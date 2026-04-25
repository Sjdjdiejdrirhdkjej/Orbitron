import { useEffect, useState } from "react";
import { CopyButton } from "../components/CopyButton";

export default function Landing() {
  const [baseUrl, setBaseUrl] = useState("https://your-deployment.replit.app");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const heroCode = `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${baseUrl}/api",
  apiKey: "YOUR_SWITCHBOARD_API_KEY",
});

const response = await client.chat.completions.create({
  model: "claude-sonnet-4.6", // Just change this
  messages: [
    { role: "user", content: "Explain quantum gravity" }
  ],
});`;

  return (
    <div className="flex flex-col animate-fade-in">
      <section className="pt-20 sm:pt-32 pb-16 sm:pb-24 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-blue-500/30 blur-[100px] rounded-full" />
        </div>
        
        <div className="container mx-auto text-center max-w-4xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-border text-sm font-mono text-muted-foreground mb-8">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            OpenAI · Anthropic · Google · one API
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-8xl font-bold tracking-tighter mb-6 sm:mb-8 leading-[1.1]">
            One API. <br />
            Every <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/50">Frontier</span> Model.
          </h1>
          
          <p className="text-base sm:text-xl text-muted-foreground mb-8 sm:mb-12 max-w-2xl mx-auto font-mono text-sm md:text-base leading-relaxed">
            Switchboard is the neutral infrastructure for AI. Access every frontier model from OpenAI, Anthropic, and Google through a single API key. Transparent per-token pricing. Zero markup.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <a href="/signup" className="h-12 sm:h-14 px-6 sm:px-8 inline-flex items-center justify-center rounded-md bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors w-full sm:w-auto text-sm sm:text-base">
              Get your API key
            </a>
            <a href="/docs" className="h-12 sm:h-14 px-6 sm:px-8 inline-flex items-center justify-center rounded-md border border-input bg-background font-medium hover:bg-accent hover:text-accent-foreground transition-colors w-full sm:w-auto font-mono text-sm">
              Read Docs
            </a>
          </div>
          <p className="mt-4 text-xs font-mono text-muted-foreground">
            Already have an account? <a href="/keys" className="underline hover:text-foreground">Manage your keys →</a>
          </p>
        </div>
      </section>

      {/* Code Demo Section */}
      <section className="py-12 sm:py-24 border-t border-border/50 bg-muted/10">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">Standardized across providers.</h2>
              <p className="text-muted-foreground mb-4 sm:mb-6 font-mono text-sm">
                No more learning new SDKs. Switchboard perfectly emulates the OpenAI API format. Just change your base URL and pass the model name.
              </p>
              <ul className="space-y-4 mb-8 font-mono text-sm">
                <li className="flex items-start gap-2 sm:gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 text-primary grid place-items-center mt-0.5 shrink-0">✓</div>
                  Streaming support across all models
                </li>
                <li className="flex items-start gap-2 sm:gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 text-primary grid place-items-center mt-0.5 shrink-0">✓</div>
                  Unified tool calling format
                </li>
                <li className="flex items-start gap-2 sm:gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 text-primary grid place-items-center mt-0.5 shrink-0">✓</div>
                  Automated multimodal format translation
                </li>
              </ul>
            </div>
            
            <div className="rounded-lg sm:rounded-xl border border-border bg-card overflow-hidden shadow-xl sm:shadow-2xl">
              <div className="flex items-center px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="ml-4 font-mono text-xs text-muted-foreground">request.ts</div>
                <div className="ml-auto">
                  <CopyButton text={heroCode} />
                </div>
              </div>
              <div className="p-4 sm:p-6 overflow-x-auto text-sm font-mono leading-relaxed">
                <pre>
                  <code className="text-muted-foreground">
<span className="text-blue-400">import</span> OpenAI <span className="text-blue-400">from</span> <span className="text-green-400">"openai"</span>;{`\n\n`}
<span className="text-blue-400">const</span> client = <span className="text-blue-400">new</span> OpenAI({`{`}{`\n`}
{'  '}baseURL: <span className="text-green-400">"{baseUrl}/api"</span>,{`\n`}
{'  '}apiKey: <span className="text-green-400">"YOUR_SWITCHBOARD_API_KEY"</span>,{`\n`}
{`}`});{`\n\n`}
<span className="text-blue-400">const</span> response = <span className="text-blue-400">await</span> client.chat.completions.create({`{`}{`\n`}
{'  '}model: <span className="text-green-400">"claude-sonnet-4.6"</span>, <span className="text-muted-foreground/50">// Just change this</span>{`\n`}
{'  '}messages: [{`\n`}
{'    '}{`{`} role: <span className="text-green-400">"user"</span>, content: <span className="text-green-400">"Explain quantum gravity"</span> {`}`}{`\n`}
{'  '}],{`\n`}
{`}`});
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
