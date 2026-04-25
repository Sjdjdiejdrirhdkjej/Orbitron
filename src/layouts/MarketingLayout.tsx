import { Outlet, Link, useLocation } from "react-router-dom";
import { Activity } from "lucide-react";

export function MarketingLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 font-mono font-bold tracking-tighter">
              <div className="w-5 h-5 bg-foreground rounded-sm grid place-items-center">
                <div className="w-2 h-2 bg-background rounded-sm" />
              </div>
              SWITCHBOARD
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link to="/models" className="text-muted-foreground hover:text-foreground transition-colors">Models</Link>
              <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
              <Link to="/docs" className="text-muted-foreground hover:text-foreground transition-colors">Docs</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-muted-foreground border border-border rounded-full px-3 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              All systems operational
            </div>
            <Link to="/login" className="text-sm font-medium hover:text-primary transition-colors">Log in</Link>
            <Link to="/chat" className="text-sm font-medium bg-foreground text-background px-4 py-1.5 rounded-md hover:bg-foreground/90 transition-colors">Get Started</Link>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border py-12 bg-muted/20">
        <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 font-mono font-bold tracking-tighter mb-4">
              SWITCHBOARD
            </div>
            <p className="text-sm text-muted-foreground">The neutral gateway to every frontier model.</p>
          </div>
          <div>
            <h4 className="font-mono text-sm font-bold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/models" className="hover:text-foreground">Models</Link></li>
              <li><Link to="/pricing" className="hover:text-foreground">Pricing</Link></li>
              <li><Link to="/docs" className="hover:text-foreground">Documentation</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-sm font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="#" className="hover:text-foreground">About</Link></li>
              <li><Link to="#" className="hover:text-foreground">Blog</Link></li>
              <li><Link to="#" className="hover:text-foreground">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-sm font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="#" className="hover:text-foreground">Privacy Policy</Link></li>
              <li><Link to="#" className="hover:text-foreground">Terms of Service</Link></li>
              <li><Link to="#" className="hover:text-foreground">Security</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
