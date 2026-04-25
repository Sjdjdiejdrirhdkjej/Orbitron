import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { models as catalog, providers } from "../src/data/models";
import { requireAuth } from "./auth";
import {
  recordUsage,
  providerForModel,
  getUsageSummary,
  getMeasuredModelStats,
} from "./usage";

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

  // POST /api/images — generate an image with OpenAI gpt-image-1
  // Body: { prompt: string, size?: "1024x1024"|"1024x1536"|"1536x1024"|"auto", n?: number }
  // Returns: { data: [{ b64_json, revised_prompt }], model, latencyMs }
  app.post("/api/images", requireAuth, async (req: Request, res: Response) => {
    const {
      prompt,
      size = "1024x1024",
      n = 1,
      model = "gpt-image-1",
    } = (req.body || {}) as ImageBody;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: { message: "prompt is required" } });
    }
    if (n < 1 || n > 4) {
      return res.status(400).json({ error: { message: "n must be between 1 and 4" } });
    }
    if (!IMAGE_MODEL_IDS.includes(model as ImageModelId)) {
      return res.status(400).json({
        error: { message: `Unsupported image model: ${model}` },
      });
    }

    const startTime = Date.now();
    const userId = req.auth!.user.id;
    try {
      if (model === "gemini-2.5-flash-image") {
        // Gemini generates one image per call; fan out for n>1.
        const calls = Array.from({ length: n }, () =>
          (gemini.models.generateContent as (a: unknown) => Promise<unknown>)({
            model: "gemini-2.5-flash-image",
            contents: prompt,
            config: { responseModalities: ["IMAGE"] },
          }),
        );
        const results = await Promise.all(calls);
        const data = results.map((r) => {
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

        const totalMs = Date.now() - startTime;
        const imagesReturned = data.filter((d) => d.b64_json).length;
        // Gemini image pricing isn't published per-image the same way as gpt-image-1;
        // record requests + latency without a synthetic cost.
        void recordUsage({
          userId,
          kind: "image",
          modelId: "gemini-2.5-flash-image",
          provider: providerForModel("gemini-2.5-flash-image") || "Google",
          inputTokens: 0,
          outputTokens: imagesReturned,
          costUsd: 0,
          latencyMs: totalMs,
          totalMs,
          success: imagesReturned > 0,
        });
        return res.json({
          model: "gemini-2.5-flash-image",
          latencyMs: totalMs,
          data,
        });
      }

      // Default: OpenAI gpt-image-1
      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        size,
        n,
      });

      const data = (response.data ?? []).map((img) => ({
        b64_json: img.b64_json ?? null,
        revised_prompt: (img as { revised_prompt?: string }).revised_prompt ?? null,
      }));

      const totalMs = Date.now() - startTime;
      const imagesReturned = data.filter((d) => d.b64_json).length;
      // gpt-image-1 list price is ~$0.04 per 1024-image (medium quality).
      const perImageCost = 0.04;
      void recordUsage({
        userId,
        kind: "image",
        modelId: "gpt-image-1",
        provider: providerForModel("gpt-image-1") || "OpenAI",
        inputTokens: 0,
        outputTokens: imagesReturned,
        costUsd: perImageCost * imagesReturned,
        latencyMs: totalMs,
        totalMs,
        success: imagesReturned > 0,
      });

      res.json({
        model: "gpt-image-1",
        latencyMs: totalMs,
        data,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Image generation failed";
      console.error("Image generation error:", err);
      void recordUsage({
        userId,
        kind: "image",
        modelId: model,
        provider: providerForModel(model) || "Unknown",
        latencyMs: Date.now() - startTime,
        totalMs: Date.now() - startTime,
        success: false,
      });
      res.status(500).json({ error: { message } });
    }
  });
}
