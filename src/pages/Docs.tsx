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

  // Node.js quickstart
  const quickstartNode = "import OpenAI from 'openai';\n\nconst client = new OpenAI({\n  baseURL: '" + baseUrl + "/api',\n  apiKey: process.env.SWITCHBOARD_API_KEY,\n});\n\nasync function main() {\n  const completion = await client.chat.completions.create({\n    messages: [{ role: 'user', content: 'Hello, world!' }],\n    model: 'claude-sonnet-4.6',\n  });\n  console.log(completion.choices[0].message.content);\n}\n\nmain();";

  // Python quickstart
  const quickstartPython = "import os\nfrom openai import OpenAI\n\nclient = OpenAI(\n    base_url='" + baseUrl + "/api',\n    api_key=os.environ.get('SWITCHBOARD_API_KEY'),\n)\n\ncompletion = client.chat.completions.create(\n    messages=[{'role': 'user', 'content': 'Hello, world!'}],\n    model='claude-sonnet-4.6',\n)\n\nprint(completion.choices[0].message.content)";

  // cURL example
  const curlExample = "curl " + baseUrl + "/api/chat \\\n  -H 'Authorization: Bearer $SWITCHBOARD_API_KEY' \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"modelId\": \"claude-sonnet-4.6\", \"messages\": [{\"role\": \"user\", \"content\": \"Hello\"}]}'";

  // Streaming Node.js
  const streamingNode = "import OpenAI from 'openai';\n\nconst client = new OpenAI({\n  baseURL: '" + baseUrl + "/api',\n  apiKey: process.env.SWITCHBOARD_API_KEY,\n});\n\nconst stream = await client.chat.completions.create({\n  model: 'gpt-5.4',\n  messages: [{ role: 'user', content: 'Write a haiku about routing.' }],\n  stream: true,\n});\n\nfor await (const chunk of stream) {\n  const delta = chunk.choices[0]?.delta?.content;\n  if (delta) process.stdout.write(delta);\n}";

  // Streaming Python
  const streamingPython = "import os\nfrom openai import OpenAI\n\nclient = OpenAI(\n    base_url='" + baseUrl + "/api',\n    api_key=os.environ.get('SWITCHBOARD_API_KEY'),\n)\n\nstream = client.chat.completions.create(\n    model='gpt-5.4',\n    messages=[{'role': 'user', 'content': 'Write a haiku about routing.'}],\n    stream=True,\n)\n\nfor chunk in stream:\n    delta = chunk.choices[0].delta.content\n    if delta:\n        print(delta, end='', flush=True)";

  // SSE Response format
  const streamingSSE = "data: {\"delta\": \"Hello\"}\ndata: {\"delta\": \" world\"}\ndata: {\"done\": true, \"latencyMs\": 150, \"totalMs\": 320, \"inputTokens\": 12, \"outputTokens\": 8, \"cost\": 0.00023}";

  // Browser streaming
  const streamingFetch = "const response = await fetch('" + baseUrl + "/api/chat', {\n  method: 'POST',\n  headers: {\n    'Content-Type': 'application/json',\n    'Authorization': 'Bearer ' + apiKey,\n  },\n  body: JSON.stringify({\n    modelId: 'claude-sonnet-4.6',\n    messages: [{ role: 'user', content: 'Hello!' }],\n  }),\n});\n\nconst reader = response.body.getReader();\nconst decoder = new TextDecoder();\n\nwhile (true) {\n  const { done, value } = await reader.read();\n  if (done) break;\n  const text = decoder.decode(value);\n  const lines = text.split('\\n\\n');\n  for (const line of lines) {\n    if (!line.startsWith('data:')) continue;\n    const data = JSON.parse(line.slice(5));\n    if (data.delta) appendToUI(data.delta);\n    if (data.done) console.log('Total cost:', data.cost);\n    if (data.error) console.error('Error:', data.error);\n  }\n}";

  // Tool request example
  const toolsRequest = "{\n  'modelId': 'claude-sonnet-4.6',\n  'messages': [\n    { 'role': 'user', 'content': 'What is the weather in NYC?' }\n  ],\n  'tools': {\n    'webSearch': true\n  }\n}";

  // Tool response
  const toolsResponse = "data: {\"tool\":{\"phase\":\"start\",\"callId\":\"abc123\",\"name\":\"web_search\",\"args\":{\"query\":\"NYC weather\",\"num_results\":5}}}\ndata: {\"tool\":{\"phase\":\"end\",\"callId\":\"abc123\",\"results\":[{\"title\":\"NYC Weather\",\"url\":\"https://example.com/weather\",\"snippet\":\"Partly cloudy, 72F\"}]}}\ndata: {\"delta\":\"Based on recent search results, the weather in NYC is...\"}";

  // Image generation
  const imageRequest = "{\n  'prompt': 'A serene mountain landscape at sunset',\n  'size': '1024x1024',\n  'n': 1,\n  'model': 'gpt-image-1'\n}";

  // Image response
  const imageResponse = "{\n  'model': 'gpt-image-1',\n  'latencyMs': 1250,\n  'data': [\n    {\n      'b64_json': 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...',\n      'revised_prompt': 'A serene mountain landscape at sunset, rendered in...'\n    }\n  ]\n}";

  // Error response
  const errorResponse = "{\n  'error': {\n    'message': 'Model not found: invalid-model-id',\n    'type': 'invalid_request'\n  }\n}";

  // Insufficient credits error
  const creditsError = "{\n  'error': {\n    'message': 'Insufficient credits. Add more credits to continue using the API.',\n    'type': 'insufficient_credits',\n    'requiredCents': 5\n  }\n}";

  // Models list response
  const modelsResponse = "{\n  'object': 'list',\n  'providers': ['OpenAI', 'Anthropic', 'Google'],\n  'data': [\n    {\n      'id': 'claude-sonnet-4.6',\n      'object': 'model',\n      'name': 'Claude Sonnet 4.6',\n      'provider': 'Anthropic',\n      'context_window': 200000,\n      'modalities': ['text', 'vision'],\n      'pricing': {\n        'input_per_million': 3.00,\n        'output_per_million': 15.00,\n        'currency': 'USD'\n      },\n      'throughput_tokens_per_second': null,\n      'latency_ms': null,\n      'description': 'Balanced intelligence and speed...',\n      'id': 'claude-sonnet-4.6'\n    }\n  ]\n}";

  // Status response
  const statusResponse = "{\n  'status': 'operational',\n  'checkedAt': '2025-01-15T12:00:00.000Z',\n  'providers': [\n    { 'name': 'OpenAI', 'status': 'operational', 'latencyMs': 45 },\n    { 'name': 'Anthropic', 'status': 'operational', 'latencyMs': 120 },\n    { 'name': 'Google', 'status': 'degraded', 'latencyMs': 4500, 'error': 'High latency' }\n  ]\n}";

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
              <li><a href="#base-url" className="hover:text-foreground">Base URL</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-2">Endpoints</h4>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li><a href="#chat" className="hover:text-foreground">Chat Completions</a></li>
              <li><a href="#images" className="hover:text-foreground">Image Generation</a></li>
              <li><a href="#models" className="hover:text-foreground">List Models</a></li>
              <li><a href="#status" className="hover:text-foreground">Status</a></li>
              <li><a href="#credits" className="hover:text-foreground">Credits</a></li>
              <li><a href="#usage" className="hover:text-foreground">Usage</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-2">Features</h4>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li><a href="#streaming" className="hover:text-foreground">Streaming</a></li>
              <li><a href="#tools" className="hover:text-foreground">Web Search</a></li>
              <li><a href="#vision" className="hover:text-foreground">Vision</a></li>
              <li><a href="#reasoning" className="hover:text-foreground">Reasoning</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-2">Reference</h4>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li><a href="#errors" className="hover:text-foreground">Errors</a></li>
              <li><a href="#rate-limits" className="hover:text-foreground">Rate Limits</a></li>
              <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
              <li><a href="#model-ids" className="hover:text-foreground">Model IDs</a></li>
            </ul>
          </div>
        </nav>
      </aside>

      <div className="flex-1 max-w-3xl min-w-0">
        <div className="prose prose-invert max-w-none">
          <h1 id="quickstart" className="text-4xl font-bold tracking-tight mb-4">API Documentation</h1>
          <p className="text-xl text-muted-foreground font-mono text-sm leading-relaxed mb-12">
            Switchboard provides an OpenAI-compatible API to interact with every frontier model from OpenAI, Anthropic, and Google.
          </p>

          {/* Authentication Section */}
          <section id="auth" className="mb-16">
            <h2 className="text-2xl font-bold mb-4">Authentication</h2>
            <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
              Every Switchboard request must include a personal API key in the{' '}
              <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground mx-1">
                Authorization
              </code>{' '}
              header using Bearer token authentication.
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground mb-4">
              <li>
                Create a free account by signing in with Replit at <a href="/api/login" className="text-foreground underline">/api/login</a>.
              </li>
              <li>
                Open <Link to="/keys" className="text-foreground underline">the dashboard</Link> and click
                <span className="text-foreground"> Create Key</span>.
              </li>
              <li>
                Copy the secret <span className="text-foreground">once</span> — it begins with{' '}
                <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground ml-1">
                  sk-sb-v1-
                </code>{' '}
                — and store it as an environment variable.
              </li>
            </ol>
            <div className="rounded-lg border border-border overflow-hidden my-6">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
                <span className="text-xs font-mono text-muted-foreground">HTTP request</span>
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{`Authorization: Bearer sk-sb-v1-…`}</code>
              </pre>
            </div>
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-4">
              <p className="text-sm text-yellow-200">
                <strong>Important:</strong> Treat your key like a password. Rotate or revoke it any time from{' '}
                <Link to="/keys" className="underline">the dashboard</Link>. Revoked keys stop working immediately.
              </p>
            </div>
          </section>

          {/* Base URL Section */}
          <section id="base-url" className="mb-16">
            <h2 className="text-2xl font-bold mb-4">Base URL</h2>
            <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
              All API endpoints are relative to your deployment's origin. When using the SDK, set the base URL to:
            </p>
            <div className="rounded-lg border border-border overflow-hidden my-4">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
                <span className="text-xs font-mono text-muted-foreground">Base URL</span>
              </div>
              <pre className="p-4 text-sm font-mono text-foreground bg-card overflow-x-auto">
                <code>{baseUrl}/api</code>
              </pre>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              For example, when calling from a frontend on the same host, the chat endpoint would be{' '}
              <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground">{baseUrl}/api/chat</code>.
            </p>
          </section>

          {/* SDKs Section */}
          <section id="sdks" className="mb-16">
            <h2 className="text-2xl font-bold mb-4">Official SDKs</h2>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              Switchboard is fully compatible with the official OpenAI SDKs. Just change the base URL and use your Switchboard API key.
            </p>

            <h3 className="text-lg font-bold mb-3">Node.js / TypeScript</h3>
            <div className="rounded-lg border border-border overflow-hidden my-6">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
                <div className="flex gap-2">
                  <span className="text-xs font-mono px-2 py-1 rounded bg-background text-foreground shadow-sm">Node.js</span>
                </div>
                <CopyButton text={quickstartNode} />
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{quickstartNode}</code>
              </pre>
            </div>

            <h3 className="text-lg font-bold mb-3">Python</h3>
            <div className="rounded-lg border border-border overflow-hidden my-6">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
                <div className="flex gap-2">
                  <span className="text-xs font-mono px-2 py-1 rounded bg-background text-foreground shadow-sm">Python</span>
                </div>
                <CopyButton text={quickstartPython} />
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{quickstartPython}</code>
              </pre>
            </div>

            <h3 className="text-lg font-bold mb-3">cURL</h3>
            <div className="rounded-lg border border-border overflow-hidden my-6">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
                <div className="flex gap-2">
                  <span className="text-xs font-mono px-2 py-1 rounded bg-background text-foreground shadow-sm">cURL</span>
                </div>
                <CopyButton text={curlExample} />
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{curlExample}</code>
              </pre>
            </div>
          </section>

          {/* Chat Completions Section */}
          <section id="chat" className="mb-16">
            <h2 className="text-2xl font-bold mb-4">Chat Completions</h2>
            <div className="flex items-center gap-3 mb-6">
              <span className="px-2 py-1 bg-green-500/20 text-green-400 font-mono text-xs font-bold rounded">POST</span>
              <code className="text-sm font-mono text-muted-foreground">{baseUrl}/api/chat</code>
            </div>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              Creates a model response for the given chat conversation. Supports streaming, tool use, and vision.
            </p>

            <h3 className="text-lg font-bold mb-3">Request Body</h3>
            <div className="border border-border rounded-lg bg-card p-4 space-y-4 font-mono text-sm mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-foreground font-bold">modelId</span>
                  <span className="text-muted-foreground text-xs">string</span>
                  <span className="text-red-400 text-xs">Required</span>
                </div>
                <div className="text-muted-foreground text-xs mb-2">ID of the model to use. See the model catalog at GET /api/models for valid IDs.</div>
                <div className="text-xs text-muted-foreground">Example: <span className="text-foreground">"claude-sonnet-4.6"</span>, <span className="text-foreground">"gpt-5.4"</span>, <span className="text-foreground">"gemini-3-pro"</span></div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-foreground font-bold">messages</span>
                  <span className="text-muted-foreground text-xs">array</span>
                  <span className="text-red-400 text-xs">Required</span>
                </div>
                <div className="text-muted-foreground text-xs mb-2">A list of messages comprising the conversation so far.</div>
                <div className="text-xs text-muted-foreground">Each message has <span className="text-foreground">role</span> (user/assistant/system) and <span className="text-foreground">content</span>.</div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-foreground font-bold">temperature</span>
                  <span className="text-muted-foreground text-xs">number</span>
                  <span className="text-muted-foreground text-xs">Optional</span>
                </div>
                <div className="text-muted-foreground text-xs">What sampling temperature to use, between 0 and 2. Defaults to 0.7.</div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-foreground font-bold">maxTokens</span>
                  <span className="text-muted-foreground text-xs">number</span>
                  <span className="text-muted-foreground text-xs">Optional</span>
                </div>
                <div className="text-muted-foreground text-xs">Maximum number of tokens to generate. Defaults to 4096. Maximum is 8192.</div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-foreground font-bold">tools</span>
                  <span className="text-muted-foreground text-xs">object</span>
                  <span className="text-muted-foreground text-xs">Optional</span>
                </div>
                <div className="text-muted-foreground text-xs">Enable tool use. Currently supports <span className="text-foreground">webSearch: true</span> for web search capability.</div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-foreground font-bold">reasoningLevel</span>
                  <span className="text-muted-foreground text-xs">string</span>
                  <span className="text-muted-foreground text-xs">Optional</span>
                </div>
                <div className="text-muted-foreground text-xs">For reasoning models (o-series, GPT-5). Values: "low", "medium", "high".</div>
              </div>
            </div>

            <h3 className="text-lg font-bold mb-3">Example Request</h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2">
                <CopyButton text={'{"modelId":"claude-sonnet-4.6","messages":[{"role":"user","content":"Hello!"}]}'} />
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{`{\n  "modelId": "claude-sonnet-4.6",\n  "messages": [\n    { "role": "user", "content": "Hello!" }\n  ]\n}`}</code>
              </pre>
            </div>
          </section>

          {/* Streaming Section */}
          <section id="streaming" className="mb-16">
            <h2 className="text-2xl font-bold mb-4">Streaming Responses</h2>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              Pass <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground">stream: true</code> in the SDK or simply receive tokens as they're generated using Server-Sent Events (SSE). Streaming reduces time-to-first-token from seconds to milliseconds.
            </p>

            <h3 className="text-lg font-bold mb-3">Node.js Streaming</h3>
            <div className="rounded-lg border border-border overflow-hidden my-6">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
                <div className="flex gap-2">
                  <span className="text-xs font-mono px-2 py-1 rounded bg-background text-foreground shadow-sm">Node.js</span>
                </div>
                <CopyButton text={streamingNode} />
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{streamingNode}</code>
              </pre>
            </div>

            <h3 className="text-lg font-bold mb-3">Python Streaming</h3>
            <div className="rounded-lg border border-border overflow-hidden my-6">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
                <div className="flex gap-2">
                  <span className="text-xs font-mono px-2 py-1 rounded bg-background text-foreground shadow-sm">Python</span>
                </div>
                <CopyButton text={streamingPython} />
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{streamingPython}</code>
              </pre>
            </div>

            <h3 className="text-lg font-bold mb-3">Browser Streaming (Fetch + SSE)</h3>
            <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
              Stream directly from the browser using <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground">fetch</code> and a{' '}
              <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground">ReadableStream</code> reader.
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2">
                <CopyButton text={streamingFetch} />
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{streamingFetch}</code>
              </pre>
            </div>

            <h3 className="text-lg font-bold mt-8 mb-3">SSE Response Format</h3>
            <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
              The server streams events with the <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground">data:</code> prefix. Each event is a JSON object.
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2">
                <CopyButton text={streamingSSE} />
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{streamingSSE}</code>
              </pre>
            </div>

            <h3 className="text-lg font-bold mt-8 mb-3">Notes</h3>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
              <li>Set <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground">stream_options: {`{ include_usage: true }`}</code> to receive token counts in the final chunk.</li>
              <li>Reasoning models (GPT-5 series, o-series) emit a thinking pause before the first content delta. Latency-to-first-token can be 2-10 seconds.</li>
              <li>Disable proxy buffering with <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground">X-Accel-Buffering: no</code> if behind nginx.</li>
              <li>Streamed responses are billed identically to non-streamed ones — per input/output token at the model's listed rate.</li>
            </ul>
          </section>

          {/* Web Search Section */}
          <section id="tools" className="mb-16">
            <h2 className="text-2xl font-bold mb-4">Web Search</h2>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              Enable web search by passing <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground">{`{ tools: { webSearch: true } }`}</code>. The model will automatically search the web when it needs current information.
            </p>

            <h3 className="text-lg font-bold mb-3">Request Example</h3>
            <div className="rounded-lg border border-border overflow-hidden my-6">
              <div className="flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2">
                <CopyButton text={toolsRequest} />
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{toolsRequest}</code>
              </pre>
            </div>

            <h3 className="text-lg font-bold mb-3">Response (SSE)</h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2">
                <CopyButton text={toolsResponse} />
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{toolsResponse}</code>
              </pre>
            </div>

            <h3 className="text-lg font-bold mt-8 mb-3">Tool Events</h3>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
              <li><code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground">tool.phase: "start"</code> — Tool call begins with query</li>
              <li><code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground">tool.phase: "end"</code> — Tool call completes with results</li>
              <li><code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground">tool.phase: "error"</code> — Tool call failed</li>
            </ul>
          </section>

          {/* Vision Section */}
          <section id="vision" className="mb-16">
            <h2 className="text-2xl font-bold mb-4">Vision</h2>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              Vision-capable models can analyze images. Include an image in your message content using the OpenAI SDK format:
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2">
                <CopyButton text={'{"modelId":"claude-sonnet-4.6","messages":[{"role":"user","content":[{"type":"text","text":"What is in this image?"},{"type":"image_url","image_url":{"url":"https://example.com/image.jpg"}}]}]}'} />
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{`{\n  "modelId": "claude-sonnet-4.6",\n  "messages": [\n    {\n      "role": "user",\n      "content": [\n        { "type": "text", "text": "What is in this image?" },\n        { "type": "image_url", "image_url": { "url": "https://example.com/image.jpg" } }\n      ]\n    }\n  ]\n}`}</code>
              </pre>
            </div>
            <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
              Vision models: <span className="text-foreground">claude-sonnet-4.6</span>, <span className="text-foreground">claude-opus-4.7</span>, <span className="text-foreground">gpt-5.4</span>, <span className="text-foreground">gemini-3-pro</span>.
            </p>
          </section>

          {/* Reasoning Section */}
          <section id="reasoning" className="mb-16">
            <h2 className="text-2xl font-bold mb-4">Reasoning Models</h2>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              Reasoning models (o-series, GPT-5 series) can think through complex problems. Control reasoning effort with the <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground">reasoningLevel</code> parameter:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5 mb-6">
              <li><code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground">"low"</code> — Faster, less reasoning</li>
              <li><code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground">"medium"</code> — Balanced (default)</li>
              <li><code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground">"high"</code> — More thorough reasoning, higher latency</li>
            </ul>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2">
                <CopyButton text={'{"modelId":"o3","messages":[{"role":"user","content":"Prove P=NP or show why it is hard"}],"reasoningLevel":"high"}'} />
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{`{\n  "modelId": "o3",\n  "messages": [\n    { "role": "user", "content": "Prove P=NP or show why it is hard" }\n  ],\n  "reasoningLevel": "high"\n}`}</code>
              </pre>
            </div>
          </section>

          {/* Image Generation Section */}
          <section id="images" className="mb-16">
            <h2 className="text-2xl font-bold mb-4">Image Generation</h2>
            <div className="flex items-center gap-3 mb-6">
              <span className="px-2 py-1 bg-green-500/20 text-green-400 font-mono text-xs font-bold rounded">POST</span>
              <code className="text-sm font-mono text-muted-foreground">{baseUrl}/api/images</code>
            </div>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              Generate images using AI. Supports <span className="text-foreground">gpt-image-1</span> (OpenAI) and <span className="text-foreground">gemini-2.5-flash-image</span> (Google).
            </p>

            <h3 className="text-lg font-bold mb-3">Request Body</h3>
            <div className="border border-border rounded-lg bg-card p-4 space-y-4 font-mono text-sm mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-foreground font-bold">prompt</span>
                  <span className="text-muted-foreground text-xs">string</span>
                  <span className="text-red-400 text-xs">Required</span>
                </div>
                <div className="text-muted-foreground text-xs">A text description of the desired image. Max 4000 characters.</div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-foreground font-bold">size</span>
                  <span className="text-muted-foreground text-xs">string</span>
                  <span className="text-muted-foreground text-xs">Optional</span>
                </div>
                <div className="text-muted-foreground text-xs">Size of the generated images. Options: "1024x1024", "1024x1536", "1536x1024", "auto". Defaults to "1024x1024".</div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-foreground font-bold">n</span>
                  <span className="text-muted-foreground text-xs">number</span>
                  <span className="text-muted-foreground text-xs">Optional</span>
                </div>
                <div className="text-muted-foreground text-xs">Number of images to generate. Must be between 1 and 4. Defaults to 1.</div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-foreground font-bold">model</span>
                  <span className="text-muted-foreground text-xs">string</span>
                  <span className="text-muted-foreground text-xs">Optional</span>
                </div>
                <div className="text-muted-foreground text-xs">Image generation model. Options: "gpt-image-1", "gemini-2.5-flash-image". Defaults to "gpt-image-1".</div>
              </div>
            </div>

            <h3 className="text-lg font-bold mb-3">Request Example</h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2">
                <CopyButton text={imageRequest} />
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{imageRequest}</code>
              </pre>
            </div>

            <h3 className="text-lg font-bold mt-8 mb-3">Response</h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2">
                <CopyButton text={imageResponse} />
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{imageResponse}</code>
              </pre>
            </div>
          </section>

          {/* List Models Section */}
          <section id="models" className="mb-16">
            <h2 className="text-2xl font-bold mb-4">List Models</h2>
            <div className="flex items-center gap-3 mb-6">
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 font-mono text-xs font-bold rounded">GET</span>
              <code className="text-sm font-mono text-muted-foreground">{baseUrl}/api/models</code>
            </div>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              Returns a list of all available models with their pricing and capabilities.
            </p>

            <h3 className="text-lg font-bold mb-3">Query Parameters</h3>
            <div className="border border-border rounded-lg bg-card p-4 space-y-4 font-mono text-sm mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-foreground font-bold">provider</span>
                  <span className="text-muted-foreground text-xs">string</span>
                  <span className="text-muted-foreground text-xs">Optional</span>
                </div>
                <div className="text-muted-foreground text-xs">Filter by provider: "OpenAI", "Anthropic", "Google".</div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-foreground font-bold">modality</span>
                  <span className="text-muted-foreground text-xs">string</span>
                  <span className="text-muted-foreground text-xs">Optional</span>
                </div>
                <div className="text-muted-foreground text-xs">Filter by modality: "text", "image".</div>
              </div>
            </div>

            <h3 className="text-lg font-bold mb-3">Response Example</h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2">
                <CopyButton text={modelsResponse} />
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{modelsResponse}</code>
              </pre>
            </div>
          </section>

          {/* Status Section */}
          <section id="status" className="mb-16">
            <h2 className="text-2xl font-bold mb-4">Status</h2>
            <div className="flex items-center gap-3 mb-6">
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 font-mono text-xs font-bold rounded">GET</span>
              <code className="text-sm font-mono text-muted-foreground">{baseUrl}/api/status</code>
            </div>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              Check the health status of all AI providers. Results are cached for 30 seconds.
            </p>

            <h3 className="text-lg font-bold mb-3">Response</h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2">
                <CopyButton text={statusResponse} />
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{statusResponse}</code>
              </pre>
            </div>

            <h3 className="text-lg font-bold mt-8 mb-3">Provider Status Values</h3>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
              <li><code className="font-mono text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">operational</code> - Provider is healthy with normal latency</li>
              <li><code className="font-mono text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">degraded</code> - Provider is available but slow (&gt;3s latency)</li>
              <li><code className="font-mono text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">down</code> - Provider is not responding</li>
            </ul>
          </section>

          {/* Credits Section */}
          <section id="credits" className="mb-16">
            <h2 className="text-2xl font-bold mb-4">Credits</h2>
            <div className="flex items-center gap-3 mb-6">
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 font-mono text-xs font-bold rounded">GET</span>
              <code className="text-sm font-mono text-muted-foreground">{baseUrl}/api/credits</code>
              <span className="text-xs text-muted-foreground">Requires Session Auth</span>
            </div>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              Returns your current credit balance and grant history. Requires session authentication (cookie-based), not API key.
            </p>

            <h3 className="text-lg font-bold mb-3">Response</h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2">
                <CopyButton text={'{"balanceCents":500,"balanceUsd":5.00,"welcomeGrantedAt":"2025-01-01T00:00:00Z","grants":[]}'} />
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{`{\n  "balanceCents": 500,\n  "balanceUsd": 5.00,\n  "welcomeGrantedAt": "2025-01-01T00:00:00Z",\n  "legacyGrantedAt": "2025-01-10T00:00:00Z",\n  "grants": [\n    {\n      "id": "grant_123",\n      "amountCents": 1000,\n      "amountUsd": 10.00,\n      "reason": "purchase",\n      "description": "Added $10 credit",\n      "createdAt": "2025-01-15T12:00:00Z"\n    }\n  ]\n}`}</code>
              </pre>
            </div>
          </section>

          {/* Usage Section */}
          <section id="usage" className="mb-16">
            <h2 className="text-2xl font-bold mb-4">Usage Analytics</h2>
            <div className="flex items-center gap-3 mb-6">
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 font-mono text-xs font-bold rounded">GET</span>
              <code className="text-sm font-mono text-muted-foreground">{baseUrl}/api/usage</code>
              <span className="text-xs text-muted-foreground">Requires Session Auth</span>
            </div>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              Returns your usage statistics and cost breakdown. Requires session authentication.
            </p>

            <h3 className="text-lg font-bold mb-3">Query Parameters</h3>
            <div className="border border-border rounded-lg bg-card p-4 space-y-4 font-mono text-sm mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-foreground font-bold">days</span>
                  <span className="text-muted-foreground text-xs">number</span>
                  <span className="text-muted-foreground text-xs">Optional</span>
                </div>
                <div className="text-muted-foreground text-xs">Number of days to include in the report. Defaults to 30. Max 90.</div>
              </div>
            </div>
          </section>

          {/* Errors Section */}
          <section id="errors" className="mb-16">
            <h2 className="text-2xl font-bold mb-4">Error Handling</h2>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              All errors return a JSON object with an <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground">error</code> field containing the message and type.
            </p>

            <h3 className="text-lg font-bold mb-3">Error Response Format</h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2">
                <CopyButton text={errorResponse} />
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{errorResponse}</code>
              </pre>
            </div>

            <h3 className="text-lg font-bold mt-8 mb-3">HTTP Status Codes</h3>
            <div className="border border-border rounded-lg bg-card p-4 font-mono text-sm mb-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-green-400 font-bold">200</span>
                  <span className="text-muted-foreground ml-2">Success</span>
                </div>
                <div>
                  <span className="text-yellow-400 font-bold">400</span>
                  <span className="text-muted-foreground ml-2">Bad Request</span>
                </div>
                <div>
                  <span className="text-red-400 font-bold">401</span>
                  <span className="text-muted-foreground ml-2">Unauthorized</span>
                </div>
                <div>
                  <span className="text-red-400 font-bold">402</span>
                  <span className="text-muted-foreground ml-2">Payment Required</span>
                </div>
                <div>
                  <span className="text-yellow-400 font-bold">404</span>
                  <span className="text-muted-foreground ml-2">Not Found</span>
                </div>
                <div>
                  <span className="text-yellow-400 font-bold">429</span>
                  <span className="text-muted-foreground ml-2">Rate Limited</span>
                </div>
                <div>
                  <span className="text-red-400 font-bold">500</span>
                  <span className="text-muted-foreground ml-2">Server Error</span>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-bold mb-3">Insufficient Credits (402)</h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2">
                <CopyButton text={creditsError} />
              </div>
              <pre className="p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto">
                <code>{creditsError}</code>
              </pre>
            </div>
          </section>

          {/* Rate Limits Section */}
          <section id="rate-limits" className="mb-16">
            <h2 className="text-2xl font-bold mb-4">Rate Limits</h2>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              Rate limits protect the API from abuse and ensure fair access for all users.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5 mb-6">
              <li><strong>Concurrent requests:</strong> Limited based on your credit balance</li>
              <li><strong>Requests per minute:</strong> Varies by model and provider</li>
              <li><strong>Max tokens per request:</strong> 8192 output tokens maximum</li>
              <li><strong>Max messages per request:</strong> 200 messages maximum</li>
              <li><strong>Max image prompt:</strong> 4000 characters</li>
              <li><strong>Images per request:</strong> 1-4 images</li>
            </ul>
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-200">
                <strong>Tip:</strong> If you hit rate limits, consider implementing exponential backoff with jitter in your client code.
              </p>
            </div>
          </section>

          {/* Pricing Section */}
          <section id="pricing" className="mb-16">
            <h2 className="text-2xl font-bold mb-4">Pricing</h2>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              Switchboard charges based on token usage at the model's listed price per million tokens.
            </p>

            <h3 className="text-lg font-bold mb-3">How Billing Works</h3>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground mb-6">
              <li>Credits are reserved before each request based on worst-case cost</li>
              <li>Actual usage is calculated after the request completes</li>
              <li>Unspent credits are refunded immediately</li>
              <li>All usage is recorded in your credit grant history</li>
            </ol>

            <h3 className="text-lg font-bold mb-3">Popular Models</h3>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left p-3 font-mono">Model</th>
                    <th className="text-left p-3 font-mono">Input</th>
                    <th className="text-left p-3 font-mono">Output</th>
                    <th className="text-left p-3 font-mono">Context</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  <tr className="border-t border-border">
                    <td className="p-3">claude-sonnet-4.6</td>
                    <td className="p-3 text-green-400">$3.00/M</td>
                    <td className="p-3 text-blue-400">$15.00/M</td>
                    <td className="p-3">200K</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3">claude-opus-4.7</td>
                    <td className="p-3 text-green-400">$15.00/M</td>
                    <td className="p-3 text-blue-400">$75.00/M</td>
                    <td className="p-3">200K</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3">gpt-5.4</td>
                    <td className="p-3 text-green-400">$2.50/M</td>
                    <td className="p-3 text-blue-400">$10.00/M</td>
                    <td className="p-3">128K</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3">gemini-3-pro</td>
                    <td className="p-3 text-green-400">$1.25/M</td>
                    <td className="p-3 text-blue-400">$5.00/M</td>
                    <td className="p-3">1M</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3">gemini-3-flash</td>
                    <td className="p-3 text-green-400">$0.15/M</td>
                    <td className="p-3 text-blue-400">$0.60/M</td>
                    <td className="p-3">1M</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-bold mt-8 mb-3">Image Generation</h3>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5 mb-6">
              <li><strong>gpt-image-1:</strong> $0.04 per 1024x1024 image</li>
              <li><strong>gemini-2.5-flash-image:</strong> $0.039 per image</li>
            </ul>

            <p className="text-muted-foreground text-sm leading-relaxed">
              Full pricing is available via the <a href="#models" className="text-foreground underline">GET /api/models</a> endpoint.
            </p>
          </section>

          {/* Model IDs Section */}
          <section id="model-ids" className="mb-16">
            <h2 className="text-2xl font-bold mb-4">Model ID Reference</h2>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              Use these IDs when specifying the model in your API requests. Full list with descriptions available at{' '}
              <a href="#models" className="text-foreground underline">GET /api/models</a>.
            </p>

            <h3 className="text-lg font-bold mb-3">Anthropic</h3>
            <div className="rounded-lg border border-border overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left p-3 font-mono">ID</th>
                    <th className="text-left p-3 font-mono">Context</th>
                    <th className="text-left p-3">Modalities</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  <tr className="border-t border-border">
                    <td className="p-3">claude-opus-4.7</td>
                    <td className="p-3">200K</td>
                    <td className="p-3 text-muted-foreground">text, vision</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3">claude-sonnet-4.6</td>
                    <td className="p-3">200K</td>
                    <td className="p-3 text-muted-foreground">text, vision</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3">claude-haiku-4.5</td>
                    <td className="p-3">200K</td>
                    <td className="p-3 text-muted-foreground">text</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-bold mb-3">OpenAI</h3>
            <div className="rounded-lg border border-border overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left p-3 font-mono">ID</th>
                    <th className="text-left p-3 font-mono">Context</th>
                    <th className="text-left p-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  <tr className="border-t border-border">
                    <td className="p-3">gpt-5.5</td>
                    <td className="p-3">128K</td>
                    <td className="p-3 text-muted-foreground">Latest flagship</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3">gpt-5.4</td>
                    <td className="p-3">128K</td>
                    <td className="p-3 text-muted-foreground">Balanced</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3">o3</td>
                    <td className="p-3">200K</td>
                    <td className="p-3 text-muted-foreground">Reasoning</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3">o4-mini</td>
                    <td className="p-3">100K</td>
                    <td className="p-3 text-muted-foreground">Fast reasoning</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-bold mb-3">Google</h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left p-3 font-mono">ID</th>
                    <th className="text-left p-3 font-mono">Context</th>
                    <th className="text-left p-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  <tr className="border-t border-border">
                    <td className="p-3">gemini-3-pro</td>
                    <td className="p-3">1M</td>
                    <td className="p-3 text-muted-foreground">Flagship</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3">gemini-3-flash</td>
                    <td className="p-3">1M</td>
                    <td className="p-3 text-muted-foreground">Fast, affordable</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3">gemini-2.5-pro</td>
                    <td className="p-3">1M</td>
                    <td className="p-3 text-muted-foreground">Previous generation</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
