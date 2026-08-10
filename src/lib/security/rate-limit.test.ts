import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, requestFingerprint, resetRateLimitsForTests } from "./rate-limit";

describe("rate limiting", () => {
  beforeEach(resetRateLimitsForTests);

  it("allows the limit, rejects overflow, and resets after the window", () => {
    expect(checkRateLimit("key", 2, 1000, 100)).toBe(true);
    expect(checkRateLimit("key", 2, 1000, 101)).toBe(true);
    expect(checkRateLimit("key", 2, 1000, 102)).toBe(false);
    expect(checkRateLimit("key", 2, 1000, 1100)).toBe(true);
  });

  it("uses only the first forwarded address", () => {
    expect(requestFingerprint(new Request("http://test", { headers: { "x-forwarded-for": "203.0.113.2, 10.0.0.1" } }))).toBe("203.0.113.2");
  });
});
