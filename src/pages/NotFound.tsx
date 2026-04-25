import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 animate-fade-in">
      <div className="text-9xl font-bold font-mono tracking-tighter text-muted/30 select-none mb-4">404</div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Route not found</h1>
      <p className="text-muted-foreground font-mono text-sm max-w-md mb-8 leading-relaxed">
        The requested endpoint does not exist. Check your URL or return to a valid path.
      </p>
      <div className="flex gap-4">
        <Link to="/" className="px-6 py-2 bg-foreground text-background rounded-md font-medium text-sm hover:bg-foreground/90 transition-colors">
          Go Home
        </Link>
        <Link to="/docs" className="px-6 py-2 border border-border bg-background rounded-md font-medium text-sm hover:bg-muted transition-colors font-mono">
          Read Docs
        </Link>
      </div>
    </div>
  );
}