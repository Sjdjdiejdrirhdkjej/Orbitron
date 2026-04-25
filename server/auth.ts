import type { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import { query } from "./db";

const SESSION_COOKIE = "sb_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const KEY_PREFIX = "sk-sb-v1-";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
  created_at: Date;
}

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

export interface AuthContext {
  user: { id: string; email: string; name: string | null };
  via: "session" | "api_key";
  apiKeyId?: string;
}

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthContext;
  }
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  const isProd = process.env.NODE_ENV === "production";
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${expiresAt.toUTCString()}`,
  ];
  if (isProd) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

function clearSessionCookie(res: Response) {
  const isProd = process.env.NODE_ENV === "production";
  const parts = [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ];
  if (isProd) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

function publicUser(u: UserRow) {
  return { id: u.id, email: u.email, name: u.name };
}

async function getSessionUser(token: string | undefined): Promise<UserRow | null> {
  if (!token) return null;
  const result = await query<UserRow & { expires_at: Date }>(
    `SELECT u.id, u.email, u.name, u.password_hash, u.created_at, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token = $1`,
    [token],
  );
  const row = result.rows[0];
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await query("DELETE FROM sessions WHERE token = $1", [token]);
    return null;
  }
  return row;
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

async function getUserFromBearer(token: string): Promise<{ user: UserRow; keyId: string } | null> {
  if (!token.startsWith(KEY_PREFIX)) return null;
  const lookup = lookupHash(token);
  const result = await query<UserRow & { key_id: string; revoked_at: Date | null }>(
    `SELECT u.id, u.email, u.name, u.password_hash, u.created_at,
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
  return {
    user: {
      id: row.id,
      email: row.email,
      name: row.name,
      password_hash: row.password_hash,
      created_at: row.created_at,
    },
    keyId: row.key_id,
  };
}

/**
 * Resolve auth from either:
 *   - Authorization: Bearer <api key>
 *   - sb_session cookie
 * Sets req.auth on success. Does not reject — that's the caller's job.
 */
export async function resolveAuth(req: Request): Promise<AuthContext | null> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const result = await getUserFromBearer(token);
      if (result) {
        return {
          user: publicUser(result.user),
          via: "api_key",
          apiKeyId: result.keyId,
        };
      }
      // Bearer was provided but invalid — return null so caller can 401.
      return null;
    }
  }

  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies[SESSION_COOKIE];
  if (sessionToken) {
    const user = await getSessionUser(sessionToken);
    if (user) {
      return { user: publicUser(user), via: "session" };
    }
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
          "Authentication required. Pass a session cookie or 'Authorization: Bearer <api key>' header. Generate a key at /keys.",
        type: "unauthorized",
      },
    });
  }
  req.auth = ctx;
  next();
}

/** Express middleware: require a session (used for /api/auth/me, /api/keys). */
export async function requireSession(req: Request, res: Response, next: NextFunction) {
  const ctx = await resolveAuth(req);
  if (!ctx || ctx.via !== "session") {
    return res.status(401).json({
      error: { message: "You must be signed in.", type: "unauthorized" },
    });
  }
  req.auth = ctx;
  next();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function registerAuthRoutes(app: Express): void {
  // POST /api/auth/signup { email, password, name? }
  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const { email, password, name } = (req.body || {}) as {
        email?: string;
        password?: string;
        name?: string;
      };
      if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
        return res.status(400).json({ error: { message: "A valid email is required." } });
      }
      if (!password || typeof password !== "string" || password.length < 8) {
        return res
          .status(400)
          .json({ error: { message: "Password must be at least 8 characters." } });
      }
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = typeof name === "string" ? name.trim().slice(0, 120) || null : null;

      const existing = await query<UserRow>("SELECT id FROM users WHERE email = $1", [cleanEmail]);
      if (existing.rowCount && existing.rowCount > 0) {
        return res
          .status(409)
          .json({ error: { message: "An account with that email already exists." } });
      }

      const hash = await bcrypt.hash(password, 12);
      const result = await query<UserRow>(
        `INSERT INTO users (email, name, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, email, name, password_hash, created_at`,
        [cleanEmail, cleanName, hash],
      );
      const user = result.rows[0];

      const token = randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      await query("INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)", [
        token,
        user.id,
        expiresAt,
      ]);
      setSessionCookie(res, token, expiresAt);
      res.status(201).json({ user: publicUser(user) });
    } catch (err) {
      console.error("signup error:", err);
      res.status(500).json({ error: { message: "Failed to create account." } });
    }
  });

  // POST /api/auth/login { email, password }
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = (req.body || {}) as { email?: string; password?: string };
      if (!email || !password) {
        return res.status(400).json({ error: { message: "Email and password required." } });
      }
      const cleanEmail = String(email).trim().toLowerCase();
      const result = await query<UserRow>(
        "SELECT id, email, name, password_hash, created_at FROM users WHERE email = $1",
        [cleanEmail],
      );
      const user = result.rows[0];
      // Always run bcrypt to avoid timing leaks.
      const ok = user
        ? await bcrypt.compare(password, user.password_hash)
        : await bcrypt.compare(password, "$2a$12$invalidhashinvalidhashinvalidhashinvalidhashinvalidhash");
      if (!user || !ok) {
        return res.status(401).json({ error: { message: "Invalid email or password." } });
      }
      const token = randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      await query("INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)", [
        token,
        user.id,
        expiresAt,
      ]);
      setSessionCookie(res, token, expiresAt);
      res.json({ user: publicUser(user) });
    } catch (err) {
      console.error("login error:", err);
      res.status(500).json({ error: { message: "Failed to sign in." } });
    }
  });

  // POST /api/auth/logout
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[SESSION_COOKIE];
    if (token) {
      await query("DELETE FROM sessions WHERE token = $1", [token]).catch(() => undefined);
    }
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  // GET /api/auth/me
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const ctx = await resolveAuth(req);
    if (!ctx || ctx.via !== "session") {
      return res.status(401).json({ error: { message: "Not signed in." } });
    }
    res.json({ user: ctx.user });
  });
}

export function registerKeyRoutes(app: Express): void {
  // GET /api/keys — list current user's keys (no secret values)
  app.get("/api/keys", requireSession, async (req: Request, res: Response) => {
    const userId = req.auth!.user.id;
    const result = await query<ApiKeyRow>(
      `SELECT id, user_id, name, prefix, monthly_cap_cents, created_at, last_used_at, revoked_at
         FROM api_keys
        WHERE user_id = $1
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

  // DELETE /api/keys/:id — revoke (does not delete row, sets revoked_at)
  app.delete("/api/keys/:id", requireSession, async (req: Request, res: Response) => {
    const userId = req.auth!.user.id;
    const { id } = req.params;
    const result = await query<{ id: string }>(
      `UPDATE api_keys
          SET revoked_at = NOW()
        WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
        RETURNING id`,
      [id, userId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: { message: "Key not found." } });
    }
    res.json({ ok: true });
  });
}

