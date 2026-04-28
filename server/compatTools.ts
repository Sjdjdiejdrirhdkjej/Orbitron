/**
 * Translation helpers between the three providers' tool/function-calling
 * formats (OpenAI, Anthropic, Gemini) plus the message-shape converters used
 * by the compat endpoints to feed the chat runners.
 *
 * Tool DEFINITION shapes:
 *   OpenAI    : { type: "function", function: { name, description, parameters } }
 *   Anthropic : { name, description, input_schema }
 *   Gemini    : { functionDeclarations: [ { name, description, parameters } ] }
 *
 * Tool CHOICE shapes:
 *   OpenAI    : "none" | "auto" | "required" | { type: "function", function: { name } }
 *   Anthropic : { type: "auto" | "any" | "tool" | "none", name? }
 *   Gemini    : { functionCallingConfig: { mode: "AUTO"|"ANY"|"NONE", allowedFunctionNames?: [] } }
 *
 * The runner's flat `ChatMessage[]` shape (defined in chat.ts) is OpenAI-
 * flavored: it carries `tool_calls` on assistant turns and `tool_call_id` on
 * `role:"tool"` turns. Each runner takes care of translating that shape into
 * its own provider's native message format internally.
 */

import type { ChatMessage, ToolCallSpec } from "./chat";

// ---------------------------------------------------------------------------
// Tool DEFINITION translators
// ---------------------------------------------------------------------------

interface OpenAIToolDef {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

interface AnthropicToolDef {
  name: string;
  description?: string;
  input_schema?: Record<string, unknown>;
}

interface GeminiToolDef {
  functionDeclarations: Array<{
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  }>;
}

/** OpenAI function tools → Anthropic tools (1:1 per tool). */
export function openaiToAnthropicTools(tools: OpenAIToolDef[]): AnthropicToolDef[] {
  return (tools || [])
    .filter((t) => t && t.type === "function" && t.function?.name)
    .map((t) => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters ?? { type: "object", properties: {} },
    }));
}

/** OpenAI function tools → Gemini tools (wrapped into one declarations array). */
export function openaiToGeminiTools(tools: OpenAIToolDef[]): GeminiToolDef[] {
  const decls = (tools || [])
    .filter((t) => t && t.type === "function" && t.function?.name)
    .map((t) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters ?? { type: "object", properties: {} },
    }));
  return decls.length > 0 ? [{ functionDeclarations: decls }] : [];
}

/** Anthropic tools → OpenAI function tools. */
export function anthropicToOpenaiTools(tools: AnthropicToolDef[]): OpenAIToolDef[] {
  return (tools || [])
    .filter((t) => t && t.name)
    .map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema ?? { type: "object", properties: {} },
      },
    }));
}

/** Anthropic tools → Gemini tools. */
export function anthropicToGeminiTools(tools: AnthropicToolDef[]): GeminiToolDef[] {
  const decls = (tools || [])
    .filter((t) => t && t.name)
    .map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.input_schema ?? { type: "object", properties: {} },
    }));
  return decls.length > 0 ? [{ functionDeclarations: decls }] : [];
}

// ---------------------------------------------------------------------------
// Tool CHOICE translators
// ---------------------------------------------------------------------------

type OpenAIToolChoice =
  | "none"
  | "auto"
  | "required"
  | { type: "function"; function: { name: string } };

type AnthropicToolChoice = {
  type: "auto" | "any" | "tool" | "none";
  name?: string;
};

type GeminiToolConfig = {
  functionCallingConfig: {
    mode: "AUTO" | "ANY" | "NONE";
    allowedFunctionNames?: string[];
  };
};

export function openaiToAnthropicToolChoice(
  choice: OpenAIToolChoice | undefined,
): AnthropicToolChoice | undefined {
  if (choice == null) return undefined;
  if (choice === "none") return { type: "none" };
  if (choice === "auto") return { type: "auto" };
  if (choice === "required") return { type: "any" };
  if (typeof choice === "object" && choice.type === "function" && choice.function?.name) {
    return { type: "tool", name: choice.function.name };
  }
  return undefined;
}

export function openaiToGeminiToolChoice(
  choice: OpenAIToolChoice | undefined,
): GeminiToolConfig | undefined {
  if (choice == null) return undefined;
  if (choice === "none") return { functionCallingConfig: { mode: "NONE" } };
  if (choice === "auto") return { functionCallingConfig: { mode: "AUTO" } };
  if (choice === "required") return { functionCallingConfig: { mode: "ANY" } };
  if (typeof choice === "object" && choice.type === "function" && choice.function?.name) {
    return {
      functionCallingConfig: {
        mode: "ANY",
        allowedFunctionNames: [choice.function.name],
      },
    };
  }
  return undefined;
}

export function anthropicToOpenaiToolChoice(
  choice: AnthropicToolChoice | undefined,
): OpenAIToolChoice | undefined {
  if (!choice || typeof choice !== "object") return undefined;
  if (choice.type === "none") return "none";
  if (choice.type === "auto") return "auto";
  if (choice.type === "any") return "required";
  if (choice.type === "tool" && choice.name) {
    return { type: "function", function: { name: choice.name } };
  }
  return undefined;
}

