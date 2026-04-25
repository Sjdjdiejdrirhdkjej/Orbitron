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
    id: "gpt-5.4",
    name: "GPT-5.4",
    provider: "OpenAI",
    contextWindow: 4e5,
    inputPrice: 1.25,
    outputPrice: 10,
    throughput: 110,
    latency: 300,
    modalities: ["text", "vision", "audio", "tools"],
    description: "OpenAI's latest flagship. The most capable general-purpose model \u2014 best for nearly every non-coding task."
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
    description: "Strong general-purpose model in the GPT-5 generation. Prefer GPT-5.4 unless pinned."
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
    description: "OpenAI's newest flagship. Sharper reasoning, better tool use, and lower latency than GPT-5."
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
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google",
    contextWindow: 2e6,
    inputPrice: 1.25,
    outputPrice: 10,
    throughput: 130,
    latency: 300,
    modalities: ["text", "vision", "audio", "tools"],
    description: "Massive 2M-token context. Native multimodal with built-in extended thinking for hard problems."
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
  }
];

// server/auth.ts
import bcrypt from "bcryptjs";
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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      prefix TEXT NOT NULL,
      lookup_hash TEXT NOT NULL UNIQUE,
      monthly_cap_cents INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys(user_id);
  `);
}
async function purgeExpiredSessions() {
  try {
    await pool.query("DELETE FROM sessions WHERE expires_at < NOW()");
  } catch (err) {
    console.error("purgeExpiredSessions failed:", err);
  }
}

// server/auth.ts
var SESSION_COOKIE = "sb_session";
var SESSION_TTL_MS = 1e3 * 60 * 60 * 24 * 30;
var KEY_PREFIX = "sk-sb-v1-";
function parseCookies(header) {
  if (!header) return {};
  const out = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}
function setSessionCookie(res, token, expiresAt) {
  const isProd = process.env.NODE_ENV === "production";
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${expiresAt.toUTCString()}`
  ];
  if (isProd) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}
function clearSessionCookie(res) {
  const isProd = process.env.NODE_ENV === "production";
  const parts = [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT"
  ];
  if (isProd) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}
