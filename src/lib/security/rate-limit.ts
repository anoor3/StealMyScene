type Bucket = { count: number; resetsAt: number };
const buckets = new Map<string, Bucket>();

function localCheck(key: string, limit: number, windowMs: number, now: number): boolean {
  const existing = buckets.get(key);
  if (!existing || existing.resetsAt <= now) {
    buckets.set(key, { count: 1, resetsAt: now + windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

export async function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): Promise<boolean> {
  const serviceUrl = process.env.RATE_LIMIT_SERVICE_URL;
  const token = process.env.RATE_LIMIT_SERVICE_TOKEN;
  if (!serviceUrl) {
    if (process.env.NODE_ENV === "production" && process.env.RATE_LIMIT_DRIVER !== "memory") return false;
    return localCheck(key, limit, windowMs, now);
  }
  if (!token) return false;
  try {
    const response = await fetch(serviceUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ key, limit, windowMs }),
      signal: AbortSignal.timeout(2_000),
      cache: "no-store"
    });
    if (!response.ok) return false;
    const result = await response.json() as { allowed?: unknown };
    return result.allowed === true;
  } catch {
    return false;
  }
}

export function requestFingerprint(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export function resetRateLimitsForTests() {
  buckets.clear();
}
