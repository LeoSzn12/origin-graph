import { createHash } from "node:crypto";
import type { Pool } from "pg";

export function privacySafeClientKey(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

export async function enforceRateLimit(pool: Pool, bucketKey: string, limit: number, windowSeconds: number): Promise<void> {
  const result = await pool.query<{ request_count: number }>(
    `INSERT INTO request_rate_limits (bucket_key, window_started_at, request_count)
     VALUES ($1, now(), 1)
     ON CONFLICT (bucket_key) DO UPDATE SET
       window_started_at = CASE WHEN request_rate_limits.window_started_at < now() - make_interval(secs => $2)
         THEN now() ELSE request_rate_limits.window_started_at END,
       request_count = CASE WHEN request_rate_limits.window_started_at < now() - make_interval(secs => $2)
         THEN 1 ELSE request_rate_limits.request_count + 1 END,
       updated_at = now()
     RETURNING request_count`, [bucketKey, windowSeconds]);
  if (result.rows[0].request_count > limit) throw new Error("RATE_LIMITED: too many requests; try again later");
}
