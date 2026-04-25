import { useEffect } from "react";
import { Link } from "react-router-dom";
import { gotoAuth } from "../lib/auth";

/**
 * Replit Auth handles the actual login flow at /api/login.
 * This page exists only as a friendly intermediate that auto-redirects
 * (in case anything still links to /login) and offers a manual button.
 */
export default function Login() {
  useEffect(() => {
    const t = window.setTimeout(() => {
      gotoAuth("/api/login");
    }, 250);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-fade-in">
      <div className="w-full max-w-sm text-center">
        <Link to="/" className="inline-flex justify-center mb-8">
          <div className="w-8 h-8 bg-foreground rounded-sm grid place-items-center">
            <div className="w-3 h-3 bg-background rounded-sm" />
          </div>
        </Link>

        <h1 className="text-2xl font-bold tracking-tight mb-2">Sign in to Switchboard</h1>
        <p className="text-muted-foreground text-sm mb-8 font-mono">
          Redirecting you to Replit to continue…
        </p>

        <a
          href="/api/login"
          onClick={(e) => {
            e.preventDefault();
            gotoAuth("/api/login");
          }}
          className="w-full h-10 inline-flex items-center justify-center bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/90 transition-colors"
        >
          Continue with Replit
        </a>

        <p className="text-xs text-muted-foreground mt-6 font-mono">
          Authentication is handled by Replit. You can sign in with Google,
          GitHub, X, Apple, or email.
        </p>
      </div>
    </div>
  );
}