export function anthropicToGeminiToolChoice(
  choice: AnthropicToolChoice | undefined,
): GeminiToolConfig | undefined {
  if (!choice || typeof choice !== "object") return undefined;
  if (choice.type === "none") return { functionCallingConfig: { mode: "NONE" } };
  if (choice.type === "auto") return { functionCallingConfig: { mode: "AUTO" } };
  if (choice.type === "any") return { functionCallingConfig: { mode: "ANY" } };
  if (choice.type === "tool" && choice.name) {
    return {
      functionCallingConfig: {
        mode: "ANY",
        allowedFunctionNames: [choice.name],
      },
    };
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// MESSAGE translators (compat input → runner ChatMessage[])
// ---------------------------------------------------------------------------

/**
 * OpenAI request messages — already very close to our `ChatMessage[]` shape.
 * We flatten any array-shaped `content` (vision parts) into plain text and
 * preserve `tool_calls` (assistant) + `tool_call_id` (tool role).
 */
export interface OpenAICompatMessage {
  role: "system" | "user" | "assistant" | "tool" | "developer";
  content?: string | Array<any> | null;
  tool_calls?: Array<{
    id: string;
    type?: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

function flattenOpenAIContent(
  content: string | Array<any> | null | undefined,
): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((p) => {
      if (typeof p === "string") return p;
      if (p && typeof p === "object") {
        if (p.type === "text" && typeof p.text === "string") return p.text;
        // Drop image_url and other non-text parts silently — vision is not
        // supported through the compat surface.
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

/** Convert OpenAI-shape compat messages into the runner's ChatMessage[]. */
export function openaiCompatMessagesToChat(
  messages: OpenAICompatMessage[],
): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const m of messages) {
    if (!m || !m.role) continue;
    // OpenAI now uses "developer" as the higher-priority system equivalent;
    // collapse it into our "system" role.
    const role: ChatMessage["role"] =
      m.role === "developer" ? "system" : (m.role as ChatMessage["role"]);
    const text = flattenOpenAIContent(m.content);
    const msg: ChatMessage = { role, content: text };
    if (role === "assistant" && m.tool_calls && m.tool_calls.length > 0) {
      msg.tool_calls = m.tool_calls
        .filter((tc) => tc && tc.function?.name)
        .map<ToolCallSpec>((tc) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: tc.function.arguments ?? "",
        }));
    }
    if (role === "tool" && m.tool_call_id) {
      msg.tool_call_id = m.tool_call_id;
    }
    out.push(msg);
  }
  return out;
}

// ---------------------------------------------------------------------------

export interface AnthropicCompatMessage {
  role: "user" | "assistant";
  content: string | Array<any>;
}

export type AnthropicCompatSystem = string | Array<any>;

function flattenAnthropicTextContent(content: string | Array<any>): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((b) => {
      if (b && typeof b === "object" && b.type === "text" && typeof b.text === "string") {
        return b.text;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

/**
 * Convert Anthropic-shape compat messages (plus the separate system) into the
 * runner's `ChatMessage[]`. Tool blocks become OpenAI-style: assistant
 * `tool_use` blocks turn into `tool_calls`; user `tool_result` blocks turn
 * into separate `role:"tool"` messages with `tool_call_id`.
 */
export function anthropicCompatMessagesToChat(
  system: AnthropicCompatSystem | undefined,
  messages: AnthropicCompatMessage[],
): ChatMessage[] {
  const out: ChatMessage[] = [];
  const sysText =
    system == null
      ? ""
      : typeof system === "string"
        ? system
        : flattenAnthropicTextContent(system);
  if (sysText) out.push({ role: "system", content: sysText });

  for (const m of messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) continue;
    const blocks = Array.isArray(m.content)
      ? m.content
      : [{ type: "text", text: m.content }];

    if (m.role === "assistant") {
      let text = "";
      const toolCalls: ToolCallSpec[] = [];
      for (const b of blocks) {
        if (!b || typeof b !== "object") continue;
        if (b.type === "text" && typeof b.text === "string") {
          text += (text ? "\n" : "") + b.text;
        } else if (b.type === "tool_use") {
          toolCalls.push({
            id: b.id ?? "",
            name: b.name ?? "",
            arguments:
              b.input == null
                ? "{}"
                : typeof b.input === "string"
                  ? b.input
                  : JSON.stringify(b.input),
          });
        }
        // Drop other block types (thinking, etc.) silently.
      }
      const msg: ChatMessage = { role: "assistant", content: text };
      if (toolCalls.length > 0) msg.tool_calls = toolCalls;
      out.push(msg);
      continue;
    }

    // role === "user": split into a plain user text message AND one tool
    // message per tool_result block. Order them so tool_result messages
    // immediately follow whatever assistant turn produced them (the
    // assistant turn is already in `out` by this point).
    let userText = "";
    const toolResults: Array<{ id: string; text: string }> = [];
    for (const b of blocks) {
      if (!b || typeof b !== "object") continue;
      if (b.type === "text" && typeof b.text === "string") {
        userText += (userText ? "\n" : "") + b.text;
      } else if (b.type === "tool_result") {
        const id = b.tool_use_id ?? "";
        const c = b.content;
        let text = "";
        if (typeof c === "string") {
          text = c;
        } else if (Array.isArray(c)) {
          text = flattenAnthropicTextContent(c);
        }
        toolResults.push({ id, text });
      }
      // Drop image and other block types silently.
    }
    // Tool results FIRST (they answer the previous assistant tool_use turn),
    // then any new user text.
    for (const r of toolResults) {
      out.push({ role: "tool", content: r.text, tool_call_id: r.id });
    }
    if (userText) out.push({ role: "user", content: userText });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Re-exported types so compat endpoints can type their request bodies
// ---------------------------------------------------------------------------

export type { OpenAIToolDef, AnthropicToolDef, GeminiToolDef };
export type {
  OpenAIToolChoice,
  AnthropicToolChoice,
  GeminiToolConfig,
};
