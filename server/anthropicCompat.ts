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
} from "./chat";

// ---------------------------------------------------------------------------
// Anthropic-compatible request/response types (subset we accept)
// ---------------------------------------------------------------------------

type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicContentBlock = AnthropicTextBlock | { type: string; [k: string]: unknown };

interface AnthropicMessageIn {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

type AnthropicSystem = string | AnthropicContentBlock[];

interface AnthropicMessagesBody {
  model?: string;
  messages?: AnthropicMessageIn[];
  system?: AnthropicSystem;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

// ---------------------------------------------------------------------------
// Model id resolution
//
// Anthropic SDKs send their canonical dashed names (e.g. "claude-opus-4-7").
// Our catalog stores the dotted variants ("claude-opus-4.7"). We accept either
// form so out-of-the-box clients work, while still allowing routing to
// non-Anthropic catalog models (e.g. "gpt-5.4") via this same endpoint.
// ---------------------------------------------------------------------------

function resolveCatalogId(modelParam: string): string | null {
  if (catalog.find((m) => m.id === modelParam)) return modelParam;
  // Try dashed -> dotted (Anthropic native naming): claude-opus-4-7 -> claude-opus-4.7
  const dotted = modelParam.replace(
    /^(claude-[a-z]+-)(\d+)-(\d+)(.*)$/,
    "$1$2.$3$4",
  );
  if (catalog.find((m) => m.id === dotted)) return dotted;
  // Try undated Anthropic snapshot strings (e.g. "claude-sonnet-4-5-20250929")
  // by stripping a trailing -YYYYMMDD before the dash->dot rewrite.
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

function flattenContent(content: string | AnthropicContentBlock[]): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((b) => {
      if (b && typeof b === "object" && b.type === "text" && typeof (b as AnthropicTextBlock).text === "string") {
        return (b as AnthropicTextBlock).text;
      }
      // Silently drop non-text blocks (images, tool_use, etc) — vision and
      // tool passthrough aren't supported through the compat surface yet.
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function flattenSystem(system: AnthropicSystem | undefined): string {
  if (!system) return "";
  if (typeof system === "string") return system;
  return flattenContent(system);
}

function newMessageId(): string {
  return `msg_${randomBytes(12).toString("base64url")}`;
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

    // Resolve catalog id (accept both dashed Anthropic native names and any
    // catalog id, so users can route to OpenAI/Gemini models too).
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

    // Translate Anthropic-shape input into the runner's flat ChatMessage[].
    const sysText = flattenSystem(body.system);
    const messages: ChatMessage[] = [];
    if (sysText) messages.push({ role: "system", content: sysText });
    for (const m of body.messages) {
      if (!m || (m.role !== "user" && m.role !== "assistant")) continue;
      const text = flattenContent(m.content);
      messages.push({ role: m.role, content: text });
    }

    const userId = req.auth!.user.id;
    const apiKeyId = req.auth!.apiKeyId ?? null;

    // Worst-case credit reservation (mirror /api/chat).
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
      sendEvent("content_block_start", {
        type: "content_block_start",
        index: 0,
        content_block: { type: "text", text: "" },
      });

      const ctx: StreamCtx = {
        onText(delta) {
          if (!delta) return;
          if (!firstTokenMs) firstTokenMs = Date.now() - startTime;
          outputText += delta;
          sendEvent("content_block_delta", {
            type: "content_block_delta",
            index: 0,
            delta: { type: "text_delta", text: delta },
          });
        },
        // Tool callbacks are unused by the compat path (we don't enable tools
        // here), but the interface requires them — just no-op.
        onToolStart() {},
        onToolEnd() {},
        onToolError() {},
        onRoundComplete(inT, outT) {
          totalInputTokens += inT;
          totalOutputTokens += outT;
        },
      };

      let success = false;
      let errorMessage = "";
      let stopReason: "end_turn" | "max_tokens" | "error" = "end_turn";
      try {
        if (catalogId in openAIMap) {
          await runOpenAI({
            model: openAIMap[catalogId],
            messages,
            temperature: body.temperature,
            maxTokens: effectiveMaxTokens,
            useTools: false,
            ctx,
          });
        } else if (catalogId in anthropicMap) {
          await runAnthropic({
            model: anthropicMap[catalogId],
            messages,
            temperature: body.temperature,
            maxTokens: effectiveMaxTokens,
            useTools: false,
            ctx,
          });
        } else {
          await runGemini({
            model: geminiMap[catalogId],
            messages,
            temperature: body.temperature,
            maxTokens: effectiveMaxTokens,
            useTools: false,
            ctx,
          });
        }
        success = true;
        // Approx — we can't always get true finish reason from runners.
        if (totalOutputTokens >= effectiveMaxTokens) stopReason = "max_tokens";
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

      // Close the content block, then emit message_delta + message_stop.
      sendEvent("content_block_stop", {
        type: "content_block_stop",
        index: 0,
      });
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

    // ----- Non-streaming path: collect full text, return Anthropic message -----
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
    };

    let success = false;
    let errorMessage = "";
    try {
      if (catalogId in openAIMap) {
        await runOpenAI({
          model: openAIMap[catalogId],
          messages,
          temperature: body.temperature,
          maxTokens: effectiveMaxTokens,
          useTools: false,
          ctx,
        });
      } else if (catalogId in anthropicMap) {
        await runAnthropic({
          model: anthropicMap[catalogId],
          messages,
          temperature: body.temperature,
          maxTokens: effectiveMaxTokens,
          useTools: false,
          ctx,
        });
      } else {
        await runGemini({
          model: geminiMap[catalogId],
          messages,
          temperature: body.temperature,
          maxTokens: effectiveMaxTokens,
          useTools: false,
          ctx,
        });
      }
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

    const stopReason: "end_turn" | "max_tokens" =
      totalOutputTokens >= effectiveMaxTokens ? "max_tokens" : "end_turn";

    return res.json({
      id: messageId,
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: outputText }],
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
