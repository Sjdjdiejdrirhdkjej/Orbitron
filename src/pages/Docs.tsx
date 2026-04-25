import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CopyButton } from "../components/CopyButton";

export default function Docs() {
  const [baseUrl, setBaseUrl] = useState("https://your-deployment.replit.app");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const quickstartCode = `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${baseUrl}/api", // Note the base URL
  apiKey: process.env.SWITCHBOARD_API_KEY,
});

async function main() {
  const completion = await client.chat.completions.create({
    messages: [{ role: "user", content: "Say this is a test" }],
    model: "claude-sonnet-4.6", // Catalog id from /api/models
  });

  console.log(completion.choices[0].message.content);
}

main();`;

  const responseJson = `{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "anthropic/claude-sonnet-4.5",
  "system_fingerprint": "fp_44709d6fcb",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "This is a test."
    },
    "logprobs": null,
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 9,
    "completion_tokens": 12,
    "total_tokens": 21
  }
}`;

  const streamingNodeCode = `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${baseUrl}/api",
  apiKey: process.env.SWITCHBOARD_API_KEY,
});

const stream = await client.chat.completions.create({
  model: "gpt-5.4",
  messages: [{ role: "user", content: "Write a haiku about routing." }],
  stream: true,
});

for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content;
  if (delta) process.stdout.write(delta);
}`;

  const streamingSse = `data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","model":"openai/gpt-5.4","choices":[{"index":0,"delta":{"role":"assistant","content":"Switch"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","model":"openai/gpt-5.4","choices":[{"index":0,"delta":{"content":"board"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","model":"openai/gpt-5.4","choices":[{"index":0,"delta":{"content":" routes"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":12,"completion_tokens":48,"total_tokens":60}}

data: [DONE]`;

  const streamingFetch = `const res = await fetch("${baseUrl}/api/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: \`Bearer \${SWITCHBOARD_API_KEY}\`,
  },
  body: JSON.stringify({
    modelId: "claude-sonnet-4.6",
    messages,
    stream: true,
  }),
});

const reader = res.body!.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const events = buffer.split("\\n\\n");
  buffer = events.pop() ?? "";
  for (const evt of events) {
    const line = evt.trim();
    if (!line.startsWith("data:")) continue;
    const json = line.slice(5).trim();
    if (json === "[DONE]") return;
    const { choices } = JSON.parse(json);
    const delta = choices[0]?.delta?.content;
    if (delta) appendToUI(delta);
  }
}`;

  return (
    <div className="container mx-auto px-4 flex items-start gap-12 py-12 animate-fade-in relative">
      <aside className="w-64 shrink-0 hidden lg:block sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto pr-4">
        <nav className="space-y-6">
          <div>
            <h4 className="font-bold text-sm mb-2">Getting Started</h4>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li><a href="#quickstart" className="hover:text-foreground text-primary font-medium">Quickstart</a></li>
              <li><a href="#auth" className="hover:text-foreground">Authentication</a></li>
              <li><a href="#sdks" className="hover:text-foreground">SDKs</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-2">Endpoints</h4>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li><a href="#chat" className="hover:text-foreground">Chat Completions</a></li>
              <li><a href="#embeddings" className="hover:text-foreground">Embeddings</a></li>
              <li><a href="#models" className="hover:text-foreground">List Models</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-2">Guides</h4>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li><a href="#streaming" className="hover:text-foreground">Streaming Responses</a></li>
              <li><a href="#tools" className="hover:text-foreground">Function Calling</a></li>
              <li><a href="#vision" className="hover:text-foreground">Vision</a></li>
              <li><a href="#errors" className="hover:text-foreground">Errors & Rate Limits</a></li>
            </ul>
          </div>
        </nav>
      </aside>

      <div className="flex-1 max-w-3xl min-w-0">
        <div className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Documentation</h1>
          <p className="text-xl text-muted-foreground font-mono text-sm leading-relaxed mb-12">
            Switchboard provides an OpenAI-compatible API to interact with every frontier model from OpenAI, Anthropic, and Google.
          </p>

          <section id="quickstart" className="mb-16">
            <h2 className="text-2xl font-bold mb-4">Quickstart</h2>
            <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
              If you're already using the OpenAI SDK, migrating to Switchboard takes two lines of code: change the base URL and use your Switchboard API key.
            </p>
            
            <div className="rounded-lg border border-border overflow-hidden my-6">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
                <div className="flex gap-2">
                  <span className="text-xs font-mono px-2 py-1 rounded bg-background text-foreground shadow-sm">Node.js</span>
                  <span className="text-xs font-mono px-2 py-1 rounded text-muted-foreground">Python</span>
                </div>
                <CopyButton text={quickstartCode} />
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{quickstartCode}</code>
              </pre>
            </div>
          </section>

          <section id="chat" className="mb-16">
            <h2 className="text-2xl font-bold mb-4">Create chat completion</h2>
            <div className="flex items-center gap-3 mb-6">
              <span className="px-2 py-1 bg-green-500/20 text-green-400 font-mono text-xs font-bold rounded">POST</span>
              <code className="text-sm font-mono text-muted-foreground">{baseUrl}/api/chat</code>
            </div>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              Creates a model response for the given chat conversation.
            </p>

            <h3 className="text-lg font-bold mb-3">Request Body</h3>
            <div className="border border-border rounded-lg bg-card p-4 space-y-4 font-mono text-sm mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-foreground font-bold">model</span>
                  <span className="text-muted-foreground text-xs">string</span>
                  <span className="text-red-400 text-xs">Required</span>
                </div>
                <div className="text-muted-foreground text-xs">ID of the model to use. See the model catalog for valid IDs.</div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-foreground font-bold">messages</span>
                  <span className="text-muted-foreground text-xs">array</span>
                  <span className="text-red-400 text-xs">Required</span>
                </div>
                <div className="text-muted-foreground text-xs">A list of messages comprising the conversation so far.</div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-foreground font-bold">temperature</span>
                  <span className="text-muted-foreground text-xs">number</span>
                  <span className="text-muted-foreground text-xs">Optional</span>
                </div>
                <div className="text-muted-foreground text-xs">What sampling temperature to use, between 0 and 2. Defaults to 1.</div>
              </div>
            </div>

            <h3 className="text-lg font-bold mb-3">Response</h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2">
                <CopyButton text={responseJson} />
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{responseJson}</code>
              </pre>
            </div>
          </section>

          <section id="streaming" className="mb-16">
            <h2 className="text-2xl font-bold mb-4">Streaming Responses</h2>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              Pass <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground">stream: true</code> to receive
              tokens as they're generated using Server-Sent Events. Streaming reduces time-to-first-token from seconds to
              milliseconds and is the recommended pattern for chat UIs. Works identically across every model in the catalog —
              Switchboard normalizes provider-specific protocols into a single OpenAI-compatible SSE format.
            </p>

            <h3 className="text-lg font-bold mb-3">Request</h3>
            <div className="rounded-lg border border-border overflow-hidden my-6">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
                <div className="flex gap-2">
                  <span className="text-xs font-mono px-2 py-1 rounded bg-background text-foreground shadow-sm">Node.js</span>
                  <span className="text-xs font-mono px-2 py-1 rounded text-muted-foreground">Python</span>
                  <span className="text-xs font-mono px-2 py-1 rounded text-muted-foreground">cURL</span>
                </div>
                <CopyButton text={streamingNodeCode} />
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{streamingNodeCode}</code>
              </pre>
            </div>

            <h3 className="text-lg font-bold mb-3">Response Format</h3>
            <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
              The server streams a sequence of <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground">data:</code> events.
              Each event is a JSON object with one or more chunks of generated content. The final event is the literal string
              <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground ml-1">[DONE]</code>.
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2">
                <CopyButton text={streamingSse} />
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{streamingSse}</code>
              </pre>
            </div>

            <h3 className="text-lg font-bold mt-8 mb-3">Browser (Fetch + SSE)</h3>
            <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
              Stream directly from the browser using <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground">fetch</code> and a
              <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground ml-1">ReadableStream</code> reader. Recommended for
              chat UIs that render tokens as they arrive.
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2">
                <CopyButton text={streamingFetch} />
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{streamingFetch}</code>
              </pre>
            </div>

            <h3 className="text-lg font-bold mt-8 mb-3">Notes</h3>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
              <li>Set <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground">stream_options: {`{ include_usage: true }`}</code> to receive token counts in the final chunk.</li>
              <li>Reasoning models (GPT-5 series, o-series) emit a "thinking" pause before the first content delta. Latency-to-first-token can be 2–10s.</li>
              <li>Disable proxy buffering with <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground">X-Accel-Buffering: no</code> if you're behind nginx.</li>
              <li>Streamed responses are billed identically to non-streamed ones — per input/output token at the model's listed rate.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}