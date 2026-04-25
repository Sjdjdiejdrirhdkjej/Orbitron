import { useEffect, useState } from "react";
import { CreditCard, Wallet, ArrowRight, Gift, Sparkles } from "lucide-react";

interface Grant {
  id: string;
  amountCents: number;
  amountUsd: number;
  reason: string;
  description: string | null;
  createdAt: string;
}

interface CreditsResponse {
  balanceCents: number;
  balanceUsd: number;
  welcomeGrantedAt: string | null;
  legacyGrantedAt: string | null;
  grants: Grant[];
}

const REASON_LABEL: Record<string, string> = {
  welcome: "Welcome bonus",
  legacy_bonus: "Launch bonus",
  topup: "Top-up",
  refund: "Refund",
};

function formatUsd(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Billing & Credits.
 *
 * Real balance + grant history come from /api/credits. New users get a $5
 * welcome bonus on first sign-in; existing users received a one-time $100
 * launch bonus. Top-ups and invoices remain placeholders until a payment
 * provider is connected.
 */
export default function Credits() {
  const [data, setData] = useState<CreditsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/credits", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as CreditsResponse;
      })
      .then((j) => {
        if (!cancelled) setData(j);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? "Failed to load credits");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const balanceUsd = data?.balanceUsd ?? 0;
  const grants = data?.grants ?? [];

  return (
    <div className="flex flex-col h-full animate-fade-in p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
        Billing & Credits
      </h1>
      <p className="text-muted-foreground font-mono text-xs sm:text-sm mb-6 sm:mb-8">
        Your live balance and credit history. Paid top-ups and invoices will
        appear here once a payment provider is connected.
      </p>

      <div className="grid md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="md:col-span-2 border border-border rounded-lg bg-card p-6 flex flex-col justify-between">
          <div>
            <div className="text-sm font-mono text-muted-foreground mb-2">
              Available Balance
            </div>
            {loading ? (
              <div className="h-10 w-32 rounded bg-muted/40 animate-pulse" />
            ) : error ? (
              <div className="text-sm text-destructive font-mono">{error}</div>
            ) : (
              <div className="text-4xl font-bold font-mono">
                {formatUsd(balanceUsd)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-3 max-w-md">
              {data?.welcomeGrantedAt && !data?.legacyGrantedAt
                ? "Includes your $5 welcome bonus. Use it across any model — credits never expire."
                : data?.legacyGrantedAt
                  ? "Includes a one-time $100 launch bonus for early accounts. Thanks for being here from the start."
                  : "Credits never expire and can be used across every model."}
            </p>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              disabled
              title="Paid top-ups not yet available — billing integration pending"
              className="px-4 py-2 bg-foreground/40 text-background rounded-md font-medium text-sm cursor-not-allowed"
            >
              Add Credits
            </button>
            <span className="text-xs font-mono text-muted-foreground self-center">
              (top-ups coming soon)
            </span>
          </div>
        </div>

        <div className="border border-border rounded-lg bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-medium">Payment Methods</h3>
          </div>
          <div className="border border-dashed border-border rounded p-4 text-center">
            <p className="text-xs text-muted-foreground font-mono">
              No payment methods.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 sm:space-y-8">
        <section>
          <h3 className="font-medium mb-4">Recent Transactions</h3>
          {loading ? (
            <div className="border border-border rounded-lg bg-card divide-y divide-border">
              {[0, 1].map((i) => (
                <div key={i} className="p-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-muted/40 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 rounded bg-muted/40 animate-pulse" />
                    <div className="h-2 w-48 rounded bg-muted/30 animate-pulse" />
                  </div>
                  <div className="h-4 w-16 rounded bg-muted/40 animate-pulse" />
                </div>
              ))}
            </div>
          ) : grants.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg bg-card/30 p-10 text-center">
              <div className="w-10 h-10 rounded-full bg-muted/40 grid place-items-center mx-auto mb-3">
                <Wallet className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">No transactions yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Top-ups and usage charges will be listed here once billing is
                connected.
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-lg bg-card overflow-hidden">
              <div className="divide-y divide-border">
                {grants.map((g) => {
                  const Icon = g.reason === "welcome" ? Sparkles : Gift;
                  return (
                    <div
                      key={g.id}
                      className="p-4 flex items-center gap-4"
                      data-testid={`grant-${g.reason}`}
                    >
                      <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-500 grid place-items-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {REASON_LABEL[g.reason] ?? g.reason}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono truncate">
                          {g.description ?? ""} · {formatDate(g.createdAt)}
                        </div>
                      </div>
                      <div className="text-sm font-bold font-mono text-emerald-500 shrink-0">
                        +{formatUsd(g.amountUsd)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section>
          <h3 className="font-medium mb-4">Invoices</h3>
          <div className="border border-dashed border-border rounded-lg bg-card/30 p-10 text-center">
            <p className="text-sm font-medium mb-1">No invoices issued</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              You can track real spend in the meantime on the{" "}
              <a
                href="/usage"
                className="underline hover:text-foreground inline-flex items-center gap-1"
              >
                Usage page <ArrowRight className="w-3 h-3" />
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
