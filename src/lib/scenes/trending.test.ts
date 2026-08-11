import { describe, expect, it } from "vitest";
import { rankTrending } from "./trending";

const hour = 60 * 60 * 1_000;
const now = Date.UTC(2026, 7, 11, 12);

describe("trending ranking", () => {
  it("combines activity, completion, velocity, and recency deterministically", () => {
    const events = [
      { sceneId: "recent", name: "scene_open" as const, timestamp: now - hour },
      { sceneId: "recent", name: "record_start" as const, timestamp: now - hour },
      { sceneId: "recent", name: "render_finish" as const, timestamp: now - hour },
      { sceneId: "recent", name: "share" as const, timestamp: now - hour },
      { sceneId: "old", name: "scene_open" as const, timestamp: now - 6 * 24 * hour },
      { sceneId: "old", name: "record_start" as const, timestamp: now - 6 * 24 * hour },
      { sceneId: "old", name: "render_finish" as const, timestamp: now - 6 * 24 * hour },
      { sceneId: "old", name: "share" as const, timestamp: now - 6 * 24 * hour }
    ];
    const ranked = rankTrending(["old", "recent", "quiet"], events, now);
    expect(ranked.map((entry) => entry.sceneId)).toEqual(["recent", "old", "quiet"]);
    expect(ranked[0]).toMatchObject({ views: 1, dubs: 1, shares: 1, completionRate: 1, velocity: 1 });
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it("ignores future and expired activity and uses a stable tie break", () => {
    const ranked = rankTrending(["scene_b", "scene_a"], [
      { sceneId: "scene_b", name: "share", timestamp: now + 1 },
      { sceneId: "scene_a", name: "share", timestamp: now - 8 * 24 * hour }
    ], now);
    expect(ranked.map((entry) => entry.sceneId)).toEqual(["scene_a", "scene_b"]);
    expect(ranked.every((entry) => entry.score === 0)).toBe(true);
  });
});
