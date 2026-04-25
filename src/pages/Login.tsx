import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Github } from "lucide-react";
import { useAuth } from "../lib/auth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const next = (location.state as { from?: string } | null)?.from || "/chat";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-fade-in">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link to="/" className="w-8 h-8 bg-foreground rounded-sm grid place-items-center">
            <div className="w-3 h-3 bg-background rounded-sm" />
          </Link>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-center mb-2">Welcome back</h1>
        <p className="text-muted-foreground text-sm text-center mb-8 font-mono">
          Sign in to your Switchboard account
        </p>

        <div className="space-y-4">
          <button
            type="button"
            disabled
            title="OAuth coming soon — sign in with email below."
            className="w-full h-10 bg-card border border-border rounded-md flex items-center justify-center gap-3 text-sm font-medium text-muted-foreground opacity-60 cursor-not-allowed"
          >
            <Github className="w-4 h-4" />
            Continue with GitHub
          </button>

          <button
            type="button"
            disabled
            title="OAuth coming soon — sign in with email below."
            className="w-full h-10 bg-card border border-border rounded-md flex items-center justify-center gap-3 text-sm font-medium text-muted-foreground opacity-60 cursor-not-allowed"
          >
            <div className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-500 grid place-items-center text-[10px] font-bold">
              G
            </div>
            Continue with Google
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs font-mono">
              <span className="bg-background px-2 text-muted-foreground">OR</span>
            </div>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-background border border-border rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-mono text-muted-foreground">Password</label>
              </div>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-background border border-border rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {error && (
              <div className="text-xs font-mono text-red-400 border border-red-500/40 bg-red-500/10 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-foreground text-background rounded-md flex items-center justify-center text-sm font-medium hover:bg-foreground/90 transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Don't have an account?{" "}
          <Link to="/signup" className="text-foreground hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
