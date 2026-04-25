import React, { useEffect, useMemo, useRef, useState } from "react";
import { Settings2, Send, Plus, MessageSquare, Trash2, Menu, X, Loader2, ChevronDown } from "lucide-react";
import { models } from "../data/models";

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
  modelId?: string;
  latencyMs?: number;
  totalMs?: number;
  cost?: number;
  inputTokens?: number;
  outputTokens?: number;
  error?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  modelId: string;
}

const STORAGE_KEY = "switchboard.conversations.v1";
const SETTINGS_KEY = "switchboard.chatSettings.v1";

const DEFAULT_MODEL = "claude-4.5-sonnet";

function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadSettings(): { temperature: number; maxTokens: number; modelId: string } {
  if (typeof window === "undefined") return { temperature: 0.7, maxTokens: 4096, modelId: DEFAULT_MODEL };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { temperature: 0.7, maxTokens: 4096, modelId: DEFAULT_MODEL, ...JSON.parse(raw) };
  } catch {}
  return { temperature: 0.7, maxTokens: 4096, modelId: DEFAULT_MODEL };
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function formatTimeBucket(ts: number): string {
  const now = new Date();
  const d = new Date(ts);
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return "Today";
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  if (now.getTime() - ts < 1000 * 60 * 60 * 24 * 7) return "Last 7 days";
  return "Older";
}

function formatCost(cost: number): string {
  if (cost === 0) return "$0.00";
  if (cost < 0.01) return `$${cost.toFixed(5)}`;
  return `$${cost.toFixed(4)}`;
}

