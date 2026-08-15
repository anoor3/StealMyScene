import { describe, expect, it } from "vitest";
import { getCategories, getPublishedScenes, getRelatedScenes, getSceneBySlug } from "./catalog";
import { sceneSchema } from "./schema";

describe("scene catalog", () => {
  it("contains the Phase 2 target of 75–150 valid, published, rights-safe scenes", () => {
    const scenes = getPublishedScenes();
    expect(scenes.length).toBeGreaterThanOrEqual(75);
    expect(scenes.length).toBeLessThanOrEqual(150);
    for (const scene of scenes) {
      expect(() => sceneSchema.parse(scene)).not.toThrow();
      expect(scene.sourceType).toBe("movie");
      expect(scene.rightsStatus).toBe("cleared");
      expect(scene.rightsOwner).toBe("Public domain");
      expect(scene.rightsBasis).toContain("commons.wikimedia.org/wiki/File:");
    }
  });

  it("has unique IDs, slugs, and immutable versioned asset names", () => {
    const scenes = getPublishedScenes();
    expect(new Set(scenes.map(({ id }) => id)).size).toBe(scenes.length);
    expect(new Set(scenes.map(({ slug }) => slug)).size).toBe(scenes.length);
    for (const scene of scenes) {
      expect(scene.videoUrl).toMatch(/\/v\d+\/.+\.v\d+\.mp4$/);
      expect(scene.thumbnailUrl).toMatch(/\/v\d+\/.+\.v\d+\.jpg$/);
    }
  });

  it("supports lookup, categories, and related scenes", () => {
    const scene = getSceneBySlug("unexpected-sermon");
    expect(scene?.id).toBe("scene_001");
    expect(getCategories()).toContain("Comedy");
    expect(getRelatedScenes(scene!, 4)).toHaveLength(4);
    expect(getRelatedScenes(scene!, 4).some(({ id }) => id === scene!.id)).toBe(false);
  });
});
