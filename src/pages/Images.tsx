import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Loader2, Download, Sparkles, Trash2, AlertCircle } from "lucide-react";

type Size = "1024x1024" | "1024x1536" | "1536x1024" | "auto";
type ImageModelId = "gpt-image-1" | "gemini-2.5-flash-image";

interface ImageModelInfo {
  id: ImageModelId;
  label: string;
  provider: string;
  supportsSize: boolean;
  blurb: string;
}

const IMAGE_MODELS: ImageModelInfo[] = [
  {
    id: "gpt-image-1",
    label: "GPT Image 1",
    provider: "OpenAI",
    supportsSize: true,
    blurb: "~$0.04/image · base64 PNG",
  },
  {
    id: "gemini-2.5-flash-image",
    label: "Gemini 2.5 Flash Image",
    provider: "Google",
    supportsSize: false,
    blurb: "Fast · native multimodal",
  },
];

interface GeneratedImage {
  id: string;
  prompt: string;
  size: Size;
  model: ImageModelId;
  dataUrl: string;
  revisedPrompt: string | null;
  latencyMs: number;
  createdAt: number;
}

const STORAGE_KEY = "switchboard.images.v1";
const MODEL_KEY = "switchboard.imageModel.v1";
const SIZES: { value: Size; label: string }[] = [
  { value: "1024x1024", label: "Square · 1024" },
  { value: "1024x1536", label: "Portrait · 1024×1536" },
  { value: "1536x1024", label: "Landscape · 1536×1024" },
  { value: "auto", label: "Auto" },
];

const PROMPT_SUGGESTIONS = [
  "A retro CRT monitor displaying glowing green terminal text in a dark room",
  "Isometric pixel-art server rack with cables in neon blue and pink",
  "A minimalist logo for a developer tools startup, geometric, monochrome",
  "Cyberpunk city skyline at dusk, photorealistic, 35mm film grain",
];

