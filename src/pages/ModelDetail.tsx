import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { models } from "../data/models";

export default function ModelDetail() {
  const { id } = useParams();
  const model = models.find((m) => m.id === id) || models[0]; // fallback for demo
  const [activeTab, setActiveTab] = useState("overview");
  const [codeLang, setCodeLang] = useState("typescript");
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState("https://your-deployment.replit.app");

  useEffect(() => {
    if (typeof window !== "undefined") setBaseUrl(window.location.origin);
  }, []);

  const codeSnippets: Record<string, string> = {
    typescript: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${baseUrl}/api",
  apiKey: process.env.SWITCHBOARD_API_KEY, // Generate at /keys
});

const response = await client.chat.completions.create({
  model: "${model.id}",
  messages: [{ role: "user", content: "Hello!" }],
});

console.log(response.choices[0].message.content);`,
    python: `from openai import OpenAI
import os

client = OpenAI(
    base_url="${baseUrl}/api",
    api_key=os.environ["SWITCHBOARD_API_KEY"],  # Generate at /keys
)

response = client.chat.completions.create(
    model="${model.id}",
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.choices[0].message.content)`,
    curl: `curl ${baseUrl}/api/chat \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SWITCHBOARD_API_KEY" \\
  -d '{
    "modelId": "${model.id}",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`,
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeSnippets[codeLang]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in overflow-y-auto">
      <header className="px-8 py-6 border-b border-border bg-card">
        <Link to="/models" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-mono mb-6 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to catalog
        </Link>
        
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded bg-muted grid place-items-center font-bold text-lg">
              {model.provider[0]}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{model.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground font-mono">
                <span>{model.provider}</span>
                <span>•</span>
                <span>{model.id}</span>
                <span>•</span>
                <span className="px-1.5 py-0.5 rounded bg-accent text-xs">v{new Date().getFullYear()}.{new Date().getMonth() + 1}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/chat" className="px-4 py-2 bg-foreground text-background rounded-md font-medium text-sm hover:bg-foreground/90 transition-colors">
              Try in Chat
            </Link>
          </div>
        </div>

        {/* Big Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
          <div className="p-4 rounded-lg border border-border bg-muted/10">
            <div className="text-xs text-muted-foreground font-mono mb-1">Input (1M tokens)</div>
            <div className="text-xl font-bold font-mono">${model.inputPrice.toFixed(2)}</div>
          </div>
          <div className="p-4 rounded-lg border border-border bg-muted/10">
            <div className="text-xs text-muted-foreground font-mono mb-1">Output (1M tokens)</div>
            <div className="text-xl font-bold font-mono">${model.outputPrice.toFixed(2)}</div>
          </div>
          <div className="p-4 rounded-lg border border-border bg-muted/10">
            <div className="text-xs text-muted-foreground font-mono mb-1">Context Window</div>
            <div className="text-xl font-bold font-mono">
              {model.contextWindow >= 1000000 ? `${model.contextWindow / 1000000}M` : `${model.contextWindow / 1000}k`}
            </div>
          </div>
          <div className="p-4 rounded-lg border border-border bg-muted/10">
            <div className="text-xs text-muted-foreground font-mono mb-1">Throughput</div>
            <div className="text-xl font-bold font-mono">{model.throughput} t/s</div>
          </div>
          <div className="p-4 rounded-lg border border-border bg-muted/10">
            <div className="text-xs text-muted-foreground font-mono mb-1">TTFT (Latency)</div>
            <div className="text-xl font-bold font-mono text-green-400">{model.latency}ms</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 mt-8 border-b border-border">
          {["overview", "api", "benchmarks"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize transition-colors border-b-2 ${
                activeTab === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 p-8">
        {activeTab === "overview" && (
          <div className="max-w-4xl space-y-8">
            <section>
              <h3 className="text-lg font-bold mb-3">Description</h3>
              <p className="text-muted-foreground leading-relaxed">{model.description}</p>
            </section>
            
            <section>
              <h3 className="text-lg font-bold mb-3">Modalities</h3>
              <div className="flex flex-wrap gap-2">
                {model.modalities.map(m => (
                  <span key={m} className="px-3 py-1 rounded bg-accent text-accent-foreground text-sm font-mono uppercase">
                    {m}
                  </span>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === "api" && (
          <div className="max-w-4xl space-y-6">
            <h3 className="text-lg font-bold mb-3">Integration Example</h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
                <div className="flex gap-2">
                  {["typescript", "python", "curl"].map(lang => (
                    <button
                      key={lang}
                      onClick={() => setCodeLang(lang)}
                      className={`text-xs font-mono px-2 py-1 rounded ${codeLang === lang ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
                <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors">
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-sm font-mono text-muted-foreground bg-background">
                <code>{codeSnippets[codeLang]}</code>
              </pre>
            </div>
          </div>
        )}

        {activeTab === "benchmarks" && (
          <div className="max-w-4xl">
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm font-mono">
                <thead className="bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Benchmark</th>
                    <th className="text-left px-4 py-3 font-medium">Metric</th>
                    <th className="text-right px-4 py-3 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-border">
                  <tr>
                    <td className="px-4 py-3 text-foreground">MMLU</td>
                    <td className="px-4 py-3 text-muted-foreground">5-shot</td>
                    <td className="px-4 py-3 text-right text-foreground font-bold">88.7%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-foreground">HumanEval</td>
                    <td className="px-4 py-3 text-muted-foreground">0-shot</td>
                    <td className="px-4 py-3 text-right text-foreground font-bold">92.3%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-foreground">GPQA</td>
                    <td className="px-4 py-3 text-muted-foreground">Diamond</td>
                    <td className="px-4 py-3 text-right text-foreground font-bold">53.1%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-foreground">MATH</td>
                    <td className="px-4 py-3 text-muted-foreground">4-shot</td>
                    <td className="px-4 py-3 text-right text-foreground font-bold">71.5%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}