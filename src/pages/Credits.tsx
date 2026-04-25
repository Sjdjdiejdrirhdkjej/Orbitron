import { CreditCard, Wallet, ArrowRight } from "lucide-react";

/**
 * Billing & Credits.
 *
 * Switchboard does not yet have a payment provider integration, so this page
 * intentionally renders a clean "not configured" empty state instead of
 * fabricated balances, transactions, or invoices. Once Stripe (or similar)
 * is wired up, the empty cards below become live data.
 */
export default function Credits() {
  return (
    <div className="flex flex-col h-full animate-fade-in p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
        Billing & Credits
      </h1>
      <p className="text-muted-foreground font-mono text-xs sm:text-sm mb-6 sm:mb-8">
        Real balance, transactions, and invoices will appear here once a payment
        provider is connected.
      </p>

      <div className="grid md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="md:col-span-2 border border-border rounded-lg bg-card p-6 flex flex-col justify-between">
          <div>
            <div className="text-sm font-mono text-muted-foreground mb-2">
              Available Balance
            </div>
            <div className="text-4xl font-bold font-mono text-muted-foreground/60">
              —
            </div>
            <p className="text-xs text-muted-foreground mt-3 max-w-md">
              No payment method on file. Connect billing to load credits and
              enable auto-topup.
            </p>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              disabled
              title="Billing integration not configured"
              className="px-4 py-2 bg-foreground/40 text-background rounded-md font-medium text-sm cursor-not-allowed"
            >
              Add Credits
            </button>
            <span className="text-xs font-mono text-muted-foreground self-center">
              (unavailable)
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
