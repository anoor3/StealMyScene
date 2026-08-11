import "server-only";
import { getPublishedScenes } from "@/lib/scenes/catalog";
import { rankTrending, TRENDING_WINDOW_MS, type TrendingActivity, type TrendingSnapshot } from "@/lib/scenes/trending";
import type { AnalyticsEventName } from "./events";
import { readAnalyticsBatches, writeTrendingSnapshot } from "./storage";

const rankingEvents = new Set<AnalyticsEventName>(["scene_open", "record_start", "render_finish", "share"]);

export async function aggregateTrending(now = Date.now()): Promise<TrendingSnapshot> {
  const scenes = getPublishedScenes();
  const idBySlug = new Map(scenes.map((scene) => [scene.slug, scene.id]));
  const batches = await readAnalyticsBatches(now - TRENDING_WINDOW_MS);
  const activity: TrendingActivity[] = batches.flatMap((batch) => batch.events.flatMap((event) => {
    if (!rankingEvents.has(event.name)) return [];
    const sceneId = typeof event.properties.sceneId === "string"
      ? event.properties.sceneId
      : typeof event.properties.sceneSlug === "string" ? idBySlug.get(event.properties.sceneSlug) : undefined;
    return sceneId ? [{ sceneId, name: event.name as TrendingActivity["name"], timestamp: event.timestamp }] : [];
  }));
  const snapshot: TrendingSnapshot = {
    version: 1,
    generatedAt: new Date(now).toISOString(),
    windowHours: TRENDING_WINDOW_MS / (60 * 60 * 1_000),
    entries: rankTrending(scenes.map((scene) => scene.id), activity, now)
  };
  await writeTrendingSnapshot(snapshot);
  return snapshot;
}
