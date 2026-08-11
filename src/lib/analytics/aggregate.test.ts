// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("scheduled trending aggregation", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "sms-analytics-"));
    process.env.VAR_ROOT = root;
    process.env.STORAGE_DRIVER = "local";
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.VAR_ROOT;
    delete process.env.STORAGE_DRIVER;
    rmSync(root, { recursive: true, force: true });
  });

  it("turns immutable batches into a cached ranking snapshot", async () => {
    const now = Date.UTC(2026, 7, 11, 12);
    const { writeAnalyticsBatch } = await import("./storage");
    await writeAnalyticsBatch({
      batchId: "eb7157af-3ff9-44a7-b188-346c09017515",
      events: [
        { name: "scene_open", timestamp: now - 100, sessionId: "b96f2590-4d85-49fd-a7cf-476a1a6af473", properties: { sceneSlug: "last-cookie" } },
        { name: "record_start", timestamp: now - 90, sessionId: "b96f2590-4d85-49fd-a7cf-476a1a6af473", properties: { sceneId: "scene_002" } },
        { name: "render_finish", timestamp: now - 80, sessionId: "b96f2590-4d85-49fd-a7cf-476a1a6af473", properties: { sceneId: "scene_002" } },
        { name: "share", timestamp: now - 70, sessionId: "b96f2590-4d85-49fd-a7cf-476a1a6af473", properties: { sceneId: "scene_002" } }
      ]
    });
    const { aggregateTrending } = await import("./aggregate");
    const snapshot = await aggregateTrending(now);
    expect(snapshot.entries[0]).toMatchObject({ sceneId: "scene_002", views: 1, dubs: 1, shares: 1, completionRate: 1 });
    const persisted = JSON.parse(readFileSync(join(root, "analytics", "trending.json"), "utf8"));
    expect(persisted).toEqual(snapshot);
  });
});
