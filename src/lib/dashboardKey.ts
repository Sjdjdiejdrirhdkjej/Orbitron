// Auto-provisioned API key used by the dashboard SPA to call /api/chat and
// /api/images. Those endpoints require a valid Bearer key from this point on
// (no more session-only path), so the SPA fetches a fresh per-tab key from
// /api/auth/dashboard-key on first need, caches it in module-scoped memory,
// and reuses it for the lifetime of the page.
//
// On a 401, callers should clear the cached key via `resetDashboardKey()` so
// the next call re-provisions a new one — handles cases where the user
// signed out in another tab or the key was rotated server-side.

let cachedKey: string | null = null;
let inflight: Promise<string> | null = null;

export async function getDashboardKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  if (inflight) return inflight;
  inflight = (async () => {
    const res = await fetch("/api/auth/dashboard-key", {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      inflight = null;
      throw new Error(
        res.status === 401
          ? "You must be signed in."
          : "Failed to provision API key.",
      );
    }
    const data = (await res.json()) as { key?: string };
    if (!data.key) {
      inflight = null;
      throw new Error("Server did not return an API key.");
    }
    cachedKey = data.key;
    inflight = null;
    return data.key;
  })();
  return inflight;
}

export function resetDashboardKey(): void {
  cachedKey = null;
  inflight = null;
}
