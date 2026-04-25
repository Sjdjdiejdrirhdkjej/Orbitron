import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { models as catalog } from "../src/data/models";
import { requireAuth } from "./auth";
import { recordUsage, providerForModel } from "./usage";
import {
  WEB_SEARCH_TOOL_NAME,
  WEB_SEARCH_OPENAI_TOOL,
  WEB_SEARCH_ANTHROPIC_TOOL,
  WEB_SEARCH_GEMINI_TOOL,
  TOOLS_SYSTEM_HINT,
  executeWebSearch,
  formatWebSearchForModel,
  type WebSearchResult,
} from "./tools";

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
  tools?: { webSearch?: boolean };
}

/** Hard cap on tool-use rounds per request — guards against runaway loops. */
const MAX_TOOL_ITERATIONS = 4;

function approxTokens(text: string): number {
  // Rough estimate: ~4 chars per token. Good enough for cost preview.
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * The streaming context passed into each provider runner. Each runner forwards
 * text deltas via `onText` and tool lifecycle events via `onTool*`. The route
 * handler turns those into SSE events.
 */
interface StreamCtx {
  onText(delta: string): void;
  onToolStart(callId: string, name: string, args: Record<string, unknown>): void;
  onToolEnd(callId: string, results: WebSearchResult[]): void;
  onToolError(callId: string, error: string): void;
}

/**
 * Execute a single tool call by name and forward lifecycle events into ctx.
 * Always returns a `{textForModel}` payload to feed back into the model.
 */
async function runToolCall(
  callId: string,
  name: string,
  args: Record<string, unknown>,
  ctx: StreamCtx,
): Promise<{ textForModel: string; isError: boolean }> {
  ctx.onToolStart(callId, name, args);
  if (name !== WEB_SEARCH_TOOL_NAME) {
    const msg = `Unknown tool "${name}".`;
    ctx.onToolError(callId, msg);
    return { textForModel: msg, isError: true };
  }
  try {
    const query = String((args as any).query ?? "");
    const num = (args as any).num_results ?? (args as any).numResults;
    const results = await executeWebSearch(
      query,
      typeof num === "number" ? num : undefined,
    );
    ctx.onToolEnd(callId, results);
    return { textForModel: formatWebSearchForModel(results), isError: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Tool execution failed";
    ctx.onToolError(callId, msg);
    return { textForModel: `Error: ${msg}`, isError: true };
  }
}

// ---------------------------------------------------------------------------
// OpenAI runner
// ---------------------------------------------------------------------------

interface OpenAIToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

async function runOpenAI(opts: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  useTools: boolean;
  ctx: StreamCtx;
}): Promise<void> {
  const isReasoning = opts.model.startsWith("gpt-5") || opts.model.startsWith("o");

  // OpenAI keeps the full conversation as an array we mutate across rounds.
  const messages: any[] = opts.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Inject the tools system hint when tools are enabled.
  if (opts.useTools) {
    const sysIdx = messages.findIndex((m) => m.role === "system");
    if (sysIdx >= 0) {
      messages[sysIdx] = {
        role: "system",
        content: `${messages[sysIdx].content}\n\n${TOOLS_SYSTEM_HINT}`,
      };
    } else {
      messages.unshift({ role: "system", content: TOOLS_SYSTEM_HINT });
    }
  }

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS + 1; iter++) {
    const stream = await openai.chat.completions.create({
      model: opts.model,
      messages,
      stream: true,
      ...(isReasoning ? {} : { temperature: opts.temperature ?? 0.7 }),
      max_completion_tokens: opts.maxTokens ?? 4096,
      ...(opts.useTools && iter < MAX_TOOL_ITERATIONS
        ? { tools: [WEB_SEARCH_OPENAI_TOOL] }
        : {}),
    } as any);

    let assistantText = "";
    const toolCalls: OpenAIToolCall[] = [];

    for await (const chunk of stream as any) {
      const delta = chunk.choices?.[0]?.delta;
      if (delta?.content) {
        assistantText += delta.content;
        opts.ctx.onText(delta.content);
      }
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          if (!toolCalls[idx]) {
            toolCalls[idx] = {
              id: "",
              type: "function",
              function: { name: "", arguments: "" },
            };
          }
          if (tc.id) toolCalls[idx].id = tc.id;
          if (tc.function?.name) toolCalls[idx].function.name += tc.function.name;
          if (tc.function?.arguments) {
            toolCalls[idx].function.arguments += tc.function.arguments;
          }
        }
      }
    }

    const completedToolCalls = toolCalls.filter((t) => t && t.function.name);
    if (completedToolCalls.length === 0) return; // model finished

    // Append the assistant message that produced the tool calls.
    messages.push({
      role: "assistant",
      content: assistantText || null,
      tool_calls: completedToolCalls,
    });

    // Execute each tool call and push its result back as a `tool` message.
    for (const tc of completedToolCalls) {
      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = tc.function.arguments
          ? JSON.parse(tc.function.arguments)
          : {};
      } catch {
        parsedArgs = {};
      }
      const { textForModel } = await runToolCall(
        tc.id,
        tc.function.name,
        parsedArgs,
        opts.ctx,
      );
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: textForModel,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Anthropic runner
// ---------------------------------------------------------------------------