export default function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations());
  const [settings, setSettings] = useState(() => loadSettings());
  const [activeId, setActiveId] = useState<string | null>(() => {
    const list = loadConversations();
    return list[0]?.id ?? null;
  });
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [paramsOpen, setParamsOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const activeModel = useMemo(
    () => models.find((m) => m.id === (active?.modelId ?? settings.modelId)) ?? models[0],
    [active, settings.modelId]
  );

  const sessionCost = useMemo(
    () => (active?.messages ?? []).reduce((sum, m) => sum + (m.cost ?? 0), 0),
    [active]
  );

  // Auto-scroll while streaming
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [active?.messages]);

  // Auto-grow composer
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  function newChat() {
    const conv: Conversation = {
      id: uid(),
      title: "New Chat",
      messages: [],
      createdAt: Date.now(),
      modelId: settings.modelId,
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    setHistoryOpen(false);
  }

  function deleteChat(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      setActiveId(remaining[0]?.id ?? null);
    }
  }

  function selectModel(modelId: string) {
    setSettings((s) => ({ ...s, modelId }));
    if (active && active.messages.length === 0) {
      setConversations((prev) =>
        prev.map((c) => (c.id === active.id ? { ...c, modelId } : c))
      );
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;

    let conv = active;
    if (!conv) {
      conv = {
        id: uid(),
        title: text.slice(0, 40),
        messages: [],
        createdAt: Date.now(),
        modelId: settings.modelId,
      };
      setConversations((prev) => [conv!, ...prev]);
      setActiveId(conv.id);
    }

    const userMsg: Message = { id: uid(), role: "user", content: text };
    const assistantId = uid();
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      modelId: conv.modelId,
    };

    const convId = conv.id;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              title: c.messages.length === 0 ? text.slice(0, 40) : c.title,
              messages: [...c.messages, userMsg, assistantMsg],
            }
          : c
      )
    );

    setInput("");
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          modelId: conv.modelId,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          messages: [
            ...conv.messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: text },
          ],
        }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const evt of events) {
          const line = evt.trim();
          if (!line.startsWith("data:")) continue;
          const json = line.slice(5).trim();
          if (!json) continue;
          try {
            const payload = JSON.parse(json);
            if (payload.delta) {
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === convId
                    ? {
                        ...c,
                        messages: c.messages.map((m) =>
                          m.id === assistantId ? { ...m, content: m.content + payload.delta } : m
                        ),
                      }
                    : c
                )
              );
            } else if (payload.done) {
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === convId
                    ? {
                        ...c,
                        messages: c.messages.map((m) =>
                          m.id === assistantId
                            ? {
                                ...m,
                                latencyMs: payload.latencyMs,
                                totalMs: payload.totalMs,
                                cost: payload.cost,
                                inputTokens: payload.inputTokens,
                                outputTokens: payload.outputTokens,
                              }
                            : m
                        ),
                      }
                    : c
                )
              );
            } else if (payload.error) {
              throw new Error(payload.error);
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content || `Error: ${message}`, error: true }
                    : m
                ),
              }
            : c
        )
      );
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
    setStreaming(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  // Group conversations by time
  const groupedConvs = useMemo(() => {
    const groups: Record<string, Conversation[]> = {};
    for (const c of conversations) {
      const bucket = formatTimeBucket(c.createdAt);
      (groups[bucket] ??= []).push(c);
    }
    return groups;
  }, [conversations]);

  const HistorySidebar = (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border flex items-center justify-between gap-2">
        <button
          onClick={newChat}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Chat
        </button>
        <button
          onClick={() => setHistoryOpen(false)}
          className="lg:hidden p-2 rounded-md hover:bg-muted"
          aria-label="Close history"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 && (
          <div className="px-3 py-8 text-center text-xs font-mono text-muted-foreground">
            No chats yet. Start one below.
          </div>
        )}
        {Object.entries(groupedConvs).map(([bucket, list]) => (
          <div key={bucket}>
            <div className="px-2 py-1.5 text-xs font-mono text-muted-foreground mt-2">{bucket}</div>
            {list.map((c) => {
              const isActive = c.id === activeId;
              return (
                <div
                  key={c.id}
                  className={`group flex items-center rounded transition-colors ${
                    isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <button
                    onClick={() => {
                      setActiveId(c.id);
                      setHistoryOpen(false);
                    }}
                    className="flex-1 text-left px-3 py-2 text-sm truncate min-w-0"
                  >
                    {c.title || "Untitled"}
                  </button>
                  <button
                    onClick={() => deleteChat(c.id)}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-2 hover:text-destructive transition-opacity"
                    aria-label="Delete chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  const ParamsSidebar = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-bold text-sm">Parameters</h3>
        <button
          onClick={() => setParamsOpen(false)}
          className="lg:hidden p-1.5 rounded-md hover:bg-muted"
          aria-label="Close parameters"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-6 overflow-y-auto">
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <label>Temperature</label>
            <span className="text-muted-foreground">{settings.temperature.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={settings.temperature}
            onChange={(e) => setSettings((s) => ({ ...s, temperature: parseFloat(e.target.value) }))}
            className="w-full accent-primary"
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <label>Max Tokens</label>
            <span className="text-muted-foreground">{settings.maxTokens}</span>
          </div>
          <input
            type="range"
            min="256"
            max="8192"
            step="256"
            value={settings.maxTokens}
            onChange={(e) => setSettings((s) => ({ ...s, maxTokens: parseInt(e.target.value, 10) }))}
            className="w-full accent-primary"
          />
        </div>
        <div className="pt-4 border-t border-border space-y-3">
          <div className="text-xs font-mono text-muted-foreground">Active Model</div>
          <div className="p-3 rounded-md bg-muted/30 border border-border">
            <div className="font-medium text-sm">{activeModel.name}</div>
            <div className="text-xs text-muted-foreground font-mono mt-0.5">{activeModel.provider}</div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-mono">
              <div>
                <div className="text-muted-foreground">Input</div>
                <div>${activeModel.inputPrice.toFixed(2)}/M</div>
              </div>
              <div>
                <div className="text-muted-foreground">Output</div>
                <div>${activeModel.outputPrice.toFixed(2)}/M</div>
              </div>
            </div>
          </div>
        </div>
        <div className="pt-4 border-t border-border">
          <div className="text-xs font-mono text-muted-foreground mb-1">Session Spend</div>
          <div className="font-mono text-2xl">{formatCost(sessionCost)}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-1 overflow-hidden relative">
      {/* History — desktop fixed sidebar */}
      <div className="w-64 border-r border-border bg-background hidden lg:flex flex-col shrink-0">
        {HistorySidebar}
      </div>

      {/* History — mobile drawer */}
      {historyOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex" onClick={() => setHistoryOpen(false)}>
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          <div
            className="relative w-72 max-w-[85vw] bg-background border-r border-border h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {HistorySidebar}
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col bg-muted/10 relative min-w-0">
        <header className="h-14 border-b border-border flex items-center justify-between px-3 sm:px-4 bg-background z-10 gap-2">
          <button
            onClick={() => setHistoryOpen(true)}
            className="lg:hidden p-2 -ml-1 rounded-md hover:bg-muted shrink-0"
            aria-label="Open chat history"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="relative flex-1 min-w-0">
            <select
              value={activeModel.id}
              onChange={(e) => selectModel(e.target.value)}
              className="appearance-none w-full bg-transparent font-mono text-xs sm:text-sm border border-border rounded-md pl-3 pr-8 py-1.5 cursor-pointer hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary truncate font-bold"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.provider} • {m.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>

          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm font-mono text-muted-foreground shrink-0">
            <span className="hidden sm:inline">{formatCost(sessionCost)}</span>
            <button
              onClick={() => setParamsOpen(true)}
              className="lg:hidden p-2 -mr-1 hover:bg-muted rounded-md"
              aria-label="Open parameters"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-8 pb-40">
          {(!active || active.messages.length === 0) && (
            <div className="max-w-3xl mx-auto text-center pt-12 sm:pt-24">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted mb-4">
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
                Chat with {activeModel.name}
              </h2>
              <p className="text-sm text-muted-foreground font-mono max-w-md mx-auto">
                Ask anything. Stream live responses, switch models mid-conversation, watch the cost in real time.
              </p>
            </div>
          )}

          {active?.messages.map((msg) => (
            <div key={msg.id} className="max-w-3xl mx-auto flex gap-3 sm:gap-4 mb-6 sm:mb-8 animate-fade-in">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded grid place-items-center font-bold text-xs shrink-0 mt-1 ${
                  msg.role === "user"
                    ? "bg-primary/20 text-primary"
                    : msg.error
                    ? "bg-destructive/20 text-destructive"
                    : "bg-foreground text-background"
                }`}
              >
                {msg.role === "user" ? "U" : (msg.modelId ?? "")[0]?.toUpperCase() || "A"}
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                <div className="flex items-center flex-wrap gap-2">
                  <div className="font-bold text-sm">
                    {msg.role === "user"
                      ? "You"
                      : models.find((m) => m.id === msg.modelId)?.name ?? "Assistant"}
                  </div>
                  {msg.latencyMs !== undefined && (
                    <span className="text-xs font-mono text-muted-foreground border border-border px-1.5 rounded bg-muted/30">
                      {msg.latencyMs}ms
                    </span>
                  )}
                  {msg.cost !== undefined && msg.cost > 0 && (
                    <span className="text-xs font-mono text-muted-foreground">
                      {formatCost(msg.cost)}
                    </span>
                  )}
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {msg.content}
                  {streaming &&
                    msg.role === "assistant" &&
                    msg.id === active?.messages[active.messages.length - 1]?.id &&
                    !msg.content && (
                      <Loader2 className="inline w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Composer */}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-background via-background to-transparent pt-10">
          <div className="max-w-3xl mx-auto relative border border-border bg-card rounded-xl shadow-lg focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className="w-full bg-transparent p-3 sm:p-4 pr-14 pb-12 min-h-[68px] max-h-[200px] resize-none focus:outline-none text-sm placeholder:text-muted-foreground"
              placeholder={`Message ${activeModel.name}...`}
              disabled={streaming}
            />
            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center pointer-events-none">
              <div className="text-xs font-mono text-muted-foreground px-2 hidden sm:block">
                Enter ↵ to send · Shift + Enter for newline
              </div>
              <div className="ml-auto flex items-center gap-2 pointer-events-auto">
                {streaming ? (
                  <button
                    onClick={stop}
                    className="bg-destructive text-destructive-foreground p-2 rounded-md hover:bg-destructive/90 transition-colors"
                    aria-label="Stop generation"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => void send()}
                    disabled={!input.trim()}
                    className="bg-foreground text-background p-2 rounded-md hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="text-center mt-2 text-xs font-mono text-muted-foreground">
            Switchboard can make mistakes. Check important info.
          </div>
        </div>
      </div>

      {/* Params — desktop fixed sidebar */}
      <div className="w-72 border-l border-border bg-background hidden lg:block overflow-y-auto shrink-0">
        {ParamsSidebar}
      </div>

      {/* Params — mobile drawer */}
      {paramsOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex justify-end" onClick={() => setParamsOpen(false)}>
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          <div
            className="relative w-80 max-w-[90vw] bg-background border-l border-border h-full overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {ParamsSidebar}
          </div>
        </div>
      )}
    </div>
  );
}
