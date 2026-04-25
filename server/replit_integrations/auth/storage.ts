import { query } from "../../db";

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  compactMode: boolean;
  defaultModel: string | null;
  emailNotifications: boolean;
  usageAlertThresholdCents: number;
}

export interface ReplitAuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  preferences: UserPreferences;
}

export interface UpsertUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
}

export interface IAuthStorage {
  getUser(id: string): Promise<ReplitAuthUser | undefined>;
  upsertUser(user: UpsertUser): Promise<ReplitAuthUser>;
  getPreferences(userId: string): Promise<UserPreferences>;
  updatePreferences(userId: string, prefs: Partial<UserPreferences>): Promise<UserPreferences>;
}

interface UserRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  created_at: Date | null;
  updated_at: Date | null;
  theme: string;
  compact_mode: boolean;
  default_model: string | null;
  email_notifications: boolean;
  usage_alert_threshold_cents: number;
}

function rowToUser(row: UserRow): ReplitAuthUser {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    profileImageUrl: row.profile_image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    preferences: {
      theme: (row.theme as "light" | "dark" | "system") || "system",
      compactMode: row.compact_mode ?? false,
      defaultModel: row.default_model ?? null,
      emailNotifications: row.email_notifications ?? true,
      usageAlertThresholdCents: row.usage_alert_threshold_cents ?? 5000,
    },
  };
}

function rowToPreferences(row: UserRow): UserPreferences {
  return {
    theme: (row.theme as "light" | "dark" | "system") || "system",
    compactMode: row.compact_mode ?? false,
    defaultModel: row.default_model ?? null,
    emailNotifications: row.email_notifications ?? true,
    usageAlertThresholdCents: row.usage_alert_threshold_cents ?? 5000,
  };
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<ReplitAuthUser | undefined> {
    const result = await query<UserRow>(
      `SELECT id, email, first_name, last_name, profile_image_url, created_at, updated_at,
              theme, compact_mode, default_model, email_notifications, usage_alert_threshold_cents
         FROM users WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? rowToUser(row) : undefined;
  }

  async getPreferences(userId: string): Promise<UserPreferences> {
    const result = await query<UserRow>(
      `SELECT theme, compact_mode, default_model, email_notifications, usage_alert_threshold_cents
         FROM users WHERE id = $1`,
      [userId],
    );
    const row = result.rows[0];
    if (!row) {
      // Return defaults if user not found (shouldn't happen for authenticated users)
      return {
        theme: "system",
        compactMode: false,
        defaultModel: null,
        emailNotifications: true,
        usageAlertThresholdCents: 5000,
      };
    }
    return rowToPreferences(row);
  }

  async updatePreferences(userId: string, prefs: Partial<UserPreferences>): Promise<UserPreferences> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (prefs.theme !== undefined) {
      updates.push(`theme = $${paramIndex++}`);
      values.push(prefs.theme);
    }
    if (prefs.compactMode !== undefined) {
      updates.push(`compact_mode = $${paramIndex++}`);
      values.push(prefs.compactMode);
    }
    if (prefs.defaultModel !== undefined) {
      updates.push(`default_model = $${paramIndex++}`);
      values.push(prefs.defaultModel);
    }
    if (prefs.emailNotifications !== undefined) {
      updates.push(`email_notifications = $${paramIndex++}`);
      values.push(prefs.emailNotifications);
    }
    if (prefs.usageAlertThresholdCents !== undefined) {
      updates.push(`usage_alert_threshold_cents = $${paramIndex++}`);
      values.push(prefs.usageAlertThresholdCents);
    }

    if (updates.length === 0) {
      return this.getPreferences(userId);
    }

    values.push(userId);
    const result = await query<UserRow>(
      `UPDATE users SET ${updates.join(", ")}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING theme, compact_mode, default_model, email_notifications, usage_alert_threshold_cents`,
      values,
    );

    return rowToPreferences(result.rows[0]);
  }

  async upsertUser(userData: UpsertUser): Promise<ReplitAuthUser> {
    // Single-statement upsert with atomic welcome bonus.
    //
    // Why this shape:
    //   - The $5 bonus (500 cents) and welcome_credit_granted_at are written
    //     directly in the INSERT. ON CONFLICT DO UPDATE intentionally omits
    //     those two columns so re-logins preserve the existing balance/flag.
    //   - We can't do a separate UPDATE on users in a sibling CTE: PG's
    //     data-modifying CTEs all see the same pre-statement snapshot, so an
    //     UPDATE wouldn't find a row that another CTE just INSERTed.
    //   - The audit CTE (credit_grants INSERT) executes regardless of being
    //     read by the main SELECT — that's the documented behavior — and
    //     reads its user_id from upserted's RETURNING values.
    //   - xmax = 0 holds only on a fresh INSERT; on ON CONFLICT UPDATE xmax
    //     is set to the txn id, so this reliably gates the grant to new users.
    const result = await query<UserRow & { inserted: boolean }>(
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
        userData.profileImageUrl ?? null,
      ],
    );
    return rowToUser(result.rows[0]);
  }
}

export const authStorage = new AuthStorage();