function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name };
}
async function getSessionUser(token) {
  if (!token) return null;
  const result = await query(
    `SELECT u.id, u.email, u.name, u.password_hash, u.created_at, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token = $1`,
    [token]
  );
  const row = result.rows[0];
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await query("DELETE FROM sessions WHERE token = $1", [token]);
    return null;
  }
  return row;
}
function lookupHash(secret) {
  return createHash("sha256").update(secret).digest("hex");
}
function generateApiKey() {
  const raw = randomBytes(32).toString("base64url");
  const full = `${KEY_PREFIX}${raw}`;
  const prefix = full.slice(0, KEY_PREFIX.length + 6);
  return { full, prefix, lookup: lookupHash(full) };
}
async function getUserFromBearer(token) {
  if (!token.startsWith(KEY_PREFIX)) return null;
  const lookup = lookupHash(token);
  const result = await query(
    `SELECT u.id, u.email, u.name, u.password_hash, u.created_at,
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
  return {
    user: {
      id: row.id,
      email: row.email,
      name: row.name,
      password_hash: row.password_hash,
      created_at: row.created_at
    },
    keyId: row.key_id
  };
}
async function resolveAuth(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const result = await getUserFromBearer(token);
      if (result) {
        return {
          user: publicUser(result.user),
          via: "api_key",
          apiKeyId: result.keyId
        };
      }
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
async function requireAuth(req, res, next) {
  const ctx = await resolveAuth(req);
  if (!ctx) {
    return res.status(401).json({
      error: {
        message: "Authentication required. Pass a session cookie or 'Authorization: Bearer <api key>' header. Generate a key at /keys.",
        type: "unauthorized"
      }
    });
  }
  req.auth = ctx;
  next();
}
async function requireSession(req, res, next) {
  const ctx = await resolveAuth(req);
  if (!ctx || ctx.via !== "session") {
    return res.status(401).json({
      error: { message: "You must be signed in.", type: "unauthorized" }
    });
  }
  req.auth = ctx;
  next();
}
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function registerAuthRoutes(app2) {
  app2.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, name } = req.body || {};
      if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
        return res.status(400).json({ error: { message: "A valid email is required." } });
      }
      if (!password || typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ error: { message: "Password must be at least 8 characters." } });
      }
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = typeof name === "string" ? name.trim().slice(0, 120) || null : null;
      const existing = await query("SELECT id FROM users WHERE email = $1", [cleanEmail]);
      if (existing.rowCount && existing.rowCount > 0) {
        return res.status(409).json({ error: { message: "An account with that email already exists." } });
      }
      const hash = await bcrypt.hash(password, 12);
      const result = await query(
        `INSERT INTO users (email, name, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, email, name, password_hash, created_at`,
        [cleanEmail, cleanName, hash]
      );
      const user = result.rows[0];
      const token = randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      await query("INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)", [
        token,
        user.id,
        expiresAt
      ]);
      setSessionCookie(res, token, expiresAt);
      res.status(201).json({ user: publicUser(user) });
    } catch (err) {
      console.error("signup error:", err);
      res.status(500).json({ error: { message: "Failed to create account." } });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: { message: "Email and password required." } });
      }
      const cleanEmail = String(email).trim().toLowerCase();
      const result = await query(
        "SELECT id, email, name, password_hash, created_at FROM users WHERE email = $1",
        [cleanEmail]
      );
      const user = result.rows[0];
      const ok = user ? await bcrypt.compare(password, user.password_hash) : await bcrypt.compare(password, "$2a$12$invalidhashinvalidhashinvalidhashinvalidhashinvalidhash");
      if (!user || !ok) {
        return res.status(401).json({ error: { message: "Invalid email or password." } });
      }
      const token = randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      await query("INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)", [
        token,
        user.id,
        expiresAt
      ]);
      setSessionCookie(res, token, expiresAt);
      res.json({ user: publicUser(user) });
    } catch (err) {
      console.error("login error:", err);
      res.status(500).json({ error: { message: "Failed to sign in." } });
    }
  });
  app2.post("/api/auth/logout", async (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[SESSION_COOKIE];
    if (token) {
      await query("DELETE FROM sessions WHERE token = $1", [token]).catch(() => void 0);
    }
    clearSessionCookie(res);
    res.json({ ok: true });
  });
  app2.get("/api/auth/me", async (req, res) => {
    const ctx = await resolveAuth(req);
    if (!ctx || ctx.via !== "session") {
      return res.status(401).json({ error: { message: "Not signed in." } });
    }
    res.json({ user: ctx.user });
  });
}
function registerKeyRoutes(app2) {
  app2.get("/api/keys", requireSession, async (req, res) => {
    const userId = req.auth.user.id;
    const result = await query(
      `SELECT id, user_id, name, prefix, monthly_cap_cents, created_at, last_used_at, revoked_at
         FROM api_keys
        WHERE user_id = $1
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
  app2.delete("/api/keys/:id", requireSession, async (req, res) => {
    const userId = req.auth.user.id;
    const { id } = req.params;
    const result = await query(
      `UPDATE api_keys
          SET revoked_at = NOW()
        WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
        RETURNING id`,
      [id, userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: { message: "Key not found." } });
    }
    res.json({ ok: true });
  });
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
  "gpt-5.4": "gpt-5.4",
  "gpt-5.2": "gpt-5.2",
  "gpt-5.1": "gpt-5.1",
  "gpt-5": "gpt-5",
  "gpt-5-mini": "gpt-5-mini",
  "gpt-5-nano": "gpt-5-nano",
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
  "gemini-2.5-pro": "gemini-2.5-pro",
  "gemini-2.5-flash": "gemini-2.5-flash"
};
function approxTokens(text) {
  return Math.max(1, Math.ceil(text.length / 4));
}
function registerChatRoutes(app2) {
  app2.post("/api/chat", requireAuth, async (req, res) => {
    const { modelId, messages, temperature, maxTokens } = req.body || {};
    if (!modelId || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "modelId and messages are required" });
    }
    const catalogEntry = models.find((m) => m.id === modelId);
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
    const inputTokens = approxTokens(messages.map((m) => m.content).join("\n"));
    try {
      const onDelta = (delta) => {
        if (!delta) return;
        if (!firstTokenMs) firstTokenMs = Date.now() - startTime;
        outputText += delta;
        send({ delta });
      };
      if (modelId in openAIMap) {
        const realModel = openAIMap[modelId];
        const isReasoning = realModel.startsWith("gpt-5") || realModel.startsWith("o");
        const stream = await openai.chat.completions.create({
          model: realModel,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          stream: true,
          ...isReasoning ? {} : { temperature: temperature ?? 0.7 },
          max_completion_tokens: maxTokens ?? 4096
        });
        for await (const chunk of stream) {
          onDelta(chunk.choices[0]?.delta?.content || "");
        }
      } else if (modelId in anthropicMap) {
        const realModel = anthropicMap[modelId];
        const systemMessages = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
        const turns = messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content }));
        const supportsTemperature = !/^claude-opus-4-(6|7)$|^claude-sonnet-4-6$/.test(realModel);
        const stream = anthropic.messages.stream({
          model: realModel,
          max_tokens: maxTokens ?? 4096,
          ...supportsTemperature ? { temperature: temperature ?? 0.7 } : {},
          system: systemMessages || void 0,
          messages: turns
        });
        for await (const event of stream) {
          if (event.type === "content_block_delta" && "delta" in event && event.delta.type === "text_delta") {
            onDelta(event.delta.text || "");
          }
        }
      } else if (modelId in geminiMap) {
        const realModel = geminiMap[modelId];
        const systemMessages = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
        const contents = messages.filter((m) => m.role !== "system").map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }]
        }));
        const config = {
          temperature: temperature ?? 0.7,
          maxOutputTokens: maxTokens ?? 4096
        };
        if (systemMessages) config.systemInstruction = systemMessages;
        const stream = await gemini.models.generateContentStream({
          model: realModel,
          contents,
          config
        });
        for await (const chunk of stream) {
          onDelta(chunk.text || "");
        }
      } else {
        send({ error: `Unsupported model: ${modelId}` });
        return res.end();
      }
      const outputTokens = approxTokens(outputText);
      const totalTime = Date.now() - startTime;
      const cost = catalogEntry ? inputTokens / 1e6 * catalogEntry.inputPrice + outputTokens / 1e6 * catalogEntry.outputPrice : 0;
      send({
        done: true,
        latencyMs: firstTokenMs,
        totalMs: totalTime,
        inputTokens,
        outputTokens,
        cost
      });
      res.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Chat request failed";
      console.error("Chat error:", err);
      send({ error: message });
      res.end();
    }
  });
}

