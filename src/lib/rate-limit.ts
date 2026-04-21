import "server-only";

// In-memory fixed-window counter. Not distributed — fine for a single
// Vercel serverless region at low volume. Swap for Redis/Upstash when
// traffic or multi-region matters.

type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

export type RateLimit = {
  ok: boolean;
  remaining: number;
  resetInSeconds: number;
};

export function checkRate(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimit {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowSeconds * 1000;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetInSeconds: windowSeconds };
  }
  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      resetInSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }
  existing.count += 1;
  return {
    ok: true,
    remaining: limit - existing.count,
    resetInSeconds: Math.ceil((existing.resetAt - now) / 1000),
  };
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? "unknown";
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
