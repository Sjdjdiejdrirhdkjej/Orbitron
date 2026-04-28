import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { models as catalog } from "../src/data/models";
import { requireApiKey } from "./auth";
import { recordUsage, providerForModel } from "./usage";
import {
  reserveCredits,
  refundCredits,
  recordCreditAudit,
} from "./credits";
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

export const openAIMap: Record<string, string> = {
  "gpt-5.5": "gpt-5.5",
  "gpt-5.4": "gpt-5.4",
  "gpt-5.2": "gpt-5.2",
  "gpt-5.3-codex": "gpt-5.3-codex",
  "gpt-5.1": "gpt-5.1",
  "gpt-5": "gpt-5",
  "gpt-5-mini": "gpt-5-mini",
  "gpt-5-nano": "gpt-5-nano",
  "gpt-4.1": "gpt-4.1",
  "gpt-4.1-mini": "gpt-4.1-mini",
  "o3-pro": "o3-pro",
  "o4-mini": "o4-mini",
  "o3": "o3",
};

export const anthropicMap: Record<string, string> = {
  "claude-opus-4.7": "claude-opus-4-7",
  "claude-sonnet-4.6": "claude-sonnet-4-6",
  "claude-opus-4.6": "claude-opus-4-6",
  "claude-opus-4.5": "claude-opus-4-5",
  "claude-sonnet-4.5": "claude-sonnet-4-5",
  "claude-haiku-4.5": "claude-haiku-4-5",
  "claude-opus-4.1": "claude-opus-4-1",
};

export const geminiMap: Record<string, string> = {
  "gemini-3-pro": "gemini-3-pro",
  "gemini-3-flash": "gemini-3-flash",
  "gemini-2.5-pro": "gemini-2.5-pro",
  "gemini-2.5-flash": "gemini-2.5-flash",
  "gemini-2.5-flash-lite": "gemini-2.5-flash-lite",
  "gemini-2.0-flash-thinking": "gemini-2.0-flash-thinking",
};

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatBody {
  modelId: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  tools?: { webSearch?: boolean };
  reasoningLevel?: "low" | "medium" | "high";
}

/** Hard cap on tool-use rounds per request — guards against runaway loops. */
export const MAX_TOOL_ITERATIONS = 4;

/** Hard cap on max_tokens we'll honor regardless of what the client requests.
 * Prevents an attacker from passing maxTokens=1_000_000 to balloon the
 * provider bill (and the server-side credit reservation that protects it). */
export const MAX_OUTPUT_TOKENS_HARD_CAP = 8192;

/** Hard cap on the number of messages we'll process in a single request.
 * Pairs with the express.json 10mb body limit to bound the worst-case input
 * cost a depleted user could try to slip past credit reservation. */
export const MAX_MESSAGES_PER_REQUEST = 200;

