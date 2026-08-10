import { describe, expect, it } from "vitest";
import { createAdminSession, secureEqual, verifyAdminSession } from "./session";

describe("admin sessions", () => {
  const secret = "a-secret-longer-than-thirty-two-characters";

  it("creates signed sessions that expire after eight hours", () => {
    const token = createAdminSession(secret, 1_000);
    expect(verifyAdminSession(token, secret, 2_000)).toBe(true);
    expect(verifyAdminSession(token, secret, 1_000 + 8 * 60 * 60 * 1000)).toBe(false);
  });

  it("rejects tampering, missing configuration, and short secrets", () => {
    const token = createAdminSession(secret, 1_000);
    expect(verifyAdminSession(`${token}x`, secret, 2_000)).toBe(false);
    expect(verifyAdminSession(token, undefined, 2_000)).toBe(false);
    expect(verifyAdminSession(token, "short", 2_000)).toBe(false);
  });

  it("compares passwords without leaking their length or prefix", () => {
    expect(secureEqual("same", "same")).toBe(true);
    expect(secureEqual("same", "different")).toBe(false);
  });
});
