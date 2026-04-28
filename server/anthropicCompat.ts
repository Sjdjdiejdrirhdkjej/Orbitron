import type { Express, Request, Response } from "express";
import { randomBytes } from "node:crypto";
import { models as catalog } from "../src/data/models";
import { requireApiKeyAnthropic } from "./auth";
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
  anthropicCompatMessagesToChat,
  anthropicToOpenaiTools,
  anthropicToGeminiTools,
  anthropicToOpenaiToolChoice,
  anthropicToGeminiToolChoice,
  type AnthropicCompatMessage,
  type AnthropicCompatSystem,
  type AnthropicToolDef,
  type AnthropicToolChoice,
} from "./compatTools";

// ---------------------------------------------------------------------------
// Anthropic-compatible request types (subset we accept)
// ---------------------------------------------------------------------------

interface AnthropicMessagesBody {
  model?: string;
  messages?: AnthropicCompatMessage[];
  system?: AnthropicCompatSystem;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: AnthropicToolDef[];
  tool_choice?: AnthropicToolChoice;
}

// ---------------------------------------------------------------------------
// Model id resolution (accept dashed Anthropic native names plus catalog ids)
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

function newMessageId(): string {
  return `msg_${randomBytes(12).toString("base64url")}`;
}

interface AssembledToolCall {
  id: string;
  name: string;
  arguments: string;
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export function registerAnthropicCompatRoutes(app: Express): void {
  const handler = async (req: Request, res: Response) => {
    const body = (req.body || {}) as AnthropicMessagesBody;

    if (!body.model || typeof body.model !== "string") {
      return res.status(400).json({
        type: "error",
        error: { type: "invalid_request_error", message: "'model' is required" },
      });
    }
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return res.status(400).json({
        type: "error",
        error: {
          type: "invalid_request_error",
          message: "'messages' must be a non-empty array",
        },
      });
    }
    if (body.messages.length > MAX_MESSAGES_PER_REQUEST) {
      return res.status(400).json({
        type: "error",
        error: {
          type: "invalid_request_error",
          message: `Too many messages (max ${MAX_MESSAGES_PER_REQUEST}).`,
        },
      });
    }
    if (typeof body.max_tokens !== "number" || body.max_tokens <= 0) {
      return res.status(400).json({
        type: "error",
        error: {
          type: "invalid_request_error",
          message: "'max_tokens' is required and must be a positive number",
        },
      });
    }

    const catalogId = resolveCatalogId(body.model);
    if (!catalogId) {
      return res.status(400).json({
        type: "error",
        error: {
          type: "invalid_request_error",
          message: `Unsupported model: ${body.model}`,
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
        type: "error",
        error: {
          type: "invalid_request_error",
          message: `Unsupported model: ${body.model}`,
        },
      });
    }

    // Cap output tokens BEFORE pricing.
    const effectiveMaxTokens = Math.max(
      1,
      Math.min(Math.floor(body.max_tokens), MAX_OUTPUT_TOKENS_HARD_CAP),
    );

    // Translate Anthropic-shape input (with tool_use / tool_result blocks)
    // into the runner's flat ChatMessage[].
    const messages: ChatMessage[] = anthropicCompatMessagesToChat(
      body.system,
      body.messages,
    );
    if (messages.length === 0) {
      return res.status(400).json({
        type: "error",
        error: {
          type: "invalid_request_error",
          message: "'messages' had no usable content",
        },
      });
    }

    // Validate tools.
    const userAnthropicTools: AnthropicToolDef[] | undefined =
      Array.isArray(body.tools) && body.tools.length > 0 ? body.tools : undefined;
    const userAnthropicToolChoice = body.tool_choice;
    if (userAnthropicTools) {
      for (const t of userAnthropicTools) {
        if (!t || !t.name) {
          return res.status(400).json({
            type: "error",
            error: {
              type: "invalid_request_error",
              message: "Each tool must include a 'name'",
            },
          });
        }
      }
    }

    const userId = req.auth!.user.id;
    const apiKeyId = req.auth!.apiKeyId ?? null;

    // Worst-case credit reservation (single round, mirrors openai-compat).
    const inputTokensEstimate = approxTokens(
      messages.map((m) => m.content ?? "").join("\n"),
    );
    const worstCaseCostUsd =
      (inputTokensEstimate / 1_000_000) * catalogEntry.inputPrice +
      (effectiveMaxTokens / 1_000_000) * catalogEntry.outputPrice;
    const reservationCents = Math.max(1, Math.ceil(worstCaseCostUsd * 100));
    const reserved = await reserveCredits(userId, reservationCents);
    if (reserved === null) {
      return res.status(402).json({
        type: "error",
        error: {
          type: "billing_error",
          message:
            "Insufficient credits. Add more credits to continue using the API.",
        },
      });
    }

    const wantStream = body.stream === true;
    const messageId = newMessageId();
    const startTime = Date.now();
    let firstTokenMs = 0;
    let outputText = "";
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Tool-call accumulator drives both the streaming SSE blocks and the
    // final non-streaming `content` array.
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

    // ----- Streaming path: Anthropic SSE event format -----
    if (wantStream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      const sendEvent = (event: string, data: Record<string, unknown>) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      // message_start: send before the first content block.
      sendEvent("message_start", {
        type: "message_start",
        message: {
          id: messageId,
          type: "message",
          role: "assistant",
          content: [],
          model: body.model,
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: inputTokensEstimate, output_tokens: 0 },
        },
      });

      // We allocate Anthropic content_block indices on the fly:
      //   - The first text delta opens block 0 (type:text).
      //   - Each new tool-call slot gets the next index, AFTER closing any
      //     currently open text block.
      //   - If text starts again later, a new text block is opened.
      // This matches Anthropic's wire format exactly so SDKs can iterate.
      let nextBlockIndex = 0;
      let openTextBlockIndex: number | null = null;
      const slotToBlockIndex = new Map<number, number>();
      const openBlockIndices = new Set<number>();

      const closeBlock = (idx: number) => {
        sendEvent("content_block_stop", {
          type: "content_block_stop",
          index: idx,
        });
        openBlockIndices.delete(idx);
      };
      const closeOpenTextBlock = () => {
        if (openTextBlockIndex !== null) {
          closeBlock(openTextBlockIndex);
          openTextBlockIndex = null;
        }
      };

      const ctx: StreamCtx = {
        onText(delta) {
          if (!delta) return;
          if (!firstTokenMs) firstTokenMs = Date.now() - startTime;
          outputText += delta;
          if (openTextBlockIndex === null) {
            openTextBlockIndex = nextBlockIndex++;
            openBlockIndices.add(openTextBlockIndex);
            sendEvent("content_block_start", {
              type: "content_block_start",
              index: openTextBlockIndex,
              content_block: { type: "text", text: "" },
            });
          }
          sendEvent("content_block_delta", {
            type: "content_block_delta",
            index: openTextBlockIndex,
            delta: { type: "text_delta", text: delta },
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

          let blockIdx = slotToBlockIndex.get(chunk.index);
          if (blockIdx === undefined) {
            // First chunk for this slot: close any open text block, then open
            // a new tool_use content block at the next index.
            closeOpenTextBlock();
            blockIdx = nextBlockIndex++;
            slotToBlockIndex.set(chunk.index, blockIdx);
            openBlockIndices.add(blockIdx);
            sendEvent("content_block_start", {
              type: "content_block_start",
              index: blockIdx,
              content_block: {
                type: "tool_use",
                id: chunk.id ?? toolCallsByIndex[chunk.index]?.id ?? "",
                name: chunk.name ?? toolCallsByIndex[chunk.index]?.name ?? "",
                input: {},
              },
            });
          }
          if (chunk.argsDelta) {
            sendEvent("content_block_delta", {
              type: "content_block_delta",
              index: blockIdx,
              delta: {
                type: "input_json_delta",
                partial_json: chunk.argsDelta,
              },
            });
          }
        },
      };

      let success = false;
      let errorMessage = "";
      let stopReason: "end_turn" | "max_tokens" | "tool_use" | "error" = "end_turn";
      try {
        await dispatchToRunner({
          catalogId,
          messages,
          temperature: body.temperature,
          maxTokens: effectiveMaxTokens,
          ctx,
          userAnthropicTools,
          userAnthropicToolChoice,
        });
        success = true;
        if (sawAnyToolCall) stopReason = "tool_use";
        else if (totalOutputTokens >= effectiveMaxTokens) stopReason = "max_tokens";
      } catch (err) {
        errorMessage = err instanceof Error ? err.message : "Request failed";
        stopReason = "error";
        console.error("Anthropic-compat error:", err);
      }

      // Settle credit reservation.
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
          `${catalogId} (anthropic-compat) — ${totalInputTokens} in / ${totalOutputTokens} out`,
        );
      }

      // Close every block that's still open (text or tool_use) before the
      // terminating message_delta / message_stop. SDKs reject streams that
      // end with an unclosed content_block.
      for (const idx of Array.from(openBlockIndices).sort((a, b) => a - b)) {
        sendEvent("content_block_stop", {
          type: "content_block_stop",
          index: idx,
        });
      }
      openBlockIndices.clear();

      if (!success) {
        sendEvent("error", {
          type: "error",
          error: { type: "api_error", message: errorMessage },
        });
      }
      sendEvent("message_delta", {
        type: "message_delta",
        delta: { stop_reason: stopReason, stop_sequence: null },
        usage: { output_tokens: totalOutputTokens },
      });
      sendEvent("message_stop", { type: "message_stop" });
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
        ctx,
        userAnthropicTools,
        userAnthropicToolChoice,
      });
      success = true;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Request failed";
      console.error("Anthropic-compat error:", err);
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
        `${catalogId} (anthropic-compat) — ${totalInputTokens} in / ${totalOutputTokens} out`,
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
        type: "error",
        error: { type: "api_error", message: errorMessage },
      });
    }

    // Build the content array. Order: text first, then tool_use blocks.
    // The Anthropic native ordering can interleave them, but for the
    // collected non-streaming response that order is lost — text-first is
    // the convention SDKs handle correctly.
    const content: any[] = [];
    if (outputText) content.push({ type: "text", text: outputText });
    if (sawAnyToolCall) {
      for (const t of toolCallsByIndex) {
        if (!t || !t.name) continue;
        let parsedInput: any = {};
        try {
          parsedInput = t.arguments ? JSON.parse(t.arguments) : {};
        } catch {
          parsedInput = {};
        }
        content.push({
          type: "tool_use",
          id: t.id,
          name: t.name,
          input: parsedInput,
        });
      }
    }

    const stopReason: "end_turn" | "max_tokens" | "tool_use" = sawAnyToolCall
      ? "tool_use"
      : totalOutputTokens >= effectiveMaxTokens
        ? "max_tokens"
        : "end_turn";

    return res.json({
      id: messageId,
      type: "message",
      role: "assistant",
      content: content.length > 0 ? content : [{ type: "text", text: "" }],
      model: body.model,
      stop_reason: stopReason,
      stop_sequence: null,
      usage: {
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
      },
    });
  };

  // Mount under both /api/v1/messages (so SDKs configured with
  // baseURL=https://orbitron.../api just work) and the bare /v1/messages
  // (so SDKs that hit the host root work too).
  app.post("/api/v1/messages", requireApiKeyAnthropic, handler);
  app.post("/v1/messages", requireApiKeyAnthropic, handler);
}

