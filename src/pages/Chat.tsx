import React from "react";
import { Settings2, Send, Paperclip } from "lucide-react";
import { models } from "../data/models";

export default function Chat() {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* History Sidebar */}
      <div className="w-64 border-r border-border bg-background hidden lg:flex flex-col">
        <div className="p-3 border-b border-border">
          <button className="w-full flex items-center justify-center gap-2 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/90 transition-colors">
            + New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1.5 text-xs font-mono text-muted-foreground mt-2">Today</div>
          <button className="w-full text-left px-3 py-2 text-sm rounded bg-accent text-accent-foreground truncate">
            Memoize React Hook
          </button>
          <button className="w-full text-left px-3 py-2 text-sm rounded hover:bg-muted text-muted-foreground truncate transition-colors">
            Postgres JSONB query
          </button>
          <div className="px-2 py-1.5 text-xs font-mono text-muted-foreground mt-4">Yesterday</div>
          <button className="w-full text-left px-3 py-2 text-sm rounded hover:bg-muted text-muted-foreground truncate transition-colors">
            Explain Transformer Architecture
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-muted/10 relative">
        <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background z-10 shadow-sm">
          <select className="bg-transparent font-mono text-sm border-none focus:ring-0 cursor-pointer p-0 font-bold">
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground">
            <span>$0.00042</span>
            <button className="p-1.5 hover:bg-accent rounded-md transition-colors lg:hidden">
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 pb-32">
          {/* Messages */}
          <div className="max-w-3xl mx-auto flex gap-4 animate-fade-in">
            <div className="w-8 h-8 rounded bg-primary/20 text-primary grid place-items-center font-bold text-xs shrink-0 mt-1">U</div>
            <div className="flex-1 space-y-2">
              <div className="font-bold text-sm">User</div>
              <p className="text-sm leading-relaxed">How do I properly memoize a React hook that returns an object containing functions? The consumers of my hook keep triggering re-renders because the object reference changes.</p>
            </div>
          </div>

          <div className="max-w-3xl mx-auto flex gap-4 animate-fade-in stagger-1">
            <div className="w-8 h-8 rounded bg-foreground text-background grid place-items-center font-bold text-xs shrink-0 mt-1">A</div>
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">Claude Sonnet 4.5</span>
                <span className="text-xs font-mono text-muted-foreground border border-border px-1.5 rounded bg-muted/30">242ms</span>
              </div>
              <p className="text-sm leading-relaxed">To prevent re-renders when returning an object of functions from a custom hook, you need to memoize both the functions themselves (using <code>useCallback</code>) and the returned object (using <code>useMemo</code>).</p>
              <div className="rounded-md border border-border bg-card overflow-hidden">
                <div className="bg-muted/30 px-3 py-1.5 border-b border-border text-xs font-mono text-muted-foreground">useCounter.ts</div>
                <pre className="p-4 text-sm font-mono overflow-x-auto text-muted-foreground">
                  <code>
<span className="text-blue-400">import</span> {`{ useState, useCallback, useMemo }`} <span className="text-blue-400">from</span> <span className="text-green-400">'react'</span>;{`\n\n`}
<span className="text-blue-400">export function</span> <span className="text-yellow-200">useCounter</span>() {`{`}{`\n`}
{'  '}<span className="text-blue-400">const</span> [count, setCount] = <span className="text-yellow-200">useState</span>(0);{`\n\n`}
{'  '}<span className="text-blue-400">const</span> increment = <span className="text-yellow-200">useCallback</span>(() =&gt; setCount(c =&gt; c + 1), []);{`\n`}
{'  '}<span className="text-blue-400">const</span> decrement = <span className="text-yellow-200">useCallback</span>(() =&gt; setCount(c =&gt; c - 1), []);{`\n\n`}
{'  '}<span className="text-muted-foreground/50">// Memoize the return object</span>{`\n`}
{'  '}<span className="text-blue-400">return</span> <span className="text-yellow-200">useMemo</span>(() =&gt; ({`{`}{`\n`}
{'    '}count,{`\n`}
{'    '}increment,{`\n`}
{'    '}decrement{`\n`}
{'  '}{`}`}), [count, increment, decrement]);{`\n`}
{`}`}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Composer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-10">
          <div className="max-w-3xl mx-auto relative border border-border bg-card rounded-xl shadow-lg focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
            <textarea 
              className="w-full bg-transparent p-4 min-h-[100px] resize-none focus:outline-none text-sm placeholder:text-muted-foreground"
              placeholder="Ask anything..."
            />
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
              <button className="p-2 hover:bg-muted text-muted-foreground rounded-md transition-colors">
                <Paperclip className="w-4 h-4" />
              </button>
              <button className="bg-foreground text-background p-2 rounded-md hover:bg-foreground/90 transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="text-center mt-2 text-xs font-mono text-muted-foreground">
            Switchboard can make mistakes. Check important info.
          </div>
        </div>
      </div>

      {/* Settings Sidebar */}
      <div className="w-72 border-l border-border bg-background hidden lg:block overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h3 className="font-bold text-sm">Parameters</h3>
        </div>
        <div className="p-4 space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <label>Temperature</label>
              <span className="text-muted-foreground">0.7</span>
            </div>
            <input type="range" min="0" max="2" step="0.1" defaultValue="0.7" className="w-full accent-primary" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <label>Max Tokens</label>
              <span className="text-muted-foreground">4096</span>
            </div>
            <input type="range" min="1" max="8192" step="1" defaultValue="4096" className="w-full accent-primary" />
          </div>
          <div className="space-y-3 pt-4 border-t border-border">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" className="rounded border-border text-primary focus:ring-primary bg-background" />
              JSON Mode
            </label>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-border text-primary focus:ring-primary bg-background" />
              Tool Use (Auto)
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
