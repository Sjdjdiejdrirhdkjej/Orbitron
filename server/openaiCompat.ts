import type { Express, Request, Response } from "express";
import { randomBytes } from "node:crypto";
import { models as catalog } from "../src/data/models";
import { requireApiKey } from "./auth";
import { providerForModel, recordUsage } from "./usage";
import {
  reserveCredits,
  refundCredits,
  recordCreditAudit,
} from "./credits";
import {
  openAIMap,
  anthropicMap,
  geminiMap,
  runOpenAI,
  runAnthropic,
  runGemini,
  approxTokens,
  MAX_OUTPUT_TOKENS_HARD_CAP,
  MAX_MESSAGES_PER_REQUEST,
  type ChatMessage,
  type StreamCtx,
  type ModelToolCallChunk,
} from "./chat";
import {
  openaiCompatMessagesToChat,
  openaiToAnthropicTools,
  openaiToGeminiTools,
  openaiToAnthropicToolChoice,
  openaiToGeminiToolChoice,
  type OpenAICompatMessage,
  type OpenAIToolDef,
  type OpenAIToolChoice,
} from "./compatTools";

// ---------------------------------------------------------------------------
// OpenAI chat.completions request types (subset we accept)
// ---------------------------------------------------------------------------

interface OpenAIChatBody {
  model?: string;
  messages?: OpenAICompatMessage[];
  max_tokens?: number;
  /** Newer alias used by the GPT-5 / o-series SDKs. */
  max_completion_tokens?: number;
  temperature?: number;
  stream?: boolean;
  /**
   * GPT-5 / o-series reasoning effort. Passed through to the OpenAI runner so
   * reasoning models behave the same when called through the compat surface.
   */
  reasoning_effort?: "low" | "medium" | "high";
  /** Function tool definitions (OpenAI native shape). */
  tools?: OpenAIToolDef[];
  /** OpenAI-native tool_choice. */
  tool_choice?: OpenAIToolChoice;
}

// ---------------------------------------------------------------------------
// Model id resolution
//
// Catalog ids are the canonical names (e.g. "gpt-5.4", "claude-sonnet-4.6",
// "gemini-3-pro"). Accept Anthropic dashed names too so an OpenAI-SDK user
// can still ask for "claude-sonnet-4-6" through this surface — the catalog
// router will dispatch it to the Anthropic runner.
// ---------------------------------------------------------------------------

function resolveCatalogId(modelParam: string): string | null {
  if (catalog.find((m) => m.id === modelParam)) return modelParam;
  const dotted = modelParam.replace(
    /^(claude-[a-z]+-)(\d+)-(\d+)(.*)$/,
    "$1$2.$3$4",
  );
  if (catalog.find((m) => m.id === dotted)) return dotted;
  const undated = modelParam.replace(/-(\d{8})$/, "");
  if (undated !== modelParam) {
    const undatedDotted = undated.replace(
      /^(claude-[a-z]+-)(\d+)-(\d+)(.*)$/,
      "$1$2.$3$4",
    );
    if (catalog.find((m) => m.id === undatedDotted)) return undatedDotted;
  }
  return null;
}

function newCompletionId(): string {
  return `chatcmpl-${randomBytes(12).toString("base64url")}`;
}

/**
 * One assembled tool call ready for the non-streaming response body. We
 * accumulate these from `onModelToolCallChunk` events and emit them either
 * inline in the assistant message (non-streaming) or as streaming deltas.
 */
