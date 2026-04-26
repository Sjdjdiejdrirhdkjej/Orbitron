import { query } from "./db";
import { models as catalog } from "../src/data/models";

export interface RecordUsageInput {
  userId: string;
  apiKeyId?: string | null;
  kind: "chat" | "image";
  modelId: string;
  provider: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  latencyMs?: number | null;
  totalMs?: number | null;
  success?: boolean;
}

/**
 * Append a usage row. Best-effort — never throw into the request path.
 */
export async function recordUsage(input: RecordUsageInput): Promise<void> {
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
        input.success ?? true,
      ],
    );
  } catch (err) {
    console.error("recordUsage failed:", err);
  }
}

export interface KeyUsageSummary {
  windowDays: number;
  totals: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    errorRate: number;
  };
  daily: Array<{ date: string; costUsd: number; requests: number }>;
  topModels: Array<{ modelId: string; provider: string; requests: number; costUsd: number }>;
}

/**
 * Aggregate usage scoped to a single API key. Mirrors getUsageSummary's shape
 * so the front-end can reuse formatting helpers. Caller is responsible for
 * verifying the key belongs to the requesting user before calling this.
 */
export async function getKeyUsageSummary(
  apiKeyId: string,
  windowDays = 30,
): Promise<KeyUsageSummary> {
  const days = Math.max(1, Math.min(90, Math.floor(windowDays)));

  const totalsRes = await query<{
    requests: string;
    input_tokens: string;
    output_tokens: string;
    cost_usd: string;
    errors: string;
  }>(
    `SELECT
       COUNT(*)::text                                     AS requests,
       COALESCE(SUM(input_tokens), 0)::text              AS input_tokens,
       COALESCE(SUM(output_tokens), 0)::text             AS output_tokens,
       COALESCE(SUM(cost_usd), 0)::text                  AS cost_usd,
       COUNT(*) FILTER (WHERE success = FALSE)::text     AS errors
     FROM usage_events
     WHERE api_key_id = $1
       AND created_at >= NOW() - ($2 || ' days')::interval`,
    [apiKeyId, days],
  );
  const t = totalsRes.rows[0];
  const requests = Number(t?.requests ?? 0);

  const dailyRes = await query<{ day: string; cost_usd: string; requests: string }>(
    `SELECT
       to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
       COALESCE(SUM(cost_usd), 0)::text                     AS cost_usd,
       COUNT(*)::text                                       AS requests
     FROM usage_events
     WHERE api_key_id = $1
       AND created_at >= NOW() - ($2 || ' days')::interval
     GROUP BY 1
     ORDER BY 1 ASC`,
    [apiKeyId, days],
  );
  const dailyMap = new Map(
    dailyRes.rows.map((r) => [
      r.day,
      { costUsd: Number(r.cost_usd), requests: Number(r.requests) },
    ]),
  );
  const daily: KeyUsageSummary["daily"] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    const entry = dailyMap.get(key);
    daily.push({
      date: key,
      costUsd: entry?.costUsd ?? 0,
      requests: entry?.requests ?? 0,
    });
  }

  const topRes = await query<{
    model_id: string;
    provider: string;
    requests: string;
    cost_usd: string;
  }>(
    `SELECT model_id, provider,
            COUNT(*)::text                       AS requests,
            COALESCE(SUM(cost_usd), 0)::text    AS cost_usd
     FROM usage_events
     WHERE api_key_id = $1
       AND created_at >= NOW() - ($2 || ' days')::interval
     GROUP BY model_id, provider
     ORDER BY COUNT(*) DESC
     LIMIT 5`,
    [apiKeyId, days],
  );

  return {
    windowDays: days,
    totals: {
      requests,
      inputTokens: Number(t?.input_tokens ?? 0),
      outputTokens: Number(t?.output_tokens ?? 0),
      costUsd: Number(t?.cost_usd ?? 0),
      errorRate: requests > 0 ? Number(t?.errors ?? 0) / requests : 0,
    },
    daily,
    topModels: topRes.rows.map((r) => ({
      modelId: r.model_id,
      provider: r.provider,
      requests: Number(r.requests),
      costUsd: Number(r.cost_usd),
    })),
  };
}

export interface UsageSummary {
  windowDays: number;
  totals: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    errorRate: number; // 0..1
  };
  daily: Array<{ date: string; costUsd: number; requests: number }>;
  topBySpend: Array<{ modelId: string; provider: string; costUsd: number }>;
  topByRequests: Array<{ modelId: string; provider: string; requests: number }>;
}

/**
 * Aggregate usage for a user over the last `windowDays` days.
 * Returns zeroed structures when the user has no events yet — the UI uses that
 * to render an empty state rather than fake numbers.
 */
