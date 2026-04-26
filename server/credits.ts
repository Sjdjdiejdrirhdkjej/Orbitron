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
 * Atomically reserve credits up-front, before a paid request runs.
 *
 * This is the primary defense against "free usage when depleted" exploits:
 * we deduct the worst-case cost from the balance BEFORE the provider call,
 * so concurrent requests can't all squeak through on the same dollar, and
 * a user with insufficient credits is rejected with a clear error rather
 * than being served the response and then having the deduction silently
 * fail post-hoc. Callers MUST settle the reservation by either:
 *   - calling `refundCredits` for any unused remainder after the request, AND
 *   - calling `recordCreditAudit` with the actual usage cost for the audit log.
 *
 * Returns the number of cents actually reserved, or `null` if the user has
 * insufficient balance (in which case the request must be rejected).
 *
 * NOTE: deliberately does NOT write a credit_grants audit row — reservation
 * is an internal accounting step that gets reconciled at settlement time.
 */
export async function reserveCredits(
  userId: string,
  amountCents: number,
): Promise<number | null> {
  if (amountCents <= 0) return 0;
  try {
    const result = await query<{ credit_balance_cents: number }>(
      `UPDATE users
          SET credit_balance_cents = credit_balance_cents - $2
        WHERE id = $1
          AND credit_balance_cents >= $2
        RETURNING credit_balance_cents`,
      [userId, amountCents],
    );
    if (result.rows.length === 0) return null;
    return amountCents;
  } catch (err) {
    console.error("reserveCredits failed:", err);
    return null;
  }
}

/**
 * Refund unused reservation back to the user's balance. Best-effort.
 * Does NOT write an audit row — the reservation never produced one.
 */
export async function refundCredits(
  userId: string,
  amountCents: number,
): Promise<void> {
  if (amountCents <= 0) return;
  try {
    await query(
      `UPDATE users
          SET credit_balance_cents = credit_balance_cents + $2
        WHERE id = $1`,
      [userId, amountCents],
    );
  } catch (err) {
    console.error("refundCredits failed:", err);
  }
}

/**
 * Write a single audit-trail entry for a settled usage charge.
 * Call this AFTER reserveCredits + the actual request, with the real cost.
 * Balance is unaffected — the deduction already happened at reservation.
 */
export async function recordCreditAudit(
  userId: string,
  amountCents: number,
  description: string,
): Promise<void> {
  if (amountCents <= 0) return;
  try {
    await query(
      `INSERT INTO credit_grants (user_id, amount_cents, reason, description)
       VALUES ($1, $2, $3, $4)`,
      [userId, -amountCents, "usage", description],
    );
  } catch (err) {
    console.error("recordCreditAudit failed:", err);
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
