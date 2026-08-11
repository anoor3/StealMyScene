import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, requestFingerprint, resetRateLimitsForTests } from "./rate-limit";

describe("rate limiting", () => {
  beforeEach(resetRateLimitsForTests);
  afterEach(() => {
    delete process.env.RATE_LIMIT_SERVICE_URL;
    delete process.env.RATE_LIMIT_SERVICE_TOKEN;
    vi.unstubAllGlobals();
  });

  it("allows the limit, rejects overflow, and resets after the window", async () => {
    expect(await checkRateLimit("key", 2, 1000, 100)).toBe(true);
    expect(await checkRateLimit("key", 2, 1000, 101)).toBe(true);
    expect(await checkRateLimit("key", 2, 1000, 102)).toBe(false);
    expect(await checkRateLimit("key", 2, 1000, 1100)).toBe(true);
  });

  it("uses only the first forwarded address", () => {
    expect(requestFingerprint(new Request("http://test", { headers: { "x-forwarded-for": "203.0.113.2, 10.0.0.1" } }))).toBe("203.0.113.2");
  });

  it("delegates atomically to the configured shared service", async () => {
    process.env.RATE_LIMIT_SERVICE_URL = "https://limiter.internal/check";
    process.env.RATE_LIMIT_SERVICE_TOKEN = "test-token";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ allowed: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(checkRateLimit("analytics:203.0.113.2", 20, 60_000)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("https://limiter.internal/check", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ key: "analytics:203.0.113.2", limit: 20, windowMs: 60_000 })
    }));
  });

  it("denies closed when the shared service fails", async () => {
    process.env.RATE_LIMIT_SERVICE_URL = "https://limiter.internal/check";
    process.env.RATE_LIMIT_SERVICE_TOKEN = "test-token";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(checkRateLimit("key", 1, 1000)).resolves.toBe(false);
  });
});
