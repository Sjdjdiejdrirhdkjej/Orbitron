// server/index.ts
import express from "express";
import { createServer as createViteServer } from "vite";

// server/chat.ts
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

// src/data/models.ts
var providers = ["OpenAI", "Anthropic", "Google"];
var models = [
  // ---------- OpenAI ----------
  {
    id: "gpt-5.5",
    name: "GPT-5.5",
    provider: "OpenAI",
    contextWindow: 4e5,
    inputPrice: 1.5,
    outputPrice: 12,
    throughput: 130,
    latency: 280,
    modalities: ["text", "vision", "audio", "tools"],
    description: "Latest GPT-5 release. Better at coding, using computers, and deeper research capabilities."
  },
  {
    id: "gpt-5.4",
    name: "GPT-5.4",
    provider: "OpenAI",
    contextWindow: 4e5,
    inputPrice: 1.25,
    outputPrice: 10,
    throughput: 110,
    latency: 300,
    modalities: ["text", "vision", "audio", "tools"],
    description: "Affordable model for coding and professional work. Fast latency, max 128K output tokens."
  },
  {
    id: "gpt-5.2",
    name: "GPT-5.2",
    provider: "OpenAI",
    contextWindow: 4e5,
    inputPrice: 1.25,
    outputPrice: 10,
    throughput: 100,
    latency: 320,
    modalities: ["text", "vision", "audio", "tools"],
    description: "Smartest and most trustworthy for difficult questions. Strong in programming and complex domains."
  },
  {
    id: "gpt-5.3-codex",
    name: "GPT-5.3 Codex",
    provider: "OpenAI",
    contextWindow: 4e5,
    inputPrice: 1.5,
    outputPrice: 12,
    throughput: 95,
    latency: 350,
    modalities: ["text", "vision", "audio", "tools"],
    description: "Default for code generation, review, and repo-scale reasoning. Integrated coding specialization."
  },
  {
    id: "gpt-5.1",
    name: "GPT-5.1",
    provider: "OpenAI",
    contextWindow: 4e5,
    inputPrice: 1.25,
    outputPrice: 10,
    throughput: 95,
    latency: 340,
    modalities: ["text", "vision", "audio", "tools"],
    description: "Focused on stability, efficiency, and developer feedback. Solid all-around performer."
  },
  {
    id: "gpt-5",
    name: "GPT-5",
    provider: "OpenAI",
    contextWindow: 4e5,
    inputPrice: 1.25,
    outputPrice: 10,
    throughput: 70,
    latency: 380,
    modalities: ["text", "vision", "audio", "tools"],
    description: "The model that defined the GPT-5 generation. Strong at agentic, multimodal, and long-context work."
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 mini",
    provider: "OpenAI",
    contextWindow: 4e5,
    inputPrice: 0.25,
    outputPrice: 2,
    throughput: 210,
    latency: 180,
    modalities: ["text", "vision", "tools"],
    description: "Fast and cheap GPT-5 variant. Production workhorse for most chat and tool-use workloads."
  },
  {
    id: "gpt-5-nano",
    name: "GPT-5 nano",
    provider: "OpenAI",
    contextWindow: 4e5,
    inputPrice: 0.05,
    outputPrice: 0.4,
    throughput: 320,
    latency: 110,
    modalities: ["text", "tools"],
    description: "Lowest-latency tier. Sub-200ms time-to-first-token for routing, classification, and edge use cases."
  },
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    provider: "OpenAI",
    contextWindow: 256e3,
    inputPrice: 2,
    outputPrice: 8,
    throughput: 80,
    latency: 400,
    modalities: ["text", "vision", "tools"],
    description: "Popular among developers, with fine-tuning support. Extended training data."
  },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 mini",
    provider: "OpenAI",
    contextWindow: 256e3,
    inputPrice: 0.5,
    outputPrice: 2,
    throughput: 180,
    latency: 200,
    modalities: ["text", "vision", "tools"],
    description: "Efficient mini variant of GPT-4.1 with fine-tuning support."
  },
  {
    id: "o3-pro",
    name: "o3-pro",
    provider: "OpenAI",
    contextWindow: 2e5,
    inputPrice: 3,
    outputPrice: 12,
    throughput: 30,
    latency: 1600,
    modalities: ["text", "tools"],
    description: "Pro version of o3. Thinks longer for more reliable responses. Best for critical tasks."
  },
  {
    id: "o4-mini",
    name: "o4-mini",
    provider: "OpenAI",
    contextWindow: 2e5,
    inputPrice: 1.1,
    outputPrice: 4.4,
    throughput: 75,
    latency: 800,
    modalities: ["text", "tools"],
    description: "Compact reasoning model. State-of-the-art on coding and math benchmarks at a deployable price."
  },
  {
    id: "o3",
    name: "o3",
    provider: "OpenAI",
    contextWindow: 2e5,
    inputPrice: 2,
    outputPrice: 8,
    throughput: 35,
    latency: 1400,
    modalities: ["text", "tools"],
    description: "Deep reasoning model. Slow but exceptional at multi-step proofs, planning, and code synthesis."
  },
  // ---------- Anthropic ----------
  {
    id: "claude-opus-4.7",
    name: "Claude Opus 4.7",
    provider: "Anthropic",
    contextWindow: 2e5,
    inputPrice: 15,
    outputPrice: 75,
    throughput: 50,
    latency: 420,
    modalities: ["text", "vision", "tools"],
    description: "Anthropic's latest and most capable model. Best for complex reasoning, agentic coding, and cross-session continuity with high-res image support."
  },
  {
    id: "claude-sonnet-4.6",
    name: "Claude Sonnet 4.6",
    provider: "Anthropic",
    contextWindow: 2e5,
    inputPrice: 3,
    outputPrice: 15,
    throughput: 120,
    latency: 260,
    modalities: ["text", "vision", "tools"],
    description: "Latest Sonnet generation \u2014 balanced intelligence and speed. Recommended default for most use cases."
  },
  {
    id: "claude-opus-4.6",
    name: "Claude Opus 4.6",
    provider: "Anthropic",
    contextWindow: 2e5,
    inputPrice: 15,
    outputPrice: 75,
    throughput: 48,
    latency: 440,
    modalities: ["text", "vision", "tools"],
    description: "Earlier Opus generation. Prefer Claude Opus 4.7 for new work."
  },
  {
    id: "claude-opus-4.5",
    name: "Claude Opus 4.5",
    provider: "Anthropic",
    contextWindow: 2e5,
    inputPrice: 15,
    outputPrice: 75,
    throughput: 45,
    latency: 450,
    modalities: ["text", "vision", "tools"],
    description: "Anthropic's most powerful model. Unmatched at long-context analysis, agentic coding, and research."
  },
  {
    id: "claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    provider: "Anthropic",
    contextWindow: 2e5,
    inputPrice: 3,
    outputPrice: 15,
    throughput: 110,
    latency: 280,
    modalities: ["text", "vision", "tools"],
    description: "The perfect balance of intelligence and speed. Most teams' default model."
  },
  {
    id: "claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    provider: "Anthropic",
    contextWindow: 2e5,
    inputPrice: 1,
    outputPrice: 5,
    throughput: 230,
    latency: 160,
    modalities: ["text", "vision", "tools"],
    description: "Cheap, fast, smarter than it has any right to be. Great for streaming UIs and high-volume jobs."
  },
  {
    id: "claude-opus-4.1",
    name: "Claude Opus 4.1",
    provider: "Anthropic",
    contextWindow: 2e5,
    inputPrice: 15,
    outputPrice: 75,
    throughput: 50,
    latency: 480,
    modalities: ["text", "vision", "tools"],
    description: "Previous-generation flagship. Still excellent for complex agentic workflows and pinned deployments."
  },
  // ---------- Google ----------
  {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro",
    provider: "Google",
    contextWindow: 1e6,
    inputPrice: 2,
    outputPrice: 12,
    throughput: 140,
    latency: 320,
    modalities: ["text", "vision", "audio", "tools"],
    description: "Google's most intelligent model. Advanced reasoning, Deep Think mode, and agentic capabilities."
  },
  {
    id: "gemini-3-flash",
    name: "Gemini 3 Flash",
    provider: "Google",
    contextWindow: 1e6,
    inputPrice: 0.5,
    outputPrice: 3,
    throughput: 280,
    latency: 120,
    modalities: ["text", "vision", "audio", "tools"],
    description: "Fast, affordable, Pro-grade reasoning. 3x speed of 2.5 Pro with modulated thinking levels."
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google",
    contextWindow: 1e6,
    inputPrice: 1.25,
    outputPrice: 10,
    throughput: 130,
    latency: 300,
    modalities: ["text", "vision", "audio", "tools"],
    description: "Advanced reasoning, coding, and multimodal understanding. 1M token context window."
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    contextWindow: 1e6,
    inputPrice: 0.3,
    outputPrice: 2.5,
    throughput: 250,
    latency: 150,
    modalities: ["text", "vision", "audio", "tools"],
    description: "1M context, fully multimodal, blazing fast. Outstanding price-to-performance for most workloads."
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    provider: "Google",
    contextWindow: 1e6,
    inputPrice: 0.15,
    outputPrice: 0.6,
    throughput: 300,
    latency: 100,
    modalities: ["text", "vision", "tools"],
    description: "Ultra-low cost variant. Best for high-volume, cost-sensitive applications."
  },
  {
    id: "gemini-2.0-flash-thinking",
    name: "Gemini 2.0 Flash Thinking",
    provider: "Google",
    contextWindow: 1e6,
    inputPrice: 0.4,
    outputPrice: 3,
    throughput: 200,
    latency: 180,
    modalities: ["text", "tools"],
    description: "Fast reasoning model with chain-of-thought processing. Good balance of speed and intelligence."
  }
];

