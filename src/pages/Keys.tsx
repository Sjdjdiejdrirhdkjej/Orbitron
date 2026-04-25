import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, MoreVertical, Copy, Check, AlertTriangle, Loader2, X } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  monthlyCapCents: number | null;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

function formatRelative(value: string | null): string {
  if (!value) return "Never";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "—";
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const m = Math.floor(diffSec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(value).toLocaleDateString();
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

export default function Keys() {
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCap, setNewCap] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<{ key: string; name: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/keys", { credentials: "include" });
      if (res.status === 401) {
        setKeys([]);
        setLoadError("Sign in to view your API keys.");
        return;
      }
      if (!res.ok) throw new Error(`Failed to load keys (${res.status})`);
      const data = (await res.json()) as { data: ApiKey[] };
      setKeys(data.data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load keys");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeKeys = useMemo(
    () => (keys ?? []).filter((k) => !k.revokedAt),
    [keys],
  );
  const revokedKeys = useMemo(
    () => (keys ?? []).filter((k) => k.revokedAt),
    [keys],
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const body: { name: string; monthlyCapCents?: number } = { name: newName.trim() };
      const capDollars = Number(newCap);
      if (newCap !== "" && Number.isFinite(capDollars) && capDollars >= 0) {
        body.monthlyCapCents = Math.floor(capDollars * 100);
      }
      const res = await fetch("/api/keys", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      const parsed = text ? JSON.parse(text) : null;
      if (!res.ok) {
        throw new Error(parsed?.error?.message || `Request failed (${res.status})`);
      }
      const { key, record } = parsed as { key: string; record: ApiKey };
      setKeys((prev) => [record, ...(prev ?? [])]);
      setRevealedKey({ key, name: record.name });
      setIsModalOpen(false);
      setNewName("");
      setNewCap("");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this key? Any apps using it will stop working immediately.")) return;
    setRevokingId(id);
    try {
      const res = await fetch(`/api/keys/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      await refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revoke");
    } finally {
      setRevokingId(null);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((v) => (v === id ? null : v)), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground font-mono text-xs sm:text-sm mt-1">
            Generate keys to call <code className="text-foreground">/api/chat</code> and{" "}
            <code className="text-foreground">/api/images</code> from your apps.
          </p>
        </div>
        <button
          onClick={() => {
            setCreateError(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-foreground text-background rounded-md font-medium text-sm hover:bg-foreground/90 transition-colors w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" /> Create Key
        </button>
      </div>

      {loadError && (
        <div className="mb-6 border border-yellow-500/40 bg-yellow-500/10 text-yellow-200 rounded-md px-4 py-3 text-sm font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {loadError}
        </div>
      )}

      {keys === null ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm font-mono">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
        </div>
      ) : activeKeys.length === 0 && revokedKeys.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-6 sm:p-8 text-center text-sm text-muted-foreground">
          <p className="font-mono">No keys yet.</p>
          <p className="mt-1">Click <span className="text-foreground">Create Key</span> to generate your first Switchboard API key.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[640px]">
            <thead className="bg-muted/30 text-muted-foreground font-mono text-xs uppercase">
              <tr>
                <th className="px-4 sm:px-6 py-4 font-medium">Name & Prefix</th>
                <th className="px-4 sm:px-6 py-4 font-medium">Created</th>
                <th className="px-4 sm:px-6 py-4 font-medium">Last Used</th>
                <th className="px-4 sm:px-6 py-4 font-medium text-right">Monthly Cap</th>
                <th className="px-4 sm:px-6 py-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y border-border">
              {[...activeKeys, ...revokedKeys].map((key) => (
                <tr key={key.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 sm:px-6 py-4">
                    <div className="font-medium text-foreground mb-1 flex items-center gap-2">
                      {key.name}
                      {key.revokedAt && (
                        <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-mono uppercase">
                          revoked
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground font-mono text-xs">
                      {key.prefix}…
                      <button
                        onClick={() => copyToClipboard(key.prefix, key.id)}
                        className="hover:text-foreground"
                        title="Copy prefix"
                      >
                        {copiedId === key.id ? (
                          <Check className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-muted-foreground font-mono text-xs whitespace-nowrap">
                    {formatDate(key.createdAt)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-muted-foreground font-mono text-xs whitespace-nowrap">
                    {formatRelative(key.lastUsedAt)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right font-mono whitespace-nowrap">
                    {key.monthlyCapCents == null ? (
                      <span className="text-muted-foreground">No cap</span>
                    ) : (
                      <span className="text-foreground">
                        ${(key.monthlyCapCents / 100).toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right">
                    {key.revokedAt ? (
                      <span className="text-muted-foreground/60 text-xs font-mono">—</span>
                    ) : (
                      <button
                        onClick={() => handleRevoke(key.id)}
                        disabled={revokingId === key.id}
                        className="text-muted-foreground hover:text-red-400 text-xs font-mono px-2 py-1 rounded hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        title="Revoke this key"
                      >
                        {revokingId === key.id ? "…" : "Revoke"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !creating && setIsModalOpen(false)}
        >        <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md p-4 sm:p-6 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg sm:text-xl font-bold mb-4">Create API Key</h2>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div>
                <label className="block text-sm font-medium mb-1.5 font-mono text-muted-foreground">
                  Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Production App"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 font-mono text-muted-foreground">
                  Monthly Spend Cap ($)
                  <span className="ml-1 text-xs">(optional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newCap}
                  onChange={(e) => setNewCap(e.target.value)}
                  placeholder="e.g. 100"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {createError && (
                <div className="text-xs font-mono text-red-400 border border-red-500/40 bg-red-500/10 rounded-md px-3 py-2">
                  {createError}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={creating}
                  className="px-4 py-2 border border-border rounded-md font-medium text-sm hover:bg-accent transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="px-4 py-2 bg-foreground text-background rounded-md font-medium text-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
                >
                  {creating ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reveal modal — shown ONCE after key creation */}
      {revealedKey && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-lg p-4 sm:p-6 animate-fade-in">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold">Save your API key</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  This is the only time we'll show <span className="text-foreground">{revealedKey.name}</span>'s
                  full secret. Copy it somewhere safe — we don't store it in plaintext.
                </p>
              </div>
              <button
                onClick={() => setRevealedKey(null)}
                className="p-1 -mt-1 -mr-1 text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-background border border-border rounded-md p-3 font-mono text-xs break-all flex items-center justify-between gap-3">
              <span>{revealedKey.key}</span>
              <button
                onClick={() => copyToClipboard(revealedKey.key, "reveal")}
                className="shrink-0 px-3 py-1 border border-border rounded-md text-xs font-medium hover:bg-accent transition-colors flex items-center gap-1.5"
              >
                {copiedId === "reveal" ? (
                  <>
                    <Check className="w-3 h-3 text-green-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 text-xs font-mono text-muted-foreground border border-border rounded-md bg-muted/20 px-3 py-2">
              Use it as <span className="text-foreground">Authorization: Bearer …</span> when calling Switchboard APIs.
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setRevealedKey(null)}
                className="px-4 py-2 bg-foreground text-background rounded-md font-medium text-sm hover:bg-foreground/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
