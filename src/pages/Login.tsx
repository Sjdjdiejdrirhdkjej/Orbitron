import React from "react";
import { Link } from "react-router-dom";
import { Github, Target } from "lucide-react";

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-fade-in">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="w-8 h-8 bg-foreground rounded-sm grid place-items-center">
            <div className="w-3 h-3 bg-background rounded-sm" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold tracking-tight text-center mb-2">Welcome back</h1>
        <p className="text-muted-foreground text-sm text-center mb-8 font-mono">Sign in to your Switchboard account</p>
        
        <div className="space-y-4">
          <button className="w-full h-10 bg-card border border-border rounded-md flex items-center justify-center gap-3 text-sm font-medium hover:bg-muted transition-colors">
            <Github className="w-4 h-4" />
            Continue with GitHub
          </button>
          
          <button className="w-full h-10 bg-card border border-border rounded-md flex items-center justify-center gap-3 text-sm font-medium hover:bg-muted transition-colors">
            <div className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-500 grid place-items-center text-[10px] font-bold">G</div>
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

          <form className="space-y-4" onSubmit={e => e.preventDefault()}>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1.5">Email address</label>
              <input type="email" placeholder="you@example.com" className="w-full bg-background border border-border rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-mono text-muted-foreground">Password</label>
                <a href="#" className="text-xs font-mono text-primary hover:underline">Forgot?</a>
              </div>
              <input type="password" placeholder="••••••••" className="w-full bg-background border border-border rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            
            <Link to="/chat" className="w-full h-10 bg-foreground text-background rounded-md flex items-center justify-center text-sm font-medium hover:bg-foreground/90 transition-colors mt-2 block text-center leading-10">
              Sign In
            </Link>
          </form>
        </div>
        
        <p className="text-center text-sm text-muted-foreground mt-8">
          Don't have an account? <Link to="/signup" className="text-foreground hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}