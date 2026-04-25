import React from "react";
import { Check } from "lucide-react";
import { models } from "../data/models";

export default function Pricing() {
  return (
    <div className="animate-fade-in">
      <header className="pt-20 sm:pt-32 pb-12 sm:pb-16 px-4 text-center max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tighter mb-4 sm:mb-6">Simple, transparent pricing.</h1>
        <p className="text-base sm:text-xl text-muted-foreground font-mono text-sm md:text-base leading-relaxed">
          Pay per token with zero markup on provider prices. <br/> No monthly minimums. BYOK available for volume users.
        </p>
      </header>

      <section className="container mx-auto px-4 max-w-5xl mb-12 sm:mb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="p-6 sm:p-8 rounded-xl border border-border bg-card flex flex-col">
            <h3 className="text-xl sm:text-2xl font-bold mb-2">Free</h3>
            <p className="text-muted-foreground text-sm mb-6 h-10">Perfect for exploration and side projects.</p>
            <div className="text-3xl sm:text-4xl font-bold mb-4 sm:mb-6 font-mono">$0<span className="text-base sm:text-lg text-muted-foreground font-sans font-normal">/mo</span></div>
            <ul className="space-y-3 mb-8 flex-1 text-sm font-mono text-muted-foreground">
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Pay-per-token pricing</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Standard rate limits (60 RPM)</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Community support</li>
            </ul>
            <button className="w-full py-2 bg-foreground text-background rounded-md font-medium text-sm hover:bg-foreground/90 transition-colors">Get Started</button>
          </div>
          
          <div className="p-6 sm:p-8 rounded-xl border-2 border-primary bg-primary/5 flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Most Popular</div>
            <h3 className="text-xl sm:text-2xl font-bold mb-2">Pro</h3>
            <p className="text-muted-foreground text-sm mb-6 h-10">For startups and professional developers.</p>
            <div className="text-3xl sm:text-4xl font-bold mb-4 sm:mb-6 font-mono">$20<span className="text-base sm:text-lg text-muted-foreground font-sans font-normal">/mo</span></div>
            <ul className="space-y-3 mb-8 flex-1 text-sm font-mono text-muted-foreground">
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Pay-per-token pricing</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> 10x higher rate limits (600 RPM)</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Priority routing</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Optional: Bring Your Own Key (BYOK)</li>
            </ul>
            <button className="w-full py-2 bg-primary text-primary-foreground rounded-md font-medium text-sm hover:bg-primary/90 transition-colors">Upgrade to Pro</button>
          </div>

          <div className="p-6 sm:p-8 rounded-xl border border-border bg-card flex flex-col">
            <h3 className="text-xl sm:text-2xl font-bold mb-2">Enterprise</h3>
            <p className="text-muted-foreground text-sm mb-6 h-10">For large scale production workloads.</p>
            <div className="text-2xl sm:text-4xl font-bold mb-4 sm:mb-6 font-mono mt-2">Custom</div>
            <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8 flex-1 text-sm font-mono text-muted-foreground mt-2">
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Volume discounts</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Custom rate limits</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> SOC2 Report & SSO</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Dedicated success manager</li>
            </ul>
            <button className="w-full py-2 border border-border rounded-md font-medium text-sm hover:bg-muted transition-colors">Contact Sales</button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 max-w-5xl mb-12 sm:mb-24">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Model Pricing</h2>
        <div className="border border-border rounded-lg overflow-hidden bg-card overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[560px]">
            <thead className="bg-muted/30 text-muted-foreground font-mono text-xs uppercase">
              <tr>
                <th className="px-3 sm:px-6 py-3 sm:py-4 font-medium">Model</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 font-medium text-right">Context</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 font-medium text-right">Input</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 font-medium text-right">Output</th>
              </tr>
            </thead>
            <tbody className="divide-y border-border">
              {models.map(m => (
                <tr key={m.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <div className="font-medium text-foreground text-sm">{m.name}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5 hidden sm:block">{m.id}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-right font-mono text-muted-foreground whitespace-nowrap text-xs sm:text-sm">
                    {m.contextWindow >= 1000000 ? `${m.contextWindow / 1000000}M` : `${m.contextWindow / 1000}k`}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-right font-mono whitespace-nowrap text-xs sm:text-sm">${m.inputPrice.toFixed(2)}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-right font-mono whitespace-nowrap text-xs sm:text-sm">${m.outputPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}