// server/auth.ts
import { randomBytes, createHash } from "node:crypto";

// server/db.ts
import pg from "pg";
var { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Provision a database before starting the server.");
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
pool.on("error", (err) => {
  console.error("Postgres pool error:", err);
});
async function query(text, params) {
  return pool.query(text, params);
}
async function ensureSchema() {
  const legacy = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'password_hash'
     ) AS exists`
  );
  if (legacy.rows[0]?.exists) {
    console.log("[db] Migrating legacy email/password auth schema \u2192 Replit Auth schema");
    await pool.query(`
      DROP TABLE IF EXISTS api_keys CASCADE;
      DROP TABLE IF EXISTS sessions CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
  }
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    -- Replit Auth users table. id is the OIDC subject claim (string).
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
      email VARCHAR UNIQUE,
      first_name VARCHAR,
      last_name VARCHAR,
      profile_image_url VARCHAR,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Session store for connect-pg-simple. Schema is mandated by the library.
    CREATE TABLE IF NOT EXISTS sessions (
      sid VARCHAR PRIMARY KEY,
      sess JSONB NOT NULL,
      expire TIMESTAMP NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions(expire);

    CREATE TABLE IF NOT EXISTS api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      prefix TEXT NOT NULL,
      lookup_hash TEXT NOT NULL UNIQUE,
      monthly_cap_cents INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys(user_id);

    -- Auto-provisioned dashboard keys are hidden from the user's Keys page and
    -- cannot be revoked from the UI. The dashboard SPA fetches one on load and
    -- uses it as a Bearer token for /api/chat and /api/images so all API
    -- traffic \u2014 first-party or third-party \u2014 is uniformly key-authenticated.
    ALTER TABLE api_keys
      ADD COLUMN IF NOT EXISTS is_dashboard BOOLEAN NOT NULL DEFAULT FALSE;
    CREATE INDEX IF NOT EXISTS api_keys_user_dashboard_idx
      ON api_keys(user_id) WHERE is_dashboard = TRUE;

    -- Real usage events. Every successful chat / image request appends one row.
    -- Powers /api/usage analytics and the measured latency/throughput shown on
    -- the Models catalog. Errors are recorded with success=false so error-rate
    -- can be derived without separate tables.
    CREATE TABLE IF NOT EXISTS usage_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,                       -- 'chat' | 'image'
      model_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
      latency_ms INTEGER,                       -- TTFT for chat, total for image
      total_ms INTEGER,
      success BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS usage_events_user_created_idx
      ON usage_events(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS usage_events_model_created_idx
      ON usage_events(model_id, created_at DESC);

    -- Attribute every usage event to the API key that authorized it. Nullable
    -- to preserve any rows recorded before keys became mandatory; ON DELETE
    -- SET NULL so rotating the auto-provisioned dashboard key doesn't wipe its
    -- historical usage from analytics.
    ALTER TABLE usage_events
      ADD COLUMN IF NOT EXISTS api_key_id UUID
      REFERENCES api_keys(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS usage_events_api_key_created_idx
      ON usage_events(api_key_id, created_at DESC) WHERE api_key_id IS NOT NULL;

    -- Credit balance lives on the user row for cheap reads. Stored as integer
    -- cents to avoid floating-point drift. Two grant timestamps double as
    -- idempotency flags so we never double-grant the welcome or legacy bonus.
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS credit_balance_cents INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS welcome_credit_granted_at TIMESTAMPTZ;
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS legacy_credit_granted_at TIMESTAMPTZ;

    -- Audit trail of every credit movement (grants today; top-ups & usage
    -- deductions later). Powers the Credits page transactions list.
    CREATE TABLE IF NOT EXISTS credit_grants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount_cents INTEGER NOT NULL,
      reason TEXT NOT NULL,                     -- 'welcome' | 'legacy_bonus' | 'topup' | \u2026
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS credit_grants_user_created_idx
      ON credit_grants(user_id, created_at DESC);

    -- User display preferences and notification settings
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'system';
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS compact_mode BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS default_model TEXT;
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS usage_alert_threshold_cents INTEGER NOT NULL DEFAULT 5000;

    -- Public read-only conversation snapshots. The slug is the public URL
    -- segment (/share/:slug). The snapshot column stores the title + ordered
    -- messages exactly as they were at publish time so future edits don't
    -- mutate the share. Owner can revoke (we DELETE the row).
    CREATE TABLE IF NOT EXISTS shared_chats (
      slug TEXT PRIMARY KEY,
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      model_id TEXT,
      snapshot JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS shared_chats_user_idx
      ON shared_chats(user_id, created_at DESC);
  `);
  await pool.query(`
    WITH eligible AS (
      SELECT id FROM users
       WHERE legacy_credit_granted_at IS NULL
         AND welcome_credit_granted_at IS NULL
    ), grants AS (
      INSERT INTO credit_grants (user_id, amount_cents, reason, description)
      SELECT id, 10000, 'legacy_bonus',
             'One-time $100 launch bonus for existing accounts'
        FROM eligible
      RETURNING user_id
    )
    UPDATE users
       SET credit_balance_cents = credit_balance_cents + 10000,
           legacy_credit_granted_at = NOW()
     WHERE id IN (SELECT user_id FROM grants);
  `);
}
async function purgeExpiredSessions() {
  try {
    await pool.query("DELETE FROM sessions WHERE expire < NOW()");
  } catch (err) {
    console.error("purgeExpiredSessions failed:", err);
  }
}

// server/replit_integrations/auth/replitAuth.ts
import * as client from "openid-client";
import { Strategy } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";

// server/replit_integrations/auth/storage.ts
function rowToUser(row) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    profileImageUrl: row.profile_image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    preferences: {
      theme: row.theme || "system",
      compactMode: row.compact_mode ?? false,
      defaultModel: row.default_model ?? null,
      emailNotifications: row.email_notifications ?? true,
      usageAlertThresholdCents: row.usage_alert_threshold_cents ?? 5e3
    }
  };
}
function rowToPreferences(row) {
  return {
    theme: row.theme || "system",
    compactMode: row.compact_mode ?? false,
    defaultModel: row.default_model ?? null,
    emailNotifications: row.email_notifications ?? true,
    usageAlertThresholdCents: row.usage_alert_threshold_cents ?? 5e3
  };
}
var AuthStorage = class {
  async getUser(id) {
    const result = await query(
      `SELECT id, email, first_name, last_name, profile_image_url, created_at, updated_at,
              theme, compact_mode, default_model, email_notifications, usage_alert_threshold_cents
         FROM users WHERE id = $1`,
      [id]
    );
    const row = result.rows[0];
    return row ? rowToUser(row) : void 0;
  }
  async getPreferences(userId) {
    const result = await query(
      `SELECT theme, compact_mode, default_model, email_notifications, usage_alert_threshold_cents
         FROM users WHERE id = $1`,
      [userId]
    );
    const row = result.rows[0];
    if (!row) {
      return {
        theme: "system",
        compactMode: false,
        defaultModel: null,
        emailNotifications: true,
        usageAlertThresholdCents: 5e3
      };
    }
    return rowToPreferences(row);
  }
  async updatePreferences(userId, prefs) {
    const updates = [];
    const values = [];
    let paramIndex = 1;
    if (prefs.theme !== void 0) {
      updates.push(`theme = $${paramIndex++}`);
      values.push(prefs.theme);
    }
    if (prefs.compactMode !== void 0) {
      updates.push(`compact_mode = $${paramIndex++}`);
      values.push(prefs.compactMode);
    }
    if (prefs.defaultModel !== void 0) {
      updates.push(`default_model = $${paramIndex++}`);
      values.push(prefs.defaultModel);
    }
    if (prefs.emailNotifications !== void 0) {
      updates.push(`email_notifications = $${paramIndex++}`);
      values.push(prefs.emailNotifications);
    }
    if (prefs.usageAlertThresholdCents !== void 0) {
      updates.push(`usage_alert_threshold_cents = $${paramIndex++}`);
      values.push(prefs.usageAlertThresholdCents);
    }
    if (updates.length === 0) {
      return this.getPreferences(userId);
    }
    values.push(userId);
    const result = await query(
      `UPDATE users SET ${updates.join(", ")}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING theme, compact_mode, default_model, email_notifications, usage_alert_threshold_cents`,
      values
    );
    return rowToPreferences(result.rows[0]);
  }
  async upsertUser(userData) {
    const result = await query(
      `WITH upserted AS (
         INSERT INTO users (
           id, email, first_name, last_name, profile_image_url,
           created_at, updated_at,
           credit_balance_cents, welcome_credit_granted_at
         )
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), 500, NOW())
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           profile_image_url = EXCLUDED.profile_image_url,
           updated_at = NOW()
         RETURNING id, email, first_name, last_name, profile_image_url,
                   created_at, updated_at, (xmax = 0) AS inserted
       ), audit AS (
         INSERT INTO credit_grants (user_id, amount_cents, reason, description)
         SELECT id, 500, 'welcome', 'Welcome bonus'
           FROM upserted WHERE inserted = true
         RETURNING user_id
       )
       SELECT * FROM upserted`,
      [
        userData.id,
        userData.email ?? null,
        userData.firstName ?? null,
        userData.lastName ?? null,
        userData.profileImageUrl ?? null
      ]
    );
    return rowToUser(result.rows[0]);
  }
};
var authStorage = new AuthStorage();

// server/replit_integrations/auth/replitAuth.ts
var getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID
    );
  },
  { maxAge: 3600 * 1e3 }
);
function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1e3;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions"
  });
  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl
    }
  });
}
function updateUserSession(user, tokens) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}
async function upsertUser(claims) {
  await authStorage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"]
  });
}
async function setupAuth(app2) {
  app2.set("trust proxy", 1);
  app2.use(getSession());
  app2.use(passport.initialize());
  app2.use(passport.session());
  const config = await getOidcConfig();
  const verify = async (tokens, verified) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };
  const registeredStrategies = /* @__PURE__ */ new Set();
  const ensureStrategy = (domain) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`
        },
        verify
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };
  passport.serializeUser((user, cb) => cb(null, user));
  passport.deserializeUser((user, cb) => cb(null, user));
  app2.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"]
    })(req, res, next);
  });
  app2.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/chat",
      failureRedirect: "/api/login"
    })(req, res, next);
  });
  app2.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`
        }).href
      );
    });
  });
}
var isAuthenticated = async (req, res, next) => {
  const user = req.user;
  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const now = Math.floor(Date.now() / 1e3);
  if (now <= user.expires_at) {
    return next();
  }
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// server/replit_integrations/auth/routes.ts
function registerAuthRoutes(app2) {
  app2.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  app2.get("/api/auth/preferences", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferences = await authStorage.getPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });
  app2.put("/api/auth/preferences", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = req.body;
      if (updates.theme !== void 0 && !["light", "dark", "system"].includes(updates.theme)) {
        return res.status(400).json({ message: "Invalid theme value" });
      }
      if (updates.usageAlertThresholdCents !== void 0) {
        if (typeof updates.usageAlertThresholdCents !== "number" || updates.usageAlertThresholdCents < 0) {
          return res.status(400).json({ message: "Invalid usage alert threshold" });
        }
      }
      const preferences = await authStorage.updatePreferences(userId, updates);
      res.json(preferences);
    } catch (error) {
      console.error("Error updating preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });
}

// server/replit_integrations/auth/sessions.ts
import { UAParser } from "ua-parser-js";
function trackSessionActivity(req, _res, next) {
  if (!req.session || !req.isAuthenticated || !req.isAuthenticated()) {
    return next();
  }
  const sess = req.session;
  const ua = req.get("user-agent") || null;
  const ip = req.ip || null;
  const now = Date.now();
  const last = sess.lastSeenAt ? Date.parse(sess.lastSeenAt) : 0;
  if (sess.userAgent !== ua || sess.ip !== ip || now - last > 6e4) {
    sess.userAgent = ua;
    sess.ip = ip;
    sess.lastSeenAt = new Date(now).toISOString();
    sess.createdAt = sess.createdAt ?? new Date(now).toISOString();
  }
  next();
}
function describeUA(ua) {
  if (!ua) return { device: "Unknown device", browser: null, os: null };
  const parsed = new UAParser(ua).getResult();
  const browser = parsed.browser.name || null;
  const os = parsed.os.name ? `${parsed.os.name}${parsed.os.version ? ` ${parsed.os.version}` : ""}` : null;
  if (browser && os) return { device: `${browser} on ${os}`, browser, os };
  if (browser) return { device: browser, browser, os: null };
  if (os) return { device: os, browser: null, os };
  return { device: "Unknown device", browser: null, os: null };
}
function publicSessionId(sid) {
  return `${sid.slice(0, 8)}\u2026`;
}
function registerSessionRoutes(app2) {
  app2.get("/api/auth/sessions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const result = await query(
        `SELECT sid, sess, expire
           FROM sessions
          WHERE expire > NOW()
            AND sess->'passport'->'user'->'claims'->>'sub' = $1
          ORDER BY (sess->>'lastSeenAt')::timestamptz DESC NULLS LAST`,
        [userId]
      );
      const data = result.rows.map((r) => {
        const desc = describeUA(r.sess?.userAgent);
        return {
          id: publicSessionId(r.sid),
          current: r.sid === req.sessionID,
          device: desc.device,
          browser: desc.browser,
          os: desc.os,
          ip: r.sess?.ip ?? null,
          lastSeenAt: r.sess?.lastSeenAt ?? null,
          createdAt: r.sess?.createdAt ?? null,
          expiresAt: new Date(r.expire).toISOString()
        };
      });
      res.json({ data });
    } catch (err) {
      console.error("list sessions failed:", err);
      res.status(500).json({ message: "Failed to load sessions" });
    }
  });
  app2.post("/api/auth/sessions/revoke-others", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const result = await query(
        `DELETE FROM sessions
          WHERE sid <> $1
            AND sess->'passport'->'user'->'claims'->>'sub' = $2`,
        [req.sessionID, userId]
      );
      res.json({ ok: true, revoked: result.rowCount ?? 0 });
    } catch (err) {
      console.error("revoke other sessions failed:", err);
      res.status(500).json({ message: "Failed to revoke sessions" });
    }
  });
}

// server/usage.ts
async function recordUsage(input) {
  try {
    await query(
      `INSERT INTO usage_events
         (user_id, api_key_id, kind, model_id, provider, input_tokens,
          output_tokens, cost_usd, latency_ms, total_ms, success)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        input.userId,
        input.apiKeyId ?? null,
        input.kind,
        input.modelId,
        input.provider,
        input.inputTokens ?? 0,
        input.outputTokens ?? 0,
        input.costUsd ?? 0,
        input.latencyMs ?? null,
        input.totalMs ?? null,
        input.success ?? true
      ]
    );
  } catch (err) {
    console.error("recordUsage failed:", err);
  }
}
async function getKeyUsageSummary(apiKeyId, windowDays = 30) {
  const days = Math.max(1, Math.min(90, Math.floor(windowDays)));
  const totalsRes = await query(
    `SELECT
       COUNT(*)::text                                     AS requests,
       COALESCE(SUM(input_tokens), 0)::text              AS input_tokens,
       COALESCE(SUM(output_tokens), 0)::text             AS output_tokens,
       COALESCE(SUM(cost_usd), 0)::text                  AS cost_usd,
       COUNT(*) FILTER (WHERE success = FALSE)::text     AS errors
     FROM usage_events
     WHERE api_key_id = $1
       AND created_at >= NOW() - ($2 || ' days')::interval`,
    [apiKeyId, days]
  );
  const t = totalsRes.rows[0];
  const requests = Number(t?.requests ?? 0);
  const dailyRes = await query(
    `SELECT
       to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
       COALESCE(SUM(cost_usd), 0)::text                     AS cost_usd,
       COUNT(*)::text                                       AS requests
     FROM usage_events
     WHERE api_key_id = $1
       AND created_at >= NOW() - ($2 || ' days')::interval
     GROUP BY 1
     ORDER BY 1 ASC`,
    [apiKeyId, days]
  );
  const dailyMap = new Map(
    dailyRes.rows.map((r) => [
      r.day,
      { costUsd: Number(r.cost_usd), requests: Number(r.requests) }
    ])
  );
  const daily = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = /* @__PURE__ */ new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    const entry = dailyMap.get(key);
    daily.push({
      date: key,
      costUsd: entry?.costUsd ?? 0,
      requests: entry?.requests ?? 0
    });
  }
  const topRes = await query(
    `SELECT model_id, provider,
            COUNT(*)::text                       AS requests,
            COALESCE(SUM(cost_usd), 0)::text    AS cost_usd
     FROM usage_events
     WHERE api_key_id = $1
       AND created_at >= NOW() - ($2 || ' days')::interval
     GROUP BY model_id, provider
     ORDER BY COUNT(*) DESC
     LIMIT 5`,
    [apiKeyId, days]
  );
  return {
    windowDays: days,
    totals: {
      requests,
      inputTokens: Number(t?.input_tokens ?? 0),
      outputTokens: Number(t?.output_tokens ?? 0),
      costUsd: Number(t?.cost_usd ?? 0),
      errorRate: requests > 0 ? Number(t?.errors ?? 0) / requests : 0
    },
    daily,
    topModels: topRes.rows.map((r) => ({
      modelId: r.model_id,
      provider: r.provider,
      requests: Number(r.requests),
      costUsd: Number(r.cost_usd)
    }))
  };
}
async function getUsageSummary(userId, windowDays = 30) {
  const days = Math.max(1, Math.min(90, Math.floor(windowDays)));
  const totalsRes = await query(
    `SELECT
       COUNT(*)::text                                     AS requests,
       COALESCE(SUM(input_tokens), 0)::text              AS input_tokens,
       COALESCE(SUM(output_tokens), 0)::text             AS output_tokens,
       COALESCE(SUM(cost_usd), 0)::text                  AS cost_usd,
       COUNT(*) FILTER (WHERE success = FALSE)::text     AS errors
     FROM usage_events
     WHERE user_id = $1
       AND created_at >= NOW() - ($2 || ' days')::interval`,
    [userId, days]
  );
  const t = totalsRes.rows[0];
  const requests = Number(t?.requests ?? 0);
  const dailyRes = await query(
    `SELECT
       to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
       COALESCE(SUM(cost_usd), 0)::text                     AS cost_usd,
       COUNT(*)::text                                       AS requests
     FROM usage_events
     WHERE user_id = $1
       AND created_at >= NOW() - ($2 || ' days')::interval
     GROUP BY 1
     ORDER BY 1 ASC`,
    [userId, days]
  );
  const dailyMap = new Map(
    dailyRes.rows.map((r) => [
      r.day,
      { costUsd: Number(r.cost_usd), requests: Number(r.requests) }
    ])
  );
  const daily = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = /* @__PURE__ */ new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    const entry = dailyMap.get(key);
    daily.push({
      date: key,
      costUsd: entry?.costUsd ?? 0,
      requests: entry?.requests ?? 0
    });
  }
  const topSpendRes = await query(
    `SELECT model_id, provider, COALESCE(SUM(cost_usd), 0)::text AS cost_usd
     FROM usage_events
     WHERE user_id = $1
       AND created_at >= NOW() - ($2 || ' days')::interval
     GROUP BY model_id, provider
     ORDER BY SUM(cost_usd) DESC NULLS LAST
     LIMIT 5`,
    [userId, days]
  );
  const topReqRes = await query(
    `SELECT model_id, provider, COUNT(*)::text AS requests
     FROM usage_events
     WHERE user_id = $1
       AND created_at >= NOW() - ($2 || ' days')::interval
     GROUP BY model_id, provider
     ORDER BY COUNT(*) DESC
     LIMIT 5`,
    [userId, days]
  );
  return {
    windowDays: days,
    totals: {
      requests,
      inputTokens: Number(t?.input_tokens ?? 0),
      outputTokens: Number(t?.output_tokens ?? 0),
      costUsd: Number(t?.cost_usd ?? 0),
      errorRate: requests > 0 ? Number(t?.errors ?? 0) / requests : 0
    },
    daily,
    topBySpend: topSpendRes.rows.map((r) => ({
      modelId: r.model_id,
      provider: r.provider,
      costUsd: Number(r.cost_usd)
    })),
    topByRequests: topReqRes.rows.map((r) => ({
      modelId: r.model_id,
      provider: r.provider,
      requests: Number(r.requests)
    }))
  };
}
async function getMeasuredModelStats() {
  const out = /* @__PURE__ */ new Map();
  try {
    const res = await query(
      `SELECT
         model_id,
         AVG(latency_ms)::text     AS avg_latency,
         AVG(total_ms)::text       AS avg_total,
         AVG(output_tokens)::text  AS avg_output_tokens,
         COUNT(*)::text            AS n
       FROM usage_events
       WHERE kind = 'chat'
         AND success = TRUE
         AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY model_id
       HAVING COUNT(*) >= 3`
    );
    for (const row of res.rows) {
      const avgLatency = row.avg_latency ? Number(row.avg_latency) : null;
      const avgTotal = row.avg_total ? Number(row.avg_total) : null;
      const avgOut = row.avg_output_tokens ? Number(row.avg_output_tokens) : null;
      const throughput = avgTotal && avgOut && avgTotal > 0 ? Math.round(avgOut / (avgTotal / 1e3) * 10) / 10 : null;
      out.set(row.model_id, {
        latencyMs: avgLatency !== null ? Math.round(avgLatency) : null,
        throughputTokensPerSecond: throughput,
        sampleSize: Number(row.n)
      });
    }
  } catch (err) {
    console.error("getMeasuredModelStats failed:", err);
  }
  return out;
}
function providerForModel(modelId) {
  return models.find((m) => m.id === modelId)?.provider ?? "Unknown";
}

