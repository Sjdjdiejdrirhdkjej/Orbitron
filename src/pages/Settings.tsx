import React, { useCallback, useEffect, useState } from "react";
import {
  User,
  Users,
  Shield,
  Key as KeyIcon,
  Monitor,
  ExternalLink,
  Loader2,
  AlertTriangle,
  LogOut,
} from "lucide-react";
import { useAuth, displayNameFor, initialsFor } from "../lib/auth";

interface SessionInfo {
  id: string;
  current: boolean;
  device: string;
  browser: string | null;
  os: string | null;
  ip: string | null;
  lastSeenAt: string | null;
  createdAt: string | null;
  expiresAt: string;
}

function formatRelative(value: string | null): string {
  if (!value) return "—";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "—";
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 30) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const m = Math.floor(diffSec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(value).toLocaleDateString();
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const { user } = useAuth();

  // Recent sign-ins state
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeNotice, setRevokeNotice] = useState<string | null>(null);

  const refreshSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/sessions", { credentials: "include" });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const body = (await res.json()) as { data: SessionInfo[] };
      setSessions(body.data);
      setSessionsError(null);
    } catch (err) {
      setSessionsError(err instanceof Error ? err.message : "Failed to load sessions");
    }
  }, []);

  useEffect(() => {
    if (activeTab === "profile") {
      void refreshSessions();
    }
  }, [activeTab, refreshSessions]);

  const handleRevokeOthers = async () => {
    if (!confirm("Sign out of every other browser and device? You'll stay signed in here.")) return;
    setRevoking(true);
    setRevokeNotice(null);
    try {
      const res = await fetch("/api/auth/sessions/revoke-others", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const body = (await res.json()) as { revoked: number };
      setRevokeNotice(
        body.revoked === 0
          ? "No other sessions were active."
          : `Signed out of ${body.revoked} other session${body.revoked === 1 ? "" : "s"}.`,
      );
      await refreshSessions();
    } catch (err) {
      setRevokeNotice(err instanceof Error ? err.message : "Failed to sign out other sessions");
    } finally {
      setRevoking(false);
    }
  };

  const otherSessionCount = (sessions ?? []).filter((s) => !s.current).length;

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "org", label: "Organization", icon: Users },
    { id: "security", label: "Security", icon: Shield },
    { id: "byok", label: "Bring Your Own Key", icon: KeyIcon },
    { id: "prefs", label: "Preferences", icon: Monitor },
  ];

  return (
    <div className="flex flex-col h-full animate-fade-in overflow-hidden">
      <header className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-4 border-b border-border">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight mb-4 sm:mb-6">Settings</h1>
        <div className="flex gap-4 sm:gap-6 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-muted/5">
        <div className="max-w-2xl">
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="flex items-center gap-6 mb-8">
                {user?.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-20 h-20 rounded-full bg-accent object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-accent grid place-items-center font-mono text-2xl font-bold">
                    {user ? initialsFor(user) : "—"}
                  </div>
                )}
                <div className="text-xs font-mono text-muted-foreground max-w-xs">
                  Your avatar is provided by your Replit account. Update it in your Replit profile settings.
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 font-mono text-muted-foreground">Full Name</label>
                  <input
                    type="text"
                    value={user ? displayNameFor(user) : ""}
                    readOnly
                    className="w-full bg-background border border-border rounded-md px-3 py-2 font-mono text-sm focus:outline-none max-w-md text-muted-foreground cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 font-mono text-muted-foreground">Email Address</label>
                  <input
                    type="email"
                    value={user?.email ?? ""}
                    readOnly
                    placeholder="Not provided by your Replit account"
                    className="w-full bg-background border border-border rounded-md px-3 py-2 font-mono text-sm focus:outline-none max-w-md text-muted-foreground cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 font-mono text-muted-foreground">User ID</label>
                  <input
                    type="text"
                    value={user?.id ?? ""}
                    readOnly
                    className="w-full bg-background border border-border rounded-md px-3 py-2 font-mono text-xs focus:outline-none max-w-md text-muted-foreground cursor-not-allowed"
                  />
                </div>

                <div className="mt-6 p-4 border border-border rounded-md bg-muted/20 max-w-md">
                  <p className="text-xs font-mono text-muted-foreground mb-3">
                    Profile fields are managed by your Replit account and refresh on every sign-in.
                  </p>
                  <a
                    href="https://replit.com/account"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:underline"
                  >
                    Manage on Replit <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Recent sign-ins */}
              <div className="pt-8 mt-8 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-lg font-bold">Recent sign-ins</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground font-mono mt-1">
                      Active Switchboard sessions for your account.
                    </p>
                  </div>
                  <button
                    onClick={handleRevokeOthers}
                    disabled={revoking || otherSessionCount === 0}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 border border-border rounded-md text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      otherSessionCount === 0
                        ? "No other active sessions"
                        : "Sign out of every other session"
                    }
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    {revoking ? "Signing out…" : "Sign out everywhere else"}
                  </button>
                </div>

                {revokeNotice && (
                  <div className="mb-4 text-xs font-mono text-muted-foreground border border-border rounded-md bg-muted/20 px-3 py-2">
                    {revokeNotice}
                  </div>
                )}

                {sessionsError ? (
                  <div className="border border-yellow-500/40 bg-yellow-500/10 text-yellow-200 rounded-md px-4 py-3 text-sm font-mono flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {sessionsError}
                  </div>
                ) : sessions === null ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground text-sm font-mono">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="border border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground font-mono">
                    No active sessions found.
                  </div>
                ) : (
                  <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
                    {sessions.map((s) => (
                      <div
                        key={s.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4"
                      >
              <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                <Monitor className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                    {s.device}
                    {s.current && (
                      <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[10px] font-mono uppercase">
                        this device
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>{s.ip ?? "ip unknown"}</span>
                    <span className="hidden sm:inline">id {s.id}</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground font-mono sm:text-right shrink-0 pl-7 sm:pl-0">
                          <div>Active {formatRelative(s.lastSeenAt)}</div>
                          <div className="text-[11px] mt-0.5">
                            Expires {new Date(s.expiresAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "byok" && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground mb-6">
                Provide your own provider API keys. We'll route requests to these providers using your keys instead of billing you per token. 
                Switchboard charges a flat $20/mo routing fee per active BYOK provider.
              </p>
              
              <div className="space-y-4">
                {["OpenAI", "Anthropic", "Google"].map(provider => (
                  <div key={provider} className="p-3 sm:p-4 border border-border rounded-lg bg-card flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between">
                    <div className="font-medium w-full sm:w-24">{provider}</div>
                    <div className="flex-1">
                      <input 
                        type="password" 
                        placeholder={`Enter ${provider} API Key`}
                        className="w-full bg-background border border-border rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50" 
                      />
                    </div>
                    <button className="px-4 py-2 border border-border rounded-md font-medium text-sm hover:bg-muted transition-colors whitespace-nowrap touch-target">
                      Verify & Save
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "org" && (
            <div className="space-y-6">
               <h3 className="text-lg font-bold">Team Members</h3>
               <div className="border border-border rounded-lg overflow-hidden bg-card">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/30 text-muted-foreground font-mono text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-border">
                    <tr>
                      <td className="px-4 py-3 font-medium">
                        {user ? displayNameFor(user) : "—"}{" "}
                        <span className="text-muted-foreground font-normal">(you)</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">Owner</td>
                      <td className="px-4 py-3 text-right"></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium">Alice Dev</td>
                      <td className="px-4 py-3">
                        <select className="bg-transparent border border-border rounded px-2 py-1 text-sm">
                          <option>Admin</option>
                          <option>Member</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-red-400 hover:text-red-500 text-xs font-medium">Remove</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <button className="px-4 py-2 border border-border rounded-md font-medium text-sm hover:bg-muted transition-colors">
                Invite Member
              </button>
            </div>
          )}
          
          {(activeTab === "security" || activeTab === "prefs") && (
            <div className="flex h-32 items-center justify-center border border-dashed border-border rounded-lg text-muted-foreground font-mono text-sm">
              Settings panel component stub
            </div>
          )}
        </div>
      </div>
    </div>
  );
}