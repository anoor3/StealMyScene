import { describe, expect, it } from "vitest";
import { createShareIdentity, shareTokenMatches } from "./security";

describe("temporary share authorization", () => {
  it("creates unguessable identifiers and verifies only the matching upload token", () => {
    const identity = createShareIdentity();
    expect(identity.id).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(identity.token.length).toBeGreaterThanOrEqual(32);
    expect(shareTokenMatches(identity.token, identity.tokenHash)).toBe(true);
    expect(shareTokenMatches(`${identity.token}x`, identity.tokenHash)).toBe(false);
  });
});