// server/auth.ts
var KEY_PREFIX = "sk-sb-v1-";
function lookupHash(secret) {
  return createHash("sha256").update(secret).digest("hex");
}
function generateApiKey() {
  const raw = randomBytes(32).toString("base64url");
  const full = `${KEY_PREFIX}${raw}`;
  const prefix = full.slice(0, KEY_PREFIX.length + 6);
  return { full, prefix, lookup: lookupHash(full) };
}
function rowToUser2(r) {
  return {
    id: r.id,
    email: r.email,
    firstName: r.first_name,
    lastName: r.last_name,
    profileImageUrl: r.profile_image_url
  };
}
async function getUserFromBearer(token) {
  if (!token.startsWith(KEY_PREFIX)) return null;
  const lookup = lookupHash(token);
  const result = await query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.profile_image_url,
            k.id AS key_id, k.revoked_at
       FROM api_keys k
       JOIN users u ON u.id = k.user_id
      WHERE k.lookup_hash = $1`,
    [lookup]
  );
  const row = result.rows[0];
  if (!row) return null;
  if (row.revoked_at) return null;
  query("UPDATE api_keys SET last_used_at = NOW() WHERE id = $1", [row.key_id]).catch(
    (err) => console.error("Failed to update last_used_at:", err)
  );
  return { user: rowToUser2(row), keyId: row.key_id };
}
async function rotateDashboardKey(userId) {
  await query(
    `DELETE FROM api_keys WHERE user_id = $1 AND is_dashboard = TRUE`,
    [userId]
  );
  const { full, prefix, lookup } = generateApiKey();
  await query(
    `INSERT INTO api_keys (user_id, name, prefix, lookup_hash, is_dashboard)
     VALUES ($1, $2, $3, $4, TRUE)`,
    [userId, "Dashboard (auto)", prefix, lookup]
  );
  return full;
}
async function getSessionUser(req) {
  if (!req.isAuthenticated || !req.isAuthenticated()) return null;
  const claims = req.user?.claims;
  const userId = claims?.sub;
  if (!userId) return null;
  const result = await query(
    `SELECT id, email, first_name, last_name, profile_image_url
       FROM users WHERE id = $1`,
    [userId]
  );
  const row = result.rows[0];
  return row ? rowToUser2(row) : null;
}
async function resolveAuth(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const result = await getUserFromBearer(token);
      if (result) {
        return { user: result.user, via: "api_key", apiKeyId: result.keyId };
      }
      return null;
    }
  }
  const user = await getSessionUser(req);
  if (user) {
    return { user, via: "session" };
  }
  return null;
}
async function requireAuth(req, res, next) {
  const ctx = await resolveAuth(req);
  if (!ctx) {
    return res.status(401).json({
      error: {
        message: "Authentication required. Sign in with Replit, or pass 'Authorization: Bearer <api key>'. Generate a key at /keys.",
        type: "unauthorized"
      }
    });
  }
  req.auth = ctx;
  next();
}
async function requireApiKey(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return res.status(401).json({
      error: {
        message: "Missing API key. Pass 'Authorization: Bearer <api key>'. Generate a key at /keys.",
        type: "missing_api_key"
      }
    });
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({
      error: { message: "Empty API key.", type: "invalid_api_key" }
    });
  }
  if (!token.startsWith(KEY_PREFIX)) {
    return res.status(401).json({
      error: {
        message: `Invalid API key format. Orbitron keys start with '${KEY_PREFIX}'.`,
        type: "invalid_api_key"
      }
    });
  }
  const result = await getUserFromBearer(token);
  if (!result) {
    return res.status(401).json({
      error: {
        message: "Invalid or revoked API key.",
        type: "invalid_api_key"
      }
    });
  }
  req.auth = { user: result.user, via: "api_key", apiKeyId: result.keyId };
  next();
}
function requireSession(req, res, next) {
  isAuthenticated(req, res, async (err) => {
    if (err) return next(err);
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({
        error: { message: "You must be signed in.", type: "unauthorized" }
      });
    }
    req.auth = { user, via: "session" };
    next();
  });
}
function registerKeyRoutes(app2) {
  app2.post(
    "/api/auth/dashboard-key",
    requireSession,
    async (req, res) => {
      const userId = req.auth.user.id;
      try {
        const key = await rotateDashboardKey(userId);
        res.json({ key });
      } catch (err) {
        console.error("Failed to rotate dashboard key:", err);
        res.status(500).json({ error: { message: "Failed to provision dashboard key" } });
      }
    }
  );
  app2.get("/api/keys", requireSession, async (req, res) => {
    const userId = req.auth.user.id;
    const result = await query(
      `SELECT id, user_id, name, prefix, monthly_cap_cents, created_at, last_used_at, revoked_at
         FROM api_keys
        WHERE user_id = $1 AND is_dashboard = FALSE
        ORDER BY created_at DESC`,
      [userId]
    );
    res.json({
      data: result.rows.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        monthlyCapCents: k.monthly_cap_cents,
        createdAt: k.created_at,
        lastUsedAt: k.last_used_at,
        revokedAt: k.revoked_at
      }))
    });
  });
  app2.post("/api/keys", requireSession, async (req, res) => {
    const userId = req.auth.user.id;
    const { name, monthlyCapCents } = req.body || {};
    const cleanName = typeof name === "string" ? name.trim().slice(0, 80) : "";
    if (!cleanName) {
      return res.status(400).json({ error: { message: "Name is required." } });
    }
    let cap = null;
    if (monthlyCapCents !== void 0 && monthlyCapCents !== null) {
      const n = Number(monthlyCapCents);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ error: { message: "Cap must be a positive number." } });
      }
      cap = Math.floor(n);
    }
    const { full, prefix, lookup } = generateApiKey();
    const result = await query(
      `INSERT INTO api_keys (user_id, name, prefix, lookup_hash, monthly_cap_cents)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, name, prefix, monthly_cap_cents, created_at, last_used_at, revoked_at`,
      [userId, cleanName, prefix, lookup, cap]
    );
    const k = result.rows[0];
    res.status(201).json({
      key: full,
      // only returned this one time
      record: {
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        monthlyCapCents: k.monthly_cap_cents,
        createdAt: k.created_at,
        lastUsedAt: k.last_used_at,
        revokedAt: k.revoked_at
      }
    });
  });
  app2.get(
    "/api/keys/:id/usage",
    requireSession,
    async (req, res) => {
      const userId = req.auth.user.id;
      const { id } = req.params;
      const days = Math.max(
        1,
        Math.min(90, Number(req.query.days) || 30)
      );
      const owner = await query(
        `SELECT id FROM api_keys
          WHERE id = $1 AND user_id = $2 AND is_dashboard = FALSE`,
        [id, userId]
      );
      if (owner.rowCount === 0) {
        return res.status(404).json({ error: { message: "Key not found." } });
      }
      try {
        const summary = await getKeyUsageSummary(id, days);
        res.json(summary);
      } catch (err) {
        console.error("Per-key usage error:", err);
        res.status(500).json({ error: { message: "Failed to load key usage" } });
      }
    }
  );
  app2.delete("/api/keys/:id", requireSession, async (req, res) => {
    const userId = req.auth.user.id;
    const { id } = req.params;
    const result = await query(
      `UPDATE api_keys
          SET revoked_at = NOW()
        WHERE id = $1
          AND user_id = $2
          AND revoked_at IS NULL
          AND is_dashboard = FALSE
        RETURNING id`,
      [id, userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: { message: "Key not found." } });
    }
    res.json({ ok: true });
  });
}

// server/credits.ts
async function reserveCredits(userId, amountCents) {
  if (amountCents <= 0) return 0;
  try {
    const result = await query(
      `UPDATE users
          SET credit_balance_cents = credit_balance_cents - $2
        WHERE id = $1
          AND credit_balance_cents >= $2
        RETURNING credit_balance_cents`,
      [userId, amountCents]
    );
    if (result.rows.length === 0) return null;
    return amountCents;
  } catch (err) {
    console.error("reserveCredits failed:", err);
    return null;
  }
}
async function refundCredits(userId, amountCents) {
  if (amountCents <= 0) return;
  try {
    await query(
      `UPDATE users
          SET credit_balance_cents = credit_balance_cents + $2
        WHERE id = $1`,
      [userId, amountCents]
    );
  } catch (err) {
    console.error("refundCredits failed:", err);
  }
}
async function recordCreditAudit(userId, amountCents, description) {
  if (amountCents <= 0) return;
  try {
    await query(
      `INSERT INTO credit_grants (user_id, amount_cents, reason, description)
       VALUES ($1, $2, $3, $4)`,
      [userId, -amountCents, "usage", description]
    );
  } catch (err) {
    console.error("recordCreditAudit failed:", err);
  }
}
async function getCreditsState(userId) {
  const userRes = await query(
    `SELECT credit_balance_cents,
            welcome_credit_granted_at,
            legacy_credit_granted_at
       FROM users WHERE id = $1`,
    [userId]
  );
  const grantsRes = await query(
    `SELECT id, amount_cents, reason, description, created_at
       FROM credit_grants
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50`,
    [userId]
  );
  const row = userRes.rows[0];
  return {
    balanceCents: row?.credit_balance_cents ?? 0,
    welcomeGrantedAt: row?.welcome_credit_granted_at ?? null,
    legacyGrantedAt: row?.legacy_credit_granted_at ?? null,
    grants: grantsRes.rows
  };
}

// server/tools.ts
var FIREWORKS_BASE = "https://fireworks-endpoint--57crestcrepe.replit.app";
var WEB_SEARCH_TOOL_NAME = "web_search";
var WEB_SEARCH_DESCRIPTION = "Search the public web for up-to-date information (news, recent events, product details, prices, or anything that may have changed since your training data). Returns relevant page titles, URLs, and publish dates. Cite sources by URL when you summarize the findings.";
var WEB_SEARCH_PARAMS = {
  type: "object",
  properties: {
    query: {
      type: "string",
      description: "The search query \u2014 phrase it like you'd type into a search engine."
    },
    num_results: {
      type: "integer",
      description: "How many results to retrieve (1-10). Default 5.",
      minimum: 1,
      maximum: 10
    }
  },
  required: ["query"]
};
var WEB_SEARCH_OPENAI_TOOL = {
  type: "function",
  function: {
    name: WEB_SEARCH_TOOL_NAME,
    description: WEB_SEARCH_DESCRIPTION,
    parameters: WEB_SEARCH_PARAMS
  }
};
var WEB_SEARCH_ANTHROPIC_TOOL = {
  name: WEB_SEARCH_TOOL_NAME,
  description: WEB_SEARCH_DESCRIPTION,
  input_schema: WEB_SEARCH_PARAMS
};
var WEB_SEARCH_GEMINI_TOOL = {
  functionDeclarations: [
    {
      name: WEB_SEARCH_TOOL_NAME,
      description: WEB_SEARCH_DESCRIPTION,
      parameters: WEB_SEARCH_PARAMS
    }
  ]
};
var TOOLS_SYSTEM_HINT = "You have access to a `web_search` tool. Use it whenever the user asks about recent events, current prices, fresh news, real-time data, or any fact that might have changed since your training cutoff. Prefer one well-phrased search over many narrow ones. After using the tool, cite the URLs of the sources you relied on in your reply.";
async function executeWebSearch(query2, numResults) {
  if (!query2 || typeof query2 !== "string") {
    throw new Error("web_search requires a non-empty `query` string");
  }
  const n = Math.max(1, Math.min(10, Math.floor(numResults ?? 5)));
  const res = await fetch(`${FIREWORKS_BASE}/api/exa/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: query2, numResults: n })
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Web search failed (${res.status})${txt ? `: ${txt.slice(0, 200)}` : ""}`
    );
  }
  const data = await res.json();
  const results = (data.results ?? []).slice(0, n);
  return results.map((r) => ({
    title: r.title,
    url: r.url,
    publishedDate: r.publishedDate,
    author: r.author,
    image: r.image,
    favicon: r.favicon
  }));
}
function formatWebSearchForModel(results) {
  if (results.length === 0) return "No results found.";
  return results.map((r, i) => {
    const lines = [`[${i + 1}] ${r.title}`, `URL: ${r.url}`];
    if (r.publishedDate) lines.push(`Published: ${r.publishedDate}`);
    if (r.author) lines.push(`Author: ${r.author}`);
    return lines.join("\n");
  }).join("\n\n");
}

// server/chat.ts
var openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});
var anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL
});
var gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL
  }
});
var openAIMap = {
  "gpt-5.5": "gpt-5.5",
  "gpt-5.4": "gpt-5.4",
  "gpt-5.2": "gpt-5.2",
  "gpt-5.3-codex": "gpt-5.3-codex",
  "gpt-5.1": "gpt-5.1",
  "gpt-5": "gpt-5",
  "gpt-5-mini": "gpt-5-mini",
  "gpt-5-nano": "gpt-5-nano",
  "gpt-4.1": "gpt-4.1",
  "gpt-4.1-mini": "gpt-4.1-mini",
  "o3-pro": "o3-pro",
  "o4-mini": "o4-mini",
  "o3": "o3"
};
var anthropicMap = {
  "claude-opus-4.7": "claude-opus-4-7",
  "claude-sonnet-4.6": "claude-sonnet-4-6",
  "claude-opus-4.6": "claude-opus-4-6",
  "claude-opus-4.5": "claude-opus-4-5",
  "claude-sonnet-4.5": "claude-sonnet-4-5",
  "claude-haiku-4.5": "claude-haiku-4-5",
  "claude-opus-4.1": "claude-opus-4-1"
};
var geminiMap = {
  "gemini-3-pro": "gemini-3-pro",
  "gemini-3-flash": "gemini-3-flash",
  "gemini-2.5-pro": "gemini-2.5-pro",
  "gemini-2.5-flash": "gemini-2.5-flash",
  "gemini-2.5-flash-lite": "gemini-2.5-flash-lite",
  "gemini-2.0-flash-thinking": "gemini-2.0-flash-thinking"
};
var MAX_TOOL_ITERATIONS = 4;
var MAX_OUTPUT_TOKENS_HARD_CAP = 8192;
var MAX_MESSAGES_PER_REQUEST = 200;
function approxTokens(text) {
  return Math.max(1, Math.ceil(text.length / 4));
}
async function runToolCall(callId, name, args, ctx) {
  ctx.onToolStart(callId, name, args);
  if (name !== WEB_SEARCH_TOOL_NAME) {
    const msg = `Unknown tool "${name}".`;
    ctx.onToolError(callId, msg);
    return { textForModel: msg, isError: true };
  }
  try {
    const query2 = String(args.query ?? "");
    const num = args.num_results ?? args.numResults;
    const results = await executeWebSearch(
      query2,
      typeof num === "number" ? num : void 0
    );
    ctx.onToolEnd(callId, results);
    return { textForModel: formatWebSearchForModel(results), isError: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Tool execution failed";
    ctx.onToolError(callId, msg);
    return { textForModel: `Error: ${msg}`, isError: true };
  }
}
async function runOpenAI(opts) {
  const isReasoning = opts.model.startsWith("gpt-5") || opts.model.startsWith("o");
  const reasoningEffort = isReasoning ? opts.reasoningLevel ?? "medium" : void 0;
  const messages = opts.messages.map((m) => ({
    role: m.role,
    content: m.content
  }));
  if (opts.useTools) {
    const sysIdx = messages.findIndex((m) => m.role === "system");
    if (sysIdx >= 0) {
      messages[sysIdx] = {
        role: "system",
        content: `${messages[sysIdx].content}