async function runAnthropic(opts: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  useTools: boolean;
  ctx: StreamCtx;
}): Promise<void> {
  const supportsTemperature = !/^claude-opus-4-(6|7)$|^claude-sonnet-4-6$/.test(
    opts.model,
  );

  let systemMessages = opts.messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  if (opts.useTools) {
    systemMessages = systemMessages
      ? `${systemMessages}\n\n${TOOLS_SYSTEM_HINT}`
      : TOOLS_SYSTEM_HINT;
  }

  const turns: any[] = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS + 1; iter++) {
    const stream = anthropic.messages.stream({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 4096,
      ...(supportsTemperature ? { temperature: opts.temperature ?? 0.7 } : {}),
      system: systemMessages || undefined,
      messages: turns,
      ...(opts.useTools && iter < MAX_TOOL_ITERATIONS
        ? { tools: [WEB_SEARCH_ANTHROPIC_TOOL] }
        : {}),
    } as any);

    for await (const event of stream as any) {
      if (
        event.type === "content_block_delta" &&
        event.delta?.type === "text_delta"
      ) {
        opts.ctx.onText(event.delta.text || "");
      }
    }

    const finalMsg = await stream.finalMessage();
    const toolUses = (finalMsg.content || []).filter(
      (b: any) => b.type === "tool_use",
    );

    if (finalMsg.stop_reason !== "tool_use" || toolUses.length === 0) return;

    // Append the assistant message (preserving the full content blocks).
    turns.push({ role: "assistant", content: finalMsg.content });

    // Execute each tool_use and gather tool_result blocks for the next user turn.
    const toolResults: any[] = [];
    for (const block of toolUses) {
      const { textForModel, isError } = await runToolCall(
        block.id,
        block.name,
        (block.input as Record<string, unknown>) ?? {},
        opts.ctx,
      );
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: textForModel,
        ...(isError ? { is_error: true } : {}),
      });
    }
    turns.push({ role: "user", content: toolResults });
  }
}

// ---------------------------------------------------------------------------
// Gemini runner
// ---------------------------------------------------------------------------