export async function getUsageSummary(
  userId: string,
  windowDays = 30,
): Promise<UsageSummary> {
  const days = Math.max(1, Math.min(90, Math.floor(windowDays)));

  const totalsRes = await query<{
    requests: string;
    input_tokens: string;
    output_tokens: string;
    cost_usd: string;
    errors: string;
  }>(
    `SELECT
       COUNT(*)::text                                     AS requests,
       COALESCE(SUM(input_tokens), 0)::text              AS input_tokens,
       COALESCE(SUM(output_tokens), 0)::text             AS output_tokens,
       COALESCE(SUM(cost_usd), 0)::text                  AS cost_usd,
       COUNT(*) FILTER (WHERE success = FALSE)::text     AS errors
     FROM usage_events
     WHERE user_id = $1
       AND created_at >= NOW() - ($2 || ' days')::interval`,
    [userId, days],
  );

  const t = totalsRes.rows[0];
  const requests = Number(t?.requests ?? 0);

  const dailyRes = await query<{ day: string; cost_usd: string; requests: string }>(
    `SELECT
       to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
       COALESCE(SUM(cost_usd), 0)::text                     AS cost_usd,
       COUNT(*)::text                                       AS requests
     FROM usage_events
     WHERE user_id = $1
       AND created_at >= NOW() - ($2 || ' days')::interval
     GROUP BY 1
     ORDER BY 1 ASC`,
    [userId, days],
  );

  // Fill in zero-cost days so the chart doesn't have gaps.
  const dailyMap = new Map(
    dailyRes.rows.map((r) => [
      r.day,
      { costUsd: Number(r.cost_usd), requests: Number(r.requests) },
    ]),
  );
  const daily: UsageSummary["daily"] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    const entry = dailyMap.get(key);
    daily.push({
      date: key,
      costUsd: entry?.costUsd ?? 0,
      requests: entry?.requests ?? 0,
    });
  }

  const topSpendRes = await query<{
    model_id: string;
    provider: string;
    cost_usd: string;
  }>(
    `SELECT model_id, provider, COALESCE(SUM(cost_usd), 0)::text AS cost_usd
     FROM usage_events
     WHERE user_id = $1
       AND created_at >= NOW() - ($2 || ' days')::interval
     GROUP BY model_id, provider
     ORDER BY SUM(cost_usd) DESC NULLS LAST
     LIMIT 5`,
    [userId, days],
  );

  const topReqRes = await query<{
    model_id: string;
    provider: string;
    requests: string;
  }>(
    `SELECT model_id, provider, COUNT(*)::text AS requests
     FROM usage_events
     WHERE user_id = $1
       AND created_at >= NOW() - ($2 || ' days')::interval
     GROUP BY model_id, provider
     ORDER BY COUNT(*) DESC
     LIMIT 5`,
    [userId, days],
  );

  return {
    windowDays: days,
    totals: {
      requests,
      inputTokens: Number(t?.input_tokens ?? 0),
      outputTokens: Number(t?.output_tokens ?? 0),
      costUsd: Number(t?.cost_usd ?? 0),
      errorRate: requests > 0 ? Number(t?.errors ?? 0) / requests : 0,
    },
    daily,
    topBySpend: topSpendRes.rows.map((r) => ({
      modelId: r.model_id,
      provider: r.provider,
      costUsd: Number(r.cost_usd),
    })),
    topByRequests: topReqRes.rows.map((r) => ({
      modelId: r.model_id,
      provider: r.provider,
      requests: Number(r.requests),
    })),
  };
}

export interface MeasuredModelStats {
  latencyMs: number | null;
  throughputTokensPerSecond: number | null;
  sampleSize: number;
}

/**
 * Compute real measured latency + throughput per model from the last 7 days
 * of successful chat events. Returns an empty map when there's no data — the
 * /api/models endpoint then reports null and the UI shows "—" instead of a
 * fabricated number.
 */
export async function getMeasuredModelStats(): Promise<
  Map<string, MeasuredModelStats>
> {
  const out = new Map<string, MeasuredModelStats>();
  try {
    const res = await query<{
      model_id: string;
      avg_latency: string | null;
      avg_total: string | null;
      avg_output_tokens: string | null;
      n: string;
    }>(
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
       HAVING COUNT(*) >= 3`,
    );

    for (const row of res.rows) {
      const avgLatency = row.avg_latency ? Number(row.avg_latency) : null;
      const avgTotal = row.avg_total ? Number(row.avg_total) : null;
      const avgOut = row.avg_output_tokens ? Number(row.avg_output_tokens) : null;
      const throughput =
        avgTotal && avgOut && avgTotal > 0
          ? Math.round((avgOut / (avgTotal / 1000)) * 10) / 10
          : null;
      out.set(row.model_id, {
        latencyMs: avgLatency !== null ? Math.round(avgLatency) : null,
        throughputTokensPerSecond: throughput,
        sampleSize: Number(row.n),
      });
    }
  } catch (err) {
    console.error("getMeasuredModelStats failed:", err);
  }
  return out;
}

/** Convenience: lookup the catalog provider for a model id (used at recording time). */
export function providerForModel(modelId: string): string {
  return catalog.find((m) => m.id === modelId)?.provider ?? "Unknown";
}
