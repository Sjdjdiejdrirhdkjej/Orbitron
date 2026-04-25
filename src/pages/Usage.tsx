import React from "react";
import { models } from "../data/models";

export default function Usage() {
  return (
    <div className="flex flex-col h-full animate-fade-in p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usage</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Analytics across all your keys and models.</p>
        </div>
        <select className="bg-background border border-border rounded-md px-3 py-1.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary">
          <option>Last 30 Days</option>
          <option>Last 7 Days</option>
          <option>Last 24 Hours</option>
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Spend", value: "$412.50", change: "+12%" },
          { label: "Requests", value: "245,091", change: "+5%" },
          { label: "Tokens Processed", value: "84.2M", change: "+18%" },
          { label: "Error Rate", value: "0.04%", change: "-0.01%" },
        ].map(stat => (
          <div key={stat.label} className="p-5 border border-border rounded-lg bg-card">
            <div className="text-sm font-mono text-muted-foreground mb-2">{stat.label}</div>
            <div className="flex items-end justify-between">
              <div className="text-2xl font-bold font-mono">{stat.value}</div>
              <div className={`text-xs font-mono ${stat.change.startsWith('+') && stat.label !== "Error Rate" ? 'text-green-400' : stat.label === "Error Rate" ? 'text-green-400' : 'text-red-400'}`}>
                {stat.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border border-border rounded-lg bg-card p-6 mb-8">
        <h3 className="font-medium mb-6">Spend over time</h3>
        <div className="h-48 w-full flex items-end gap-1">
          {Array.from({ length: 30 }).map((_, i) => {
            const height = Math.random() * 80 + 20;
            return (
              <div key={i} className="flex-1 bg-primary/20 hover:bg-primary/40 transition-colors relative group rounded-t-sm" style={{ height: `${height}%` }}>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                  ${(height * 0.5).toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h3 className="font-medium mb-4">Top Models by Spend</h3>
          <div className="space-y-4">
            {models.slice(0, 5).map((m, i) => {
              const pct = 100 - i * 15;
              return (
                <div key={m.id}>
                  <div className="flex justify-between text-sm mb-1 font-mono">
                    <span>{m.name}</span>
                    <span className="text-muted-foreground">${(pct * 2.4).toFixed(2)}</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div>
          <h3 className="font-medium mb-4">Top Models by Requests</h3>
          <div className="space-y-4">
            {[models[1], models[6], models[5], models[0], models[3]].map((m, i) => {
              const pct = 100 - i * 18;
              return (
                <div key={m.id}>
                  <div className="flex justify-between text-sm mb-1 font-mono">
                    <span>{m.name}</span>
                    <span className="text-muted-foreground">{(pct * 1420).toFixed(0)} req</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
}