import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function createShareIdentity() {
  const id = randomBytes(16).toString("base64url");
  const token = randomBytes(32).toString("base64url");
  return { id, token, tokenHash: hashShareToken(token) };
}

export function hashShareToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function shareTokenMatches(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashShareToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function secretMatches(value: string | null, expected: string | undefined): boolean {
  if (!value || !expected) return false;
  const actualBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
