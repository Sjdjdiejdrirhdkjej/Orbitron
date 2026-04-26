import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Provision a database before starting the server.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  console.error("Postgres pool error:", err);
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params as never);
}

/**
 * Ensure the schema needed by Replit Auth + the API key flow exists.
 * Called once at server startup so a fresh environment can sign in immediately
 * without manual migration steps.
 *
 * Replit Auth requires:
 *   - users(id varchar PK, email, first_name, last_name, profile_image_url, created_at, updated_at)
 *   - sessions(sid varchar PK, sess jsonb, expire timestamp) with expire index
 *
 * On first boot we drop any pre-existing legacy email/password users + sessions
 * tables (Switchboard previously had its own auth) so they can be recreated to
 * match the Replit Auth shape. api_keys is dropped along with them because its
 * user_id column referenced the old UUID primary key.
 */
export async function ensureSchema(): Promise<void> {
  // One-time migration off the legacy email/password auth schema. The legacy
  // users table had a NOT NULL `password_hash` column that Replit Auth doesn't
  // populate — that's our signal to drop and recreate.
  const legacy = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'password_hash'
     ) AS exists`,
  );
  if (legacy.rows[0]?.exists) {
    console.log("[db] Migrating legacy email/password auth schema → Replit Auth schema");
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
    -- traffic — first-party or third-party — is uniformly key-authenticated.
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
      reason TEXT NOT NULL,                     -- 'welcome' | 'legacy_bonus' | 'topup' | …
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

  // One-time legacy bonus: $100 to every user that existed before the credits
  // feature shipped (i.e. they never received the welcome bonus). Idempotent
  // via legacy_credit_granted_at — re-running ensureSchema is a no-op.
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

/** Best-effort cleanup of expired session rows. Safe to call periodically. */
export async function purgeExpiredSessions(): Promise<void> {
  try {
    await pool.query("DELETE FROM sessions WHERE expire < NOW()");
  } catch (err) {
    console.error("purgeExpiredSessions failed:", err);
  }
}
