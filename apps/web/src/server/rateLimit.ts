type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

const pruneExpired = (now: number) => {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size < MAX_BUCKETS) return;
  // Drop oldest windows if still over capacity (best-effort under abuse).
  const overflow = buckets.size - Math.floor(MAX_BUCKETS / 2);
  let removed = 0;
  for (const key of buckets.keys()) {
    buckets.delete(key);
    removed += 1;
    if (removed >= overflow) break;
  }
};

export type RateLimitResult = {
  ok: boolean;
  retryAfterSec: number;
};

/** Simple fixed-window limiter for Node runtimes (per-instance). */
export const rateLimit = (
  key: string,
  options: { limit: number; windowMs: number }
): RateLimitResult => {
  const now = Date.now();
  pruneExpired(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  if (existing.count >= options.limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
    };
  }

  existing.count += 1;
  return { ok: true, retryAfterSec: 0 };
};

export const clientIpFromHeaders = (headers: Headers): string => {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
};