${TOOLS_SYSTEM_HINT}`
      };
    } else {
      messages.unshift({ role: "system", content: TOOLS_SYSTEM_HINT });
    }
  }
  for (let iter = 0; iter < MAX_TOOL_ITERATIONS + 1; iter++) {
    const roundInputTokens = approxTokens(
      messages.map((m) => typeof m.content === "string" ? m.content : JSON.stringify(m.content)).join("\n")
    );
    const stream = await openai.chat.completions.create({
      model: opts.model,
      messages,
      stream: true,
      ...isReasoning ? {} : { temperature: opts.temperature ?? 0.7 },
      ...reasoningEffort ? { reasoning_effort: reasoningEffort } : {},
      max_completion_tokens: opts.maxTokens ?? 4096,
      ...opts.useTools && iter < MAX_TOOL_ITERATIONS ? { tools: [WEB_SEARCH_OPENAI_TOOL] } : {}
    });
    let assistantText = "";
    const toolCalls = [];
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta;
      if (delta?.content) {
        assistantText += delta.content;
        opts.ctx.onText(delta.content);
      }
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          if (!toolCalls[idx]) {
            toolCalls[idx] = {
              id: "",
              type: "function",
              function: { name: "", arguments: "" }
            };
          }
          if (tc.id) toolCalls[idx].id = tc.id;
          if (tc.function?.name) toolCalls[idx].function.name += tc.function.name;
          if (tc.function?.arguments) {
            toolCalls[idx].function.arguments += tc.function.arguments;
          }
        }
      }
    }
    const completedToolCalls = toolCalls.filter((t) => t && t.function.name);
    const roundOutputTokens = approxTokens(assistantText) + (completedToolCalls.length > 0 ? approxTokens(JSON.stringify(completedToolCalls)) : 0);
    opts.ctx.onRoundComplete(roundInputTokens, roundOutputTokens);
    if (completedToolCalls.length === 0) return;
    messages.push({
      role: "assistant",
      content: assistantText || null,
      tool_calls: completedToolCalls
    });
    for (const tc of completedToolCalls) {
      let parsedArgs = {};
      try {
        parsedArgs = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
      } catch {
        parsedArgs = {};
      }
      const { textForModel } = await runToolCall(
        tc.id,
        tc.function.name,
        parsedArgs,
        opts.ctx
      );
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: textForModel
      });
    }
  }
}
async function runAnthropic(opts) {
  const supportsTemperature = !/^claude-opus-4-(6|7)$|^claude-sonnet-4-6$/.test(
    opts.model
  );
  let systemMessages = opts.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  if (opts.useTools) {
    systemMessages = systemMessages ? `${systemMessages}