export function approxTokens(text: string): number {
  // Rough estimate: ~4 chars per token. Good enough for cost preview.
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * The streaming context passed into each provider runner. Each runner forwards
 * text deltas via `onText` and tool lifecycle events via `onTool*`. The route
 * handler turns those into SSE events.
 */
export interface StreamCtx {
  onText(delta: string): void;
  onToolStart(callId: string, name: string, args: Record<string, unknown>): void;
  onToolEnd(callId: string, results: WebSearchResult[]): void;
  onToolError(callId: string, error: string): void;
  /**
   * Reports tokens billed for one provider round. Tool-loop iterations call
   * this once per round so the route handler can sum total billable tokens
   * (including tokens spent on tool inputs/outputs invisible to the user).
   * Without this, an attacker could craft prompts that maximize tool-use
   * loops and burn provider quota that's never charged back to credits.
   */
  onRoundComplete(inputTokens: number, outputTokens: number): void;
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

export async function runOpenAI(opts: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  useTools: boolean;
  reasoningLevel?: "low" | "medium" | "high";
  ctx: StreamCtx;
}): Promise<void> {
  const isReasoning = opts.model.startsWith("gpt-5") || opts.model.startsWith("o");
  const reasoningEffort = isReasoning ? (opts.reasoningLevel ?? "medium") : undefined;

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
    // Snapshot the input tokens billed for THIS provider round before we
    // mutate `messages` with the assistant + tool turns. Without this, tool
    // iterations re-feed the growing transcript at no extra charge.
    const roundInputTokens = approxTokens(
      messages
        .map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)))
        .join("\n"),
    );

    const stream = await openai.chat.completions.create({
      model: opts.model,
      messages,
      stream: true,
      ...(isReasoning ? {} : { temperature: opts.temperature ?? 0.7 }),
      ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
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
    // Output is the visible text plus the JSON tool-call payload — both are
    // billed by the provider, so both must count toward the user's deduction.
    const roundOutputTokens =
      approxTokens(assistantText) +
      (completedToolCalls.length > 0
        ? approxTokens(JSON.stringify(completedToolCalls))
        : 0);
    opts.ctx.onRoundComplete(roundInputTokens, roundOutputTokens);

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

export async function runAnthropic(opts: {
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
    // Snapshot input tokens for THIS round (system prompt + entire transcript
    // so far) before the assistant + tool turns get appended. Anthropic's
    // usage object on finalMsg would be more accurate, but the proxy doesn't
    // always surface it; the approximation is what we already use elsewhere.
    const roundInputTokens =
      approxTokens(systemMessages || "") +
      approxTokens(
        turns
          .map((t) =>
            typeof t.content === "string" ? t.content : JSON.stringify(t.content),
          )
          .join("\n"),
      );

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

    let assistantText = "";
    for await (const event of stream as any) {
      if (
        event.type === "content_block_delta" &&
        event.delta?.type === "text_delta"
      ) {
        const t = event.delta.text || "";
        assistantText += t;
        opts.ctx.onText(t);
      }
    }

    const finalMsg = await stream.finalMessage();
    const toolUses = (finalMsg.content || []).filter(
      (b: any) => b.type === "tool_use",
    );
    const roundOutputTokens =
      approxTokens(assistantText) +
      (toolUses.length > 0 ? approxTokens(JSON.stringify(toolUses)) : 0);
    opts.ctx.onRoundComplete(roundInputTokens, roundOutputTokens);

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

export async function runGemini(opts: {
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

    // Snapshot input tokens for THIS provider round before the model + tool
    // turns get appended. Mirrors the OpenAI/Anthropic flow so tool loops
    // aren't a free token sink.
    const roundInputTokens =
      approxTokens(systemMessages || "") +
      approxTokens(
        contents
          .flatMap((c) => (c.parts ?? []).map((p: any) => p.text ?? JSON.stringify(p)))
          .join("\n"),
      );

    const stream = await gemini.models.generateContentStream({
      model: opts.model,
      contents,
      config,
    } as any);

    const functionCalls: Array<{ name: string; args: Record<string, unknown>; id?: string }> = [];
    let assistantText = "";

    for await (const chunk of stream as any) {
      if (chunk.text) {
        assistantText += chunk.text;
        opts.ctx.onText(chunk.text);
      }
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

    const roundOutputTokens =
      approxTokens(assistantText) +
      (functionCalls.length > 0 ? approxTokens(JSON.stringify(functionCalls)) : 0);
    opts.ctx.onRoundComplete(roundInputTokens, roundOutputTokens);

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
  app.post("/api/chat", requireApiKey, async (req: Request, res: Response) => {
    const {
      modelId,
      messages,
      temperature,
      maxTokens,
      tools: clientTools,
      reasoningLevel,
    } = (req.body || {}) as ChatBody;

    if (!modelId || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: { message: "modelId and messages are required", type: "invalid_request" },
      });
    }
    if (messages.length > MAX_MESSAGES_PER_REQUEST) {
      return res.status(400).json({
        error: {
          message: `Too many messages (max ${MAX_MESSAGES_PER_REQUEST}).`,
          type: "invalid_request",
        },
      });
    }

    // SECURITY: routing-table-only models would slip past credit reservation
    // because their cost would compute to $0. Require the model to be in the
    // catalog (which is the only source of truth for pricing) before we'll
    // even consider running it.
    const catalogEntry = catalog.find((m) => m.id === modelId);
    if (!catalogEntry) {
      return res.status(400).json({
        error: { message: `Unsupported model: ${modelId}`, type: "invalid_request" },
      });
    }
    if (
      !(modelId in openAIMap) &&
      !(modelId in anthropicMap) &&
      !(modelId in geminiMap)
    ) {
      return res.status(400).json({
        error: { message: `Unsupported model: ${modelId}`, type: "invalid_request" },
      });
    }

    // Cap maxTokens BEFORE pricing so a malicious client can't inflate the
    // worst-case bill past what we can actually reserve.
    const requestedMaxTokens = Number(maxTokens);
    const effectiveMaxTokens = Math.max(
      1,
      Math.min(
        Number.isFinite(requestedMaxTokens) && requestedMaxTokens > 0
          ? Math.floor(requestedMaxTokens)
          : 4096,
        MAX_OUTPUT_TOKENS_HARD_CAP,
      ),
    );

    const useWebSearch = !!clientTools?.webSearch;
    const userId = req.auth!.user.id;
    const apiKeyId = req.auth!.apiKeyId ?? null;

    // ------------------------------------------------------------------
    // Up-front credit reservation.
    //
    // We compute a worst-case cost (full input × inputPrice + capped
    // maxTokens × outputPrice) and atomically deduct it from the user's
    // balance BEFORE making any provider call. If the user can't cover
    // the worst case we return 402 Payment Required and never touch the
    // upstream API. After the request finishes we refund whatever wasn't
    // actually consumed and write a single audit row for the real cost.
    //
    // When tools are enabled we multiply the worst case by the maximum
    // number of provider rounds (MAX_TOOL_ITERATIONS + 1) because each
    // tool round re-feeds the transcript and produces another billable
    // completion.
    // ------------------------------------------------------------------
    const inputTokensEstimate = approxTokens(
      messages.map((m) => m.content ?? "").join("\n"),
    );
    const roundsForReservation = useWebSearch ? MAX_TOOL_ITERATIONS + 1 : 1;
    const worstCaseCostUsd =
      ((inputTokensEstimate * roundsForReservation) / 1_000_000) *
        catalogEntry.inputPrice +
      ((effectiveMaxTokens * roundsForReservation) / 1_000_000) *
        catalogEntry.outputPrice;
    // Round up so we never under-reserve due to floor()-ing fractional cents.
    const reservationCents = Math.max(
      1,
      Math.ceil(worstCaseCostUsd * 100),
    );

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
    // Accumulators populated by the runners as they complete each provider
    // round. We use these — not the visible-text-only counters — for the
    // final cost so tool iterations can't escape billing.
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

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
      onRoundComplete(inT, outT) {
        totalInputTokens += inT;
        totalOutputTokens += outT;
      },
    };

    let success = false;
    try {
      if (modelId in openAIMap) {
        await runOpenAI({
          model: openAIMap[modelId],
          messages,
          temperature,
          maxTokens: effectiveMaxTokens,
          useTools: useWebSearch,
          reasoningLevel,
          ctx,
        });
      } else if (modelId in anthropicMap) {
        await runAnthropic({
          model: anthropicMap[modelId],
          messages,
          temperature,
          maxTokens: effectiveMaxTokens,
          useTools: useWebSearch,
          ctx,
        });
      } else {
        await runGemini({
          model: geminiMap[modelId],
          messages,
          temperature,
          maxTokens: effectiveMaxTokens,
          useTools: useWebSearch,
          ctx,
        });
      }
      success = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Chat request failed";
      console.error("Chat error:", err);
      send({ error: message });
    }

    // Settle the reservation regardless of success/failure.
    //
    // Fall back to outputText-derived counters if a runner errored before
    // emitting any onRoundComplete (e.g. provider 4xx on the very first call).
    if (totalInputTokens === 0) totalInputTokens = inputTokensEstimate;
    if (totalOutputTokens === 0) totalOutputTokens = approxTokens(outputText);

    const actualCostUsd =
      (totalInputTokens / 1_000_000) * catalogEntry.inputPrice +
      (totalOutputTokens / 1_000_000) * catalogEntry.outputPrice;
    // Cap the actual charge at the reservation: if approxTokens overshoots
    // due to JSON-stringified tool calls we'd otherwise over-bill the user.
    const actualCostCents = Math.min(
      reservationCents,
      Math.max(0, Math.ceil(actualCostUsd * 100)),
    );
    const refundCents = reservationCents - actualCostCents;
    if (refundCents > 0) {
      await refundCredits(userId, refundCents);
    }
    if (actualCostCents > 0) {
      void recordCreditAudit(
        userId,
        actualCostCents,
        `${modelId} — ${totalInputTokens} in / ${totalOutputTokens} out`,
      );
    }

    if (success) {
      const totalTime = Date.now() - startTime;
      send({
        done: true,
        latencyMs: firstTokenMs,
        totalMs: totalTime,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        cost: actualCostCents / 100,
      });
    }
    res.end();

    // Record analytics event AFTER settlement so the recorded cost matches
    // what we actually charged.
    void recordUsage({
      userId,
      apiKeyId,
      kind: "chat",
      modelId,
      provider: catalogEntry.provider ?? providerForModel(modelId),
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      costUsd: actualCostCents / 100,
      latencyMs: firstTokenMs || null,
      totalMs: Date.now() - startTime,
      success,
    });
  });
}
