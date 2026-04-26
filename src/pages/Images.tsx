import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Loader2, Download, Sparkles, Trash2, AlertCircle } from "lucide-react";
import { getDashboardKey, resetDashboardKey } from "../lib/dashboardKey";

// Lazy-initialized browser support check (SSR-safe)
function getBrowserSupportsWebP(): boolean {
  if (typeof window === "undefined") return false;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL("image/webp").startsWith("data:image/webp");
}

// Quality presets for WebP conversion
const QUALITY_PRESETS = {
  high: { value: 0.92, label: "High", description: "Best quality, larger file" },
  balanced: { value: 0.85, label: "Balanced", description: "Good quality, moderate size" },
  compact: { value: 0.75, label: "Compact", description: "Smaller file, slightly reduced quality" },
} as const;

type QualityPreset = keyof typeof QUALITY_PRESETS;

// Convert base64 PNG to WebP using Canvas API
async function convertToWebP(base64Png: string, quality: number): Promise<string | null> {
  if (typeof window === "undefined" || !getBrowserSupportsWebP()) return null;
  
  try {
    const img = new Image();
    const imgLoaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
    });
    img.src = base64Png;
    await imgLoaded;
    
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    
    ctx.drawImage(img, 0, 0);
    // Convert to WebP with user-selected quality
    return canvas.toDataURL("image/webp", quality);
  } catch {
    return null;
  }
}

// Get human-readable quality label
function getQualityLabel(preset: QualityPreset): string {
  return QUALITY_PRESETS[preset].label;
}

// Get quality value from preset
function getQualityValue(preset: QualityPreset): number {
  return QUALITY_PRESETS[preset].value;
}

// Get the best display URL (WebP if available, fallback to PNG)
function getDisplayUrl(img: GeneratedImage): string {
  return img.webpUrl || img.dataUrl;
}

// Note: AVIF encoding is not natively supported via Canvas API.
// WebP provides excellent compression for mobile. For AVIF support,
// a library like squoosh or server-side conversion would be needed.

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
  webpUrl: string | null;
  format: "webp" | "png";
  quality: QualityPreset;
  revisedPrompt: string | null;
  latencyMs: number;
  createdAt: number;
}

