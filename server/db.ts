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
 * Ensure the schema needed by the auth + key flows exists.
 * Called once at server startup so a fresh environment can sign up immediately
 * without manual migration steps. All statements use IF NOT EXISTS, so it is
 * safe to run on every boot.
 */
export async function ensureSchema(): Promise<void> {
  await pool.query(`
    -- gen_random_uuid() is in core Postgres 13+, but pgcrypto guarantees it on
    -- older builds and is a no-op everywhere else.
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

/** Best-effort cleanup of expired session rows. Safe to call periodically. */
export async function purgeExpiredSessions(): Promise<void> {
  try {
    await pool.query("DELETE FROM sessions WHERE expires_at < NOW()");
  } catch (err) {
    console.error("purgeExpiredSessions failed:", err);
  }
}
