import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "sms_admin_session";
const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;

function signature(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function secureEqual(left: string, right: string): boolean {
  const leftDigest = createHmac("sha256", "comparison").update(left).digest();
  const rightDigest = createHmac("sha256", "comparison").update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

export function createAdminSession(secret: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ expiresAt: now + SESSION_LIFETIME_MS, nonce: randomUUID() })).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyAdminSession(token: string | undefined, secret: string | undefined, now = Date.now()): boolean {
  if (!token || !secret || secret.length < 32) return false;
  const [payload, providedSignature, extra] = token.split(".");
  if (!payload || !providedSignature || extra || !secureEqual(providedSignature, signature(payload, secret))) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof parsed.expiresAt === "number" && parsed.expiresAt > now && typeof parsed.nonce === "string";
  } catch {
    return false;
  }
}
