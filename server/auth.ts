import type { Express, Request, Response, NextFunction } from "express";
import { randomBytes, createHash } from "node:crypto";
import { query } from "./db";
import { isAuthenticated as isReplitAuthenticated } from "./replit_integrations/auth";
import { getKeyUsageSummary } from "./usage";

const KEY_PREFIX = "sk-sb-v1-";

interface ApiKeyRow {
  id: string;
  user_id: string;
  name: string;
  prefix: string;
  monthly_cap_cents: number | null;
  created_at: Date;
  last_used_at: Date | null;
  revoked_at: Date | null;
}

interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

export interface AuthContext {
  user: AuthUser;
  via: "session" | "api_key";
  apiKeyId?: string;
}

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthContext;
  }
}

function lookupHash(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function generateApiKey(): { full: string; prefix: string; lookup: string } {
  // 32 random bytes → URL-safe base64 (43 chars)
  const raw = randomBytes(32).toString("base64url");
  const full = `${KEY_PREFIX}${raw}`;
  const prefix = full.slice(0, KEY_PREFIX.length + 6); // first 6 chars of secret
  return { full, prefix, lookup: lookupHash(full) };
}

interface UserLookupRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
}

function rowToUser(r: UserLookupRow): AuthUser {
  return {
    id: r.id,
    email: r.email,
    firstName: r.first_name,
    lastName: r.last_name,
    profileImageUrl: r.profile_image_url,
  };
}

