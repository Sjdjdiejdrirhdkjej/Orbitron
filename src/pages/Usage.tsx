import { useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, Loader2 } from "lucide-react";

interface UsageSummary {
  windowDays: number;
  totals: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    errorRate: number;
  };
  daily: { date: string; costUsd: number; requests: number }[];
  topBySpend: { modelId: string; provider: string; costUsd: number }[];
  topByRequests: { modelId: string; provider: string; requests: number }[];
}

const WINDOWS = [
  { value: 30, label: "Last 30 Days" },
  { value: 7, label: "Last 7 Days" },
  { value: 1, label: "Last 24 Hours" },
];

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatUsd(n: number): string {
  if (n === 0) return "$0.00";
  if (n < 0.01) return "<$0.01";
  return `$${n.toFixed(2)}`;
}

export default function Usage() {
  const [windowDays, setWindowDays] = useState(30);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/usage?days=${windowDays}`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body?.error?.message || `Failed: ${r.status}`);
        }
        return (await r.json()) as UsageSummary;
      })
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [windowDays]);

  const isEmpty = !!summary && summary.totals.requests === 0;
  const maxDailyCost = useMemo(() => {
    if (!summary) return 0;
    return Math.max(0, ...summary.daily.map((d) => d.costUsd));
  }, [summary]);
  const maxSpend = useMemo(
    () => Math.max(0, ...(summary?.topBySpend.map((m) => m.costUsd) ?? [])),
    [summary],
  );
  const maxReq = useMemo(
    () => Math.max(0, ...(summary?.topByRequests.map((m) => m.requests) ?? [])),
    [summary],
  );

  return (
    <div className="flex flex-col h-full animate-fade-in p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Usage</h1>
          <p className="text-muted-foreground font-mono text-xs sm:text-sm mt-1">
            Real analytics across all your keys and models.
          </p>
        </div>
        <select
          value={windowDays}
          onChange={(e) => setWindowDays(Number(e.target.value))}
          className="bg-background border border-border rounded-md px-3 py-1.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto"
        >
          {WINDOWS.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 mb-6 flex items-start gap-3 text-sm">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <div>
            <div className="font-medium text-red-400 mb-0.5">Couldn't load usage</div>
            <div className="text-xs font-mono text-muted-foreground break-words">{error}</div>
          </div>
        </div>
      )}

      {loading && !summary && (
        <div className="flex-1 grid place-items-center text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-xs font-mono">Loading usage…</span>
        </div>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {[
              { label: "Total Spend", value: formatUsd(summary.totals.costUsd) },
              { label: "Requests", value: summary.totals.requests.toLocaleString() },
              {
                label: "Tokens Processed",
                value: formatTokens(
                  summary.totals.inputTokens + summary.totals.outputTokens,
                ),
              },
              {
                label: "Error Rate",
                value: `${(summary.totals.errorRate * 100).toFixed(2)}%`,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-4 sm:p-5 border border-border rounded-lg bg-card"
              >
                <div className="text-xs sm:text-sm font-mono text-muted-foreground mb-2">
                  {stat.label}
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono truncate">
                  {isEmpty ? "—" : stat.value}
                </div>
              </div>
            ))}
          </div>

          {isEmpty ? (
            <div className="border border-dashed border-border rounded-lg bg-card/30 p-10 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/40 grid place-items-center mx-auto mb-4">
                <Activity className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="font-bold text-sm mb-1">No usage yet</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                Start a chat or generate an image and your spend, request volume,
                and per-model breakdowns will show up here automatically.
              </p>
              <div className="flex items-center justify-center gap-2 mt-5 text-xs font-mono">
                <a
                  href="/chat"
                  className="px-3 py-1.5 rounded-md bg-foreground text-background hover:bg-foreground/90 transition-colors"
                >
                  Open Chat
                </a>
                <a
                  href="/images"
                  className="px-3 py-1.5 rounded-md border border-border hover:bg-muted/40 transition-colors"
                >
                  Generate Image
                </a>
              </div>
            </div>
          ) : (
            <>
              <div className="border border-border rounded-lg bg-card p-6 mb-8">
                <h3 className="font-medium mb-6">Spend over time</h3>
                <div className="h-48 w-full flex items-end gap-1">
                  {summary.daily.map((d) => {
                    const pct =
                      maxDailyCost > 0 ? (d.costUsd / maxDailyCost) * 100 : 0;
                    return (
                      <div
                        key={d.date}
                        className="flex-1 bg-primary/20 hover:bg-primary/40 transition-colors relative group rounded-t-sm min-h-[2px]"
                        style={{ height: `${Math.max(pct, d.costUsd > 0 ? 2 : 0)}%` }}
                      >
                        <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                          {d.date} · {formatUsd(d.costUsd)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
                <div>
                  <h3 className="font-medium mb-4">Top Models by Spend</h3>
                  {summary.topBySpend.length === 0 ? (
                    <p className="text-xs text-muted-foreground font-mono">
                      No spend yet in this window.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {summary.topBySpend.map((m) => {
                        const pct = maxSpend > 0 ? (m.costUsd / maxSpend) * 100 : 0;
                        return (
                          <div key={m.modelId}>
                            <div className="flex justify-between text-sm mb-1 font-mono">
                              <span className="truncate pr-2">{m.modelId}</span>
                              <span className="text-muted-foreground shrink-0">
                                {formatUsd(m.costUsd)}
                              </span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-medium mb-4">Top Models by Requests</h3>
                  {summary.topByRequests.length === 0 ? (
                    <p className="text-xs text-muted-foreground font-mono">
                      No requests yet in this window.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {summary.topByRequests.map((m) => {
                        const pct = maxReq > 0 ? (m.requests / maxReq) * 100 : 0;
                        return (
                          <div key={m.modelId}>
                            <div className="flex justify-between text-sm mb-1 font-mono">
                              <span className="truncate pr-2">{m.modelId}</span>
                              <span className="text-muted-foreground shrink-0">
                                {m.requests.toLocaleString()} req
                              </span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
