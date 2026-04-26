import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface ProviderStatus {
  name: string;
  status: "operational" | "degraded" | "down";
  latencyMs: number;
  error?: string;
}

interface StatusPayload {
  status: "operational" | "degraded" | "down";
  checkedAt: string;
  providers: ProviderStatus[];
}

const STATUS_META: Record<
  "operational" | "degraded" | "down",
  { label: string; dotClass: string; textClass: string; Icon: typeof CheckCircle2 }
> = {
  operational: {
    label: "Operational",
    dotClass: "bg-green-500",
    textClass: "text-green-400",
    Icon: CheckCircle2,
  },
  degraded: {
    label: "Degraded performance",
    dotClass: "bg-yellow-500",
    textClass: "text-yellow-400",
    Icon: AlertTriangle,
  },
  down: {
    label: "Outage",
    dotClass: "bg-red-500",
    textClass: "text-red-400",
    Icon: XCircle,
  },
};

export default function Status() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as StatusPayload;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, []);

  const aggregate = data ? STATUS_META[data.status] : STATUS_META.operational;

  return (
    <div className="container mx-auto px-4 py-10 sm:py-16 max-w-3xl animate-fade-in">
      <div className="flex items-start justify-between mb-6 sm:mb-10 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-2">System Status</h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-mono">
            Live health of every upstream provider Switchboard routes through.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 border border-border rounded-md px-3 py-1.5 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Aggregate banner */}
      {data && (
        <div
          className={`rounded-xl border p-4 sm:p-5 mb-6 sm:mb-8 flex items-center gap-3 sm:gap-4 ${
            data.status === "operational"
              ? "border-green-500/30 bg-green-500/5"
              : data.status === "degraded"
                ? "border-yellow-500/30 bg-yellow-500/5"
                : "border-red-500/30 bg-red-500/5"
          }`}
        >
          <aggregate.Icon className={`w-6 h-6 shrink-0 ${aggregate.textClass}`} />
          <div className="min-w-0 flex-1">
            <div className={`font-bold text-base ${aggregate.textClass}`}>
              {data.status === "operational"
                ? "All systems operational"
                : data.status === "degraded"
                  ? "Some systems degraded"
                  : "Major outage detected"}
            </div>
            <div className="text-xs font-mono text-muted-foreground mt-0.5">
              Last checked {new Date(data.checkedAt).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 mb-8 text-sm">
          <div className="font-medium text-red-400 mb-0.5">Status check failed</div>
          <div className="text-xs font-mono text-muted-foreground">{error}</div>
        </div>
      )}

      {/* Initial skeleton */}
      {!data && !error && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-lg border border-border bg-muted/10 animate-pulse" />
          ))}
        </div>
      )}

      {/* Per-provider rows */}
      {data && (
        <div className="space-y-3">
          {data.providers.map((p) => {
            const meta = STATUS_META[p.status];
            return (
              <div
                key={p.name}
                className="rounded-lg border border-border bg-card px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3 sm:gap-4"
              >
                <div className={`w-2.5 h-2.5 rounded-full ${meta.dotClass} shrink-0`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="font-bold text-sm">{p.name}</div>
                    <span className={`text-xs font-mono ${meta.textClass}`}>{meta.label}</span>
                  </div>
                  {p.error && (
                    <div
                      className="text-xs font-mono text-muted-foreground mt-1 break-all"
                      title={p.error}
                    >
                      {p.error.length > 120 ? p.error.slice(0, 120) + "…" : p.error}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-mono font-bold">{p.latencyMs} ms</div>
                  <div className="text-[11px] font-mono text-muted-foreground">latency</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-10 text-xs font-mono text-muted-foreground text-center">
        Auto-refreshes every 60 seconds. Pings each provider with a 1-token completion. Cached server-side for 30s.
      </div>
    </div>
  );
}