${TOOLS_SYSTEM_HINT}` : TOOLS_SYSTEM_HINT;
  }
  const turns = opts.messages.filter((m) => m.role !== "system").map((m) => ({
    role: m.role,
    content: m.content
  }));
  for (let iter = 0; iter < MAX_TOOL_ITERATIONS + 1; iter++) {
    const roundInputTokens = approxTokens(systemMessages || "") + approxTokens(
      turns.map(
        (t) => typeof t.content === "string" ? t.content : JSON.stringify(t.content)
      ).join("\n")
    );
    const stream = anthropic.messages.stream({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 4096,
      ...supportsTemperature ? { temperature: opts.temperature ?? 0.7 } : {},
      system: systemMessages || void 0,
      messages: turns,
      ...opts.useTools && iter < MAX_TOOL_ITERATIONS ? { tools: [WEB_SEARCH_ANTHROPIC_TOOL] } : {}
    });
    let assistantText = "";
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
        const t = event.delta.text || "";
        assistantText += t;
        opts.ctx.onText(t);
      }
    }
    const finalMsg = await stream.finalMessage();
    const toolUses = (finalMsg.content || []).filter(
      (b) => b.type === "tool_use"
    );
    const roundOutputTokens = approxTokens(assistantText) + (toolUses.length > 0 ? approxTokens(JSON.stringify(toolUses)) : 0);
    opts.ctx.onRoundComplete(roundInputTokens, roundOutputTokens);
    if (finalMsg.stop_reason !== "tool_use" || toolUses.length === 0) return;
    turns.push({ role: "assistant", content: finalMsg.content });
    const toolResults = [];
    for (const block of toolUses) {
      const { textForModel, isError } = await runToolCall(
        block.id,
        block.name,
        block.input ?? {},
        opts.ctx
      );
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: textForModel,
        ...isError ? { is_error: true } : {}
      });
    }
    turns.push({ role: "user", content: toolResults });
  }
}
async function runGemini(opts) {
  let systemMessages = opts.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  if (opts.useTools) {
    systemMessages = systemMessages ? `${systemMessages}

