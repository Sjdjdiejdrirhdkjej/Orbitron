import React from "react";
import { Link } from "react-router-dom";
import { Copy } from "lucide-react";

export default function Docs() {
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
            Switchboard provides an OpenAI-compatible API to interact with hundreds of frontier models.
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
                <button className="text-muted-foreground hover:text-foreground"><Copy className="w-4 h-4" /></button>
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{`import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.switchboard.dev/v1", // Note the base URL
  apiKey: process.env.SWITCHBOARD_API_KEY,
});

async function main() {
  const completion = await client.chat.completions.create({
    messages: [{ role: "user", content: "Say this is a test" }],
    model: "anthropic/claude-4.5-sonnet", // Use the provider/model format
  });

  console.log(completion.choices[0].message.content);
}

main();`}</code>
              </pre>
            </div>
          </section>

          <section id="chat" className="mb-16">
            <h2 className="text-2xl font-bold mb-4">Create chat completion</h2>
            <div className="flex items-center gap-3 mb-6">
              <span className="px-2 py-1 bg-green-500/20 text-green-400 font-mono text-xs font-bold rounded">POST</span>
              <code className="text-sm font-mono text-muted-foreground">/v1/chat/completions</code>
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
               <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>
{`{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "anthropic/claude-4.5-sonnet",
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
}`}
                </code>
              </pre>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}