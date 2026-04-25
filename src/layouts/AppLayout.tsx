import { useEffect, useRef, useState } from "react";
import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import {
  MessageSquare,
  Cpu,
  Key,
  BarChart2,
  CreditCard,
  Settings,
  Menu,
  X,
  Image as ImageIcon,
  LogOut,
  ChevronUp,
  ExternalLink,
  UserCircle2,
} from "lucide-react";
import { useAuth, displayNameFor, initialsFor } from "../lib/auth";

export function AppLayout() {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const { user, loading, logout } = useAuth();

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
    setAccountMenuOpen(false);
  }, [location.pathname]);

  // Close the account menu on outside click + Escape key
  useEffect(() => {
    if (!accountMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountMenuOpen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground font-mono text-sm">
        Loading…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  const initials = initialsFor(user);
  const displayName = displayNameFor(user);
  const emailLine = user.email || "Signed in via Replit";

  const handleLogout = () => {
    logout();
  };

  const navItems = [
    { name: "Chat", path: "/chat", icon: MessageSquare },
    { name: "Images", path: "/images", icon: ImageIcon },
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

      <div className="p-3 border-t border-border relative" ref={accountMenuRef}>
        {accountMenuOpen && (
          <div
            role="menu"
            aria-label="Account menu"
            className="absolute left-3 right-3 bottom-full mb-2 bg-popover border border-border rounded-md shadow-lg overflow-hidden z-20 animate-fade-in"
          >
            <div className="px-3 py-2.5 border-b border-border">
              <div className="text-sm font-medium truncate">{displayName}</div>
              <div className="text-xs text-muted-foreground font-mono truncate">{emailLine}</div>
            </div>
            <Link
              to="/settings"
              role="menuitem"
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
              onClick={() => setAccountMenuOpen(false)}
            >
              <UserCircle2 className="w-4 h-4 text-muted-foreground" />
              Account settings
            </Link>
            <a
              href="https://replit.com/account"
              target="_blank"
              rel="noreferrer noopener"
              role="menuitem"
              className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
              onClick={() => setAccountMenuOpen(false)}
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                Manage on Replit
              </span>
            </a>
            <div className="border-t border-border" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setAccountMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setAccountMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={accountMenuOpen}
          className={`w-full flex items-center gap-3 p-2 rounded-md border border-transparent hover:bg-accent hover:border-border transition-colors text-left ${
            accountMenuOpen ? "bg-accent border-border" : ""
          }`}
        >
          {user.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt=""
              className="w-8 h-8 rounded-full bg-accent object-cover shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-accent grid place-items-center font-mono text-xs shrink-0">
              {initials}
            </div>
          )}
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium truncate">{displayName}</span>
            <span className="text-xs text-muted-foreground font-mono truncate">{emailLine}</span>
          </div>
          <ChevronUp
            className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
              accountMenuOpen ? "" : "rotate-180"
            }`}
          />
        </button>
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