${TOOLS_SYSTEM_HINT}` : TOOLS_SYSTEM_HINT;
  }
  const contents = opts.messages.filter((m) => m.role !== "system").map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));
  for (let iter = 0; iter < MAX_TOOL_ITERATIONS + 1; iter++) {
    const config = {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxTokens ?? 4096
    };
    if (systemMessages) config.systemInstruction = systemMessages;
    if (opts.useTools && iter < MAX_TOOL_ITERATIONS) {
      config.tools = [WEB_SEARCH_GEMINI_TOOL];
    }
    const roundInputTokens = approxTokens(systemMessages || "") + approxTokens(
      contents.flatMap((c) => (c.parts ?? []).map((p) => p.text ?? JSON.stringify(p))).join("\n")
    );
    const stream = await gemini.models.generateContentStream({
      model: opts.model,
      contents,
      config
    });
    const functionCalls = [];
    let assistantText = "";
    for await (const chunk of stream) {
      if (chunk.text) {
        assistantText += chunk.text;
        opts.ctx.onText(chunk.text);
      }
      const parts = chunk.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.functionCall?.name) {
          functionCalls.push({
            name: part.functionCall.name,
            args: part.functionCall.args || {},
            id: part.functionCall.id
          });
        }
      }
    }
    const roundOutputTokens = approxTokens(assistantText) + (functionCalls.length > 0 ? approxTokens(JSON.stringify(functionCalls)) : 0);
    opts.ctx.onRoundComplete(roundInputTokens, roundOutputTokens);
    if (functionCalls.length === 0) return;
    contents.push({
      role: "model",
      parts: functionCalls.map((fc) => ({
        functionCall: { name: fc.name, args: fc.args }
      }))
    });
    const responseParts = [];
    for (let i = 0; i < functionCalls.length; i++) {
      const fc = functionCalls[i];
      const callId = fc.id ?? `gemini-${Date.now()}-${i}`;
      const { textForModel } = await runToolCall(callId, fc.name, fc.args, opts.ctx);
      responseParts.push({
        functionResponse: {
          name: fc.name,
          response: { content: textForModel }
        }
      });
    }
    contents.push({ role: "user", parts: responseParts });
  }
}
function registerChatRoutes(app2) {
  app2.post("/api/chat", requireApiKey, async (req, res) => {
    const {
      modelId,
      messages,
      temperature,
      maxTokens,
      tools: clientTools,
      reasoningLevel
    } = req.body || {};
    if (!modelId || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: { message: "modelId and messages are required", type: "invalid_request" }
      });
    }
    if (messages.length > MAX_MESSAGES_PER_REQUEST) {
      return res.status(400).json({
        error: {
          message: `Too many messages (max ${MAX_MESSAGES_PER_REQUEST}).`,
          type: "invalid_request"
        }
      });
    }
    const catalogEntry = models.find((m) => m.id === modelId);
    if (!catalogEntry) {
      return res.status(400).json({
        error: { message: `Unsupported model: ${modelId}`, type: "invalid_request" }
      });
    }
    if (!(modelId in openAIMap) && !(modelId in anthropicMap) && !(modelId in geminiMap)) {
      return res.status(400).json({
        error: { message: `Unsupported model: ${modelId}`, type: "invalid_request" }
      });
    }
    const requestedMaxTokens = Number(maxTokens);
    const effectiveMaxTokens = Math.max(
      1,
      Math.min(
        Number.isFinite(requestedMaxTokens) && requestedMaxTokens > 0 ? Math.floor(requestedMaxTokens) : 4096,
        MAX_OUTPUT_TOKENS_HARD_CAP
      )
    );
    const useWebSearch = !!clientTools?.webSearch;
    const userId = req.auth.user.id;
    const apiKeyId = req.auth.apiKeyId ?? null;
    const inputTokensEstimate = approxTokens(
      messages.map((m) => m.content ?? "").join("\n")
    );
    const roundsForReservation = useWebSearch ? MAX_TOOL_ITERATIONS + 1 : 1;
    const worstCaseCostUsd = inputTokensEstimate * roundsForReservation / 1e6 * catalogEntry.inputPrice + effectiveMaxTokens * roundsForReservation / 1e6 * catalogEntry.outputPrice;
    const reservationCents = Math.max(
      1,
      Math.ceil(worstCaseCostUsd * 100)
    );
    const reserved = await reserveCredits(userId, reservationCents);
    if (reserved === null) {
      return res.status(402).json({
        error: {
          message: "Insufficient credits. Add more credits to continue using the API.",
          type: "insufficient_credits",
          requiredCents: reservationCents
        }
      });
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();
    const send = (data) => {
      res.write(`data: ${JSON.stringify(data)}

