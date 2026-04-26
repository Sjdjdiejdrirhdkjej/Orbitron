import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { MarketingLayout } from "./layouts/MarketingLayout";
import { AppLayout } from "./layouts/AppLayout";
import Landing from "./pages/Landing";
import Models from "./pages/Models";
import ModelDetail from "./pages/ModelDetail";
import Chat from "./pages/Chat";
import Images from "./pages/Images";
import Keys from "./pages/Keys";
import Usage from "./pages/Usage";
import Credits from "./pages/Credits";
import Settings from "./pages/Settings";
import Pricing from "./pages/Pricing";
import Docs from "./pages/Docs";
import Status from "./pages/Status";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import SharedChat from "./pages/SharedChat";
import NotFound from "./pages/NotFound";
import { models } from "./data/models";
import { ProviderIcon } from "./components/ProviderIcon";

function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (!isOpen) return null;

  const filtered = models.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.provider.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 5);

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-start justify-center pt-[10vh] sm:pt-[20vh]" onClick={() => setIsOpen(false)}>
      <div className="w-full max-w-[90vw] sm:max-w-xl bg-card border border-border rounded-lg sm:rounded-xl shadow-xl sm:shadow-2xl overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="p-3 sm:p-4 border-b border-border flex items-center">
          <input 
            autoFocus
            type="text" 
            placeholder="Search models..." 
            className="w-full bg-transparent font-mono text-sm focus:outline-none text-base sm:text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="text-xs font-mono text-muted-foreground px-2 py-1 bg-muted rounded border border-border hidden sm:block">ESC</div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {filtered.map(model => (
            <button 
              key={model.id}
              className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-muted/50 border-b border-border last:border-0 text-left transition-colors touch-target"
              onClick={() => {
                navigate(`/models/${model.id}`);
                setIsOpen(false);
              }}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-6 h-6 rounded bg-muted grid place-items-center shrink-0">
                  <ProviderIcon provider={model.provider} className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm">{model.name}</div>
                  <div className="text-xs font-mono text-muted-foreground">{model.provider}</div>
                </div>
              </div>
              <div className="text-xs font-mono text-muted-foreground shrink-0">
                ${model.inputPrice.toFixed(2)}/M
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
             <div className="p-8 text-center text-sm font-mono text-muted-foreground">No models found</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  React.useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <>
      <CommandPalette />
      <Routes>
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/status" element={<Status />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route element={<AppLayout />}>
          <Route path="/chat" element={<Chat />} />
          <Route path="/images" element={<Images />} />
          <Route path="/models" element={<Models />} />
          <Route path="/models/:id" element={<ModelDetail />} />
          <Route path="/keys" element={<Keys />} />
          <Route path="/usage" element={<Usage />} />
          <Route path="/credits" element={<Credits />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/share/:slug" element={<SharedChat />} />
      </Routes>
    </>
  );
}