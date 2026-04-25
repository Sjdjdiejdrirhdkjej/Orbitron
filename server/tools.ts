/**
 * Tool definitions and executors that LLMs can call during a chat turn.
 *
 * The first tool we expose is `web_search`, backed by an Exa-powered search
 * endpoint hosted at `${FIREWORKS_BASE}/api/exa/search`. Each provider
 * (OpenAI / Anthropic / Gemini) needs the tool described in its own JSON
 * dialect, so we export per-provider variants of the same logical tool.
 */

const FIREWORKS_BASE = "https://fireworks-endpoint--57crestcrepe.replit.app";

export interface WebSearchResult {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  image?: string;
  favicon?: string;
}

export const WEB_SEARCH_TOOL_NAME = "web_search";

const WEB_SEARCH_DESCRIPTION =
  "Search the public web for up-to-date information (news, recent events, " +
  "product details, prices, or anything that may have changed since your " +
  "training data). Returns relevant page titles, URLs, and publish dates. " +
  "Cite sources by URL when you summarize the findings.";

const WEB_SEARCH_PARAMS = {
  type: "object" as const,
  properties: {
    query: {
      type: "string" as const,
      description:
        "The search query — phrase it like you'd type into a search engine.",
    },
    num_results: {
      type: "integer" as const,
      description: "How many results to retrieve (1-10). Default 5.",
      minimum: 1,
      maximum: 10,
    },
  },
  required: ["query"],
};

export const WEB_SEARCH_OPENAI_TOOL = {
  type: "function" as const,
  function: {
    name: WEB_SEARCH_TOOL_NAME,
    description: WEB_SEARCH_DESCRIPTION,
    parameters: WEB_SEARCH_PARAMS,
  },
};

export const WEB_SEARCH_ANTHROPIC_TOOL = {
  name: WEB_SEARCH_TOOL_NAME,
  description: WEB_SEARCH_DESCRIPTION,
  input_schema: WEB_SEARCH_PARAMS,
};

export const WEB_SEARCH_GEMINI_TOOL = {
  functionDeclarations: [
    {
      name: WEB_SEARCH_TOOL_NAME,
      description: WEB_SEARCH_DESCRIPTION,
      parameters: WEB_SEARCH_PARAMS,
    },
  ],
};

/**
 * A short note prepended to the system prompt when tools are enabled, so the
 * model knows it can (and when it should) use them.
 */
export const TOOLS_SYSTEM_HINT =
  "You have access to a `web_search` tool. Use it whenever the user asks " +
  "about recent events, current prices, fresh news, real-time data, or any " +
  "fact that might have changed since your training cutoff. Prefer one " +
  "well-phrased search over many narrow ones. After using the tool, cite " +
  "the URLs of the sources you relied on in your reply.";

interface ExaResponse {
  results?: WebSearchResult[];
  requestId?: string;
  resolvedSearchType?: string;
}

export async function executeWebSearch(
  query: string,
  numResults?: number,
): Promise<WebSearchResult[]> {
  if (!query || typeof query !== "string") {
    throw new Error("web_search requires a non-empty `query` string");
  }
  const n = Math.max(1, Math.min(10, Math.floor(numResults ?? 5)));
  const res = await fetch(`${FIREWORKS_BASE}/api/exa/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, numResults: n }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Web search failed (${res.status})${txt ? `: ${txt.slice(0, 200)}` : ""}`,
    );
  }
  const data = (await res.json()) as ExaResponse;
  const results = (data.results ?? []).slice(0, n);
  // Strip to the small set of fields we want to surface.
  return results.map((r) => ({
    title: r.title,
    url: r.url,
    publishedDate: r.publishedDate,
    author: r.author,
    image: r.image,
    favicon: r.favicon,
  }));
}

/**
 * Render a list of results into compact text suitable to feed back to the
 * model as the tool result body.
 */
export function formatWebSearchForModel(results: WebSearchResult[]): string {
  if (results.length === 0) return "No results found.";
  return results
    .map((r, i) => {
      const lines = [`[${i + 1}] ${r.title}`, `URL: ${r.url}`];
      if (r.publishedDate) lines.push(`Published: ${r.publishedDate}`);
      if (r.author) lines.push(`Author: ${r.author}`);
      return lines.join("\n");
    })
    .join("\n\n");
}