async function runGemini(opts: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  useTools: boolean;
  ctx: StreamCtx;
}): Promise<void> {
  let systemMessages = opts.messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  if (opts.useTools) {
    systemMessages = systemMessages
      ? `${systemMessages}\n\n${TOOLS_SYSTEM_HINT}`
      : TOOLS_SYSTEM_HINT;
  }

  const contents: any[] = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS + 1; iter++) {
    const config: Record<string, unknown> = {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxTokens ?? 4096,
    };
    if (systemMessages) config.systemInstruction = systemMessages;
    if (opts.useTools && iter < MAX_TOOL_ITERATIONS) {
      config.tools = [WEB_SEARCH_GEMINI_TOOL];
    }

    const stream = await gemini.models.generateContentStream({
      model: opts.model,
      contents,
      config,
    } as any);

    const functionCalls: Array<{ name: string; args: Record<string, unknown>; id?: string }> = [];

    for await (const chunk of stream as any) {
      if (chunk.text) opts.ctx.onText(chunk.text);
      const parts = chunk.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.functionCall?.name) {
          functionCalls.push({
            name: part.functionCall.name,
            args: (part.functionCall.args || {}) as Record<string, unknown>,
            id: part.functionCall.id,
          });
        }
      }
    }

    if (functionCalls.length === 0) return;

    // Append model's function-call turn.
    contents.push({
      role: "model",
      parts: functionCalls.map((fc) => ({
        functionCall: { name: fc.name, args: fc.args },
      })),
    });

    // Execute and append each function response.
    const responseParts: any[] = [];
    for (let i = 0; i < functionCalls.length; i++) {
      const fc = functionCalls[i];
      const callId = fc.id ?? `gemini-${Date.now()}-${i}`;
      const { textForModel } = await runToolCall(callId, fc.name, fc.args, opts.ctx);
      responseParts.push({
        functionResponse: {
          name: fc.name,
          response: { content: textForModel },
        },
      });
    }
    contents.push({ role: "user", parts: responseParts });
  }
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export function registerChatRoutes(app: Express): void {
  app.post("/api/chat", requireAuth, async (req: Request, res: Response) => {
    const {
      modelId,
      messages,
      temperature,
      maxTokens,
      tools: clientTools,
    } = (req.body || {}) as ChatBody;

    if (!modelId || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "modelId and messages are required" });
    }

    const useWebSearch = !!clientTools?.webSearch;
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

    const ctx: StreamCtx = {
      onText(delta) {
        if (!delta) return;
        if (!firstTokenMs) firstTokenMs = Date.now() - startTime;
        outputText += delta;
        send({ delta });
      },
      onToolStart(callId, name, args) {
        send({ tool: { phase: "start", callId, name, args } });
      },
      onToolEnd(callId, results) {
        send({ tool: { phase: "end", callId, results } });
      },
      onToolError(callId, error) {
        send({ tool: { phase: "error", callId, error } });
      },
    };

    try {
      if (modelId in openAIMap) {
        await runOpenAI({
          model: openAIMap[modelId],
          messages,
          temperature,
          maxTokens,
          useTools: useWebSearch,
          ctx,
        });
      } else if (modelId in anthropicMap) {
        await runAnthropic({
          model: anthropicMap[modelId],
          messages,
          temperature,
          maxTokens,
          useTools: useWebSearch,
          ctx,
        });
      } else if (modelId in geminiMap) {
        await runGemini({
          model: geminiMap[modelId],
          messages,
          temperature,
          maxTokens,
          useTools: useWebSearch,
          ctx,
        });
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

      // Record real usage for the analytics page. Best-effort; never blocks.
      void recordUsage({
        userId: req.auth!.user.id,
        kind: "chat",
        modelId,
        provider: catalogEntry?.provider ?? providerForModel(modelId),
        inputTokens,
        outputTokens,
        costUsd: cost,
        latencyMs: firstTokenMs || null,
        totalMs: totalTime,
        success: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Chat request failed";
      console.error("Chat error:", err);
      send({ error: message });
      void recordUsage({
        userId: req.auth!.user.id,
        kind: "chat",
        modelId,
        provider: catalogEntry?.provider ?? providerForModel(modelId),
        inputTokens,
        outputTokens: approxTokens(outputText),
        costUsd: 0,
        latencyMs: firstTokenMs || null,
        totalMs: Date.now() - startTime,
        success: false,
      });
      res.end();
    }
  });
}
