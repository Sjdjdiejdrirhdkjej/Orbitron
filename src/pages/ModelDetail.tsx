import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Copy, Check, BarChart3 } from "lucide-react";
import { models } from "../data/models";
import { ProviderIcon } from "../components/ProviderIcon";

interface MeasuredStats {
  latencyMs: number | null;
  throughput: number | null;
  sampleSize: number;
}

export default function ModelDetail() {
  const { id } = useParams();
  const model = models.find((m) => m.id === id) || models[0]; // fallback for demo
  const [activeTab, setActiveTab] = useState("overview");
  const [codeLang, setCodeLang] = useState("typescript");
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState("https://your-deployment.replit.app");
  const [stats, setStats] = useState<MeasuredStats>({
    latencyMs: null,
    throughput: null,
    sampleSize: 0,
  });

  useEffect(() => {
    if (typeof window !== "undefined") setBaseUrl(window.location.origin);
  }, []);

  // Pull measured latency/throughput for this model.
  useEffect(() => {
    if (!model?.id) return;
    let cancelled = false;
    fetch(`/api/models/${encodeURIComponent(model.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          data: {
            latency_ms: number | null;
            throughput_tokens_per_second: number | null;
            measured_sample_size?: number;
          } | null,
        ) => {
          if (cancelled || !data) return;
          setStats({
            latencyMs: data.latency_ms,
            throughput: data.throughput_tokens_per_second,
            sampleSize: data.measured_sample_size ?? 0,
          });
        },
      )
      .catch(() => {
        /* leave defaults */
      });
    return () => {
      cancelled = true;
    };
  }, [model?.id]);

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
      <header className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-border bg-card">
        <Link to="/models" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-mono mb-4 sm:mb-6 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to catalog
        </Link>
        
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-muted grid place-items-center shrink-0">
              <ProviderIcon provider={model.provider} className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">{model.name}</h1>
              <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-muted-foreground font-mono flex-wrap">
                <span>{model.provider}</span>
                <span>•</span>
                <span className="truncate max-w-[180px] sm:max-w-none">{model.id}</span>
                {stats.sampleSize > 0 && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span
                      className="px-1.5 py-0.5 rounded bg-accent text-xs"
                      title="Stats based on real measurements from your recent chats"
                    >
                      {stats.sampleSize} measured calls
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/chat" className="px-3 sm:px-4 py-2 bg-foreground text-background rounded-md font-medium text-sm hover:bg-foreground/90 transition-colors whitespace-nowrap">
              Try in Chat
            </Link>
          </div>
        </div>

        {/* Big Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mt-6 sm:mt-8">
          <div className="p-3 sm:p-4 rounded-lg border border-border bg-muted/10">
            <div className="text-xs text-muted-foreground font-mono mb-1">Input (1M)</div>
            <div className="text-lg sm:text-xl font-bold font-mono">${model.inputPrice.toFixed(2)}</div>
          </div>
          <div className="p-3 sm:p-4 rounded-lg border border-border bg-muted/10">
            <div className="text-xs text-muted-foreground font-mono mb-1">Output (1M)</div>
            <div className="text-lg sm:text-xl font-bold font-mono">${model.outputPrice.toFixed(2)}</div>
          </div>
          <div className="p-3 sm:p-4 rounded-lg border border-border bg-muted/10">
            <div className="text-xs text-muted-foreground font-mono mb-1">Context</div>
            <div className="text-lg sm:text-xl font-bold font-mono">
              {model.contextWindow >= 1000000 ? `${model.contextWindow / 1000000}M` : `${model.contextWindow / 1000}k`}
            </div>
          </div>
          <div className="p-3 sm:p-4 rounded-lg border border-border bg-muted/10">
            <div
              className="text-xs text-muted-foreground font-mono mb-1"
              title="Average tokens per second across your last 7 days of chats"
            >
              Throughput
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono">
              {stats.throughput != null ? (
                `${stats.throughput} t/s`
              ) : (
                <span className="text-muted-foreground/60">—</span>
              )}
            </div>
          </div>
          <div className="p-3 sm:p-4 rounded-lg border border-border bg-muted/10 col-span-2 md:col-span-1">
            <div
              className="text-xs text-muted-foreground font-mono mb-1"
              title="Time to first token, measured from your real chats"
            >
              TTFT (Latency)
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono">
              {stats.latencyMs != null ? (
                <span className="text-green-400">{stats.latencyMs}ms</span>
              ) : (
                <span className="text-muted-foreground/60">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-5 sm:gap-6 mt-6 sm:mt-8 border-b border-border overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          {["overview", "api", "benchmarks"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        {activeTab === "overview" && (
          <div className="max-w-4xl space-y-6 sm:space-y-8">
            <section>
              <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3">Description</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{model.description}</p>
            </section>
            
            <section>
              <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3">Modalities</h3>
              <div className="flex flex-wrap gap-2">
                {model.modalities.map(m => (
                  <span key={m} className="px-2.5 sm:px-3 py-1 rounded bg-accent text-accent-foreground text-xs sm:text-sm font-mono uppercase">
                    {m}
                  </span>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === "api" && (
          <div className="max-w-4xl space-y-4 sm:space-y-6">
            <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3">Integration Example</h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 sm:px-4 py-2">
                <div className="flex gap-1 sm:gap-2">
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
                <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <pre className="p-3 sm:p-4 overflow-x-auto text-xs sm:text-sm font-mono text-muted-foreground bg-background">
                <code>{codeSnippets[codeLang]}</code>
              </pre>
            </div>
          </div>
        )}

        {activeTab === "benchmarks" && (
          <div className="max-w-4xl">
            <div className="border border-dashed border-border rounded-lg bg-card/30 p-8 sm:p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/40 grid place-items-center mx-auto mb-4">
                <BarChart3 className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="font-bold text-sm mb-1">No benchmark data yet</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                Switchboard hasn't published independent benchmark scores for{" "}
                <span className="font-mono">{model.id}</span>. Once we run a
                standard suite (MMLU, HumanEval, GPQA, etc.) the results will
                show up here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}