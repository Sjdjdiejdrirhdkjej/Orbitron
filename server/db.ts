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
