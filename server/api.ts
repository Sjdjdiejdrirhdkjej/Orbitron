import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { models as catalog, providers } from "../src/data/models";
import { requireAuth, requireApiKey } from "./auth";
import {
  recordUsage,
  providerForModel,
  getUsageSummary,
  getMeasuredModelStats,
} from "./usage";
import {
  getCreditsState,
  reserveCredits,
  refundCredits,
  recordCreditAudit,
} from "./credits";
import { query } from "./db";
import { randomBytes } from "node:crypto";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

interface ProviderStatus {
  name: string;
  status: "operational" | "degraded" | "down";
  latencyMs: number;
  error?: string;
}

async function pingProvider(
  name: string,
  fn: () => Promise<unknown>,
  timeoutMs = 8000,
): Promise<ProviderStatus> {
  const start = Date.now();
  try {
    await Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);
    const latencyMs = Date.now() - start;
    return {
      name,
      status: latencyMs > 3000 ? "degraded" : "operational",
      latencyMs,
    };
  } catch (err) {
    return {
      name,
      status: "down",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

let statusCache: { data: unknown; expires: number } | null = null;
const STATUS_TTL_MS = 30_000;

interface ImageBody {
  prompt: string;
  size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto";
  n?: number;
  model?: string;
}

const IMAGE_MODEL_IDS = ["gpt-image-1", "gemini-2.5-flash-image"] as const;
type ImageModelId = (typeof IMAGE_MODEL_IDS)[number];

/**
 * Per-image USD list price for each supported image model.
 *
 * These prices MUST be non-zero — a $0 entry would let a depleted user
 * generate images for free because the credit reservation would compute to
 * zero and the post-hoc audit row would never debit anything.
 *
 * - gpt-image-1: $0.04 / 1024 medium-quality image (OpenAI list price).
 * - gemini-2.5-flash-image: $0.039 / image (Gemini "Nano Banana" list price).
 */
const IMAGE_PRICE_USD: Record<ImageModelId, number> = {
  "gpt-image-1": 0.04,
  "gemini-2.5-flash-image": 0.039,
};

const IMAGE_PROMPT_MAX_LEN = 4000;

// In-memory sliding-window rate limiter for the account deletion endpoint.
// Keyed by userId. We allow up to ACCOUNT_DELETE_MAX attempts per window;
// successful deletions naturally clear the user from the map on the next
// purge sweep, so this only matters for failed attempts (wrong phrase, etc).
const ACCOUNT_DELETE_MAX = 5;
const ACCOUNT_DELETE_WINDOW_MS = 15 * 60 * 1000;
const accountDeleteAttempts = new Map<string, number[]>();

function checkAccountDeleteRate(userId: string): boolean {
  const now = Date.now();
  const cutoff = now - ACCOUNT_DELETE_WINDOW_MS;
  const prev = accountDeleteAttempts.get(userId) ?? [];
  const recent = prev.filter((t) => t > cutoff);
  if (recent.length >= ACCOUNT_DELETE_MAX) {
    accountDeleteAttempts.set(userId, recent);
    return false;
  }
  recent.push(now);
  accountDeleteAttempts.set(userId, recent);
  return true;
}

export function registerApiRoutes(app: Express): void {
  // GET /api/status — ping each provider and report aggregate + per-provider health.
  // Cached for 30s on the server to avoid hammering provider list endpoints.
  app.get("/api/status", async (_req: Request, res: Response) => {
    if (statusCache && statusCache.expires > Date.now()) {
      return res.json(statusCache.data);
    }

    // The Replit AI proxy only exposes generation endpoints — /models lists return 405.
    // Use minimal completion calls as health probes (cents-scale cost, cached 30s).
    const providerResults = await Promise.all([
      pingProvider("OpenAI", () =>
        openai.chat.completions.create({
          model: "gpt-5-nano",
          messages: [{ role: "user", content: "ping" }],
          max_completion_tokens: 16,
        }),
      ),
      pingProvider("Anthropic", () =>
        anthropic.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        }),
      ),
      pingProvider("Google", () =>
        gemini.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: "ping" }] }],
          config: { maxOutputTokens: 1 },
        }),
      ),
    ]);

    const down = providerResults.filter((p) => p.status === "down").length;
    const degraded = providerResults.filter((p) => p.status === "degraded").length;
    const aggregate: "operational" | "degraded" | "down" =
      down === providerResults.length ? "down" : down + degraded > 0 ? "degraded" : "operational";

    const payload = {
      status: aggregate,
      checkedAt: new Date().toISOString(),
      providers: providerResults,
    };

    statusCache = { data: payload, expires: Date.now() + STATUS_TTL_MS };
    res.json(payload);
  });

  // GET /api/models — list every model in the catalog with optional ?provider= filter.
  // latency_ms / throughput_tokens_per_second are derived from measured usage when
  // we have ≥3 successful chat events for a model in the last 7 days; otherwise null.
  app.get("/api/models", async (req: Request, res: Response) => {
    const providerFilter = typeof req.query.provider === "string" ? req.query.provider : null;
    const modalityFilter = typeof req.query.modality === "string" ? req.query.modality : null;

    let data = catalog;
    if (providerFilter) {
      const lower = providerFilter.toLowerCase();
      data = data.filter((m) => m.provider.toLowerCase() === lower);
    }
    if (modalityFilter) {
      data = data.filter((m) => m.modalities.includes(modalityFilter as never));
    }

    const measured = await getMeasuredModelStats();

    res.json({
      object: "list",
      providers,
      data: data.map((m) => {
        const stats = measured.get(m.id);
        return {
          id: m.id,
          object: "model",
          name: m.name,
          provider: m.provider,
          context_window: m.contextWindow,
          modalities: m.modalities,
          pricing: {
            input_per_million: m.inputPrice,
            output_per_million: m.outputPrice,
            currency: "USD",
          },
          throughput_tokens_per_second: stats?.throughputTokensPerSecond ?? null,
          latency_ms: stats?.latencyMs ?? null,
          measured_sample_size: stats?.sampleSize ?? 0,
          description: m.description,
        };
      }),
    });
  });

  // GET /api/models/:id — fetch one model by id (with measured stats merged in)
  app.get("/api/models/:id", async (req: Request, res: Response) => {
    const model = catalog.find((m) => m.id === req.params.id);
    if (!model) {
      return res.status(404).json({ error: { message: `Model not found: ${req.params.id}` } });
    }
    const measured = await getMeasuredModelStats();
    const stats = measured.get(model.id);
    res.json({
      id: model.id,
      object: "model",
      name: model.name,
      provider: model.provider,
      context_window: model.contextWindow,
      modalities: model.modalities,
      pricing: {
        input_per_million: model.inputPrice,
        output_per_million: model.outputPrice,
        currency: "USD",
      },
      throughput_tokens_per_second: stats?.throughputTokensPerSecond ?? null,
      latency_ms: stats?.latencyMs ?? null,
      measured_sample_size: stats?.sampleSize ?? 0,
      description: model.description,
    });
  });

  // GET /api/usage — real per-user analytics. Returns zeroed structures with no
  // events yet so the Usage page can render a clean empty state.
  app.get("/api/usage", requireAuth, async (req: Request, res: Response) => {
    const windowDays = Math.max(
      1,
      Math.min(90, Number(req.query.days) || 30),
    );
    const userId = req.auth!.user.id;
    try {
      const summary = await getUsageSummary(userId, windowDays);
      res.json(summary);
    } catch (err) {
      console.error("Usage summary error:", err);
      res.status(500).json({ error: { message: "Failed to load usage" } });
    }
  });

  // GET /api/credits — current user's credit balance + grant history.
  app.get("/api/credits", requireAuth, async (req: Request, res: Response) => {
    const userId = req.auth!.user.id;
    try {
      const state = await getCreditsState(userId);
      res.json({
        balanceCents: state.balanceCents,
        balanceUsd: state.balanceCents / 100,
        welcomeGrantedAt: state.welcomeGrantedAt,
        legacyGrantedAt: state.legacyGrantedAt,
        grants: state.grants.map((g) => ({
          id: g.id,
          amountCents: g.amount_cents,
          amountUsd: g.amount_cents / 100,
          reason: g.reason,
          description: g.description,
          createdAt: g.created_at,
        })),
      });
    } catch (err) {
      console.error("Credits state error:", err);
      res.status(500).json({ error: { message: "Failed to load credits" } });
    }
  });

  // POST /api/images — generate an image with OpenAI gpt-image-1
  // Body: { prompt: string, size?: "1024x1024"|"1024x1536"|"1536x1024"|"auto", n?: number }
  // Returns: { data: [{ b64_json, revised_prompt }], model, latencyMs }
  app.post("/api/images", requireApiKey, async (req: Request, res: Response) => {
    const {
      prompt,
      size = "1024x1024",
      n = 1,
      model = "gpt-image-1",
    } = (req.body || {}) as ImageBody;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: { message: "prompt is required" } });
    }
    if (prompt.length > IMAGE_PROMPT_MAX_LEN) {
      return res.status(400).json({
        error: { message: `Prompt too long (max ${IMAGE_PROMPT_MAX_LEN} chars).` },
      });
    }
    const requestedN = Number(n);
    if (!Number.isInteger(requestedN) || requestedN < 1 || requestedN > 4) {
      return res
        .status(400)
        .json({ error: { message: "n must be an integer between 1 and 4" } });
    }
    if (!IMAGE_MODEL_IDS.includes(model as ImageModelId)) {
      return res.status(400).json({
        error: { message: `Unsupported image model: ${model}` },
      });
    }

    const startTime = Date.now();
    const userId = req.auth!.user.id;
    const apiKeyId = req.auth!.apiKeyId ?? null;
    const modelId = model as ImageModelId;
    const perImageUsd = IMAGE_PRICE_USD[modelId];
    // Reserve worst-case cost (n × per-image price) up front. If this fails
    // we never call the provider — that's the only thing standing between a
    // depleted user and unlimited image generation.
    const reservationCents = Math.max(1, Math.ceil(perImageUsd * requestedN * 100));
    const reserved = await reserveCredits(userId, reservationCents);
    if (reserved === null) {
      return res.status(402).json({
        error: {
          message:
            "Insufficient credits. Add more credits to continue using the API.",
          type: "insufficient_credits",
          requiredCents: reservationCents,
        },
      });
    }

    let imagesReturned = 0;
    let success = false;
    try {
      let data: Array<{ b64_json: string | null; revised_prompt: string | null }>;
      if (modelId === "gemini-2.5-flash-image") {
        // Gemini generates one image per call; fan out for n>1.
        const calls = Array.from({ length: requestedN }, () =>
          (gemini.models.generateContent as (a: unknown) => Promise<unknown>)({
            model: "gemini-2.5-flash-image",
            contents: prompt,
            config: { responseModalities: ["IMAGE"] },
          }),
        );
        const results = await Promise.all(calls);
        data = results.map((r) => {
          const parts =
            (r as { candidates?: { content?: { parts?: unknown[] } }[] })
              .candidates?.[0]?.content?.parts ?? [];
          const imgPart = parts.find(
            (p): p is { inlineData: { data: string } } =>
              !!(p as { inlineData?: { data?: string } })?.inlineData?.data,
          );
          return {
            b64_json: imgPart?.inlineData.data ?? null,
            revised_prompt: null,
          };
        });
      } else {
        // Default: OpenAI gpt-image-1
        const response = await openai.images.generate({
          model: "gpt-image-1",
          prompt,
          size,
          n: requestedN,
        });
        data = (response.data ?? []).map((img) => ({
          b64_json: img.b64_json ?? null,
          revised_prompt:
            (img as { revised_prompt?: string }).revised_prompt ?? null,
        }));
      }

      imagesReturned = data.filter((d) => d.b64_json).length;
      success = imagesReturned > 0;
      const totalMs = Date.now() - startTime;
      res.json({ model: modelId, latencyMs: totalMs, data });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Image generation failed";
      console.error("Image generation error:", err);
      res.status(500).json({ error: { message } });
    } finally {
      // Settle the reservation: charge for images that actually came back,
      // refund the rest. Failed requests refund the full reservation so a
      // user is never billed for a provider error they didn't get value from.
      const actualCostCents = Math.min(
        reservationCents,
        Math.ceil(perImageUsd * imagesReturned * 100),
      );
      const refundCents = reservationCents - actualCostCents;
      if (refundCents > 0) await refundCredits(userId, refundCents);
      if (actualCostCents > 0) {
        void recordCreditAudit(
          userId,
          actualCostCents,
          `${modelId} — ${imagesReturned} image${imagesReturned === 1 ? "" : "s"}`,
        );
      }
      void recordUsage({
        userId,
        apiKeyId,
        kind: "image",
        modelId,
        provider: providerForModel(modelId) || "Unknown",
        inputTokens: 0,
        outputTokens: imagesReturned,
        costUsd: actualCostCents / 100,
        latencyMs: Date.now() - startTime,
        totalMs: Date.now() - startTime,
        success,
      });
    }
  });

  // POST /api/share — publish a read-only snapshot of a conversation. Returns
  // a slug that maps to /share/:slug. The caller passes the full message list
  // so we don't need to know about their localStorage shape on the server.
  app.post("/api/share", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.user as { claims: { sub: string } }).claims.sub;
    const body = req.body as {
      title?: unknown;
      modelId?: unknown;
      messages?: unknown;
    };
    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim().slice(0, 200)
        : "Untitled chat";
    const modelId =
      typeof body.modelId === "string" ? body.modelId.slice(0, 100) : null;
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return res
        .status(400)
        .json({ error: { message: "messages must be a non-empty array" } });
    }
    // Hard cap snapshot size to keep one row from blowing up the DB.
    const snapshot = { title, modelId, messages: body.messages };
    const serialized = JSON.stringify(snapshot);
    if (serialized.length > 1_000_000) {
      return res
        .status(413)
        .json({ error: { message: "Conversation is too large to share" } });
    }
    // 12-byte url-safe slug — ~96 bits of entropy, no collisions in practice.
    const slug = randomBytes(9).toString("base64url");
    await query(
      `INSERT INTO shared_chats (slug, user_id, title, model_id, snapshot)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [slug, userId, title, modelId, serialized],
    );
    res.json({ slug, url: `/share/${slug}` });
  });

  // POST /api/account/delete — permanently delete the authenticated user.
  // Removes the users row, which CASCADEs to api_keys, usage_events,
  // credit_grants, and shared_chats. Then destroys the session so the browser
  // is signed out. Frontend should redirect to "/" after a successful 204.
  //
  // Hardening layers (defense in depth):
  //   1. requireAuth — must hold a valid session cookie.
  //   2. Origin / Referer check — request must originate from our own host,
  //      blocking cross-site CSRF even if the attacker has the cookie.
  //   3. Body-confirmation phrase — the server independently checks that the
  //      caller passed the literal phrase, so a cross-site attacker would need
  //      to know it (and JSON bodies trigger CORS preflight anyway).
  //   4. Per-user rate limit — caps repeat attempts at 5 / 15min so a tricked
  //      user can't be hammered, and protects against scripted abuse.
  //   5. Audit log — every attempt (success or rejection) is logged with user
  //      id, IP, and user-agent for incident review.
  app.post("/api/account/delete", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.user as { claims: { sub: string } }).claims.sub;
    const ip = req.ip ?? "?";
    const ua = req.get("user-agent") ?? "?";

    // 2. Origin / Referer check. Either header must match our host.
    const expectedHost = req.get("host");
    const origin = req.get("origin");
    const referer = req.get("referer");
    let originOk = false;
    try {
      if (origin) originOk = new URL(origin).host === expectedHost;
      if (!originOk && referer) {
        originOk = new URL(referer).host === expectedHost;
      }
    } catch {
      originOk = false;
    }
    if (!originOk) {
      console.warn(
        `[account-delete] rejected (bad origin) user=${userId} ip=${ip} origin=${origin ?? "-"} referer=${referer ?? "-"}`,
      );
      return res
        .status(403)
        .json({ error: { message: "Request origin not allowed" } });
    }

    // 3. Body confirmation phrase.
    const confirm = (req.body as { confirm?: unknown })?.confirm;
    const REQUIRED_PHRASE = "delete my account";
    if (
      typeof confirm !== "string" ||
      confirm.trim().toLowerCase() !== REQUIRED_PHRASE
    ) {
      console.warn(
        `[account-delete] rejected (bad confirmation) user=${userId} ip=${ip}`,
      );
      return res
        .status(400)
        .json({ error: { message: "Confirmation phrase did not match" } });
    }

    // 4. Per-user rate limit.
    if (!checkAccountDeleteRate(userId)) {
      console.warn(
        `[account-delete] rejected (rate limited) user=${userId} ip=${ip}`,
      );
      return res
        .status(429)
        .json({ error: { message: "Too many delete attempts. Try again later." } });
    }

    // 5. Audit log + perform the delete.
    console.log(
      `[account-delete] proceeding user=${userId} ip=${ip} ua=${JSON.stringify(ua)}`,
    );
    try {
      await query(`DELETE FROM users WHERE id = $1`, [userId]);
    } catch (err) {
      console.error("Account deletion failed:", err);
      return res
        .status(500)
        .json({ error: { message: "Failed to delete account" } });
    }
    // Best-effort session teardown. We don't fail the request if logout/destroy
    // errors — the user row is already gone, so any leftover session is inert.
    req.logout(() => {
      req.session?.destroy(() => {
        res.clearCookie("connect.sid");
        res.status(204).end();
      });
    });
  });

  // GET /api/share/:slug — public, no auth. Returns the snapshot and metadata
  // for the public viewer page.
  app.get("/api/share/:slug", async (req: Request, res: Response) => {
    const slug = req.params.slug;
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(slug)) {
      return res.status(404).json({ error: { message: "Not found" } });
    }
    const result = await query<{
      title: string;
      model_id: string | null;
      snapshot: { title: string; modelId: string | null; messages: unknown[] };
      created_at: Date;
    }>(
      `SELECT title, model_id, snapshot, created_at
         FROM shared_chats WHERE slug = $1`,
      [slug],
    );
    const row = result.rows[0];
    if (!row) {
      return res.status(404).json({ error: { message: "Not found" } });
    }
    res.json({
      slug,
      title: row.title,
      modelId: row.model_id,
      messages: row.snapshot.messages,
      createdAt: row.created_at,
    });
  });
}
