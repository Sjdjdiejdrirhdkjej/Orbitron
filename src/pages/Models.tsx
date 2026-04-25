import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, Filter, ArrowUpDown, Check } from "lucide-react";
import { models, providers } from "../data/models";

type SortKey =
  | "price-asc"
  | "price-desc"
  | "output-asc"
  | "output-desc"
  | "latency-asc"
  | "throughput-desc"
  | "context-desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "price-asc", label: "Input price ↑" },
  { value: "price-desc", label: "Input price ↓" },
  { value: "output-asc", label: "Output price ↑" },
  { value: "output-desc", label: "Output price ↓" },
  { value: "latency-asc", label: "Latency ↑" },
  { value: "throughput-desc", label: "Speed ↓" },
  { value: "context-desc", label: "Context window ↓" },
];

export default function Models() {
  const [searchTerm, setSearchTerm] = useState("");
  const [provider, setProvider] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("price-asc");
  const [providerOpen, setProviderOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const providerRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click / escape
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (providerRef.current && !providerRef.current.contains(e.target as Node)) {
        setProviderOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setProviderOpen(false);
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const filteredModels = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let list = models.filter((m) => {
      const matchesSearch =
        !term ||
        m.name.toLowerCase().includes(term) ||
        m.provider.toLowerCase().includes(term) ||
        m.id.toLowerCase().includes(term);
      const matchesProvider = provider === "all" || m.provider === provider;
      return matchesSearch && matchesProvider;
    });

    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case "price-asc":
          return a.inputPrice - b.inputPrice;
        case "price-desc":
          return b.inputPrice - a.inputPrice;
        case "output-asc":
          return a.outputPrice - b.outputPrice;
        case "output-desc":
          return b.outputPrice - a.outputPrice;
        case "latency-asc":
          return a.latency - b.latency;
        case "throughput-desc":
          return b.throughput - a.throughput;
        case "context-desc":
          return b.contextWindow - a.contextWindow;
        default:
          return 0;
      }
    });

    return list;
  }, [searchTerm, provider, sortKey]);

  const providerLabel = provider === "all" ? "All providers" : provider;
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? "Sort";

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <header className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-border bg-card">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Model Catalog</h1>
        <p className="text-muted-foreground font-mono text-xs sm:text-sm max-w-2xl">
          Browse {models.length} frontier models available through Switchboard. Prices are per 1
          million tokens.
        </p>
      </header>

      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-muted/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search models..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            {/* Provider filter */}
            <div className="relative flex-1 sm:flex-none" ref={providerRef}>
              <button
                type="button"
                onClick={() => {
                  setProviderOpen((o) => !o);
                  setSortOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-background border border-border rounded-md font-mono text-sm hover:bg-accent transition-colors"
              >
                <Filter className="w-4 h-4" /> {providerLabel}
              </button>
              {providerOpen && (
                <div className="absolute right-0 sm:right-auto sm:left-0 mt-1 z-20 w-48 bg-background border border-border rounded-md shadow-lg py-1 font-mono text-sm">
                  <MenuItem
                    selected={provider === "all"}
                    onClick={() => {
                      setProvider("all");
                      setProviderOpen(false);
                    }}
                  >
                    All providers
                  </MenuItem>
                  {providers.map((p) => (
                    <MenuItem
                      key={p}
                      selected={provider === p}
                      onClick={() => {
                        setProvider(p);
                        setProviderOpen(false);
                      }}
                    >
                      {p}
                    </MenuItem>
                  ))}
                </div>
              )}
            </div>

            {/* Sort */}
            <div className="relative flex-1 sm:flex-none" ref={sortRef}>
              <button
                type="button"
                onClick={() => {
                  setSortOpen((o) => !o);
                  setProviderOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-background border border-border rounded-md font-mono text-sm hover:bg-accent transition-colors"
              >
                <ArrowUpDown className="w-4 h-4" />
                <span className="hidden sm:inline">Sort:</span> {sortLabel}
              </button>
              {sortOpen && (
                <div className="absolute right-0 mt-1 z-20 w-56 bg-background border border-border rounded-md shadow-lg py-1 font-mono text-sm">
                  {SORT_OPTIONS.map((opt) => (
                    <MenuItem
                      key={opt.value}
                      selected={sortKey === opt.value}
                      onClick={() => {
                        setSortKey(opt.value);
                        setSortOpen(false);
                      }}
                    >
                      {opt.label}
                    </MenuItem>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {filteredModels.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground font-mono text-sm">
            No models match your filters.
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredModels.map((model, i) => (
              <div
                key={model.id}
                className={`bg-background border border-border rounded-lg p-5 flex flex-col md:flex-row gap-6 md:items-center hover:border-primary/50 transition-colors stagger-${Math.min(
                  i + 1,
                  5
                )}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded bg-muted grid place-items-center font-bold text-xs">
                      {model.provider[0]}
                    </div>
                    <div>
                      <h3 className="font-bold">{model.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">
                        {model.provider} • {model.id}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">{model.description}</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {model.modalities.map((m) => (
                      <span
                        key={m}
                        className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-mono uppercase"
                      >
                        {m}
                      </span>
                    ))}
                    <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-mono">
                      {model.contextWindow >= 1000000
                        ? `${model.contextWindow / 1000000}M`
                        : `${model.contextWindow / 1000}k`}{" "}
                      ctx
                    </span>
                  </div>
                </div>

                <div className="flex md:flex-col gap-6 md:gap-2 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
                  <div className="grid grid-cols-2 md:grid-cols-1 gap-4 md:gap-2 font-mono text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Input (1M)</div>
                      <div>${model.inputPrice.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Output (1M)</div>
                      <div>${model.outputPrice.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                <div className="flex md:flex-col gap-6 md:gap-2 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 min-w-[120px]">
                  <div className="grid grid-cols-2 md:grid-cols-1 gap-4 md:gap-2 font-mono text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Latency</div>
                      <div className="text-green-400">{model.latency}ms</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Speed</div>
                      <div>{model.throughput} t/s</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
                  <button className="px-4 py-2 bg-foreground text-background rounded font-medium text-sm hover:bg-foreground/90 w-full md:w-auto whitespace-nowrap">
                    Use Model
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-accent transition-colors"
    >
      <span>{children}</span>
      {selected && <Check className="w-3.5 h-3.5 text-primary" />}
    </button>
  );
}