interface AssembledToolCall {
  id: string;
  name: string;
  arguments: string;
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export function registerOpenAICompatRoutes(app: Express): void {
  const handler = async (req: Request, res: Response) => {
    const body = (req.body || {}) as OpenAIChatBody;

    if (!body.model || typeof body.model !== "string") {
      return res.status(400).json({
        error: {
          message: "'model' is required",
          type: "invalid_request_error",
          param: "model",
          code: null,
        },
      });
    }
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return res.status(400).json({
        error: {
          message: "'messages' must be a non-empty array",
          type: "invalid_request_error",
          param: "messages",
          code: null,
        },
      });
    }
    if (body.messages.length > MAX_MESSAGES_PER_REQUEST) {
      return res.status(400).json({
        error: {
          message: `Too many messages (max ${MAX_MESSAGES_PER_REQUEST}).`,
          type: "invalid_request_error",
          param: "messages",
          code: null,
        },
      });
    }

    const catalogId = resolveCatalogId(body.model);
    if (!catalogId) {
      return res.status(400).json({
        error: {
          message: `Unsupported model: ${body.model}`,
          type: "invalid_request_error",
          param: "model",
          code: "model_not_found",
        },
      });
    }
    const catalogEntry = catalog.find((m) => m.id === catalogId)!;
    if (
      !(catalogId in openAIMap) &&
      !(catalogId in anthropicMap) &&
      !(catalogId in geminiMap)
    ) {
      return res.status(400).json({
        error: {
          message: `Unsupported model: ${body.model}`,
          type: "invalid_request_error",
          param: "model",
          code: "model_not_found",
        },
      });
    }

    // OpenAI's API treats max_tokens / max_completion_tokens as optional.
    // Default to 4096 (matches /api/chat) and clamp to the hard cap.
    const requestedMax =
      typeof body.max_completion_tokens === "number"
        ? body.max_completion_tokens
        : typeof body.max_tokens === "number"
          ? body.max_tokens
          : 4096;
    const effectiveMaxTokens = Math.max(
      1,
      Math.min(
        Number.isFinite(requestedMax) && requestedMax > 0
          ? Math.floor(requestedMax)
          : 4096,
        MAX_OUTPUT_TOKENS_HARD_CAP,
      ),
    );

    // Translate OpenAI-shape input into the runner's flat ChatMessage[].
    // The helper preserves assistant `tool_calls` and `tool_call_id` on tool
    // results so multi-turn function calling works through this surface.
    const messages: ChatMessage[] = openaiCompatMessagesToChat(body.messages);
    if (messages.length === 0) {
      return res.status(400).json({
        error: {
          message: "'messages' had no usable content",
          type: "invalid_request_error",
          param: "messages",
          code: null,
        },
      });
    }

    // Validate tools/tool_choice early. We ignore an empty tools array and
    // an undefined tool_choice — the request runs as a normal chat.
    const userOpenaiTools: OpenAIToolDef[] | undefined =
      Array.isArray(body.tools) && body.tools.length > 0 ? body.tools : undefined;
    const userOpenaiToolChoice = body.tool_choice;
    if (userOpenaiTools) {
      for (const t of userOpenaiTools) {
        if (!t || t.type !== "function" || !t.function?.name) {
          return res.status(400).json({
            error: {
              message:
                "Each tool must be of type 'function' with a function.name",
              type: "invalid_request_error",
              param: "tools",
              code: null,
            },
          });
        }
      }
    }

    const userId = req.auth!.user.id;
    const apiKeyId = req.auth!.apiKeyId ?? null;

    // Worst-case credit reservation — identical math to /api/chat. Tools
    // pass-through is single-round so no multiplier is needed.
    const inputTokensEstimate = approxTokens(
      messages.map((m) => m.content ?? "").join("\n"),
    );
    const worstCaseCostUsd =
      (inputTokensEstimate / 1_000_000) * catalogEntry.inputPrice +
      (effectiveMaxTokens / 1_000_000) * catalogEntry.outputPrice;
    const reservationCents = Math.max(1, Math.ceil(worstCaseCostUsd * 100));
    const reserved = await reserveCredits(userId, reservationCents);
    if (reserved === null) {
      // OpenAI's "insufficient_quota" maps cleanly to our credit-exhausted
      // state and is what SDK error-handling generally checks for.
      return res.status(402).json({
        error: {
          message:
            "Insufficient credits. Add more credits to continue using the API.",
          type: "insufficient_quota",
          param: null,
          code: "insufficient_quota",
        },
      });
    }

    const wantStream = body.stream === true;
    const completionId = newCompletionId();
    const created = Math.floor(Date.now() / 1000);
    const startTime = Date.now();
    let firstTokenMs = 0;
    let outputText = "";
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Assemble per-index tool calls as the runner streams them. Drives both
    // the streaming `delta.tool_calls` chunks AND the final non-streaming
    // `message.tool_calls` payload.
    const toolCallsByIndex: AssembledToolCall[] = [];
    let sawAnyToolCall = false;
    const accumulateToolCallChunk = (chunk: ModelToolCallChunk) => {
      sawAnyToolCall = true;
      const slot = chunk.index;
      if (!toolCallsByIndex[slot]) {
        toolCallsByIndex[slot] = { id: "", name: "", arguments: "" };
      }
      if (chunk.id) toolCallsByIndex[slot].id = chunk.id;
      if (chunk.name) toolCallsByIndex[slot].name = chunk.name;
      if (chunk.argsDelta) toolCallsByIndex[slot].arguments += chunk.argsDelta;
    };

    // ----- Streaming path: OpenAI SSE chunk format -----
    if (wantStream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      const sendChunk = (chunk: Record<string, unknown>) => {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      };

      // First chunk: just announces the assistant role (OpenAI SDK convention).
      sendChunk({
        id: completionId,
        object: "chat.completion.chunk",
        created,
        model: body.model,
        choices: [
          { index: 0, delta: { role: "assistant" }, finish_reason: null },
        ],
      });

      const ctx: StreamCtx = {
        onText(delta) {
          if (!delta) return;
          if (!firstTokenMs) firstTokenMs = Date.now() - startTime;
          outputText += delta;
          sendChunk({
            id: completionId,
            object: "chat.completion.chunk",
            created,
            model: body.model,
            choices: [
              { index: 0, delta: { content: delta }, finish_reason: null },
            ],
          });
        },
        onToolStart() {},
        onToolEnd() {},
        onToolError() {},
        onRoundComplete(inT, outT) {
          totalInputTokens += inT;
          totalOutputTokens += outT;
        },
        onModelToolCallChunk(chunk) {
          if (!firstTokenMs) firstTokenMs = Date.now() - startTime;
          accumulateToolCallChunk(chunk);
          // Emit the chunk as an OpenAI tool_call delta. The OpenAI SDK
          // accumulates id/name/arguments across deltas for the same index.
          const deltaToolCall: any = { index: chunk.index };
          if (chunk.id) {
            deltaToolCall.id = chunk.id;
            deltaToolCall.type = "function";
          }
          if (chunk.name || chunk.argsDelta) {
            deltaToolCall.function = {};
            if (chunk.name) deltaToolCall.function.name = chunk.name;
            if (chunk.argsDelta) deltaToolCall.function.arguments = chunk.argsDelta;
          }
          sendChunk({
            id: completionId,
            object: "chat.completion.chunk",
            created,
            model: body.model,
            choices: [
              {
                index: 0,
                delta: { tool_calls: [deltaToolCall] },
                finish_reason: null,
              },
            ],
          });
        },
      };

      let success = false;
      let errorMessage = "";
      try {
        await dispatchToRunner({
          catalogId,
          messages,
          temperature: body.temperature,
          maxTokens: effectiveMaxTokens,
          reasoningLevel: body.reasoning_effort,
          ctx,
          userOpenaiTools,
          userOpenaiToolChoice,
        });
        success = true;
      } catch (err) {
        errorMessage = err instanceof Error ? err.message : "Request failed";
        console.error("OpenAI-compat error:", err);
      }

      // Settle credit reservation (identical to /api/chat math).
      if (totalInputTokens === 0) totalInputTokens = inputTokensEstimate;
      if (totalOutputTokens === 0) totalOutputTokens = approxTokens(outputText);
      const actualCostUsd =
        (totalInputTokens / 1_000_000) * catalogEntry.inputPrice +
        (totalOutputTokens / 1_000_000) * catalogEntry.outputPrice;
      const actualCostCents = Math.min(
        reservationCents,
        Math.max(0, Math.ceil(actualCostUsd * 100)),
      );
      const refundCents = reservationCents - actualCostCents;
      if (refundCents > 0) await refundCredits(userId, refundCents);
      if (actualCostCents > 0) {
        void recordCreditAudit(
          userId,
          actualCostCents,
          `${catalogId} (openai-compat) — ${totalInputTokens} in / ${totalOutputTokens} out`,
        );
      }

      const finishReason: "stop" | "length" | "tool_calls" = sawAnyToolCall
        ? "tool_calls"
        : totalOutputTokens >= effectiveMaxTokens
          ? "length"
          : "stop";

      // Final chunk with finish_reason + usage (OpenAI sends usage on the last
      // chunk when stream_options.include_usage is true; we always send it).
      sendChunk({
        id: completionId,
        object: "chat.completion.chunk",
        created,
        model: body.model,
        choices: [{ index: 0, delta: {}, finish_reason: finishReason }],
        usage: {
          prompt_tokens: totalInputTokens,
          completion_tokens: totalOutputTokens,
          total_tokens: totalInputTokens + totalOutputTokens,
        },
      });
      if (!success) {
        // Surface the upstream error to the SDK before terminating the stream.
        res.write(
          `data: ${JSON.stringify({
            error: {
              message: errorMessage,
              type: "api_error",
              param: null,
              code: null,
            },
          })}\n\n`,
        );
      }
      // OpenAI's stream sentinel.
      res.write("data: [DONE]\n\n");
      res.end();

      void recordUsage({
        userId,
        apiKeyId,
        kind: "chat",
        modelId: catalogId,
        provider: catalogEntry.provider ?? providerForModel(catalogId),
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        costUsd: actualCostCents / 100,
        latencyMs: firstTokenMs || null,
        totalMs: Date.now() - startTime,
        success,
      });
      return;
    }

    // ----- Non-streaming path: collect full text + tool calls -----
    const ctx: StreamCtx = {
      onText(delta) {
        if (!delta) return;
        if (!firstTokenMs) firstTokenMs = Date.now() - startTime;
        outputText += delta;
      },
      onToolStart() {},
      onToolEnd() {},
      onToolError() {},
      onRoundComplete(inT, outT) {
        totalInputTokens += inT;
        totalOutputTokens += outT;
      },
      onModelToolCallChunk(chunk) {
        if (!firstTokenMs) firstTokenMs = Date.now() - startTime;
        accumulateToolCallChunk(chunk);
      },
    };

    let success = false;
    let errorMessage = "";
    try {
      await dispatchToRunner({
        catalogId,
        messages,
        temperature: body.temperature,
        maxTokens: effectiveMaxTokens,
        reasoningLevel: body.reasoning_effort,
        ctx,
        userOpenaiTools,
        userOpenaiToolChoice,
      });
      success = true;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Request failed";
      console.error("OpenAI-compat error:", err);
    }

    if (totalInputTokens === 0) totalInputTokens = inputTokensEstimate;
    if (totalOutputTokens === 0) totalOutputTokens = approxTokens(outputText);
    const actualCostUsd =
      (totalInputTokens / 1_000_000) * catalogEntry.inputPrice +
      (totalOutputTokens / 1_000_000) * catalogEntry.outputPrice;
    const actualCostCents = Math.min(
      reservationCents,
      Math.max(0, Math.ceil(actualCostUsd * 100)),
    );
    const refundCents = reservationCents - actualCostCents;
    if (refundCents > 0) await refundCredits(userId, refundCents);
    if (actualCostCents > 0) {
      void recordCreditAudit(
        userId,
        actualCostCents,
        `${catalogId} (openai-compat) — ${totalInputTokens} in / ${totalOutputTokens} out`,
      );
    }

    void recordUsage({
      userId,
      apiKeyId,
      kind: "chat",
      modelId: catalogId,
      provider: catalogEntry.provider ?? providerForModel(catalogId),
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      costUsd: actualCostCents / 100,
      latencyMs: firstTokenMs || null,
      totalMs: Date.now() - startTime,
      success,
    });

    if (!success) {
      return res.status(500).json({
        error: {
          message: errorMessage,
          type: "api_error",
          param: null,
          code: null,
        },
      });
    }

    const finishReason: "stop" | "length" | "tool_calls" = sawAnyToolCall
      ? "tool_calls"
      : totalOutputTokens >= effectiveMaxTokens
        ? "length"
        : "stop";

    // Build the assistant message. When the model emitted tool calls, OpenAI
    // convention is `content: null` alongside a populated `tool_calls` array.
    const message: any = {
      role: "assistant",
      content: sawAnyToolCall && !outputText ? null : outputText,
    };
    if (sawAnyToolCall) {
      message.tool_calls = toolCallsByIndex
        .filter((t) => t && t.name)
        .map((t) => ({
          id: t.id,
          type: "function",
          function: { name: t.name, arguments: t.arguments },
        }));
    }

    return res.json({
      id: completionId,
      object: "chat.completion",
      created,
      model: body.model,
      choices: [
        {
          index: 0,
          message,
          finish_reason: finishReason,
        },
      ],
      usage: {
        prompt_tokens: totalInputTokens,
        completion_tokens: totalOutputTokens,
        total_tokens: totalInputTokens + totalOutputTokens,
      },
    });
  };