export default function Images() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<Size>("1024x1024");
  const [count, setCount] = useState(1);
  const [model, setModel] = useState<ImageModelId>(() => {
    try {
      const saved = localStorage.getItem(MODEL_KEY);
      if (saved && IMAGE_MODELS.some((m) => m.id === saved)) {
        return saved as ImageModelId;
      }
    } catch {
      /* ignore */
    }
    return "gpt-image-1";
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [lightbox, setLightbox] = useState<GeneratedImage | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeModel =
    IMAGE_MODELS.find((m) => m.id === model) ?? IMAGE_MODELS[0];

  // Persist model choice
  useEffect(() => {
    try {
      localStorage.setItem(MODEL_KEY, model);
    } catch {
      /* ignore */
    }
  }, [model]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as GeneratedImage[];
        if (Array.isArray(parsed)) setHistory(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist history (capped at 24 most recent to stay under localStorage limits)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 24)));
    } catch {
      /* quota exceeded — silently keep in-memory */
    }
  }, [history]);

  const generate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          size: activeModel.supportsSize ? size : undefined,
          n: count,
          model,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || `Request failed: ${res.status}`);
      }

      const data = (await res.json()) as {
        latencyMs: number;
        data: { b64_json: string | null; revised_prompt: string | null }[];
      };

      const newImages: GeneratedImage[] = data.data
        .filter((img) => img.b64_json)
        .map((img, i) => ({
          id: `${Date.now()}-${i}`,
          prompt: trimmed,
          size,
          model,
          dataUrl: `data:image/png;base64,${img.b64_json}`,
          revisedPrompt: img.revised_prompt,
          latencyMs: data.latencyMs,
          createdAt: Date.now(),
        }));

      if (newImages.length === 0) {
        throw new Error("No image returned");
      }

      setHistory((prev) => [...newImages, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  const download = (img: GeneratedImage) => {
    const link = document.createElement("a");
    link.href = img.dataUrl;
    const safeName = img.prompt.slice(0, 40).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
    link.download = `switchboard-${safeName || "image"}-${img.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const removeImage = (id: string) => {
    setHistory((prev) => prev.filter((img) => img.id !== id));
    if (lightbox?.id === id) setLightbox(null);
  };

  const clearAll = () => {
    if (confirm("Clear all generated images?")) {
      setHistory([]);
    }
  };

  const onTextareaKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      generate();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-md bg-primary/10 text-primary grid place-items-center shrink-0">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-base leading-tight">Image Playground</h1>
            <p className="text-xs text-muted-foreground font-mono truncate">
              {activeModel.id} · {activeModel.provider} · {activeModel.blurb}
            </p>
          </div>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear all
          </button>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
          {/* Prompt composer */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={onTextareaKey}
              placeholder="Describe the image you want to generate..."
              disabled={busy}
              rows={3}
              className="w-full bg-transparent px-4 py-3 text-sm resize-none focus:outline-none placeholder:text-muted-foreground/60 disabled:opacity-50"
            />
            <div className="border-t border-border px-3 py-2.5 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value as ImageModelId)}
                  disabled={busy}
                  title="Image model"
                  className="text-xs font-mono bg-muted/40 border border-border rounded px-2 py-1.5 focus:outline-none focus:border-primary/50 disabled:opacity-50"
                >
                  {IMAGE_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} · {m.provider}
                    </option>
                  ))}
                </select>
                <select
                  value={activeModel.supportsSize ? size : "auto"}
                  onChange={(e) => setSize(e.target.value as Size)}
                  disabled={busy || !activeModel.supportsSize}
                  title={
                    activeModel.supportsSize
                      ? "Image size"
                      : `${activeModel.label} chooses the size automatically`
                  }
                  className="text-xs font-mono bg-muted/40 border border-border rounded px-2 py-1.5 focus:outline-none focus:border-primary/50 disabled:opacity-50"
                >
                  {activeModel.supportsSize ? (
                    SIZES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))
                  ) : (
                    <option value="auto">Size · auto</option>
                  )}
                </select>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  disabled={busy}
                  className="text-xs font-mono bg-muted/40 border border-border rounded px-2 py-1.5 focus:outline-none focus:border-primary/50 disabled:opacity-50"
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>{n} {n === 1 ? "image" : "images"}</option>
                  ))}
                </select>
                <span className="text-xs font-mono text-muted-foreground hidden sm:inline">
                  ⌘↵ to generate
                </span>
              </div>
              <button
                onClick={generate}
                disabled={busy || !prompt.trim()}
                className="bg-primary text-primary-foreground font-medium text-sm px-4 py-1.5 rounded-md hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 flex items-start gap-3 text-sm">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-red-400 mb-0.5">Generation failed</div>
                <div className="text-xs font-mono text-muted-foreground break-words">{error}</div>
              </div>
            </div>
          )}

          {/* Empty state with suggestions */}
          {history.length === 0 && !busy && (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-muted/40 grid place-items-center mx-auto mb-4">
                <ImageIcon className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="font-bold text-sm mb-1">No images yet</h3>
              <p className="text-xs text-muted-foreground mb-6">
                Try one of these prompts to get started.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto">
                {PROMPT_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setPrompt(s);
                      textareaRef.current?.focus();
                    }}
                    className="text-left text-xs text-muted-foreground hover:text-foreground bg-muted/20 hover:bg-muted/40 border border-border rounded-md px-3 py-2.5 transition-colors leading-relaxed"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {busy && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: count }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-lg border border-border bg-muted/20 grid place-items-center animate-pulse"
                >
                  <div className="text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto mb-2" />
                    <div className="text-xs font-mono text-muted-foreground">Painting pixels...</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* History grid */}
          {history.length > 0 && (
            <div>
              <div className="text-xs font-mono text-muted-foreground mb-3">
                {history.length} {history.length === 1 ? "image" : "images"}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {history.map((img) => (
                  <div
                    key={img.id}
                    className="group rounded-lg border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setLightbox(img)}
                      className="block w-full aspect-square bg-muted/20 overflow-hidden"
                    >
                      <img
                        src={img.dataUrl}
                        alt={img.prompt}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    </button>
                    <div className="p-3 space-y-2">
                      <p className="text-xs leading-relaxed line-clamp-2" title={img.prompt}>
                        {img.prompt}
                      </p>
                      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                        <span title={img.model}>
                          {(IMAGE_MODELS.find((m) => m.id === img.model)?.provider) ?? "?"} · {img.size === "auto" ? "auto" : img.size} · {(img.latencyMs / 1000).toFixed(1)}s
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => download(img)}
                            className="p-1 hover:text-foreground hover:bg-muted/40 rounded transition-colors"
                            aria-label="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeImage(img.id)}
                            className="p-1 hover:text-red-400 hover:bg-muted/40 rounded transition-colors"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm grid place-items-center p-6 animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          <div
            className="max-w-4xl w-full max-h-full flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.dataUrl}
              alt={lightbox.prompt}
              className="max-w-full max-h-[75vh] object-contain mx-auto rounded-lg border border-border"
            />
            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
              <p className="text-sm leading-relaxed">{lightbox.prompt}</p>
              {lightbox.revisedPrompt && lightbox.revisedPrompt !== lightbox.prompt && (
                <p className="text-xs text-muted-foreground italic leading-relaxed border-t border-border pt-2">
                  <span className="font-mono not-italic text-[11px] uppercase tracking-wide mr-2">Revised:</span>
                  {lightbox.revisedPrompt}
                </p>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs font-mono text-muted-foreground">
                  {lightbox.size === "auto" ? "auto" : lightbox.size} · {(lightbox.latencyMs / 1000).toFixed(1)}s
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => download(lightbox)}
                    className="text-xs font-medium px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                  <button
                    onClick={() => setLightbox(null)}
                    className="text-xs font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