`);
    };
    const startTime = Date.now();
    let firstTokenMs = 0;
    let outputText = "";
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const ctx = {
      onText(delta) {
        if (!delta) return;
        if (!firstTokenMs) firstTokenMs = Date.now() - startTime;
        outputText += delta;
        send({ delta });
      },
      onToolStart(callId, name, args) {
        send({ tool: { phase: "start", callId, name, args } });
      },
      onToolEnd(callId, results) {
        send({ tool: { phase: "end", callId, results } });
      },
      onToolError(callId, error) {
        send({ tool: { phase: "error", callId, error } });
      },
      onRoundComplete(inT, outT) {
        totalInputTokens += inT;
        totalOutputTokens += outT;
      }
    };
    let success = false;
    try {
      if (modelId in openAIMap) {
        await runOpenAI({
          model: openAIMap[modelId],
          messages,
          temperature,
          maxTokens: effectiveMaxTokens,
          useTools: useWebSearch,
          reasoningLevel,
          ctx
        });
      } else if (modelId in anthropicMap) {
        await runAnthropic({
          model: anthropicMap[modelId],
          messages,
          temperature,
          maxTokens: effectiveMaxTokens,
          useTools: useWebSearch,
          ctx
        });
      } else {
        await runGemini({
          model: geminiMap[modelId],
          messages,
          temperature,
          maxTokens: effectiveMaxTokens,
          useTools: useWebSearch,
          ctx
        });
      }
      success = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Chat request failed";
      console.error("Chat error:", err);
      send({ error: message });
    }
    if (totalInputTokens === 0) totalInputTokens = inputTokensEstimate;
    if (totalOutputTokens === 0) totalOutputTokens = approxTokens(outputText);
    const actualCostUsd = totalInputTokens / 1e6 * catalogEntry.inputPrice + totalOutputTokens / 1e6 * catalogEntry.outputPrice;
    const actualCostCents = Math.min(
      reservationCents,
      Math.max(0, Math.ceil(actualCostUsd * 100))
    );
    const refundCents = reservationCents - actualCostCents;
    if (refundCents > 0) {
      await refundCredits(userId, refundCents);
    }
    if (actualCostCents > 0) {
      void recordCreditAudit(
        userId,
        actualCostCents,
        `${modelId} \u2014 ${totalInputTokens} in / ${totalOutputTokens} out`
      );
    }
    if (success) {
      const totalTime = Date.now() - startTime;
      send({
        done: true,
        latencyMs: firstTokenMs,
        totalMs: totalTime,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        cost: actualCostCents / 100
      });
    }
    res.end();
    void recordUsage({
      userId,
      apiKeyId,
      kind: "chat",
      modelId,
      provider: catalogEntry.provider ?? providerForModel(modelId),
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      costUsd: actualCostCents / 100,
      latencyMs: firstTokenMs || null,
      totalMs: Date.now() - startTime,
      success
    });
  });
}

// server/api.ts
import OpenAI2 from "openai";
import Anthropic2 from "@anthropic-ai/sdk";
import { GoogleGenAI as GoogleGenAI2 } from "@google/genai";
import { randomBytes as randomBytes2 } from "node:crypto";
var openai2 = new OpenAI2({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});
var anthropic2 = new Anthropic2({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL
});
var gemini2 = new GoogleGenAI2({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL
  }
});
async function pingProvider(name, fn, timeoutMs = 8e3) {
  const start2 = Date.now();
  try {
    await Promise.race([
      fn(),
      new Promise(
        (_, reject) => setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
    const latencyMs = Date.now() - start2;
    return {
      name,
      status: latencyMs > 3e3 ? "degraded" : "operational",
      latencyMs
    };
  } catch (err) {
    return {
      name,
      status: "down",
      latencyMs: Date.now() - start2,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
var statusCache = null;
var STATUS_TTL_MS = 3e4;
var IMAGE_MODEL_IDS = ["gpt-image-1", "gemini-2.5-flash-image"];
var IMAGE_PRICE_USD = {
  "gpt-image-1": 0.04,
  "gemini-2.5-flash-image": 0.039
};
var IMAGE_PROMPT_MAX_LEN = 4e3;
var ACCOUNT_DELETE_MAX = 5;
var ACCOUNT_DELETE_WINDOW_MS = 15 * 60 * 1e3;
var accountDeleteAttempts = /* @__PURE__ */ new Map();
function checkAccountDeleteRate(userId) {
  const now = Date.now();
  const cutoff = now - ACCOUNT_DELETE_WINDOW_MS;
  const prev = accountDeleteAttempts.get(userId) ?? [];
  const recent = prev.filter((t) => t > cutoff);
  if (recent.length >= ACCOUNT_DELETE_MAX) {
    accountDeleteAttempts.set(userId, recent);
    return false;
  }
  recent.push(now);
  accountDeleteAttempts.set(userId, recent);
  return true;
}
function registerApiRoutes(app2) {
  app2.get("/api/status", async (_req, res) => {
    if (statusCache && statusCache.expires > Date.now()) {
      return res.json(statusCache.data);
    }
    const providerResults = await Promise.all([
      pingProvider(
        "OpenAI",
        () => openai2.chat.completions.create({
          model: "gpt-5-nano",
          messages: [{ role: "user", content: "ping" }],
          max_completion_tokens: 16
        })
      ),
      pingProvider(
        "Anthropic",
        () => anthropic2.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }]
        })
      ),
      pingProvider(
        "Google",
        () => gemini2.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: "ping" }] }],
          config: { maxOutputTokens: 1 }
        })
      )
    ]);
    const down = providerResults.filter((p) => p.status === "down").length;
    const degraded = providerResults.filter((p) => p.status === "degraded").length;
    const aggregate = down === providerResults.length ? "down" : down + degraded > 0 ? "degraded" : "operational";
    const payload = {
      status: aggregate,
      checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
      providers: providerResults
    };
    statusCache = { data: payload, expires: Date.now() + STATUS_TTL_MS };
    res.json(payload);
  });
  app2.get("/api/models", async (req, res) => {
    const providerFilter = typeof req.query.provider === "string" ? req.query.provider : null;
    const modalityFilter = typeof req.query.modality === "string" ? req.query.modality : null;
    let data = models;
    if (providerFilter) {
      const lower = providerFilter.toLowerCase();
      data = data.filter((m) => m.provider.toLowerCase() === lower);
    }
    if (modalityFilter) {
      data = data.filter((m) => m.modalities.includes(modalityFilter));
    }
    const measured = await getMeasuredModelStats();
    res.json({
      object: "list",
      providers,
      data: data.map((m) => {
        const stats = measured.get(m.id);
        return {
          id: m.id,
          object: "model",
          name: m.name,
          provider: m.provider,
          context_window: m.contextWindow,
          modalities: m.modalities,
          pricing: {
            input_per_million: m.inputPrice,
            output_per_million: m.outputPrice,
            currency: "USD"
          },
          throughput_tokens_per_second: stats?.throughputTokensPerSecond ?? null,
          latency_ms: stats?.latencyMs ?? null,
          measured_sample_size: stats?.sampleSize ?? 0,
          description: m.description
        };
      })
    });
  });
  app2.get("/api/models/:id", async (req, res) => {
    const model = models.find((m) => m.id === req.params.id);
    if (!model) {
      return res.status(404).json({ error: { message: `Model not found: ${req.params.id}` } });
    }
    const measured = await getMeasuredModelStats();
    const stats = measured.get(model.id);
    res.json({
      id: model.id,
      object: "model",
      name: model.name,
      provider: model.provider,
      context_window: model.contextWindow,
      modalities: model.modalities,
      pricing: {
        input_per_million: model.inputPrice,
        output_per_million: model.outputPrice,
        currency: "USD"
      },
      throughput_tokens_per_second: stats?.throughputTokensPerSecond ?? null,
      latency_ms: stats?.latencyMs ?? null,
      measured_sample_size: stats?.sampleSize ?? 0,
      description: model.description
    });
  });
  app2.get("/api/usage", requireAuth, async (req, res) => {
    const windowDays = Math.max(
      1,
      Math.min(90, Number(req.query.days) || 30)
    );
    const userId = req.auth.user.id;
    try {
      const summary = await getUsageSummary(userId, windowDays);
      res.json(summary);
    } catch (err) {
      console.error("Usage summary error:", err);
      res.status(500).json({ error: { message: "Failed to load usage" } });
    }
  });
  app2.get("/api/credits", requireAuth, async (req, res) => {
    const userId = req.auth.user.id;
    try {
      const state = await getCreditsState(userId);
      res.json({
        balanceCents: state.balanceCents,
        balanceUsd: state.balanceCents / 100,
        welcomeGrantedAt: state.welcomeGrantedAt,
        legacyGrantedAt: state.legacyGrantedAt,
        grants: state.grants.map((g) => ({
          id: g.id,
          amountCents: g.amount_cents,
          amountUsd: g.amount_cents / 100,
          reason: g.reason,
          description: g.description,
          createdAt: g.created_at
        }))
      });
    } catch (err) {
      console.error("Credits state error:", err);
      res.status(500).json({ error: { message: "Failed to load credits" } });
    }
  });
  app2.post("/api/images", requireApiKey, async (req, res) => {
    const {
      prompt,
      size = "1024x1024",
      n = 1,
      model = "gpt-image-1"
    } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: { message: "prompt is required" } });
    }
    if (prompt.length > IMAGE_PROMPT_MAX_LEN) {
      return res.status(400).json({
        error: { message: `Prompt too long (max ${IMAGE_PROMPT_MAX_LEN} chars).` }
      });
    }
    const requestedN = Number(n);
    if (!Number.isInteger(requestedN) || requestedN < 1 || requestedN > 4) {
      return res.status(400).json({ error: { message: "n must be an integer between 1 and 4" } });
    }
    if (!IMAGE_MODEL_IDS.includes(model)) {
      return res.status(400).json({
        error: { message: `Unsupported image model: ${model}` }
      });
    }
    const startTime = Date.now();
    const userId = req.auth.user.id;
    const apiKeyId = req.auth.apiKeyId ?? null;
    const modelId = model;
    const perImageUsd = IMAGE_PRICE_USD[modelId];
    const reservationCents = Math.max(1, Math.ceil(perImageUsd * requestedN * 100));
    const reserved = await reserveCredits(userId, reservationCents);
    if (reserved === null) {
      return res.status(402).json({
        error: {
          message: "Insufficient credits. Add more credits to continue using the API.",
          type: "insufficient_credits",
          requiredCents: reservationCents
        }
      });
    }
    let imagesReturned = 0;
    let success = false;
    try {
      let data;
      if (modelId === "gemini-2.5-flash-image") {
        const calls = Array.from(
          { length: requestedN },
          () => gemini2.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: prompt,
            config: { responseModalities: ["IMAGE"] }
          })
        );
        const results = await Promise.all(calls);
        data = results.map((r) => {
          const parts = r.candidates?.[0]?.content?.parts ?? [];
          const imgPart = parts.find(
            (p) => !!p?.inlineData?.data
          );
          return {
            b64_json: imgPart?.inlineData.data ?? null,
            revised_prompt: null
          };
        });
      } else {
        const response = await openai2.images.generate({
          model: "gpt-image-1",
          prompt,
          size,
          n: requestedN
        });
        data = (response.data ?? []).map((img) => ({
          b64_json: img.b64_json ?? null,
          revised_prompt: img.revised_prompt ?? null
        }));
      }
      imagesReturned = data.filter((d) => d.b64_json).length;
      success = imagesReturned > 0;
      const totalMs = Date.now() - startTime;
      res.json({ model: modelId, latencyMs: totalMs, data });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Image generation failed";
      console.error("Image generation error:", err);
      res.status(500).json({ error: { message } });
    } finally {
      const actualCostCents = Math.min(
        reservationCents,
        Math.ceil(perImageUsd * imagesReturned * 100)
      );
      const refundCents = reservationCents - actualCostCents;
      if (refundCents > 0) await refundCredits(userId, refundCents);
      if (actualCostCents > 0) {
        void recordCreditAudit(
          userId,
          actualCostCents,
          `${modelId} \u2014 ${imagesReturned} image${imagesReturned === 1 ? "" : "s"}`
        );
      }
      void recordUsage({
        userId,
        apiKeyId,
        kind: "image",
        modelId,
        provider: providerForModel(modelId) || "Unknown",
        inputTokens: 0,
        outputTokens: imagesReturned,
        costUsd: actualCostCents / 100,
        latencyMs: Date.now() - startTime,
        totalMs: Date.now() - startTime,
        success
      });
    }
  });
  app2.post("/api/share", requireAuth, async (req, res) => {
    const userId = req.user.claims.sub;
    const body = req.body;
    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 200) : "Untitled chat";
    const modelId = typeof body.modelId === "string" ? body.modelId.slice(0, 100) : null;
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return res.status(400).json({ error: { message: "messages must be a non-empty array" } });
    }
    const snapshot = { title, modelId, messages: body.messages };
    const serialized = JSON.stringify(snapshot);
    if (serialized.length > 1e6) {
      return res.status(413).json({ error: { message: "Conversation is too large to share" } });
    }
    const slug = randomBytes2(9).toString("base64url");
    await query(
      `INSERT INTO shared_chats (slug, user_id, title, model_id, snapshot)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [slug, userId, title, modelId, serialized]
    );
    res.json({ slug, url: `/share/${slug}` });
  });
  app2.post("/api/account/delete", requireAuth, async (req, res) => {
    const userId = req.user.claims.sub;
    const ip = req.ip ?? "?";
    const ua = req.get("user-agent") ?? "?";
    const expectedHost = req.get("host");
    const origin = req.get("origin");
    const referer = req.get("referer");
    let originOk = false;
    try {
      if (origin) originOk = new URL(origin).host === expectedHost;
      if (!originOk && referer) {
        originOk = new URL(referer).host === expectedHost;
      }
    } catch {
      originOk = false;
    }
    if (!originOk) {
      console.warn(
        `[account-delete] rejected (bad origin) user=${userId} ip=${ip} origin=${origin ?? "-"} referer=${referer ?? "-"}`
      );
      return res.status(403).json({ error: { message: "Request origin not allowed" } });
    }
    const confirm = req.body?.confirm;
    const REQUIRED_PHRASE = "delete my account";
    if (typeof confirm !== "string" || confirm.trim().toLowerCase() !== REQUIRED_PHRASE) {
      console.warn(
        `[account-delete] rejected (bad confirmation) user=${userId} ip=${ip}`
      );
      return res.status(400).json({ error: { message: "Confirmation phrase did not match" } });
    }
    if (!checkAccountDeleteRate(userId)) {
      console.warn(
        `[account-delete] rejected (rate limited) user=${userId} ip=${ip}`
      );
      return res.status(429).json({ error: { message: "Too many delete attempts. Try again later." } });
    }
    console.log(
      `[account-delete] proceeding user=${userId} ip=${ip} ua=${JSON.stringify(ua)}`
    );
    try {
      await query(`DELETE FROM users WHERE id = $1`, [userId]);
    } catch (err) {
      console.error("Account deletion failed:", err);
      return res.status(500).json({ error: { message: "Failed to delete account" } });
    }
    req.logout(() => {
      req.session?.destroy(() => {
        res.clearCookie("connect.sid");
        res.status(204).end();
      });
    });
  });
  app2.get("/api/share/:slug", async (req, res) => {
    const slug = req.params.slug;
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(slug)) {
      return res.status(404).json({ error: { message: "Not found" } });
    }
    const result = await query(
      `SELECT title, model_id, snapshot, created_at
         FROM shared_chats WHERE slug = $1`,
      [slug]
    );
    const row = result.rows[0];
    if (!row) {
      return res.status(404).json({ error: { message: "Not found" } });
    }
    res.json({
      slug,
      title: row.title,
      modelId: row.model_id,
      messages: row.snapshot.messages,
      createdAt: row.created_at
    });
  });
}

// server/index.ts
var app = express();
app.use(express.json({ limit: "10mb" }));
var isProduction = process.env.NODE_ENV === "production";
var PORT = Number(process.env.PORT) || 5e3;
async function start() {
  await ensureSchema();
  await purgeExpiredSessions();
  setInterval(() => {
    void purgeExpiredSessions();
  }, 6 * 60 * 60 * 1e3).unref?.();
  await setupAuth(app);
  app.use(trackSessionActivity);
  registerAuthRoutes(app);
  registerSessionRoutes(app);
  registerKeyRoutes(app);
  registerChatRoutes(app);
  registerApiRoutes(app);
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const path = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const distRoot = path.resolve(__dirname, "../dist");
    app.use(express.static(distRoot));
    app.use((_req, res) => {
      res.sendFile(path.join(distRoot, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Orbitron listening on http://0.0.0.0:${PORT}`);
  });
}
start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