// ---------------------------------------------------------------------------
// Runner dispatch with cross-family translation
// ---------------------------------------------------------------------------

async function dispatchToRunner(args: {
  catalogId: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens: number;
  ctx: StreamCtx;
  userAnthropicTools?: AnthropicToolDef[];
  userAnthropicToolChoice?: AnthropicToolChoice;
}): Promise<void> {
  const {
    catalogId,
    messages,
    temperature,
    maxTokens,
    ctx,
    userAnthropicTools,
    userAnthropicToolChoice,
  } = args;

  if (catalogId in anthropicMap) {
    await runAnthropic({
      model: anthropicMap[catalogId],
      messages,
      temperature,
      maxTokens,
      useTools: false,
      ctx,
      ...(userAnthropicTools
        ? {
            userTools: userAnthropicTools,
            userToolChoice: userAnthropicToolChoice,
          }
        : {}),
    });
  } else if (catalogId in openAIMap) {
    await runOpenAI({
      model: openAIMap[catalogId],
      messages,
      temperature,
      maxTokens,
      useTools: false,
      ctx,
      ...(userAnthropicTools
        ? {
            userTools: anthropicToOpenaiTools(userAnthropicTools),
            userToolChoice: anthropicToOpenaiToolChoice(userAnthropicToolChoice),
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
      ...(userAnthropicTools
        ? {
            userTools: anthropicToGeminiTools(userAnthropicTools),
            userToolChoice: anthropicToGeminiToolChoice(userAnthropicToolChoice),
          }
        : {}),
    });
  }
}
