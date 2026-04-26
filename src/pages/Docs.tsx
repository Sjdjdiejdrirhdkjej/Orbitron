import React, { useEffect, useState } from \"react\";
import { Link } from \"react-router-dom\";
import { CopyButton } from \"../components/CopyButton\";

// ============================================================================
// TYPES
// ============================================================================

interface EndpointDoc {
  method: string;
  path: string;
  auth: string;
  description: string;
}

interface Example {
  title: string;
  language: string;
  code: string;
}

// ============================================================================
// CONTENT
// ============================================================================

const endpoints: EndpointDoc[] = [
  { method: \"POST\", path: \"/api/chat\", auth: \"API Key\", description: \"Create a chat completion with streaming support\" },
  { method: \"POST\", path: \"/api/images\", auth: \"API Key\", description: \"Generate images using AI models\" },
  { method: \"GET\", path: \"/api/models\", auth: \"None\", description: \"List all available models with pricing\" },
  { method: \"GET\", path: \"/api/models/:id\", auth: \"None\", description: \"Get details for a specific model\" },
  { method: \"GET\", path: \"/api/status\", auth: \"None\", description: \"Check provider health and latency\" },
  { method: \"GET\", path: \"/api/usage\", auth: \"Session\", description: \"View your usage analytics and costs\" },
  { method: \"GET\", path: \"/api/credits\", auth: \"Session\", description: \"Check your credit balance and history\" },
  { method: \"POST\", path: \"/api/share\", auth: \"Session\", description: \"Share a conversation publicly\" },
  { method: \"GET\", path: \"/api/share/:slug\", auth: \"None\", description: \"View a shared conversation\" },
  { method: \"GET\", path: \"/api/keys\", auth: \"Session\", description: \"List your API keys\" },
  { method: \"POST\", path: \"/api/keys\", auth: \"Session\", description: \"Create a new API key\" },
  { method: \"DELETE\", path: \"/api/keys/:id\", auth: \"Session\", description: \"Revoke an API key\" },
  { method: \"GET\", path: \"/api/keys/:id/usage\", auth: \"Session\", description: \"Get usage stats for a specific key\" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function Docs() {
  const [baseUrl, setBaseUrl] = useState(\"https://your-deployment.replit.app\");

  useEffect(() => {
    if (typeof window !== \"undefined\") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  // --------------------------------------------------------------------------
  // CODE EXAMPLES
  // --------------------------------------------------------------------------

  const quickstartNode = `import OpenAI from \"openai\";

const client = new OpenAI({
  baseURL: \"${baseUrl}/api\",
  apiKey: process.env.SWITCHBOARD_API_KEY,
});

async function main() {
  const completion = await client.chat.completions.create({
    messages: [{ role: \"user\", content: \"Hello, world!\" }],
    model: \"claude-sonnet-4.6\",
  });

  console.log(completion.choices[0].message.content);
}

main();`;

  const quickstartPython = `from openai import OpenAI

client = OpenAI(
    base_url=\"${baseUrl}/api\",
    api_key=os.environ.get(\"SWITCHBOARD_API_KEY\"),
)

completion = client.chat.completions.create(
    messages=[{\"role\": \"user\", \"content\": \"Hello, world!\"}],
    model=\"claude-sonnet-4.6\",
)

print(completion.choices[0].message.content)`;

  const quickstartCurl = `curl ${baseUrl}/api/chat \\
  -H \"Authorization: Bearer $SWITCHBOARD_API_KEY\" \\
  -H \"Content-Type: application/json\" \\
  -d '{
    \"modelId\": \"claude-sonnet-4.6\",
    \"messages\": [{\"role\": \"user\", \"content\": \"Hello, world!\"}]
  }'`;

  const streamingNode = `import OpenAI from \"openai\";

const client = new OpenAI({
  baseURL: \"${baseUrl}/api\",
  apiKey: process.env.SWITCHBOARD_API_KEY,
});

const stream = await client.chat.completions.create({
  model: \"gpt-5.4\",
  messages: [{ role: \"user\", content: \"Write a haiku about routing.\" }],
  stream: true,
});

for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content;
  if (delta) process.stdout.write(delta);
}`;

  const streamingPython = `from openai import OpenAI

client = OpenAI(
    base_url=\"${baseUrl}/api\",
    api_key=os.environ.get(\"SWITCHBOARD_API_KEY\"),
)

stream = client.chat.completions.create(
    model=\"gpt-5.4\",
    messages=[{\"role\": \"user\", \"content\": \"Write a haiku about routing.\"}],
    stream=True,
)

for chunk in stream:
    delta = chunk.choices[0].delta.content
    if delta:
        print(delta, end=\"\", flush=True)`;

  const streamingSSE = `data: {\"delta\":\"Hello\"}
data: {\"delta\":\" world\"}
data: {\"done\":true,\"latencyMs\":150,\"totalMs\":320,\"inputTokens\":12,\"outputTokens\":8,\"cost\":0.00023}`;

  const streamingFetch = `const response = await fetch(\"${baseUrl}/api/chat\", {
  method: \"POST\",
  headers: {
    \"Content-Type\": \"application/json\",
    \"Authorization\": \\`Bearer \\${process.env.SWITCHBOARD_API_KEY}\\\\`,
  },
  body: JSON.stringify({
    modelId: \"claude-sonnet-4.6\",
    messages: [{ role: \"user\", content: \"Hello!\" }],
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value);
  const lines = text.split(\"\\n\\n\");

  for (const line of lines) {
    if (!line.startsWith(\"data:\")) continue;
    const data = JSON.parse(line.slice(5));

    if (data.delta) appendToUI(data.delta);
    if (data.done) console.log(\"Total cost:\", data.cost);
    if (data.error) console.error(\"Error:\", data.error);
  }
}`;

  const toolsSystemPrompt = `You have access to a web_search tool. Use it whenever the user asks about recent events, current prices, fresh news, or any fact that might have changed since your training cutoff. Prefer one well-phrased search over many narrow ones. After using the tool, cite the URLs of the sources you relied on.`;

  const toolsRequest = `{
  \"modelId\": \"claude-sonnet-4.6\",
  \"messages\": [
    { \"role\": \"user\", \"content\": \"What's the latest news about AI regulations?\" }
  ],
  \"tools\": {
    \"webSearch\": true
  }
}`;

  const toolsResponse = `data: {\"tool\":{\"phase\":\"start\",\"callId\":\"abc123\",\"name\":\"web_search\",\"args\":{\"query\":\"AI regulations 2025 news\",\"num_results\":5}}}
data: {\"tool\":{\"phase\":\"end\",\"callId\":\"abc123\",\"results\":[{\"title\":\"EU AI Act Implementation\",\"url\":\"https://example.com/eu-ai-act\",\"publishedDate\":\"2025-01-15\"},{\"title\":\"US AI Policy Update\",\"url\":\"https://example.com/us-ai-policy\",\"publishedDate\":\"2025-01-14\"}]}}
data: {\"delta\":\"Based on recent search results, the EU AI Act...\"}`;

  const imageRequest = `{
  \"prompt\": \"A futuristic city skyline at sunset with flying vehicles\",
  \"size\": \"1024x1024\",
  \"n\": 2,
  \"model\": \"gpt-image-1\"
}`;

  const imageResponse = `{
  \"model\": \"gpt-image-1\",
  \"latencyMs\": 4500,
  \"data\": [
    {
      \"b64_json\": \"iVBORw0KGgoAAAANSUhEUgAA...\",
      \"revised_prompt\": \"A futuristic city skyline at sunset with flying vehicles, cinematic lighting\"
    },
    {
      \"b64_json\": \"iVBORw0KGgoAAAANSUhEUgAA...\",
      \"revised_prompt\": \"Futuristic cityscape at dusk with aerial traffic\"
    }
  ]
}`;

  const multiMessage = `{
  \"modelId\": \"claude-opus-4.7\",
  \"messages\": [
    { \"role\": \"system\", \"content\": \"You are a helpful coding assistant.\" },
    { \"role\": \"user\", \"content\": \"Explain what a binary search tree is.\" },
    { \"role\": \"assistant\", \"content\": \"A binary search tree (BST) is a data structure...\" },
    { \"role\": \"user\", \"content\": \"Show me an implementation in Python.\" }
  ],
  \"temperature\": 0.7,
  \"maxTokens\": 2000
}`;

  const conversationRequest = `{
  \"title\": \"Binary Search Tree Discussion\",
  \"modelId\": \"claude-opus-4.7\",
  \"messages\": [
    { \"role\": \"user\", \"content\": \"Explain what a binary search tree is.\" },
    { \"role\": \"assistant\", \"content\": \"A binary search tree (BST) is...\" },
    { \"role\": \"user\", \"content\": \"Show me an implementation.\" }
  ]
}`;

  const conversationResponse = `{
  \"slug\": \"a1b2c3d4e5f6\",
  \"url\": \"/share/a1b2c3d4e5f6\"
}`;

  const modelsResponse = `{
  \"object\": \"list\",
  \"providers\": [\"OpenAI\", \"Anthropic\", \"Google\"],
  \"data\": [
    {
      \"id\": \"claude-sonnet-4.6\",
      \"object\": \"model\",
      \"name\": \"Claude Sonnet 4.6\",
      \"provider\": \"Anthropic\",
      \"context_window\": 200000,
      \"modalities\": [\"text\", \"vision\", \"tools\"],
      \"pricing\": {
        \"input_per_million\": 3.0,
        \"output_per_million\": 15.0,
        \"currency\": \"USD\"
      },
      \"throughput_tokens_per_second\": 120,
      \"latency_ms\": 260,
      \"measured_sample_size\": 1523,
      \"description\": \"Latest Sonnet generation — balanced intelligence and speed.\"
    }
  ]
}`;

  const statusResponse = `{
  \"status\": \"operational\",
  \"checkedAt\": \"2025-01-20T10:30:00.000Z\",
  \"providers\": [
    { \"name\": \"OpenAI\", \"status\": \"operational\", \"latencyMs\": 145 },
    { \"name\": \"Anthropic\", \"status\": \"operational\", \"latencyMs\": 203 },
    { \"name\": \"Google\", \"status\": \"degraded\", \"latencyMs\": 3500, \"error\": \"High latency\" }
  ]
}`;

  const error401 = `{
  \"error\": {
    \"message\": \"Missing API key. Pass 'Authorization: Bearer <api key>'. Generate a key at /keys.\",
    \"type\": \"missing_api_key\"
  }
}`;

  const error402 = `{
  \"error\": {
    \"message\": \"Insufficient credits. Add more credits to continue using the API.\",
    \"type\": \"insufficient_credits\",
    \"requiredCents\": 15
  }
}`;

  const error429 = `{
  \"error\": {
    \"message\": \"Rate limit exceeded. Please wait before making more requests.\",
    \"type\": \"rate_limit_exceeded\",
    \"retryAfter\": 60
  }
}`;

  const error500 = `{
  \"error\": {
    \"message\": \"Chat request failed: Provider timeout\",
    \"type\": \"provider_error\"
  }
}`;

  const usageResponse = `{
  \"windowDays\": 30,
  \"totals\": {
    \"requests\": 1247,
    \"inputTokens\": 3892000,
    \"outputTokens\": 8921000,
    \"costUsd\": 142.58,
    \"errorRate\": 0.02
  },
  \"daily\": [
    { \"date\": \"2025-01-19\", \"costUsd\": 5.23, \"requests\": 42 },
    { \"date\": \"2025-01-18\", \"costUsd\": 4.87, \"requests\": 38 }
  ],
  \"topBySpend\": [
    { \"modelId\": \"claude-opus-4.7\", \"costUsd\": 89.34 },
    { \"modelId\": \"gpt-5.5\", \"costUsd\": 32.12 }
  ],
  \"topByRequests\": [
    { \"modelId\": \"claude-haiku-4.5\", \"requests\": 892 },
    { \"modelId\": \"gpt-5-nano\", \"requests\": 234 }
  ]
}`;

  const creditsResponse = `{
  \"balanceCents\": 8500,
  \"balanceUsd\": 85.00,
  \"welcomeGrantedAt\": \"2025-01-15T10:00:00.000Z\",
  \"legacyGrantedAt\": null,
  \"grants\": [
    {
      \"id\": \"grant-abc123\",
      \"amountCents\": 500,
      \"amountUsd\": 5.00,
      \"reason\": \"welcome\",
      \"description\": \"Welcome bonus\",
      \"createdAt\": \"2025-01-15T10:00:00.000Z\"
    }
  ]
}`;

  const keysListResponse = `{
  \"data\": [
    {
      \"id\": \"key-xyz789\",
      \"name\": \"Production API\",
      \"prefix\": \"sk-sb-v1-abc123\",
      \"monthlyCapCents\": null,
      \"createdAt\": \"2025-01-10T08:00:00.000Z\",
      \"lastUsedAt\": \"2025-01-20T09:15:00.000Z\",
      \"revokedAt\": null
    }
  ]
}`;

  const keyCreateResponse = `{
  \"key\": \"sk-sb-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\",
  \"record\": {
    \"id\": \"key-new123\",
    \"name\": \"Development\",
    \"prefix\": \"sk-sb-v1-abc456\",
    \"monthlyCapCents\": null,
    \"createdAt\": \"2025-01-20T10:00:00.000Z\",
    \"lastUsedAt\": null,
    \"revokedAt\": null
  }
}`;

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

  return (
    <div className=\"container mx-auto px-4 flex items-start gap-12 py-12 animate-fade-in relative\">
      {/* Sidebar navigation */}
      <aside className=\"w-64 shrink-0 hidden lg:block sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto pr-4\">
        <nav className=\"space-y-6\">
          <div>
            <h4 className=\"font-bold text-sm mb-2\">Getting Started</h4>
            <ul className=\"space-y-1.5 text-sm text-muted-foreground\">
              <li><a href=\"#overview\" className=\"hover:text-foreground text-primary font-medium\">Overview</a></li>
              <li><a href=\"#authentication\" className=\"hover:text-foreground\">Authentication</a></li>
              <li><a href=\"#quickstart\" className=\"hover:text-foreground\">Quickstart</a></li>
              <li><a href=\"#sdks\" className=\"hover:text-foreground\">SDKs</a></li>
            </ul>
          </div>
          <div>
            <h4 className=\"font-bold text-sm mb-2\">Endpoints</h4>
            <ul className=\"space-y-1.5 text-sm text-muted-foreground\">
              <li><a href=\"#chat\" className=\"hover:text-foreground\">Chat Completions</a></li>
              <li><a href=\"#images\" className=\"hover:text-foreground\">Image Generation</a></li>
              <li><a href=\"#models\" className=\"hover:text-foreground\">Models</a></li>
              <li><a href=\"#status\" className=\"hover:text-foreground\">Status</a></li>
            </ul>
          </div>
          <div>
            <h4 className=\"font-bold text-sm mb-2\">Features</h4>
            <ul className=\"space-y-1.5 text-sm text-muted-foreground\">
              <li><a href=\"#streaming\" className=\"hover:text-foreground\">Streaming</a></li>
              <li><a href=\"#tools\" className=\"hover:text-foreground\">Tools & Function Calling</a></li>
              <li><a href=\"#conversation-history\" className=\"hover:text-foreground\">Conversation History</a></li>
              <li><a href=\"#sharing\" className=\"hover:text-foreground\">Sharing</a></li>
            </ul>
          </div>
          <div>
            <h4 className=\"font-bold text-sm mb-2\">Management</h4>
            <ul className=\"space-y-1.5 text-sm text-muted-foreground\">
              <li><a href=\"#api-keys\" className=\"hover:text-foreground\">API Keys</a></li>
              <li><a href=\"#usage\" className=\"hover:text-foreground\">Usage Analytics</a></li>
              <li><a href=\"#credits\" className=\"hover:text-foreground\">Credits</a></li>
            </ul>
          </div>
          <div>
            <h4 className=\"font-bold text-sm mb-2\">Reference</h4>
            <ul className=\"space-y-1.5 text-sm text-muted-foreground\">
              <li><a href=\"#errors\" className=\"hover:text-foreground\">Error Handling</a></li>
              <li><a href=\"#rate-limits\" className=\"hover:text-foreground\">Rate Limits</a></li>
              <li><a href=\"#models-catalog\" className=\"hover:text-foreground\">Model Catalog</a></li>
            </ul>
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <div className=\"flex-1 max-w-3xl min-w-0\">
        <div className=\"prose prose-invert max-w-none\">
          <h1 className=\"text-4xl font-bold tracking-tight mb-4\">API Documentation</h1>
          <p className=\"text-xl text-muted-foreground font-mono text-sm leading-relaxed mb-12\">
            Switchboard provides a unified API to access frontier models from OpenAI, Anthropic, and Google.
            One key. Every model. Transparent pricing.
          </p>

          {/* Overview Section */}
          <section id=\"overview\" className=\"mb-16\">
            <h2 className=\"text-2xl font-bold mb-4\">Overview</h2>
            <p className=\"text-muted-foreground mb-4 text-sm leading-relaxed\">
              Switchboard is an OpenAI-compatible API gateway that routes requests to the best model for your use case.
              Whether you need the speed of GPT-5 nano, the reasoning capabilities of Claude Opus, or the multimodal
              strength of Gemini, Switchboard handles the complexity so you can focus on building.
            </p>
            <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4 mt-6\">
              <div className=\"rounded-lg border border-border p-4 bg-card\">
                <div className=\"text-2xl font-bold text-primary mb-1\">26+</div>
                <div className=\"text-sm text-muted-foreground\">Models Available</div>
              </div>
              <div className=\"rounded-lg border border-border p-4 bg-card\">
                <div className=\"text-2xl font-bold text-primary mb-1\">3</div>
                <div className=\"text-sm text-muted-foreground\">Providers</div>
              </div>
              <div className=\"rounded-lg border border-border p-4 bg-card\">
                <div className=\"text-2xl font-bold text-primary mb-1\">$0.05</div>
                <div className=\"text-sm text-muted-foreground\">Starting price / 1M tokens</div>
              </div>
            </div>
          </section>

          {/* Authentication Section */}
          <section id=\"authentication\" className=\"mb-16\">
            <h2 className=\"text-2xl font-bold mb-4\">Authentication</h2>
            <p className=\"text-muted-foreground mb-4 text-sm leading-relaxed\">
              Switchboard uses API keys for authentication. Every request must include your key in the Authorization header.
            </p>

            <h3 className=\"text-lg font-bold mb-3\">Getting an API Key</h3>
            <ol className=\"list-decimal pl-5 space-y-2 text-sm text-muted-foreground mb-6\">
              <li>Sign in with Replit at <a href=\"/api/login\" className=\"text-foreground underline\">/api/login</a></li>
              <li>Navigate to <Link to=\"/keys\" className=\"text-foreground underline\">the Keys page</Link></li>
              <li>Click <span className=\"text-foreground\">Create Key</span> and give it a name</li>
              <li>Copy the key — it's only shown once. It starts with <code className=\"font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground\">sk-sb-v1-</code></li>
            </ol>

            <h3 className=\"text-lg font-bold mb-3\">Using Your Key</h3>
            <div className=\"rounded-lg border border-border overflow-hidden my-4\">
              <div className=\"flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2\">
                <span className=\"text-xs font-mono text-muted-foreground\">HTTP Header</span>
              </div>
              <pre className=\"p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto\">
                <code>Authorization: Bearer sk-sb-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</code>
              </pre>
            </div>

            <div className=\"rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 mb-6\">
              <div className=\"flex items-start gap-3\">
                <svg className=\"w-5 h-5 text-yellow-500 shrink-0 mt-0.5\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                  <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth=\"2\" d=\"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z\" />
                </svg>
                <div className=\"text-sm\">
                  <div className=\"font-medium text-yellow-500 mb-1\">Security Notice</div>
                  <div className=\"text-muted-foreground\">Never expose your API key in client-side code or version control. Use environment variables.</div>
                </div>
              </div>
            </div>

            <h3 className=\"text-lg font-bold mb-3\">Key Management</h3>
            <ul className=\"space-y-2 text-sm text-muted-foreground list-disc pl-5 mb-6\">
              <li>Keys can be revoked from the <Link to=\"/keys\" className=\"text-foreground underline\">dashboard</Link></li>
              <li>Revoked keys stop working immediately</li>
              <li>No key expiration — manage access by rotating or revoking</li>
              <li>Only the key prefix is stored; full keys are hashed with SHA-256</li>
            </ul>
          </section>

          {/* Quickstart Section */}
          <section id=\"quickstart\" className=\"mb-16\">
            <h2 className=\"text-2xl font-bold mb-4\">Quickstart</h2>
            <p className=\"text-muted-foreground mb-6 text-sm leading-relaxed\">
              If you're using the OpenAI SDK, migrating to Switchboard requires just two changes: update the base URL and set your Switchboard API key.
            </p>

            <h3 className=\"text-lg font-bold mb-3\">Node.js</h3>
            <div className=\"rounded-lg border border-border overflow-hidden my-4\">
              <div className=\"flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2\">
                <div className=\"flex gap-2\">
                  <span className=\"text-xs font-mono px-2 py-1 rounded bg-background text-foreground shadow-sm\">Node.js</span>
                </div>
                <CopyButton text={quickstartNode} />
              </div>
              <pre className=\"p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto\">
                <code>{quickstartNode}</code>
              </pre>
            </div>

            <h3 className=\"text-lg font-bold mb-3\">Python</h3>
            <div className=\"rounded-lg border border-border overflow-hidden my-4\">
              <div className=\"flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2\">
                <div className=\"flex gap-2\">
                  <span className=\"text-xs font-mono px-2 py-1 rounded bg-background text-foreground shadow-sm\">Python</span>
                </div>
                <CopyButton text={quickstartPython} />
              </div>
              <pre className=\"p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto\">
                <code>{quickstartPython}</code>
              </pre>
            </div>

            <h3 className=\"text-lg font-bold mb-3\">cURL</h3>
            <div className=\"rounded-lg border border-border overflow-hidden my-4\">
              <div className=\"flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2\">
                <div className=\"flex gap-2\">
                  <span className=\"text-xs font-mono px-2 py-1 rounded bg-background text-foreground shadow-sm\">cURL</span>
                </div>
                <CopyButton text={quickstartCurl} />
              </div>
              <pre className=\"p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto\">
                <code>{quickstartCurl}</code>
              </pre>
            </div>
          </section>

          {/* SDKs Section */}
          <section id=\"sdks\" className=\"mb-16\">
            <h2 className=\"text-2xl font-bold mb-4\">SDKs</h2>
            <p className=\"text-muted-foreground mb-6 text-sm leading-relaxed\">
              Switchboard is fully compatible with the official OpenAI SDK. No special libraries needed.
            </p>

            <div className=\"space-y-4\">
              <div className=\"rounded-lg border border-border p-4 bg-card\">
                <div className=\"flex items-center gap-3 mb-3\">
                  <div className=\"text-lg font-bold\">Node.js / TypeScript</div>
                </div>
                <pre className=\"text-sm font-mono text-muted-foreground\">
                  <code>npm install openai</code>
                </pre>
              </div>

              <div className=\"rounded-lg border border-border p-4 bg-card\">
                <div className=\"flex items-center gap-3 mb-3\">
                  <div className=\"text-lg font-bold\">Python</div>
                </div>
                <pre className=\"text-sm font-mono text-muted-foreground\">
                  <code>pip install openai</code>
                </pre>
              </div>
            </div>
          </section>

          {/* Chat Section */}
          <section id=\"chat\" className=\"mb-16\">
            <h2 className=\"text-2xl font-bold mb-4\">Chat Completions</h2>
            <div className=\"flex items-center gap-3 mb-6\">
              <span className=\"px-2 py-1 bg-green-500/20 text-green-400 font-mono text-xs font-bold rounded\">POST</span>
              <code className=\"text-sm font-mono text-muted-foreground\">{baseUrl}/api/chat</code>
            </div>
            <p className=\"text-muted-foreground mb-6 text-sm leading-relaxed\">
              Creates a model response for a multi-turn conversation. Supports streaming for real-time token delivery.
            </p>

            <h3 className=\"text-lg font-bold mb-3\">Request Body</h3>
            <div className=\"border border-border rounded-lg bg-card p-4 space-y-4 font-mono text-sm mb-6\">
              <div className=\"border-b border-border pb-4\">
                <div className=\"flex items-center gap-2 mb-1\">
                  <span className=\"text-foreground font-bold\">modelId</span>
                  <span className=\"text-muted-foreground text-xs\">string</span>
                  <span className=\"text-red-400 text-xs\">Required</span>
                </div>
                <div className=\"text-muted-foreground text-xs mb-2\">
                  The model to use. See <a href=\"#models-catalog\" className=\"text-foreground underline\">Model Catalog</a> for valid IDs.
                </div>
                <div className=\"text-xs text-muted-foreground\">Example: <span className=\"text-primary\">\"claude-sonnet-4.6\"</span>, <span className=\"text-primary\">\"gpt-5.4\"</span>, <span className=\"text-primary\">\"gemini-2.5-flash\"</span></div>
              </div>
              <div className=\"border-b border-border pb-4\">
                <div className=\"flex items-center gap-2 mb-1\">
                  <span className=\"text-foreground font-bold\">messages</span>
                  <span className=\"text-muted-foreground text-xs\">array</span>
                  <span className=\"text-red-400 text-xs\">Required</span>
                </div>
                <div className=\"text-muted-foreground text-xs mb-2\">
                  Array of message objects with <span className=\"text-primary\">role</span> and <span className=\"text-primary\">content</span>.
                </div>
                <div className=\"text-xs text-muted-foreground\">
                  Roles: <span className=\"text-primary\">\"system\"</span>, <span className=\"text-primary\">\"user\"</span>, <span className=\"text-primary\">\"assistant\"</span>
                </div>
              </div>
              <div className=\"border-b border-border pb-4\">
                <div className=\"flex items-center gap-2 mb-1\">
                  <span className=\"text-foreground font-bold\">temperature</span>
                  <span className=\"text-muted-foreground text-xs\">number</span>
                  <span className=\"text-green-400 text-xs\">Optional</span>
                </div>
                <div className=\"text-muted-foreground text-xs\">
                  Sampling temperature (0-2). Higher values make output more creative, lower values more deterministic. Default: varies by model.
                </div>
              </div>
              <div className=\"border-b border-border pb-4\">
                <div className=\"flex items-center gap-2 mb-1\">
                  <span className=\"text-foreground font-bold\">maxTokens</span>
                  <span className=\"text-muted-foreground text-xs\">number</span>
                  <span className=\"text-green-400 text-xs\">Optional</span>
                </div>
                <div className=\"text-muted-foreground text-xs\">
                  Maximum tokens to generate. Hard capped at 8192. Default: 4096.
                </div>
              </div>
              <div>
                <div className=\"flex items-center gap-2 mb-1\">
                  <span className=\"text-foreground font-bold\">tools</span>
                  <span className=\"text-muted-foreground text-xs\">object</span>
                  <span className=\"text-green-400 text-xs\">Optional</span>
                </div>
                <div className=\"text-muted-foreground text-xs\">
                  Enable function calling. See <a href=\"#tools\" className=\"text-foreground underline\">Tools section</a> for details.
                </div>
              </div>
            </div>

            <h3 className=\"text-lg font-bold mb-3\">Example Request</h3>
            <div className=\"rounded-lg border border-border overflow-hidden my-4\">
              <div className=\"flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2\">
                <CopyButton text={multiMessage} />
              </div>
              <pre className=\"p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto\">
                <code>{multiMessage}</code>
              </pre>
            </div>
          </section>

          {/* Streaming Section */}
          <section id=\"streaming\" className=\"mb-16\">
            <h2 className=\"text-2xl font-bold mb-4\">Streaming Responses</h2>
            <p className=\"text-muted-foreground mb-6 text-sm leading-relaxed\">
              Enable streaming to receive tokens as they're generated using Server-Sent Events (SSE).
              This dramatically reduces time-to-first-token and is ideal for chat interfaces.
            </p>

            <div className=\"rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 mb-6\">
              <div className=\"flex items-start gap-3\">
                <svg className=\"w-5 h-5 text-blue-400 shrink-0 mt-0.5\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                  <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth=\"2\" d=\"M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z\" />
                </svg>
                <div className=\"text-sm\">
                  <div className=\"font-medium text-blue-400 mb-1\">OpenAI SDK Note</div>
                  <div className=\"text-muted-foreground\">When using the OpenAI SDK, simply pass <code className=\"font-mono text-xs\">stream: true</code> to enable streaming. The SDK handles SSE parsing automatically.</div>
                </div>
              </div>
            </div>

            <h3 className=\"text-lg font-bold mb-3\">Node.js Example</h3>
            <div className=\"rounded-lg border border-border overflow-hidden my-4\">
              <div className=\"flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2\">
                <CopyButton text={streamingNode} />
              </div>
              <pre className=\"p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto\">
                <code>{streamingNode}</code>
              </pre>
            </div>

            <h3 className=\"text-lg font-bold mb-3\">Python Example</h3>
            <div className=\"rounded-lg border border-border overflow-hidden my-4\">
              <div className=\"flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2\">
                <CopyButton text={streamingPython} />
              </div>
              <pre className=\"p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto\">
                <code>{streamingPython}</code>
              </pre>
            </div>

            <h3 className=\"text-lg font-bold mb-3\">Browser (Fetch API)</h3>
            <p className=\"text-muted-foreground mb-4 text-sm leading-relaxed\">
              Stream directly from the browser using the Fetch API and a ReadableStream reader:
            </p>
            <div className=\"rounded-lg border border-border overflow-hidden my-4\">
              <div className=\"flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2\">
                <CopyButton text={streamingFetch} />
              </div>
              <pre className=\"p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto\">
                <code>{streamingFetch}</code>
              </pre>
            </div>

            <h3 className=\"text-lg font-bold mb-3\">SSE Response Format</h3>
            <p className=\"text-muted-foreground mb-4 text-sm leading-relaxed\">
              The server streams events in the following format:
            </p>
            <div className=\"rounded-lg border border-border overflow-hidden my-4\">
              <div className=\"flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2\">
                <CopyButton text={streamingSSE} />
              </div>
              <pre className=\"p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto\">
                <code>{streamingSSE}</code>
              </pre>
            </div>

            <div className=\"space-y-2 text-sm text-muted-foreground list-disc pl-5 mt-6\">
              <li><code className=\"font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground\">delta</code>: Text chunk as it's generated</li>
              <li><code className=\"font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground\">tool</code>: Tool lifecycle event (start/end/error)</li>
              <li><code className=\"font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground\">done</code>: Final event with usage statistics</li>
              <li><code className=\"font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground\">error</code>: Error message if request failed</li>
            </div>
          </section>

          {/* Tools Section */}
          <section id=\"tools\" className=\"mb-16\">
            <h2 className=\"text-2xl font-bold mb-4\">Tools & Function Calling</h2>
            <p className=\"text-muted-foreground mb-6 text-sm leading-relaxed\">
              Switchboard supports tool use for real-time information retrieval. The primary tool is <span className=\"text-foreground font-mono\">web_search</span>,
              which enables models to fetch current information from the web.
            </p>

            <h3 className=\"text-lg font-bold mb-3\">Enabling Web Search</h3>
            <p className=\"text-muted-foreground mb-4 text-sm leading-relaxed\">
              Pass <code className=\"font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground\">tools: {`{ webSearch: true }`}</code> in your request:
            </p>
            <div className=\"rounded-lg border border-border overflow-hidden my-4\">
              <div className=\"flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2\">
                <CopyButton text={toolsRequest} />
              </div>
              <pre className=\"p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto\">
                <code>{toolsRequest}</code>
              </pre>
            </div>

            <h3 className=\"text-lg font-bold mb-3\">Tool Event Flow</h3>
            <p className=\"text-muted-foreground mb-4 text-sm leading-relaxed\">
              When a model uses web search, you'll receive events for each phase:
            </p>
            <div className=\"rounded-lg border border-border overflow-hidden my-4\">
              <div className=\"flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2\">
                <CopyButton text={toolsResponse} />
              </div>
              <pre className=\"p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto\">
                <code>{toolsResponse}</code>
              </pre>
            </div>

            <div className=\"rounded-lg border border-border p-4 bg-card mt-6\">
              <div className=\"text-sm font-bold mb-3\">Tool Lifecycle Events</div>
              <div className=\"space-y-3 font-mono text-xs\">
                <div>
                  <span className=\"text-green-400\">start</span>: Tool execution began
                  <div className=\"text-muted-foreground mt-1\">Contains: callId, name, args</div>
                </div>
                <div>
                  <span className=\"text-green-400\">end</span>: Tool execution completed
                  <div className=\"text-muted-foreground mt-1\">Contains: callId, results (array of web search results)</div>
                </div>
                <div>
                  <span className=\"text-red-400\">error</span>: Tool execution failed
                  <div className=\"text-muted-foreground mt-1\">Contains: callId, error (error message)</div>
                </div>
              </div>
            </div>

            <h3 className=\"text-lg font-bold mb-3 mt-6\">When to Use Web Search</h3>
            <p className=\"text-muted-foreground mb-4 text-sm leading-relaxed\">
              Models automatically use web search when you ask about:
            </p>
            <ul className=\"space-y-2 text-sm text-muted-foreground list-disc pl-5\">
              <li>Recent news or current events</li>
              <li>Real-time prices or stock data</li>
              <li>Information that may have changed since training</li>
              <li>Factual questions requiring up-to-date sources</li>
            </ul>

            <div className=\"rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 mt-6\">
              <div className=\"flex items-start gap-3\">
                <svg className=\"w-5 h-5 text-yellow-500 shrink-0 mt-0.5\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                  <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth=\"2\" d=\"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z\" />
                </svg>
                <div className=\"text-sm\">
                  <div className=\"font-medium text-yellow-500 mb-1\">Cost Consideration</div>
                  <div className=\"text-muted-foreground\">Each tool call counts toward your token usage. With web search enabled, expect up to 5x more input tokens as the full search context is included.</div>
                </div>
              </div>
            </div>
          </section>

          {/* Images Section */}
          <section id=\"images\" className=\"mb-16\">
            <h2 className=\"text-2xl font-bold mb-4\">Image Generation</h2>
            <div className=\"flex items-center gap-3 mb-6\">
              <span className=\"px-2 py-1 bg-green-500/20 text-green-400 font-mono text-xs font-bold rounded\">POST</span>
              <code className=\"text-sm font-mono text-muted-foreground\">{baseUrl}/api/images</code>
            </div>
            <p className=\"text-muted-foreground mb-6 text-sm leading-relaxed\">
              Generate images using AI models. Supports multiple output sizes and batch generation.
            </p>

            <h3 className=\"text-lg font-bold mb-3\">Request Body</h3>
            <div className=\"border border-border rounded-lg bg-card p-4 space-y-4 font-mono text-sm mb-6\">
              <div className=\"border-b border-border pb-4\">
                <div className=\"flex items-center gap-2 mb-1\">
                  <span className=\"text-foreground font-bold\">prompt</span>
                  <span className=\"text-muted-foreground text-xs\">string</span>
                  <span className=\"text-red-400 text-xs\">Required</span>
                </div>
                <div className=\"text-muted-foreground text-xs\">
                  Text description of the image you want to generate. Max 4000 characters.
                </div>
              </div>
              <div className=\"border-b border-border pb-4\">
                <div className=\"flex items-center gap-2 mb-1\">
                  <span className=\"text-foreground font-bold\">size</span>
                  <span className=\"text-muted-foreground text-xs\">string</span>
                  <span className=\"text-green-400 text-xs\">Optional</span>
                </div>
                <div className=\"text-muted-foreground text-xs\">
                  Output size. Options: <span className=\"text-primary\">\"1024x1024\"</span>, <span className=\"text-primary\">\"1024x1536\"</span>, <span className=\"text-primary\">\"1536x1024\"</span>, <span className=\"text-primary\">\"auto\"</span>. Default: <span className=\"text-primary\">\"1024x1024\"</span>
                </div>
              </div>
              <div className=\"border-b border-border pb-4\">
                <div className=\"flex items-center gap-2 mb-1\">
                  <span className=\"text-foreground font-bold\">n</span>
                  <span className=\"text-muted-foreground text-xs\">integer</span>
                  <span className=\"text-green-400 text-xs\">Optional</span>
                </div>
                <div className=\"text-muted-foreground text-xs\">
                  Number of images to generate (1-4). Default: 1.
                </div>
              </div>
              <div>
                <div className=\"flex items-center gap-2 mb-1\">
                  <span className=\"text-foreground font-bold\">model</span>
                  <span className=\"text-muted-foreground text-xs\">string</span>
                  <span className=\"text-green-400 text-xs\">Optional</span>
                </div>
                <div className=\"text-muted-foreground text-xs\">
                  Model to use. Options: <span className=\"text-primary\">\"gpt-image-1\"</span>, <span className=\"text-primary\">\"gemini-2.5-flash-image\"</span>. Default: <span className=\"text-primary\">\"gpt-image-1\"</span>
                </div>
              </div>
            </div>

            <h3 className=\"text-lg font-bold mb-3\">Example Request</h3>
            <div className=\"rounded-lg border border-border overflow-hidden my-4\">
              <div className=\"flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2\">
                <CopyButton text={imageRequest} />
              </div>
              <pre className=\"p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto\">
                <code>{imageRequest}</code>
              </pre>
            </div>

            <h3 className=\"text-lg font-bold mb-3\">Response</h3>
            <div className=\"rounded-lg border border-border overflow-hidden my-4\">
              <div className=\"flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2\">
                <CopyButton text={imageResponse} />
              </div>
              <pre className=\"p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto\">
                <code>{imageResponse}</code>
              </pre>
            </div>

            <div className=\"rounded-lg border border-border p-4 bg-card mt-6\">
              <div className=\"text-sm font-bold mb-3\">Response Fields</div>
              <div className=\"space-y-3 font-mono text-xs\">
                <div>
                  <span className=\"text-foreground\">b64_json</span>
                  <div className=\"text-muted-foreground mt-1\">Base64-encoded PNG image data</div>
                </div>
                <div>
                  <span className=\"text-foreground\">revised_prompt</span>
                  <div className=\"text-muted-foreground mt-1\">Model's refined version of your prompt (gpt-image-1 only)</div>
                </div>
                <div>
                  <span className=\"text-foreground\">latencyMs</span>
                  <div className=\"text-muted-foreground mt-1\">Time taken to generate (milliseconds)</div>
                </div>
              </div>
            </div>
          </section>

          {/* Models Section */}
          <section id=\"models\" className=\"mb-16\">
            <h2 className=\"text-2xl font-bold mb-4\">List Models</h2>
            <div className=\"flex items-center gap-3 mb-6\">
              <span className=\"px-2 py-1 bg-blue-500/20 text-blue-400 font-mono text-xs font-bold rounded\">GET</span>
              <code className=\"text-sm font-mono text-muted-foreground\">{baseUrl}/api/models</code>
            </div>
            <p className=\"text-muted-foreground mb-6 text-sm leading-relaxed\">
              Returns a list of all available models with pricing, context windows, and measured performance data.
            </p>

            <h3 className=\"text-lg font-bold mb-3\">Query Parameters</h3>
            <div className=\"border border-border rounded-lg bg-card p-4 space-y-4 font-mono text-sm mb-6\">
              <div className=\"border-b border-border pb-4\">
                <div className=\"flex items-center gap-2 mb-1\">
                  <span className=\"text-foreground font-bold\">provider</span>
                  <span className=\"text-muted-foreground text-xs\">string</span>
                  <span className=\"text-green-400 text-xs\">Optional</span>
                </div>
                <div className=\"text-muted-foreground text-xs\">
                  Filter by provider. Options: <span className=\"text-primary\">\"OpenAI\"</span>, <span className=\"text-primary\">\"Anthropic\"</span>, <span className=\"text-primary\">\"Google\"</span>
                </div>
              </div>
              <div>
                <div className=\"flex items-center gap-2 mb-1\">
                  <span className=\"text-foreground font-bold\">modality</span>
                  <span className=\"text-muted-foreground text-xs\">string</span>
                  <span className=\"text-green-400 text-xs\">Optional</span>
                </div>
                <div className=\"text-muted-foreground text-xs\">
                  Filter by capability. Options: <span className=\"text-primary\">\"text\"</span>, <span className=\"text-primary\">\"vision\"</span>, <span className=\"text-primary\">\"audio\"</span>, <span className=\"text-primary\">\"tools\"</span>
                </div>
              </div>
            </div>

            <h3 className=\"text-lg font-bold mb-3\">Example Response</h3>
            <div className=\"rounded-lg border border-border overflow-hidden my-4\">
              <div className=\"flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2\">
                <CopyButton text={modelsResponse} />
              </div>
              <pre className=\"p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto\">
                <code>{modelsResponse}</code>
              </pre>
            </div>

            <h3 className=\"text-lg font-bold mb-3 mt-6\">Get Single Model</h3>
            <div className=\"flex items-center gap-3 mb-4\">
              <span className=\"px-2 py-1 bg-blue-500/20 text-blue-400 font-mono text-xs font-bold rounded\">GET</span>
              <code className=\"text-sm font-mono text-muted-foreground\">{baseUrl}/api/models/:id</code>
            </div>
            <p className=\"text-muted-foreground text-sm leading-relaxed\">
              Retrieve details for a specific model by its ID. Returns 404 if the model doesn't exist.
            </p>
          </section>

          {/* Status Section */}
          <section id=\"status\" className=\"mb-16\">
            <h2 className=\"text-2xl font-bold mb-4\">System Status</h2>
            <div className=\"flex items-center gap-3 mb-6\">
              <span className=\"px-2 py-1 bg-blue-500/20 text-blue-400 font-mono text-xs font-bold rounded\">GET</span>
              <code className=\"text-sm font-mono text-muted-foreground\">{baseUrl}/api/status</code>
            </div>
            <p className=\"text-muted-foreground mb-6 text-sm leading-relaxed\">
              Check the health and latency of all supported providers. Results are cached for 30 seconds.
            </p>

            <h3 className=\"text-lg font-bold mb-3\">Response</h3>
            <div className=\"rounded-lg border border-border overflow-hidden my-4\">
              <div className=\"flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2\">
                <CopyButton text={statusResponse} />
              </div>
              <pre className=\"p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto\">
                <code>{statusResponse}</code>
              </pre>
            </div>

            <div className=\"rounded-lg border border-border p-4 bg-card mt-6\">
              <div className=\"text-sm font-bold mb-3\">Status Values</div>
              <div className=\"space-y-2 font-mono text-xs\">
                <div><span className=\"text-green-400\">operational</span>: All systems normal</div>
                <div><span className=\"text-yellow-400\">degraded</span>: Performance issues detected</div>
                <div><span className=\"text-red-400\">down</span>: Service unavailable</div>
              </div>
            </div>
          </section>

          {/* Conversation History Section */}
          <section id=\"conversation-history\" className=\"mb-16\">
            <h2 className=\"text-2xl font-bold mb-4\">Conversation History</h2>
            <p className=\"text-muted-foreground mb-6 text-sm leading-relaxed\">
              Switchboard stores conversation history per-user. Continue conversations by passing prior messages in the messages array.
            </p>

            <div className=\"rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 mb-6\">
              <div className=\"flex items-start gap-3\">
                <svg className=\"w-5 h-5 text-blue-400 shrink-0 mt-0.5\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                  <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth=\"2\" d=\"M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z\" />
                </svg>
                <div className=\"text-sm\">
                  <div className=\"font-medium text-blue-400 mb-1\">Context Window</div>
                  <div className=\"text-muted-foreground\">Each model has a maximum context window. Keep your conversation history within these limits for best results.</div>
                </div>
              </div>
            </div>

            <div className=\"space-y-4\">
              <div className=\"rounded-lg border border-border p-4 bg-card\">
                <div className=\"text-sm font-bold mb-2\">GPT-5 Series</div>
                <div className=\"text-xs text-muted-foreground\">400,000 tokens context window</div>
              </div>
              <div className=\"rounded-lg border border-border p-4 bg-card\">
                <div className=\"text-sm font-bold mb-2\">Claude Models</div>
                <div className=\"text-xs text-muted-foreground\">200,000 tokens context window</div>
              </div>
              <div className=\"rounded-lg border border-border p-4 bg-card\">
                <div className=\"text-sm font-bold mb-2\">Gemini Models</div>
                <div className=\"text-xs text-muted-foreground\">1,000,000 tokens context window</div>
              </div>
            </div>
          </section>

          {/* Sharing Section */}
          <section id=\"sharing\" className=\"mb-16\">
            <h2 className=\"text-2xl font-bold mb-4\">Sharing Conversations</h2>
            <p className=\"text-muted-foreground mb-6 text-sm leading-relaxed\">
              Publish a read-only snapshot of any conversation for sharing. Requires session authentication.
            </p>

            <div className=\"flex items-center gap-3 mb-4\">
              <span className=\"px-2 py-1 bg-green-500/20 text-green-400 font-mono text-xs font-bold rounded\">POST</span>
              <code className=\"text-sm font-mono text-muted-foreground\">{baseUrl}/api/share</code>
            </div>

            <h3 className=\"text-lg font-bold mb-3\">Request Body</h3>
            <div className=\"border border-border rounded-lg bg-card p-4 space-y-4 font-mono text-sm mb-6\">
              <div className=\"border-b border-border pb-4\">
                <div className=\"flex items-center gap-2 mb-1\">
                  <span className=\"text-foreground font-bold\">title</span>
                  <span className=\"text-muted-foreground text-xs\">string</span>
                  <span className=\"text-green-400 text-xs\">Optional</span>
                </div>
                <div className=\"text-muted-foreground text-xs\">
                  Display title for the shared conversation. Max 200 characters.
                </div>
              </div>
              <div className=\"border-b border-border pb-4\">
                <div className=\"flex items-center gap-2 mb-1\">
                  <span className=\"text-foreground font-bold\">modelId</span>
                  <span className=\"text-muted-foreground text-xs\">string</span>
                  <span className=\"text-green-400 text-xs\">Optional</span>
                </div>
                <div className=\"text-muted-foreground text-xs\">
                  Model used in the conversation.
                </div>
              </div>
              <div>
                <div className=\"flex items-center gap-2 mb-1\">
                  <span className=\"text-foreground font-bold\">messages</span>
                  <span className=\"text-muted-foreground text-xs\">array</span>
                  <span className=\"text-red-400 text-xs\">Required</span>
                </div>
                <div className=\"text-muted-foreground text-xs\">
                  Array of message objects (role + content).
                </div>
              </div>
            </div>

            <h3 className=\"text-lg font-bold mb-3\">Example</h3>
            <div className=\"rounded-lg border border-border overflow-hidden my-4\">
              <div className=\"flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2\">
                <CopyButton text={conversationRequest} />
              </div>
              <pre className=\"p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto\">
                <code>{conversationRequest}</code>
              </pre>
            </div>

            <div className=\"rounded-lg border border-border overflow-hidden my-4\">
              <div className=\"flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2\">
                <CopyButton text={conversationResponse} />
              </div>
              <pre className=\"p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto\">
                <code>{conversationResponse}</code>
              </pre>
            </div>

            <div className=\"flex items-center gap-3 mt-6 mb-4\">
              <span className=\"px-2 py-1 bg-blue-500/20 text-blue-400 font-mono text-xs font-bold rounded\">GET</span>
              <code className=\"text-sm font-mono text-muted-foreground\">{baseUrl}/api/share/:slug</code>
            </div>
            <p className=\"text-muted-foreground text-sm leading-relaxed\">
              View a shared conversation by its slug. No authentication required.
            </p>
          </section>

          {/* API Keys Management Section */}
          <section id=\"api-keys\" className=\"mb-16\">
            <h2 className=\"text-2xl font-bold mb-4\">API Key Management</h2>
            <p className=\"text-muted-foreground mb-6 text-sm leading-relaxed\">
              Create, list, and revoke API keys for programmatic access. Requires session authentication.
            </p>

            <h3 className=\"text-lg font-bold mb-3\">List Keys</h3>
            <div className=\"flex items-center gap-3 mb-4\">
              <span className=\"px-2 py-1 bg-blue-500/20 text-blue-400 font-mono text-xs font-bold rounded\">GET</span>
              <code className=\"text-sm font-mono text-muted-foreground\">{baseUrl}/api/keys</code>
            </div>
            <div className=\"rounded-lg border border-border overflow-hidden my-4\">
              <div className=\"flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2\">
                <CopyButton text={keysListResponse} />
              </div>
              <pre className=\"p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto\">
                <code>{keysListResponse}</code>
              </pre>
            </div>

            <h3 className=\"text-lg font-bold mb-3\">Create Key</h3>
            <div className=\"flex items-center gap-3 mb-4\">
              <span className=\"px-2 py-1 bg-green-500/20 text-green-400 font-mono text-xs font-bold rounded\">POST</span>
              <code className=\"text-sm font-mono text-muted-foreground\">{baseUrl}/api/keys</code>
            </div>
            <p className=\"text-muted-foreground mb-4 text-sm leading-relaxed\">
              Request body: <code className=\"font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground\">{`{ name: string, monthlyCapCents?: number }`}</code>
            </p>
            <div className=\"rounded-lg border border-border overflow-hidden my-4\">
              <div className=\"flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2\">
                <CopyButton text={keyCreateResponse} />
              </div>
              <pre className=\"p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto\">
                <code>{keyCreateResponse}</code>
              </pre>
            </div>

            <div className=\"rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 mb-6\">
              <div className=\"flex items-start gap-3\">
                <svg className=\"w-5 h-5 text-yellow-500 shrink-0 mt-0.5\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                  <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth=\"2\" d=\"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z\" />
                </svg>
                <div className=\"text-sm\">
                  <div className=\"font-medium text-yellow-500 mb-1\">One-Time Display</div>
                  <div className=\"text-muted-foreground\">The full key is only returned once during creation. Store it securely immediately.</div>
                </div>
              </div>
            </div>

            <h3 className=\"text-lg font-bold mb-3\">Revoke Key</h3>
            <div className=\"flex items-center gap-3 mb-4\">
              <span className=\"px-2 py-1 bg-red-500/20 text-red-400 font-mono text-xs font-bold rounded\">DELETE</span>
              <code className=\"text-sm font-mono text-muted-foreground\">{baseUrl}/api/keys/:id</code>
            </div>
            <p className=\"text-muted-foreground text-sm leading-relaxed\">
              Revokes an API key immediately. Revoked keys cannot be restored.
            </p>

            <h3 className=\"text-lg font-bold mb-3 mt-6\">Key Usage Stats</h3>
            <div className=\"flex items-center gap-3 mb-4\">
              <span className=\"px-2 py-1 bg-blue-500/20 text-blue-400 font-mono text-xs font-bold rounded\">GET</span>
              <code className=\"text-sm font-mono text-muted-foreground\">{baseUrl}/api/keys/:id/usage</code>
            </div>
            <p className=\"text-muted-foreground text-sm leading-relaxed\">
              Query parameter: <code className=\"font-mono text-xs px-1.5 py-0.5 rounded bg-muted/40 text-foreground\">days</code> (1-90, default 30)
            </p>
          </section>

          {/* Usage Analytics Section */}
          <section id=\"usage\" className=\"mb-16\">
            <h2 className=\"text-2xl font-bold mb-4\">Usage Analytics</h2>
            <div className=\"flex items-center gap-3 mb-6\">
              <span className=\"px-2 py-1 bg-blue-500/20 text-blue-400 font-mono text-xs font-bold rounded\">GET</span>
              <code className=\"text-sm font-mono text-muted-foreground\">{baseUrl}/api/usage</code>
            </div>
            <p className=\"text-muted-foreground mb-6 text-sm leading-relaxed\">
              View your usage statistics, costs, and model breakdown. Requires session authentication.
            </p>

            <h3 className=\"text-lg font-bold mb-3\">Query Parameters</h3>
            <div className=\"border border-border rounded-lg bg-card p-4 mb-6\">
              <div className=\"flex items-center gap-2 mb-1\">
                <span className=\"text-foreground font-bold\">days</span>
                <span className=\"text-muted-foreground text-xs\">integer</span>
                <span className=\"text-green-400 text-xs\">Optional</span>
              </div>
              <div className=\"text-muted-foreground text-xs\">
                Number of days to include (1-90). Default: 30.
              </div>
            </div>

            <h3 className=\"text-lg font-bold mb-3\">Example Response</h3>
            <div className=\"rounded-lg border border-border overflow-hidden my-4\">
              <div className=\"flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2\">
                <CopyButton text={usageResponse} />
              </div>
              <pre className=\"p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto\">
                <code>{usageResponse}</code>
              </pre>
            </div>
          </section>

          {/* Credits Section */}
          <section id=\"credits\" className=\"mb-16\">
            <h2 className=\"text-2xl font-bold mb-4\">Credits</h2>
            <div className=\"flex items-center gap-3 mb-6\">
              <span className=\"px-2 py-1 bg-blue-500/20 text-blue-400 font-mono text-xs font-bold rounded\">GET</span>
              <code className=\"text-sm font-mono text-muted-foreground\">{baseUrl}/api/credits</code>
            </div>
            <p className=\"text-muted-foreground mb-6 text-sm leading-relaxed\">
              Check your credit balance and transaction history. Requires session authentication.
            </p>

            <h3 className=\"text-lg font-bold mb-3\">Example Response</h3>
            <div className=\"rounded-lg border border-border overflow-hidden my-4\">
              <div className=\"flex items-center justify-end border-b border-border bg-muted/30 px-4 py-2\">
                <CopyButton text={creditsResponse} />
              </div>
              <pre className=\"p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto\">
                <code>{creditsResponse}</code>
              </pre>
            </div>

            <div className=\"rounded-lg border border-border p-4 bg-card mt-6\">
              <div className=\"text-sm font-bold mb-3\">Grant Reasons</div>
              <div className=\"space-y-2 text-sm\">
                <div><span className=\"text-primary font-mono\">welcome</span>: New user bonus</div>
                <div><span className=\"text-primary font-mono\">legacy</span>: Backfill for existing users</div>
                <div><span className=\"text-primary font-mono\">purchase</span>: Paid credit top-up</div>
                <div><span className=\"text-primary font-mono\">usage</span>: Deduction for API usage</div>
              </div>
            </div>
          </section>

          {/* Error Handling Section */}
          <section id=\"errors\" className=\"mb-16\">
            <h2 className=\"text-2xl font-bold mb-4\">Error Handling</h2>
            <p className=\"text-muted-foreground mb-6 text-sm leading-relaxed\">
              All errors follow a consistent JSON format with a message, type, and optional additional fields.
            </p>

            <div className=\"space-y-6\">
              <div>
                <h3 className=\"text-lg font-bold mb-3\">401 Unauthorized</h3>
                <p className=\"text-muted-foreground mb-4 text-sm leading-relaxed\">
                  Missing or invalid API key.
                </p>
                <div className=\"rounded-lg border border-border overflow-hidden\">
                  <pre className=\"p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto\">
                    <code>{error401}</code>
                  </pre>
                </div>
              </div>

              <div>
                <h3 className=\"text-lg font-bold mb-3\">402 Payment Required</h3>
                <p className=\"text-muted-foreground mb-4 text-sm leading-relaxed\">
                  Insufficient credit balance to complete the request.
                </p>
                <div className=\"rounded-lg border border-border overflow-hidden\">
                  <pre className=\"p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto\">
                    <code>{error402}</code>
                  </pre>
                </div>
              </div>

              <div>
                <h3 className=\"text-lg font-bold mb-3\">429 Too Many Requests</h3>
                <p className=\"text-muted-foreground mb-4 text-sm leading-relaxed\">
                  Rate limit exceeded. Wait before retrying.
                </p>
                <div className=\"rounded-lg border border-border overflow-hidden\">
                  <pre className=\"p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto\">
                    <code>{error429}</code>
                  </pre>
                </div>
              </div>

              <div>
                <h3 className=\"text-lg font-bold mb-3\">500 Internal Server Error</h3>
                <p className=\"text-muted-foreground mb-4 text-sm leading-relaxed\">
                  Provider or server error. Check the message for details.
                </p>
                <div className=\"rounded-lg border border-border overflow-hidden\">
                  <pre className=\"p-4 text-sm font-mono text-muted-foreground bg-card overflow-x-auto\">
                    <code>{error500}</code>
                  </pre>
                </div>
              </div>
            </div>

            <h3 className=\"text-lg font-bold mb-3 mt-8\">Error Types</h3>
            <div className=\"border border-border rounded-lg bg-card p-4\">
              <div className=\"grid grid-cols-2 gap-4 text-sm\">
                <div className=\"font-mono\">missing_api_key</div>
                <div className=\"text-muted-foreground\">No Authorization header</div>
                <div className=\"font-mono\">invalid_api_key</div>
                <div className=\"text-muted-foreground\">Invalid or revoked key</div>
                <div className=\"font-mono\">insufficient_credits</div>
                <div className=\"text-muted-foreground\">Not enough balance</div>
                <div className=\"font-mono\">rate_limit_exceeded</div>
                <div className=\"text-muted-foreground\">Too many requests</div>
                <div className=\"font-mono\">invalid_request</div>
                <div className=\"text-muted-foreground\">Malformed request body</div>
                <div className=\"font-mono\">provider_error</div>
                <div className=\"text-muted-foreground\">Upstream provider failed</div>
              </div>
            </div>
          </section>

          {/* Rate Limits Section */}
          <section id=\"rate-limits\" className=\"mb-16\">
            <h2 className=\"text-2xl font-bold mb-4\">Rate Limits</h2>
            <p className=\"text-muted-foreground mb-6 text-sm leading-relaxed\">
              Rate limits protect the service and ensure fair access for all users.
            </p>

            <div className=\"space-y-4\">
              <div className=\"rounded-lg border border-border p-4 bg-card\">
                <div className=\"text-sm font-bold mb-2\">Requests per Minute</div>
                <div className=\"text-2xl font-bold text-primary mb-1\">60</div>
                <div className=\"text-xs text-muted-foreground\">Per API key</div>
              </div>
              <div className=\"rounded-lg border border-border p-4 bg-card\">
                <div className=\"text-sm font-bold mb-2\">Tokens per Minute</div>
                <div className=\"text-2xl font-bold text-primary mb-1\">1,000,000</div>
                <div className=\"text-xs text-muted-foreground\">Per API key (input + output)</div>
              </div>
              <div className=\"rounded-lg border border-border p-4 bg-card\">
                <div className=\"text-sm font-bold mb-2\">Max Messages per Request</div>
                <div className=\"text-2xl font-bold text-primary mb-1\">200</div>
                <div className=\"text-xs text-muted-foreground\">Per chat request</div>
              </div>
              <div className=\"rounded-lg border border-border p-4 bg-card\">
                <div className=\"text-sm font-bold mb-2\">Max Output Tokens</div>
                <div className=\"text-2xl font-bold text-primary mb-1\">8,192</div>
                <div className=\"text-xs text-muted-foreground\">Hard cap regardless of request</div>
              </div>
            </div>

            <div className=\"rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 mt-6\">
              <div className=\"flex items-start gap-3\">
                <svg className=\"w-5 h-5 text-yellow-500 shrink-0 mt-0.5\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                  <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth=\"2\" d=\"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z\" />
                </svg>
                <div className=\"text-sm\">
                  <div className=\"font-medium text-yellow-500 mb-1\">Enterprise Limits</div>
                  <div className=\"text-muted-foreground\">Contact us for higher rate limits for production workloads.</div>
                </div>
              </div>
            </div>
          </section>

          {/* Model Catalog Section */}
          <section id=\"models-catalog\" className=\"mb-16\">
            <h2 className=\"text-2xl font-bold mb-4\">Model Catalog</h2>
            <p className=\"text-muted-foreground mb-6 text-sm leading-relaxed\">
              Complete list of available models. Prices are per 1M tokens in USD.
            </p>

            <h3 className=\"text-lg font-bold mb-3\">OpenAI</h3>
            <div className=\"overflow-x-auto mb-8\">
              <table className=\"w-full text-sm\">
                <thead>
                  <tr className=\"border-b border-border\">
                    <th className=\"text-left py-2 px-3 text-muted-foreground font-normal\">Model ID</th>
                    <th className=\"text-right py-2 px-3 text-muted-foreground font-normal\">Input</th>
                    <th className=\"text-right py-2 px-3 text-muted-foreground font-normal\">Output</th>
                    <th className=\"text-left py-2 px-3 text-muted-foreground font-normal\">Modalities</th>
                  </tr>
                </thead>
                <tbody className=\"font-mono text-xs\">
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">gpt-5.5</td><td className=\"py-2 px-3 text-right\">$1.50</td><td className=\"py-2 px-3 text-right\">$12.00</td><td className=\"py-2 px-3\">text, vision, audio, tools</td></tr>
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">gpt-5.4</td><td className=\"py-2 px-3 text-right\">$1.25</td><td className=\"py-2 px-3 text-right\">$10.00</td><td className=\"py-2 px-3\">text, vision, audio, tools</td></tr>
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">gpt-5.2</td><td className=\"py-2 px-3 text-right\">$1.25</td><td className=\"py-2 px-3 text-right\">$10.00</td><td className=\"py-2 px-3\">text, vision, audio, tools</td></tr>
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">gpt-5.3-codex</td><td className=\"py-2 px-3 text-right\">$1.50</td><td className=\"py-2 px-3 text-right\">$12.00</td><td className=\"py-2 px-3\">text, vision, audio, tools</td></tr>
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">gpt-5.1</td><td className=\"py-2 px-3 text-right\">$1.25</td><td className=\"py-2 px-3 text-right\">$10.00</td><td className=\"py-2 px-3\">text, vision, audio, tools</td></tr>
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">gpt-5</td><td className=\"py-2 px-3 text-right\">$1.25</td><td className=\"py-2 px-3 text-right\">$10.00</td><td className=\"py-2 px-3\">text, vision, audio, tools</td></tr>
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">gpt-5-mini</td><td className=\"py-2 px-3 text-right\">$0.25</td><td className=\"py-2 px-3 text-right\">$2.00</td><td className=\"py-2 px-3\">text, vision, tools</td></tr>
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">gpt-5-nano</td><td className=\"py-2 px-3 text-right\">$0.05</td><td className=\"py-2 px-3 text-right\">$0.40</td><td className=\"py-2 px-3\">text, tools</td></tr>
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">gpt-4.1</td><td className=\"py-2 px-3 text-right\">$2.00</td><td className=\"py-2 px-3 text-right\">$8.00</td><td className=\"py-2 px-3\">text, vision, tools</td></tr>
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">gpt-4.1-mini</td><td className=\"py-2 px-3 text-right\">$0.50</td><td className=\"py-2 px-3 text-right\">$2.00</td><td className=\"py-2 px-3\">text, vision, tools</td></tr>
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">o3-pro</td><td className=\"py-2 px-3 text-right\">$3.00</td><td className=\"py-2 px-3 text-right\">$12.00</td><td className=\"py-2 px-3\">text, tools</td></tr>
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">o4-mini</td><td className=\"py-2 px-3 text-right\">$1.10</td><td className=\"py-2 px-3 text-right\">$4.40</td><td className=\"py-2 px-3\">text, tools</td></tr>
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">o3</td><td className=\"py-2 px-3 text-right\">$2.00</td><td className=\"py-2 px-3 text-right\">$8.00</td><td className=\"py-2 px-3\">text, tools</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className=\"text-lg font-bold mb-3\">Anthropic</h3>
            <div className=\"overflow-x-auto mb-8\">
              <table className=\"w-full text-sm\">
                <thead>
                  <tr className=\"border-b border-border\">
                    <th className=\"text-left py-2 px-3 text-muted-foreground font-normal\">Model ID</th>
                    <th className=\"text-right py-2 px-3 text-muted-foreground font-normal\">Input</th>
                    <th className=\"text-right py-2 px-3 text-muted-foreground font-normal\">Output</th>
                    <th className=\"text-left py-2 px-3 text-muted-foreground font-normal\">Modalities</th>
                  </tr>
                </thead>
                <tbody className=\"font-mono text-xs\">
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">claude-opus-4.7</td><td className=\"py-2 px-3 text-right\">$15.00</td><td className=\"py-2 px-3 text-right\">$75.00</td><td className=\"py-2 px-3\">text, vision, tools</td></tr>
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">claude-sonnet-4.6</td><td className=\"py-2 px-3 text-right\">$3.00</td><td className=\"py-2 px-3 text-right\">$15.00</td><td className=\"py-2 px-3\">text, vision, tools</td></tr>
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">claude-opus-4.6</td><td className=\"py-2 px-3 text-right\">$15.00</td><td className=\"py-2 px-3 text-right\">$75.00</td><td className=\"py-2 px-3\">text, vision, tools</td></tr>
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">claude-opus-4.5</td><td className=\"py-2 px-3 text-right\">$15.00</td><td className=\"py-2 px-3 text-right\">$75.00</td><td className=\"py-2 px-3\">text, vision, tools</td></tr>
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">claude-sonnet-4.5</td><td className=\"py-2 px-3 text-right\">$3.00</td><td className=\"py-2 px-3 text-right\">$15.00</td><td className=\"py-2 px-3\">text, vision, tools</td></tr>
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">claude-haiku-4.5</td><td className=\"py-2 px-3 text-right\">$1.00</td><td className=\"py-2 px-3 text-right\">$5.00</td><td className=\"py-2 px-3\">text, vision, tools</td></tr>
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">claude-opus-4.1</td><td className=\"py-2 px-3 text-right\">$15.00</td><td className=\"py-2 px-3 text-right\">$75.00</td><td className=\"py-2 px-3\">text, vision, tools</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className=\"text-lg font-bold mb-3\">Google</h3>
            <div className=\"overflow-x-auto\">
              <table className=\"w-full text-sm\">
                <thead>
                  <tr className=\"border-b border-border\">
                    <th className=\"text-left py-2 px-3 text-muted-foreground font-normal\">Model ID</th>
                    <th className=\"text-right py-2 px-3 text-muted-foreground font-normal\">Input</th>
                    <th className=\"text-right py-2 px-3 text-muted-foreground font-normal\">Output</th>
                    <th className=\"text-left py-2 px-3 text-muted-foreground font-normal\">Modalities</th>
                  </tr>
                </thead>
                <tbody className=\"font-mono text-xs\">
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">gemini-3-pro</td><td className=\"py-2 px-3 text-right\">$2.00</td><td className=\"py-2 px-3 text-right\">$12.00</td><td className=\"py-2 px-3\">text, vision, audio, tools</td></tr>
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">gemini-3-flash</td><td className=\"py-2 px-3 text-right\">$0.50</td><td className=\"py-2 px-3 text-right\">$3.00</td><td className=\"py-2 px-3\">text, vision, audio, tools</td></tr>
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">gemini-2.5-pro</td><td className=\"py-2 px-3 text-right\">$1.25</td><td className=\"py-2 px-3 text-right\">$10.00</td><td className=\"py-2 px-3\">text, vision, audio, tools</td></tr>
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">gemini-2.5-flash</td><td className=\"py-2 px-3 text-right\">$0.30</td><td className=\"py-2 px-3 text-right\">$2.50</td><td className=\"py-2 px-3\">text, vision, audio, tools</td></tr>
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">gemini-2.5-flash-lite</td><td className=\"py-2 px-3 text-right\">$0.15</td><td className=\"py-2 px-3 text-right\">$0.60</td><td className=\"py-2 px-3\">text, vision, tools</td></tr>
                  <tr className=\"border-b border-border/50\"><td className=\"py-2 px-3\">gemini-2.0-flash-thinking</td><td className=\"py-2 px-3 text-right\">$0.40</td><td className=\"py-2 px-3 text-right\">$3.00</td><td className=\"py-2 px-3\">text, tools</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Footer */}
          <section className=\"mb-8 border-t border-border pt-8\">
            <div className=\"flex items-center justify-between\">
              <div>
                <div className=\"text-sm text-muted-foreground\">Need help?</div>
                <div className=\"text-sm\">
                  <a href=\"https://replit.com\" className=\"text-foreground underline\">Contact Support</a>
                </div>
              </div>
              <div className=\"text-sm text-muted-foreground\">
                Last updated: January 2025
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}