const STORAGE_KEY = "switchboard.images.v1";
const MODEL_KEY = "switchboard.imageModel.v1";
const QUALITY_KEY = "switchboard.imageQuality.v1";
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
  const [quality, setQuality] = useState<QualityPreset>(() => {
    try {
      const saved = localStorage.getItem(QUALITY_KEY);
      if (saved && saved in QUALITY_PRESETS) {
        return saved as QualityPreset;
      }
    } catch {
      /* ignore */
    }
    return "balanced";
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

  // Persist quality choice
  useEffect(() => {
    try {
      localStorage.setItem(QUALITY_KEY, quality);
    } catch {
      /* ignore */
    }
  }, [quality]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as GeneratedImage[];
        if (Array.isArray(parsed)) {
          // Ensure older images without webpUrl/format have defaults
          const normalized: GeneratedImage[] = parsed.map(img => ({
            ...img,
            webpUrl: img.webpUrl ?? null,
            format: img.format ?? "png" as const,
            quality: (img as { quality?: QualityPreset }).quality ?? "balanced" as QualityPreset,
          }));
          setHistory(normalized);
        }
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
      // /api/images now requires a Bearer API key. Same auto-provisioning +
      // 401-retry pattern as the Chat page so the dashboard works without the
      // user ever seeing or managing a key.
      const callImages = async (): Promise<Response> => {
        const apiKey = await getDashboardKey();
        return fetch("/api/images", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            prompt: trimmed,
            size: activeModel.supportsSize ? size : undefined,
            n: count,
            model,
          }),
        });
      };

      let res = await callImages();
      if (res.status === 401) {
        resetDashboardKey();
        res = await callImages();
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || `Request failed: ${res.status}`);
      }

      const data = (await res.json()) as {
        latencyMs: number;
        data: { b64_json: string | null; revised_prompt: string | null }[];
      };

      const newImagePromises: Promise<GeneratedImage>[] = data.data
        .filter((img) => img.b64_json)
        .map(async (img, i) => {
          const dataUrl = `data:image/png;base64,${img.b64_json}`;
          // Convert to WebP in background for better mobile performance
          const webpUrl = await convertToWebP(dataUrl, getQualityValue(quality));
          return {
            id: `${Date.now()}-${i}`,
            prompt: trimmed,
            size,
            model,
            dataUrl,
            webpUrl,
            format: webpUrl ? ("webp" as const) : ("png" as const),
            quality,
            revisedPrompt: img.revised_prompt,
            latencyMs: data.latencyMs,
            createdAt: Date.now(),
          };
        });

      if (newImagePromises.length === 0) {
        throw new Error("No image returned");
      }

      // Wait for all conversions and add to history
      const resolvedImages = await Promise.all(newImagePromises);
      setHistory((prev) => [...resolvedImages, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  const download = (img: GeneratedImage) => {
    const link = document.createElement("a");
    // Use WebP for download if available, otherwise PNG
    const downloadUrl = img.webpUrl || img.dataUrl;
    const extension = img.webpUrl ? "webp" : "png";
    link.href = downloadUrl;
    const safeName = img.prompt.slice(0, 40).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
    link.download = `switchboard-${safeName || "image"}-${img.id}.${extension}`;
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
      <div className="border-b border-border px-4 sm:px-6 py-3 sm:py-4 shrink-0 flex items-center justify-between gap-4">
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
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
              className="w-full bg-transparent px-4 py-3 text-base sm:text-sm resize-none focus:outline-none placeholder:text-muted-foreground/60 disabled:opacity-50"
            />
            <div className="border-t border-border px-3 py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value as ImageModelId)}
                  disabled={busy}
                  title="Image model"
                  className="text-xs sm:text-sm font-mono bg-muted/40 border border-border rounded px-2 py-2 sm:py-1.5 focus:outline-none focus:border-primary/50 disabled:opacity-50"
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
                  className="text-xs sm:text-sm font-mono bg-muted/40 border border-border rounded px-2 py-2 sm:py-1.5 focus:outline-none focus:border-primary/50 disabled:opacity-50"
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
                  className="text-xs sm:text-sm font-mono bg-muted/40 border border-border rounded px-2 py-2 sm:py-1.5 focus:outline-none focus:border-primary/50 disabled:opacity-50"
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>{n} {n === 1 ? "image" : "images"}</option>
                  ))}
                </select>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value as QualityPreset)}
                  disabled={busy}
                  title={`Quality: ${QUALITY_PRESETS[quality].description}`}
                  className="text-xs sm:text-sm font-mono bg-muted/40 border border-border rounded px-2 py-2 sm:py-1.5 focus:outline-none focus:border-primary/50 disabled:opacity-50"
                >
                  {(Object.keys(QUALITY_PRESETS) as QualityPreset[]).map((q) => (
                    <option key={q} value={q}>
                      {QUALITY_PRESETS[q].label}
                    </option>
                  ))}
                </select>
                <span className="text-xs font-mono text-muted-foreground hidden sm:inline">
                  ⌘↵ to generate
                </span>
              </div>
              <button
                onClick={generate}
                disabled={busy || !prompt.trim()}
                className="bg-primary text-primary-foreground font-medium text-sm px-4 py-2.5 sm:py-1.5 rounded-md hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 touch-target"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {history.map((img) => (
                  <div
                    key={img.id}
                    className="group rounded-lg border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setLightbox(img)}
                      className="block w-full aspect-square bg-muted/20 overflow-hidden touch-target"
                    >
                      <img
                        src={getDisplayUrl(img)}
                        alt={img.prompt}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    </button>
                    <div className="p-3 space-y-2">
                      <p className="text-xs leading-relaxed line-clamp-2" title={img.prompt}>
                        {img.prompt}
                      </p>
                      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                        <span title={`${img.model} · Quality: ${getQualityLabel(img.quality)} (${Math.round(getQualityValue(img.quality) * 100)}%)`}>
                          {(IMAGE_MODELS.find((m) => m.id === img.model)?.provider) ?? "?"} · {img.size === "auto" ? "auto" : img.size} · {img.format.toUpperCase()} · {getQualityLabel(img.quality)} · {(img.latencyMs / 1000).toFixed(1)}s
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
          className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm grid place-items-center p-4 sm:p-6 animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          <div
            className="max-w-4xl w-full max-h-full flex flex-col gap-3 sm:gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getDisplayUrl(lightbox)}
              alt={lightbox.prompt}
              loading="eager"
              decoding="async"
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
                  {lightbox.size === "auto" ? "auto" : lightbox.size} · {lightbox.format.toUpperCase()} · {(lightbox.latencyMs / 1000).toFixed(1)}s
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
