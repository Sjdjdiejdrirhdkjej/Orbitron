import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { models as catalog } from "../src/data/models";

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

const openAIMap: Record<string, string> = {
  "gpt-5.4": "gpt-5.4",
  "gpt-5.2": "gpt-5.2",
  "gpt-5.1": "gpt-5.1",
  "gpt-5": "gpt-5",
  "gpt-5-mini": "gpt-5-mini",
  "gpt-5-nano": "gpt-5-nano",
  "o4-mini": "o4-mini",
  "o3": "o3",
};

const anthropicMap: Record<string, string> = {
  "claude-opus-4.7": "claude-opus-4-7",
  "claude-sonnet-4.6": "claude-sonnet-4-6",
  "claude-opus-4.6": "claude-opus-4-6",
  "claude-opus-4.5": "claude-opus-4-5",
  "claude-sonnet-4.5": "claude-sonnet-4-5",
  "claude-haiku-4.5": "claude-haiku-4-5",
  "claude-opus-4.1": "claude-opus-4-1",
};

const geminiMap: Record<string, string> = {
  "gemini-2.5-pro": "gemini-2.5-pro",
  "gemini-2.5-flash": "gemini-2.5-flash",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatBody {
  modelId: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

function approxTokens(text: string): number {
  // Rough estimate: ~4 chars per token. Good enough for cost preview.
  return Math.max(1, Math.ceil(text.length / 4));
}

export function registerChatRoutes(app: Express): void {
  app.post("/api/chat", async (req: Request, res: Response) => {
    const { modelId, messages, temperature, maxTokens } = (req.body || {}) as ChatBody;

    if (!modelId || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "modelId and messages are required" });
    }

    const catalogEntry = catalog.find((m) => m.id === modelId);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const send = (data: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const startTime = Date.now();
    let firstTokenMs = 0;
    let outputText = "";
    const inputTokens = approxTokens(messages.map((m) => m.content).join("\n"));

    try {
      const onDelta = (delta: string) => {
        if (!delta) return;
        if (!firstTokenMs) firstTokenMs = Date.now() - startTime;
        outputText += delta;
        send({ delta });
      };

      if (modelId in openAIMap) {
        const realModel = openAIMap[modelId];
        const isReasoning = realModel.startsWith("gpt-5") || realModel.startsWith("o");
        const stream = await openai.chat.completions.create({
          model: realModel,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          stream: true,
          ...(isReasoning ? {} : { temperature: temperature ?? 0.7 }),
          max_completion_tokens: maxTokens ?? 4096,
        });
        for await (const chunk of stream) {
          onDelta(chunk.choices[0]?.delta?.content || "");
        }
      } else if (modelId in anthropicMap) {
        const realModel = anthropicMap[modelId];
        const systemMessages = messages
          .filter((m) => m.role === "system")
          .map((m) => m.content)
          .join("\n\n");
        const turns = messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
        // Newer Anthropic models deprecate temperature/top_p/top_k.
        const supportsTemperature = !/^claude-opus-4-(6|7)$|^claude-sonnet-4-6$/.test(realModel);
        const stream = anthropic.messages.stream({
          model: realModel,
          max_tokens: maxTokens ?? 4096,
          ...(supportsTemperature ? { temperature: temperature ?? 0.7 } : {}),
          system: systemMessages || undefined,
          messages: turns,
        });
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            "delta" in event &&
            (event.delta as { type?: string; text?: string }).type === "text_delta"
          ) {
            onDelta((event.delta as { text?: string }).text || "");
          }
        }
      } else if (modelId in geminiMap) {
        const realModel = geminiMap[modelId];
        const systemMessages = messages
          .filter((m) => m.role === "system")
          .map((m) => m.content)
          .join("\n\n");
        const contents = messages
          .filter((m) => m.role !== "system")
          .map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }));
        const config: Record<string, unknown> = {
          temperature: temperature ?? 0.7,
          maxOutputTokens: maxTokens ?? 4096,
        };
        if (systemMessages) config.systemInstruction = systemMessages;
        const stream = await gemini.models.generateContentStream({
          model: realModel,
          contents,
          config,
        });
        for await (const chunk of stream) {
          onDelta(chunk.text || "");
        }
      } else {
        send({ error: `Unsupported model: ${modelId}` });
        return res.end();
      }

      const outputTokens = approxTokens(outputText);
      const totalTime = Date.now() - startTime;
      const cost = catalogEntry
        ? (inputTokens / 1_000_000) * catalogEntry.inputPrice +
          (outputTokens / 1_000_000) * catalogEntry.outputPrice
        : 0;

      send({
        done: true,
        latencyMs: firstTokenMs,
        totalMs: totalTime,
        inputTokens,
        outputTokens,
        cost,
      });
      res.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Chat request failed";
      console.error("Chat error:", err);
      send({ error: message });
      res.end();
    }
  });
}
