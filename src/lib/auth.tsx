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
  email: string;
  name: string | null;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  signup(input: { email: string; password: string; name?: string }): Promise<void>;
  login(input: { email: string; password: string }): Promise<void>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function jsonOrThrow(res: Response): Promise<unknown> {
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    const message =
      (parsed as { error?: { message?: string } } | null)?.error?.message ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }
  return parsed;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as { user: AuthUser };
        setUser(data.user);
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

  const signup = useCallback(
    async (input: { email: string; password: string; name?: string }) => {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      const data = (await jsonOrThrow(res)) as { user: AuthUser };
      setUser(data.user);
    },
    [],
  );

  const login = useCallback(async (input: { email: string; password: string }) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    const data = (await jsonOrThrow(res)) as { user: AuthUser };
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, loading, signup, login, logout, refresh }),
    [user, loading, signup, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
