import { describe, expect, it } from "vitest";
import { createShareSchema, SHARE_MAX_BYTES, shareIsExpired, type ShareRecord } from "./schema";

const record: ShareRecord = {
  version: 1,
  id: "Abcdefghijklmnopqrstuv",
  status: "ready",
  tokenHash: "a".repeat(64),
  title: "My scene",
  fileName: "scene.mp4",
  contentType: "video/mp4",
  bytes: 100,
  mediaKey: "shares/Abcdefghijklmnopqrstuv/output.mp4",
  createdAt: "2026-08-11T00:00:00.000Z",
  uploadExpiresAt: "2026-08-11T01:00:00.000Z",
  expiresAt: "2026-08-14T00:00:00.000Z",
  moderation: "passed"
};

describe("temporary share schema", () => {
  it("accepts only bounded MP4 outputs", () => {
    expect(createShareSchema.safeParse({ fileName: "dub.mp4", contentType: "video/mp4", size: 100, title: "Dub" }).success).toBe(true);
    expect(createShareSchema.safeParse({ fileName: "dub.webm", contentType: "video/webm", size: 100, title: "Dub" }).success).toBe(false);
    expect(createShareSchema.safeParse({ fileName: "dub.mp4", contentType: "video/mp4", size: SHARE_MAX_BYTES + 1, title: "Dub" }).success).toBe(false);
  });

  it("expires ready links at their configured deadline", () => {
    expect(shareIsExpired(record, new Date("2026-08-13T23:59:59.000Z").getTime())).toBe(false);
    expect(shareIsExpired(record, new Date("2026-08-14T00:00:00.000Z").getTime())).toBe(true);
  });
});