  // Mount on every plausible path the OpenAI SDK might hit:
  //   - baseURL=`${baseUrl}/api/v1`  -> /api/v1/chat/completions
  //   - baseURL=`${baseUrl}/v1`      -> /v1/chat/completions
  //   - baseURL=`${baseUrl}/api`     -> /api/chat/completions
  //
  // The third one matches what the existing Docs quickstart already advertises,
  // so users who copy/pasted the snippet now have a real handler to hit.
  app.post("/api/v1/chat/completions", requireApiKey, handler);
  app.post("/v1/chat/completions", requireApiKey, handler);
  app.post("/api/chat/completions", requireApiKey, handler);
}

// ---------------------------------------------------------------------------
// Runner dispatch
//
// Centralizes the per-provider dispatch including translation of OpenAI-shape
// tool defs / tool_choice into Anthropic and Gemini native shapes when the
// caller asked for a model from a different family.
// ---------------------------------------------------------------------------

async function dispatchToRunner(args: {
  catalogId: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens: number;
  reasoningLevel?: "low" | "medium" | "high";
  ctx: StreamCtx;
  userOpenaiTools?: OpenAIToolDef[];
  userOpenaiToolChoice?: OpenAIToolChoice;
}): Promise<void> {
  const {
    catalogId,
    messages,
    temperature,
    maxTokens,
    reasoningLevel,
    ctx,
    userOpenaiTools,
    userOpenaiToolChoice,
  } = args;

  if (catalogId in openAIMap) {
    await runOpenAI({
      model: openAIMap[catalogId],
      messages,
      temperature,
      maxTokens,
      useTools: false,
      reasoningLevel,
      ctx,
      ...(userOpenaiTools
        ? { userTools: userOpenaiTools, userToolChoice: userOpenaiToolChoice }
        : {}),
    });
  } else if (catalogId in anthropicMap) {
    await runAnthropic({
      model: anthropicMap[catalogId],
      messages,
      temperature,
      maxTokens,
      useTools: false,
      ctx,
      ...(userOpenaiTools
        ? {
            userTools: openaiToAnthropicTools(userOpenaiTools),
            userToolChoice: openaiToAnthropicToolChoice(userOpenaiToolChoice),
          }
        : {}),
    });
  } else {
    await runGemini({
      model: geminiMap[catalogId],
      messages,
      temperature,
      maxTokens,
      useTools: false,
      ctx,
      ...(userOpenaiTools
        ? {
            userTools: openaiToGeminiTools(userOpenaiTools),
            userToolChoice: openaiToGeminiToolChoice(userOpenaiToolChoice),
          }
        : {}),
    });
  }
}
