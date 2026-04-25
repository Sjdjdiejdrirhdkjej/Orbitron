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
