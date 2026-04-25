import React, { useState } from "react";
import { Plus, MoreVertical, Copy, Check } from "lucide-react";

export default function Keys() {
  const [keys, setKeys] = useState([
    { id: "1", name: "Production App", prefix: "sk-sb-v1-PrOd...", created: "2026-03-15", lastUsed: "2 mins ago", requests: 145000, spend: 342.50, cap: 1000 },
    { id: "2", name: "Staging", prefix: "sk-sb-v1-StAg...", created: "2026-04-01", lastUsed: "1 hr ago", requests: 12000, spend: 28.10, cap: 100 },
    { id: "3", name: "Dev (Alice)", prefix: "sk-sb-v1-AlIc...", created: "2026-01-10", lastUsed: "5 days ago", requests: 450, spend: 1.20, cap: 50 },
    { id: "4", name: "Analytics Cron", prefix: "sk-sb-v1-CrOn...", created: "2026-02-20", lastUsed: "12 hrs ago", requests: 8900, spend: 15.00, cap: 50 },
  ]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string) => {
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground font-mono text-xs sm:text-sm mt-1">Manage your access keys and limits.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-foreground text-background rounded-md font-medium text-sm hover:bg-foreground/90 transition-colors w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" /> Create Key
        </button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-card overflow-x-auto">
        <table className="w-full text-sm text-left min-w-[640px]">
          <thead className="bg-muted/30 text-muted-foreground font-mono text-xs uppercase">
            <tr>
              <th className="px-4 sm:px-6 py-4 font-medium">Name & Prefix</th>
              <th className="px-4 sm:px-6 py-4 font-medium">Created</th>
              <th className="px-4 sm:px-6 py-4 font-medium">Last Used</th>
              <th className="px-4 sm:px-6 py-4 font-medium text-right">30d Spend</th>
              <th className="px-4 sm:px-6 py-4 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y border-border">
            {keys.map((key) => (
              <tr key={key.id} className="hover:bg-muted/10 transition-colors">
                <td className="px-4 sm:px-6 py-4">
                  <div className="font-medium text-foreground mb-1">{key.name}</div>
                  <div className="flex items-center gap-2 text-muted-foreground font-mono text-xs">
                    {key.prefix}
                    <button onClick={() => handleCopy(key.id)} className="hover:text-foreground">
                      {copiedId === key.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-4 text-muted-foreground font-mono text-xs whitespace-nowrap">{key.created}</td>
                <td className="px-4 sm:px-6 py-4 text-muted-foreground font-mono text-xs whitespace-nowrap">{key.lastUsed}</td>
                <td className="px-4 sm:px-6 py-4 text-right font-mono whitespace-nowrap">
                  <div className="text-foreground">${key.spend.toFixed(2)}</div>
                  <div className="text-muted-foreground text-xs">/ ${key.cap} cap</div>
                </td>
                <td className="px-4 sm:px-6 py-4 text-right">
                  <button className="text-muted-foreground hover:text-foreground p-1">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md p-6 animate-fade-in">
            <h2 className="text-xl font-bold mb-4">Create API Key</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 font-mono text-muted-foreground">Name</label>
                <input type="text" placeholder="e.g. Production App" className="w-full bg-background border border-border rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 font-mono text-muted-foreground">Monthly Spend Cap ($)</label>
                <input type="number" placeholder="100" className="w-full bg-background border border-border rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-md font-medium text-sm hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-foreground text-background rounded-md font-medium text-sm hover:bg-foreground/90 transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}