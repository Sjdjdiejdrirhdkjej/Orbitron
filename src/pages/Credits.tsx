import React from "react";
import { Download, CreditCard, Plus } from "lucide-react";

export default function Credits() {
  return (
    <div className="flex flex-col h-full animate-fade-in p-8 overflow-y-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Billing & Credits</h1>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2 border border-border rounded-lg bg-card p-6 flex flex-col justify-between">
          <div>
            <div className="text-sm font-mono text-muted-foreground mb-2">Available Balance</div>
            <div className="text-4xl font-bold font-mono">$42.50</div>
          </div>
          <div className="flex gap-3 mt-6">
            <button className="px-4 py-2 bg-foreground text-background rounded-md font-medium text-sm hover:bg-foreground/90 transition-colors">
              Add Credits
            </button>
            <label className="flex items-center gap-2 text-sm font-medium border border-border px-4 py-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-border text-primary focus:ring-primary bg-background" />
              Auto-topup
            </label>
          </div>
        </div>
        
        <div className="border border-border rounded-lg bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-medium">Payment Methods</h3>
          </div>
          <div className="p-3 border border-border rounded flex justify-between items-center bg-muted/20 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-5 bg-background rounded border border-border flex items-center justify-center text-[10px] font-bold">VISA</div>
              <span className="font-mono text-sm">•••• 4242</span>
            </div>
            <span className="text-xs text-muted-foreground">Default</span>
          </div>
          <button className="w-full py-2 flex justify-center items-center gap-2 text-sm font-medium border border-border rounded-md hover:bg-muted/50 transition-colors text-muted-foreground">
            <Plus className="w-4 h-4" /> Add Method
          </button>
        </div>
      </div>

      <div className="space-y-8">
        <section>
          <h3 className="font-medium mb-4">Recent Transactions</h3>
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30 text-muted-foreground font-mono text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Description</th>
                  <th className="px-6 py-3 font-medium text-right">Amount</th>
                  <th className="px-6 py-3 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y border-border font-mono text-sm">
                <tr className="hover:bg-muted/10">
                  <td className="px-6 py-3 text-muted-foreground">Apr 15, 2026</td>
                  <td className="px-6 py-3">Auto-topup (Visa •••• 4242)</td>
                  <td className="px-6 py-3 text-right text-green-400">+$50.00</td>
                  <td className="px-6 py-3 text-right">$54.20</td>
                </tr>
                <tr className="hover:bg-muted/10">
                  <td className="px-6 py-3 text-muted-foreground">Apr 14, 2026</td>
                  <td className="px-6 py-3">Usage (Apr 7 - Apr 14)</td>
                  <td className="px-6 py-3 text-right text-foreground">-$45.80</td>
                  <td className="px-6 py-3 text-right">$4.20</td>
                </tr>
                <tr className="hover:bg-muted/10">
                  <td className="px-6 py-3 text-muted-foreground">Apr 7, 2026</td>
                  <td className="px-6 py-3">Usage (Mar 31 - Apr 7)</td>
                  <td className="px-6 py-3 text-right text-foreground">-$32.10</td>
                  <td className="px-6 py-3 text-right">$50.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3 className="font-medium mb-4">Invoices</h3>
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30 text-muted-foreground font-mono text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Invoice ID</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Amount</th>
                  <th className="px-6 py-3 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y border-border font-mono text-sm">
                <tr className="hover:bg-muted/10">
                  <td className="px-6 py-3 text-muted-foreground">Apr 15, 2026</td>
                  <td className="px-6 py-3">INV-2026-04</td>
                  <td className="px-6 py-3"><span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">Paid</span></td>
                  <td className="px-6 py-3 text-right">$50.00</td>
                  <td className="px-6 py-3 text-right">
                    <button className="text-muted-foreground hover:text-foreground inline-flex">
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}