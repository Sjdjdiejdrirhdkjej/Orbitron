import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  /** Redirects to the Replit Auth login flow. */
  login(): void;
  /** Redirects to the Replit Auth logout flow. */
  logout(): void;
  refresh(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Navigate to a Replit Auth endpoint without leaking a window.opener reference.
 *
 * If the current tab was opened from another window (e.g. the Replit
 * workspace's "Open in new tab" button on the preview pane), `window.opener`
 * will be set. Replit's OIDC consent page detects that and calls
 * `window.close()` after the user authorizes — which closes the user's app
 * tab instead of returning control to it. Disconnecting the opener before
 * navigating prevents that auto-close behaviour.
 */
export function gotoAuth(path: "/api/login" | "/api/logout"): void {
  try {
    if (window.opener) {
      // Some browsers make this a no-op for cross-origin openers; that's fine.
      (window as any).opener = null;
    }
  } catch {
    // ignore — best-effort
  }
  window.location.href = path;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as AuthUser;
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(() => {
    gotoAuth("/api/login");
  }, []);

  const logout = useCallback(() => {
    gotoAuth("/api/logout");
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, loading, login, logout, refresh }),
    [user, loading, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Convenience helper: a friendly display name for the user. */
export function displayNameFor(user: AuthUser): string {
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (user.email) return user.email.split("@")[0];
  return "Account";
}

export function initialsFor(user: AuthUser): string {
  const f = (user.firstName?.[0] || "").toUpperCase();
  const l = (user.lastName?.[0] || "").toUpperCase();
  if (f || l) return `${f}${l}` || f || l || "U";
  if (user.email) {
    return user.email.slice(0, 2).toUpperCase();
  }
  return "U";
}
