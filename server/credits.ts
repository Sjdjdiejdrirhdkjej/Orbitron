import { query } from "./db";

export interface CreditGrantRow {
  id: string;
  amount_cents: number;
  reason: string;
  description: string | null;
  created_at: Date;
}

export interface CreditsState {
  balanceCents: number;
  welcomeGrantedAt: Date | null;
  legacyGrantedAt: Date | null;
  grants: CreditGrantRow[];
}

/**
 * Deduct credits from a user's balance. Best-effort — never throws into the request path.
 * Also inserts a usage deduction record into credit_grants for the audit trail.
 * Returns the new balance, or null if deduction failed or user had insufficient credits.
 */
export async function deductCredits(
  userId: string,
  amountCents: number,
  description?: string,
): Promise<{ newBalanceCents: number } | null> {
  if (amountCents <= 0) return null;

  try {
    const result = await query<{ credit_balance_cents: number }>(
      `UPDATE users
          SET credit_balance_cents = GREATEST(credit_balance_cents - $2, 0)
        WHERE id = $1
          AND credit_balance_cents >= $2
        RETURNING credit_balance_cents`,
      [userId, amountCents],
    );

    if (result.rows.length === 0) {
      // User doesn't have enough credits
      return null;
    }

    const newBalance = result.rows[0].credit_balance_cents;

    // Record the deduction in the audit trail (best-effort)
    await query(
      `INSERT INTO credit_grants (user_id, amount_cents, reason, description)
       VALUES ($1, $2, $3, $4)`,
      [userId, -amountCents, "usage", description ?? "AI chat deduction"],
    ).catch((err) => console.error("Failed to record credit deduction audit:", err));

    return { newBalanceCents: newBalance };
  } catch (err) {
    console.error("deductCredits failed:", err);
    return null;
  }
}

/**
 * Get the user's current credit balance in cents.
 * Returns 0 if user not found.
 */
export async function getCreditBalance(userId: string): Promise<number> {
  try {
    const res = await query<{ credit_balance_cents: number }>(
      `SELECT credit_balance_cents FROM users WHERE id = $1`,
      [userId],
    );
    return res.rows[0]?.credit_balance_cents ?? 0;
  } catch (err) {
    console.error("getCreditBalance failed:", err);
    return 0;
  }
}

export async function getCreditsState(userId: string): Promise<CreditsState> {
  const userRes = await query<{
    credit_balance_cents: number;
    welcome_credit_granted_at: Date | null;
    legacy_credit_granted_at: Date | null;
  }>(
    `SELECT credit_balance_cents,
            welcome_credit_granted_at,
            legacy_credit_granted_at
       FROM users WHERE id = $1`,
    [userId],
  );

  const grantsRes = await query<CreditGrantRow>(
    `SELECT id, amount_cents, reason, description, created_at
       FROM credit_grants
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50`,
    [userId],
  );

  const row = userRes.rows[0];
  return {
    balanceCents: row?.credit_balance_cents ?? 0,
    welcomeGrantedAt: row?.welcome_credit_granted_at ?? null,
    legacyGrantedAt: row?.legacy_credit_granted_at ?? null,
    grants: grantsRes.rows,
  };
}
