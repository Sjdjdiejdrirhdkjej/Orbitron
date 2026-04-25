import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { models as catalog, providers } from "../src/data/models";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface ImageBody {
  prompt: string;
  size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto";
  n?: number;
}

export function registerApiRoutes(app: Express): void {
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
