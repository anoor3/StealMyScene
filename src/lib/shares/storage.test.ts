import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { ShareRecord } from "./schema";

const root = mkdtempSync(join(tmpdir(), "sms-share-storage-test-"));
const previousRoot = process.env.VAR_ROOT;
const previousDriver = process.env.STORAGE_DRIVER;
process.env.VAR_ROOT = root;
process.env.STORAGE_DRIVER = "local";

afterAll(() => {
  if (previousRoot === undefined) delete process.env.VAR_ROOT;
  else process.env.VAR_ROOT = previousRoot;
  if (previousDriver === undefined) delete process.env.STORAGE_DRIVER;
  else process.env.STORAGE_DRIVER = previousDriver;
  rmSync(root, { recursive: true, force: true });
});

describe("temporary share cleanup", () => {
  it("marks expired metadata and deletes hosted media bytes", async () => {
    const { cleanupExpiredShares, localShareMediaPath, readShareRecord, writeShareRecord } = await import("./storage");
    const record: ShareRecord = {
      version: 1,
      id: "Abcdefghijklmnopqrstuv",
      status: "ready",
      tokenHash: "a".repeat(64),
      title: "Expiry test",
      fileName: "scene.mp4",
      contentType: "video/mp4",
      bytes: 5,
      mediaKey: "shares/Abcdefghijklmnopqrstuv/output.mp4",
      createdAt: "2026-08-10T00:00:00.000Z",
      uploadExpiresAt: "2026-08-10T01:00:00.000Z",
      expiresAt: "2026-08-11T00:00:00.000Z",
      moderation: "passed"
    };
    await writeShareRecord(record, true);
    const path = join(root, "shares", record.id, "output.mp4");
    writeFileSync(path, "video");
    expect(readFileSync(localShareMediaPath(record.id), "utf8")).toBe("video");
    await expect(cleanupExpiredShares(new Date("2026-08-12T00:00:00.000Z").getTime())).resolves.toEqual({ inspected: 1, expired: 1 });
    expect((await readShareRecord(record.id)).status).toBe("expired");
    expect(() => localShareMediaPath(record.id)).toThrow();
  });
});
