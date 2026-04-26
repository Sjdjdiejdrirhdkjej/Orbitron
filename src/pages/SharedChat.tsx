import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Markdown } from "../components/Markdown";
import { models } from "../data/models";
import { ProviderIcon } from "../components/ProviderIcon";

interface SharedMessage {
  id?: string;
  role: "user" | "assistant" | "system";
  content?: string;
  blocks?: Array<{ type: string; text?: string }>;
  modelId?: string;
}

interface SharedChat {
  slug: string;
  title: string;
  modelId: string | null;
  messages: SharedMessage[];
  createdAt: string;
}

function plainText(m: SharedMessage): string {
  if (m.blocks && m.blocks.length > 0) {
    return m.blocks
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
  }
  return m.content ?? "";
}

export default function SharedChatPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<SharedChat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/share/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(r.status === 404 ? "This chat was not found." : "Failed to load.");
        }
        return r.json();
      })
      .then((d: SharedChat) => {
        if (!cancelled) setData(d);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 bg-foreground rounded-sm grid place-items-center">
              <div className="w-2.5 h-2.5 bg-background rounded-sm" />
            </div>
            <span className="font-bold text-sm">Orbitron</span>
          </Link>
          <div className="text-xs font-mono text-muted-foreground truncate min-w-0">
            {data ? `Shared chat · ${data.title}` : "Shared chat"}
          </div>
          <Link
            to="/chat"
            className="shrink-0 text-xs font-mono px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
          >
            Try Orbitron
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {loading && (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-20">
            <h1 className="text-xl font-bold mb-2">Chat unavailable</h1>
            <p className="text-sm font-mono text-muted-foreground">{error}</p>
          </div>
        )}

        {data && !loading && (
          <>
            <div className="mb-8 pb-6 border-b border-border">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                {data.title}
              </h1>
              <div className="text-xs font-mono text-muted-foreground mt-2">
                {data.modelId
                  ? `${models.find((m) => m.id === data.modelId)?.name ?? data.modelId} · `
                  : ""}
                {new Date(data.createdAt).toLocaleString()}
              </div>
            </div>

            {data.messages.map((msg, i) => {
              const text = plainText(msg);
              const modelName =
                msg.modelId
                  ? models.find((m) => m.id === msg.modelId)?.name ?? "Assistant"
                  : "Assistant";
              return (
                <div
                  key={msg.id ?? i}
                  className="flex gap-3 sm:gap-4 mb-6 sm:mb-8"
                >
                  <div
                    className={`w-6 h-6 sm:w-8 sm:h-8 rounded grid place-items-center font-bold text-xs shrink-0 mt-0.5 sm:mt-1 ${
                      msg.role === "user"
                        ? "bg-primary/20 text-primary"
                        : "bg-muted"
                    }`}
                  >
                    {msg.role === "user" ? (
                      "U"
                    ) : (
                      <ProviderIcon
                        provider={
                          models.find((m) => m.id === msg.modelId)?.provider ??
                          ""
                        }
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                      />
                    )}
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="font-bold text-sm">
                      {msg.role === "user" ? "You" : modelName}
                    </div>
                    {msg.role === "assistant" ? (
                      <Markdown>{text}</Markdown>
                    ) : (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {text}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </main>
    </div>
  );
}
