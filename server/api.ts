import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { models as catalog, providers } from "../src/data/models";

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

  // GET /api/models — list every model in the catalog with optional ?provider= filter
  app.get("/api/models", (req: Request, res: Response) => {
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

    res.json({
      object: "list",
      providers,
      data: data.map((m) => ({
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
        throughput_tokens_per_second: m.throughput,
        latency_ms: m.latency,
        description: m.description,
      })),
    });
  });

  // GET /api/models/:id — fetch one model by id
  app.get("/api/models/:id", (req: Request, res: Response) => {
    const model = catalog.find((m) => m.id === req.params.id);
    if (!model) {
      return res.status(404).json({ error: { message: `Model not found: ${req.params.id}` } });
    }
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
      throughput_tokens_per_second: model.throughput,
      latency_ms: model.latency,
      description: model.description,
    });
  });

  // POST /api/images — generate an image with OpenAI gpt-image-1
  // Body: { prompt: string, size?: "1024x1024"|"1024x1536"|"1536x1024"|"auto", n?: number }
  // Returns: { data: [{ b64_json, revised_prompt }], model, latencyMs }
  app.post("/api/images", async (req: Request, res: Response) => {
    const { prompt, size = "1024x1024", n = 1 } = (req.body || {}) as ImageBody;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: { message: "prompt is required" } });
    }
    if (n < 1 || n > 4) {
      return res.status(400).json({ error: { message: "n must be between 1 and 4" } });
    }

    const startTime = Date.now();
    try {
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

      res.json({
        model: "gpt-image-1",
        latencyMs: Date.now() - startTime,
        data,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Image generation failed";
      console.error("Image generation error:", err);
      res.status(500).json({ error: { message } });
    }
  });
}