// server/api.ts
import OpenAI2 from "openai";
import Anthropic2 from "@anthropic-ai/sdk";
import { GoogleGenAI as GoogleGenAI2 } from "@google/genai";
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
  app2.get("/api/models", (req, res) => {
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
    res.json({
      object: "list",
      providers,
      data: data.map((m) => ({
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
        throughput_tokens_per_second: m.throughput,
        latency_ms: m.latency,
        description: m.description
      }))
    });
  });
  app2.get("/api/models/:id", (req, res) => {
    const model = models.find((m) => m.id === req.params.id);
    if (!model) {
      return res.status(404).json({ error: { message: `Model not found: ${req.params.id}` } });
    }
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
      throughput_tokens_per_second: model.throughput,
      latency_ms: model.latency,
      description: model.description
    });
  });
  app2.post("/api/images", requireAuth, async (req, res) => {
    const { prompt, size = "1024x1024", n = 1 } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: { message: "prompt is required" } });
    }
    if (n < 1 || n > 4) {
      return res.status(400).json({ error: { message: "n must be between 1 and 4" } });
    }
    const startTime = Date.now();
    try {
      const response = await openai2.images.generate({
        model: "gpt-image-1",
        prompt,
        size,
        n
      });
      const data = (response.data ?? []).map((img) => ({
        b64_json: img.b64_json ?? null,
        revised_prompt: img.revised_prompt ?? null
      }));
      res.json({
        model: "gpt-image-1",
        latencyMs: Date.now() - startTime,
        data
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Image generation failed";
      console.error("Image generation error:", err);
      res.status(500).json({ error: { message } });
    }
  });
}

// server/index.ts
var app = express();
app.use(express.json({ limit: "10mb" }));
registerAuthRoutes(app);
registerKeyRoutes(app);
registerChatRoutes(app);
registerApiRoutes(app);
var isProduction = process.env.NODE_ENV === "production";
var PORT = Number(process.env.PORT) || 5e3;
async function start() {
  await ensureSchema();
  await purgeExpiredSessions();
  setInterval(() => {
    void purgeExpiredSessions();
  }, 6 * 60 * 60 * 1e3).unref?.();
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
    console.log(`Switchboard listening on http://0.0.0.0:${PORT}`);
  });
}
start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
