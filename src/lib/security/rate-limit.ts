type Bucket = { count: number; resetsAt: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const existing = buckets.get(key);
  if (!existing || existing.resetsAt <= now) {
    buckets.set(key, { count: 1, resetsAt: now + windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

export function requestFingerprint(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export function resetRateLimitsForTests() {
  buckets.clear();
}