async function getUserFromBearer(
  token: string,
): Promise<{ user: AuthUser; keyId: string } | null> {
  if (!token.startsWith(KEY_PREFIX)) return null;
  const lookup = lookupHash(token);
  const result = await query<UserLookupRow & { key_id: string; revoked_at: Date | null }>(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.profile_image_url,
            k.id AS key_id, k.revoked_at
       FROM api_keys k
       JOIN users u ON u.id = k.user_id
      WHERE k.lookup_hash = $1`,
    [lookup],
  );
  const row = result.rows[0];
  if (!row) return null;
  if (row.revoked_at) return null;
  // Update last_used_at without blocking
  query("UPDATE api_keys SET last_used_at = NOW() WHERE id = $1", [row.key_id]).catch(
    (err) => console.error("Failed to update last_used_at:", err),
  );
  return { user: rowToUser(row), keyId: row.key_id };
}

/**
 * Rotate (or create) the auto-provisioned "Dashboard" API key for a user and
 * return the plaintext exactly once. Any prior dashboard key is deleted so a
 * single user never accumulates more than one.
 *
 * The dashboard SPA calls /api/auth/dashboard-key on load to obtain a fresh
 * key, then uses it as a Bearer token for /api/chat and /api/images. This way
 * those endpoints can uniformly require an API key — there is no longer a
 * "session-only" path that bypasses key authentication.
 */
async function rotateDashboardKey(userId: string): Promise<string> {
  await query(
    `DELETE FROM api_keys WHERE user_id = $1 AND is_dashboard = TRUE`,
    [userId],
  );
  const { full, prefix, lookup } = generateApiKey();
  await query(
    `INSERT INTO api_keys (user_id, name, prefix, lookup_hash, is_dashboard)
     VALUES ($1, $2, $3, $4, TRUE)`,
    [userId, "Dashboard (auto)", prefix, lookup],
  );
  return full;
}

async function getSessionUser(req: Request): Promise<AuthUser | null> {
  if (!req.isAuthenticated || !req.isAuthenticated()) return null;
  const claims = (req.user as any)?.claims;
  const userId = claims?.sub;
  if (!userId) return null;
  const result = await query<UserLookupRow>(
    `SELECT id, email, first_name, last_name, profile_image_url
       FROM users WHERE id = $1`,
    [userId],
  );
  const row = result.rows[0];
  return row ? rowToUser(row) : null;
}

/**
 * Resolve auth from either:
 *   - Authorization: Bearer <api key>
 *   - Replit Auth session (passport)
 * Sets req.auth on success. Does not reject — that's the caller's job.
 */
export async function resolveAuth(req: Request): Promise<AuthContext | null> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const result = await getUserFromBearer(token);
      if (result) {
        return { user: result.user, via: "api_key", apiKeyId: result.keyId };
      }
      // Bearer was provided but invalid — return null so caller can 401.
      return null;
    }
  }

  const user = await getSessionUser(req);
  if (user) {
    return { user, via: "session" };
  }
  return null;
}

/** Express middleware: require any valid auth (session or API key). */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const ctx = await resolveAuth(req);
  if (!ctx) {
    return res.status(401).json({
      error: {
        message:
          "Authentication required. Sign in with Replit, or pass 'Authorization: Bearer <api key>'. Generate a key at /keys.",
        type: "unauthorized",
      },
    });
  }
  req.auth = ctx;
  next();
}

/**
 * Express middleware: require a valid dashboard-issued API key.
 *
 * Used for the public-facing model-routing endpoints (/api/chat, /api/images).
 * Session cookies are NOT accepted here — programmatic API access must always
 * present a key generated at /keys (or the auto-provisioned dashboard key the
 * SPA fetches via /api/auth/dashboard-key). Returns 401 with an explicit error
 * type so SDK consumers can distinguish "missing key" from "invalid key".
 */
export async function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return res.status(401).json({
      error: {
        message:
          "Missing API key. Pass 'Authorization: Bearer <api key>'. Generate a key at /keys.",
        type: "missing_api_key",
      },
    });
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({
      error: { message: "Empty API key.", type: "invalid_api_key" },
    });
  }
  if (!token.startsWith(KEY_PREFIX)) {
    return res.status(401).json({
      error: {
        message: `Invalid API key format. Orbitron keys start with '${KEY_PREFIX}'.`,
        type: "invalid_api_key",
      },
    });
  }
  const result = await getUserFromBearer(token);
  if (!result) {
    return res.status(401).json({
      error: {
        message: "Invalid or revoked API key.",
        type: "invalid_api_key",
      },
    });
  }
  req.auth = { user: result.user, via: "api_key", apiKeyId: result.keyId };
  next();
}

/**
 * Express middleware: require a Replit Auth session (used for /api/keys).
 * Wraps Replit Auth's `isAuthenticated` (which handles token refresh) and then
 * loads the database user record into req.auth.
 */
export function requireSession(req: Request, res: Response, next: NextFunction) {
  isReplitAuthenticated(req, res, async (err?: unknown) => {
    if (err) return next(err);
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({
        error: { message: "You must be signed in.", type: "unauthorized" },
      });
    }
    req.auth = { user, via: "session" };
    next();
  });
}

export function registerKeyRoutes(app: Express): void {
  // POST /api/auth/dashboard-key — issue a fresh auto-provisioned key for the
  // currently signed-in user. Required by the dashboard SPA so its Chat and
  // Images pages can call /api/chat and /api/images, both of which now require
  // a Bearer API key (no more session-only fallback). Each call rotates the
  // user's previous dashboard key, so the plaintext only ever lives in the
  // current browser tab's memory.
  app.post(
    "/api/auth/dashboard-key",
    requireSession,
    async (req: Request, res: Response) => {
      const userId = req.auth!.user.id;
      try {
        const key = await rotateDashboardKey(userId);
        res.json({ key });
      } catch (err) {
        console.error("Failed to rotate dashboard key:", err);
        res
          .status(500)
          .json({ error: { message: "Failed to provision dashboard key" } });
      }
    },
  );

  // GET /api/keys — list current user's keys (no secret values).
  // Excludes auto-provisioned dashboard keys (is_dashboard = TRUE) — those are
  // an internal implementation detail of the SPA and aren't user-managed.
  app.get("/api/keys", requireSession, async (req: Request, res: Response) => {
    const userId = req.auth!.user.id;
    const result = await query<ApiKeyRow>(
      `SELECT id, user_id, name, prefix, monthly_cap_cents, created_at, last_used_at, revoked_at
         FROM api_keys
        WHERE user_id = $1 AND is_dashboard = FALSE
        ORDER BY created_at DESC`,
      [userId],
    );
    res.json({
      data: result.rows.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        monthlyCapCents: k.monthly_cap_cents,
        createdAt: k.created_at,
        lastUsedAt: k.last_used_at,
        revokedAt: k.revoked_at,
      })),
    });
  });

  // POST /api/keys { name, monthlyCapCents? } — returns the full key ONCE
  app.post("/api/keys", requireSession, async (req: Request, res: Response) => {
    const userId = req.auth!.user.id;
    const { name, monthlyCapCents } = (req.body || {}) as {
      name?: string;
      monthlyCapCents?: number | null;
    };
    const cleanName = typeof name === "string" ? name.trim().slice(0, 80) : "";
    if (!cleanName) {
      return res.status(400).json({ error: { message: "Name is required." } });
    }
    let cap: number | null = null;
    if (monthlyCapCents !== undefined && monthlyCapCents !== null) {
      const n = Number(monthlyCapCents);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ error: { message: "Cap must be a positive number." } });
      }
      cap = Math.floor(n);
    }

    const { full, prefix, lookup } = generateApiKey();
    const result = await query<ApiKeyRow>(
      `INSERT INTO api_keys (user_id, name, prefix, lookup_hash, monthly_cap_cents)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, name, prefix, monthly_cap_cents, created_at, last_used_at, revoked_at`,
      [userId, cleanName, prefix, lookup, cap],
    );
    const k = result.rows[0];
    res.status(201).json({
      key: full, // only returned this one time
      record: {
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        monthlyCapCents: k.monthly_cap_cents,
        createdAt: k.created_at,
        lastUsedAt: k.last_used_at,
        revokedAt: k.revoked_at,
      },
    });
  });

  // GET /api/keys/:id/usage?days=30 — per-key analytics for the Keys page.
  // Verifies the key belongs to the requesting user (and isn't the hidden
  // dashboard key) before returning aggregated stats.
  app.get(
    "/api/keys/:id/usage",
    requireSession,
    async (req: Request, res: Response) => {
      const userId = req.auth!.user.id;
      const { id } = req.params;
      const days = Math.max(
        1,
        Math.min(90, Number(req.query.days) || 30),
      );
      const owner = await query<{ id: string }>(
        `SELECT id FROM api_keys
          WHERE id = $1 AND user_id = $2 AND is_dashboard = FALSE`,
        [id, userId],
      );
      if (owner.rowCount === 0) {
        return res.status(404).json({ error: { message: "Key not found." } });
      }
      try {
        const summary = await getKeyUsageSummary(id, days);
        res.json(summary);
      } catch (err) {
        console.error("Per-key usage error:", err);
        res
          .status(500)
          .json({ error: { message: "Failed to load key usage" } });
      }
    },
  );

  // DELETE /api/keys/:id — revoke (does not delete row, sets revoked_at)
  app.delete("/api/keys/:id", requireSession, async (req: Request, res: Response) => {
    const userId = req.auth!.user.id;
    const { id } = req.params;
    const result = await query<{ id: string }>(
      `UPDATE api_keys
          SET revoked_at = NOW()
        WHERE id = $1
          AND user_id = $2
          AND revoked_at IS NULL
          AND is_dashboard = FALSE
        RETURNING id`,
      [id, userId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: { message: "Key not found." } });
    }
    res.json({ ok: true });
  });
}
