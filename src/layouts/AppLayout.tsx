import { useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { MessageSquare, Cpu, Key, BarChart2, CreditCard, Settings, Menu, X } from "lucide-react";

export function AppLayout() {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const navItems = [
    { name: "Chat", path: "/chat", icon: MessageSquare },
    { name: "Models", path: "/models", icon: Cpu },
    { name: "API Keys", path: "/keys", icon: Key },
    { name: "Usage", path: "/usage", icon: BarChart2 },
    { name: "Credits", path: "/credits", icon: CreditCard },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  const Sidebar = (
    <div className="flex flex-col h-full bg-muted/10">
      <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
        <Link to="/" className="flex items-center gap-2 font-mono font-bold tracking-tighter">
          <div className="w-5 h-5 bg-foreground rounded-sm grid place-items-center">
            <div className="w-2 h-2 bg-background rounded-sm" />
          </div>
          SWITCHBOARD
        </Link>
        <button
          className="md:hidden p-2 -mr-1 rounded-md hover:bg-muted"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 border-b border-border">
        <div className="text-xs font-mono text-muted-foreground mb-1">WORKSPACE</div>
        <div className="flex items-center justify-between p-2 hover:bg-accent rounded-md cursor-pointer border border-transparent hover:border-border transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded bg-primary/20 text-primary grid place-items-center font-mono text-xs font-bold shrink-0">A</div>
            <span className="text-sm font-medium truncate">Acme Corp</span>
          </div>
          <span className="text-xs text-muted-foreground font-mono shrink-0">$42.50</span>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent grid place-items-center font-mono text-xs">JD</div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">Jane Doe</span>
            <span className="text-xs text-muted-foreground font-mono">Pro Plan</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="w-64 border-r border-border hidden md:flex flex-col shrink-0">
        {Sidebar}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          <aside
            className="relative w-72 max-w-[85vw] border-r border-border h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {Sidebar}
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden h-14 border-b border-border flex items-center justify-between px-3 bg-background shrink-0">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 -ml-1 rounded-md hover:bg-muted"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link to="/" className="flex items-center gap-2 font-mono font-bold tracking-tighter text-sm">
            <div className="w-4 h-4 bg-foreground rounded-sm grid place-items-center">
              <div className="w-1.5 h-1.5 bg-background rounded-sm" />
            </div>
            SWITCHBOARD
          </Link>
          <div className="w-9" />
        </div>

        <Outlet />
      </main>
    </div>
  );
}
