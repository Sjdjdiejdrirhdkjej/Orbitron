import { Outlet, Link, useLocation } from "react-router-dom";
import { MessageSquare, Cpu, Key, BarChart2, CreditCard, Settings, Search } from "lucide-react";

export function AppLayout() {
  const location = useLocation();

  const navItems = [
    { name: "Chat", path: "/chat", icon: MessageSquare },
    { name: "Models", path: "/models", icon: Cpu },
    { name: "API Keys", path: "/keys", icon: Key },
    { name: "Usage", path: "/usage", icon: BarChart2 },
    { name: "Credits", path: "/credits", icon: CreditCard },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-muted/10 flex flex-col hidden md:flex">
        <div className="h-14 border-b border-border flex items-center px-4">
          <Link to="/" className="flex items-center gap-2 font-mono font-bold tracking-tighter">
            <div className="w-5 h-5 bg-foreground rounded-sm grid place-items-center">
              <div className="w-2 h-2 bg-background rounded-sm" />
            </div>
            SWITCHBOARD
          </Link>
        </div>
        
        <div className="p-4 border-b border-border">
          <div className="text-xs font-mono text-muted-foreground mb-1">WORKSPACE</div>
          <div className="flex items-center justify-between p-2 hover:bg-accent rounded-md cursor-pointer border border-transparent hover:border-border transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary/20 text-primary grid place-items-center font-mono text-xs font-bold">A</div>
              <span className="text-sm font-medium">Acme Corp</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">$42.50</span>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1">
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
            )
          })}
        </nav>
        
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent grid place-items-center font-mono text-xs">JD</div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Jane Doe</span>
              <span className="text-xs text-muted-foreground font-mono">Pro Plan</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
