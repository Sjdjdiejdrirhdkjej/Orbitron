import React, { useState } from "react";
import { User, Users, Shield, Key as KeyIcon, Monitor, ExternalLink } from "lucide-react";
import { useAuth, displayNameFor, initialsFor } from "../lib/auth";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const { user } = useAuth();

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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">Settings</h1>
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
                  <div key={provider} className="p-4 border border-border rounded-lg bg-card flex gap-4 items-center justify-between">
                    <div className="font-medium w-24">{provider}</div>
                    <div className="flex-1">
                      <input 
                        type="password" 
                        placeholder={`Enter ${provider} API Key`}
                        className="w-full bg-background border border-border rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50" 
                      />
                    </div>
                    <button className="px-4 py-2 border border-border rounded-md font-medium text-sm hover:bg-muted transition-colors whitespace-nowrap">
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