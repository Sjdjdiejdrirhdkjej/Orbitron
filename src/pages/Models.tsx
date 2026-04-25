import React, { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, ArrowUpDown, Check, Sparkles, X } from "lucide-react";
import { models, providers, Modality } from "../data/models";

const MODALITIES: Modality[] = ["text", "vision", "audio", "tools"];

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

interface MeasuredStat {
  latencyMs: number | null;
  throughput: number | null;
}

export default function Models() {
  const [searchTerm, setSearchTerm] = useState("");
  const [provider, setProvider] = useState<string>("all");
  const [selectedModalities, setSelectedModalities] = useState<Modality[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("price-asc");
  const [providerOpen, setProviderOpen] = useState(false);
  const [modalityOpen, setModalityOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [measured, setMeasured] = useState<Map<string, MeasuredStat>>(new Map());
  const providerRef = useRef<HTMLDivElement>(null);
  const modalityRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Pull real measured latency / throughput from /api/models. Values are null
  // until enough chat events accumulate for that model — we render "—" then.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/models")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { data?: { id: string; latency_ms: number | null; throughput_tokens_per_second: number | null }[] } | null) => {
        if (cancelled || !data?.data) return;
        const map = new Map<string, MeasuredStat>();
        for (const m of data.data) {
          map.set(m.id, {
            latencyMs: m.latency_ms,
            throughput: m.throughput_tokens_per_second,
          });
        }
        setMeasured(map);
      })
      .catch(() => {
        /* leave empty — render "—" */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close menus on outside click / escape
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (providerRef.current && !providerRef.current.contains(e.target as Node)) {
        setProviderOpen(false);
      }
      if (modalityRef.current && !modalityRef.current.contains(e.target as Node)) {
        setModalityOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setProviderOpen(false);
        setModalityOpen(false);
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

  const toggleModality = (m: Modality) => {
    setSelectedModalities((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const clearFilters = () => {
    setProvider("all");
    setSelectedModalities([]);
    setSearchTerm("");
  };

  const filteredModels = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let list = models.filter((m) => {
      const matchesSearch =
        !term ||
        m.name.toLowerCase().includes(term) ||
        m.provider.toLowerCase().includes(term) ||
        m.id.toLowerCase().includes(term);
      const matchesProvider = provider === "all" || m.provider === provider;
      const matchesModalities =
        selectedModalities.length === 0 ||
        selectedModalities.every((mod) => m.modalities.includes(mod));
      return matchesSearch && matchesProvider && matchesModalities;
    });

    // Helpers: nullable measured-value sorters push "—" entries to the end
    // regardless of asc/desc so the catalog never looks misordered.
    const sortNullable = (
      av: number | null | undefined,
      bv: number | null | undefined,
      direction: "asc" | "desc",
    ) => {
      const aMissing = av == null;
      const bMissing = bv == null;
      if (aMissing && bMissing) return 0;
      if (aMissing) return 1;
      if (bMissing) return -1;
      return direction === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    };

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
          return sortNullable(measured.get(a.id)?.latencyMs, measured.get(b.id)?.latencyMs, "asc");
        case "throughput-desc":
          return sortNullable(measured.get(a.id)?.throughput, measured.get(b.id)?.throughput, "desc");
        case "context-desc":
          return b.contextWindow - a.contextWindow;
        default:
          return 0;
      }
    });

    return list;
  }, [searchTerm, provider, selectedModalities, sortKey, measured]);

  const providerLabel = provider === "all" ? "All providers" : provider;
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? "Sort";
  const modalityLabel =
    selectedModalities.length === 0
      ? "Modalities"
      : `Modalities · ${selectedModalities.length}`;
  const hasActiveFilters =
    provider !== "all" || selectedModalities.length > 0 || searchTerm.trim() !== "";

  return (
    <div className="flex flex-col h-full animate-fade-in overflow-hidden">
      <header className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-border bg-card shrink-0">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight mb-2">Model Catalog</h1>
        <p className="text-muted-foreground font-mono text-xs sm:text-sm max-w-2xl">
          Browse {models.length} frontier models available through Switchboard. Prices are per 1
          million tokens.
        </p>
      </header>

      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-muted/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
          <div className="relative w-full sm:w-64 md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search models..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 sm:py-2 bg-background border border-border rounded-md font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Provider filter */}
            <div className="relative flex-1 sm:flex-none" ref={providerRef}>
              <button
                type="button"
                onClick={() => {
                  setProviderOpen((o) => !o);
                  setSortOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 sm:py-1.5 bg-background border border-border rounded-md font-mono text-xs sm:text-sm hover:bg-accent transition-colors touch-target"
              >
                <Filter className="w-4 h-4" /> <span className="hidden xs:inline">{providerLabel}</span><span className="xs:hidden">Provider</span>
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

            {/* Modality multi-select */}
            <div className="relative flex-1 sm:flex-none" ref={modalityRef}>
              <button
                type="button"
                onClick={() => {
                  setModalityOpen((o) => !o);
                  setProviderOpen(false);
                  setSortOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 sm:py-1.5 bg-background border border-border rounded-md font-mono text-xs sm:text-sm hover:bg-accent transition-colors touch-target"
              >
                <Sparkles className="w-4 h-4" /> <span className="hidden sm:inline">{modalityLabel}</span><span className="sm:hidden">Mod.</span>
              </button>
              {modalityOpen && (
                <div className="absolute right-0 sm:right-auto sm:left-0 mt-1 z-20 w-48 bg-background border border-border rounded-md shadow-lg py-1 font-mono text-sm">
                  {MODALITIES.map((mod) => (
                    <MenuItem
                      key={mod}
                      selected={selectedModalities.includes(mod)}
                      onClick={() => toggleModality(mod)}
                    >
                      <span className="capitalize">{mod}</span>
                    </MenuItem>
                  ))}
                  {selectedModalities.length > 0 && (
                    <>
                      <div className="my-1 border-t border-border" />
                      <button
                        type="button"
                        onClick={() => setSelectedModalities([])}
                        className="w-full text-left px-3 py-1.5 text-muted-foreground hover:bg-accent transition-colors"
                      >
                        Clear modalities
                      </button>
                    </>
                  )}
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
                className="w-full flex items-center justify-center gap-2 px-3 py-2 sm:py-1.5 bg-background border border-border rounded-md font-mono text-xs sm:text-sm hover:bg-accent transition-colors touch-target"
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

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-4 font-mono text-xs">
            <span className="text-muted-foreground">
              {filteredModels.length} of {models.length}
            </span>
            {provider !== "all" && (
              <FilterChip onRemove={() => setProvider("all")}>{provider}</FilterChip>
            )}
            {selectedModalities.map((mod) => (
              <FilterChip key={mod} onRemove={() => toggleModality(mod)}>
                <span className="capitalize">{mod}</span>
              </FilterChip>
            ))}
            <button
              type="button"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        )}

        {filteredModels.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground font-mono text-sm">
            No models match your filters.
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredModels.map((model, i) => (
              <div
                key={model.id}
                className={`bg-background border border-border rounded-lg p-4 sm:p-5 flex flex-col md:flex-row gap-4 sm:gap-6 md:items-center hover:border-primary/50 transition-colors stagger-${Math.min(
                  i + 1,
                  5
                )}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <div className="w-8 h-8 rounded bg-muted grid place-items-center font-bold text-xs shrink-0">
                      {model.provider[0]}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm sm:text-base">{model.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {model.provider} • {model.id}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-2 sm:mt-3 line-clamp-2">{model.description}</p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4">
                    {model.modalities.map((m) => (
                      <span
                        key={m}
                        className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-mono uppercase"
                      >
                        {m}
                      </span>
                    ))}
                    <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-mono">
                      {model.contextWindow >= 1000000
                        ? `${model.contextWindow / 1000000}M`
                        : `${model.contextWindow / 1000}k`}{" "}
                      ctx
                    </span>
                  </div>
                </div>

                <div className="flex md:flex-col gap-4 sm:gap-6 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
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

                <div className="flex md:flex-col gap-4 sm:gap-6 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 min-w-[100px] sm:min-w-[120px]">
                  <div className="grid grid-cols-2 md:grid-cols-1 gap-4 md:gap-2 font-mono text-sm">
                    <div>
                      <div
                        className="text-xs text-muted-foreground mb-1"
                        title="Time to first token, measured from your real chats"
                      >
                        Latency
                      </div>
                      {measured.get(model.id)?.latencyMs != null ? (
                        <div className="text-green-400">
                          {measured.get(model.id)!.latencyMs}ms
                        </div>
                      ) : (
                        <div
                          className="text-muted-foreground/60"
                          title="Not enough measurements yet — try this model in Chat to populate this number."
                        >
                          —
                        </div>
                      )}
                    </div>
                    <div>
                      <div
                        className="text-xs text-muted-foreground mb-1"
                        title="Average tokens per second, measured from your real chats"
                      >
                        Speed
                      </div>
                      {measured.get(model.id)?.throughput != null ? (
                        <div>{measured.get(model.id)!.throughput} t/s</div>
                      ) : (
                        <div
                          className="text-muted-foreground/60"
                          title="Not enough measurements yet — try this model in Chat to populate this number."
                        >
                          —
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
                  <Link
                    to={`/chat?model=${encodeURIComponent(model.id)}`}
                    className="px-4 py-2.5 sm:py-2 bg-foreground text-background rounded font-medium text-sm hover:bg-foreground/90 w-full md:w-auto whitespace-nowrap text-center touch-target"
                  >
                    Use Model
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground border border-border">
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="hover:text-foreground"
        aria-label="Remove filter"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
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
