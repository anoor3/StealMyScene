import { z } from "zod";
import type { Scene } from "./schema";

export const TRENDING_WINDOW_MS = 7 * 24 * 60 * 60 * 1_000;
const RECENCY_HALF_LIFE_MS = 48 * 60 * 60 * 1_000;
const VELOCITY_WINDOW_MS = 12 * 60 * 60 * 1_000;

export const trendingActivitySchema = z.object({
  sceneId: z.string().min(1),
  name: z.enum(["scene_open", "record_start", "render_finish", "share"]),
  timestamp: z.number().int().positive()
});

export const trendingEntrySchema = z.object({
  sceneId: z.string().min(1),
  score: z.number().finite().nonnegative(),
  views: z.number().int().nonnegative(),
  dubs: z.number().int().nonnegative(),
  shares: z.number().int().nonnegative(),
  completionRate: z.number().min(0).max(1),
  velocity: z.number().min(-1).max(1)
});

export const trendingSnapshotSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string().datetime(),
  windowHours: z.number().positive(),
  entries: z.array(trendingEntrySchema)
});

export type TrendingActivity = z.infer<typeof trendingActivitySchema>;
export type TrendingEntry = z.infer<typeof trendingEntrySchema>;
export type TrendingSnapshot = z.infer<typeof trendingSnapshotSchema>;

function round(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

export function rankTrending(sceneIds: string[], activity: TrendingActivity[], now = Date.now()): TrendingEntry[] {
  const cutoff = now - TRENDING_WINDOW_MS;
  return sceneIds.map((sceneId) => {
    const events = activity.filter((event) => event.sceneId === sceneId && event.timestamp >= cutoff && event.timestamp <= now);
    const count = (name: TrendingActivity["name"]) => events.filter((event) => event.name === name).length;
    const views = count("scene_open");
    const starts = count("record_start");
    const dubs = count("render_finish");
    const shares = count("share");
    const completionRate = starts === 0 ? 0 : Math.min(1, dubs / starts);
    const weighted = events.reduce((total, event) => {
      const recency = 2 ** (-(now - event.timestamp) / RECENCY_HALF_LIFE_MS);
      const value = event.name === "share" ? 5 : event.name === "render_finish" ? 4 : event.name === "scene_open" ? 0.25 : 0;
      return total + recency * value;
    }, 0);
    const current = events.filter((event) => event.timestamp >= now - VELOCITY_WINDOW_MS).length;
    const previous = events.filter((event) => event.timestamp < now - VELOCITY_WINDOW_MS && event.timestamp >= now - 2 * VELOCITY_WINDOW_MS).length;
    const velocity = (current - previous) / Math.max(1, current + previous);
    const score = Math.max(0, weighted + completionRate * 3 + velocity * 2);
    return { sceneId, score: round(score), views, dubs, shares, completionRate: round(completionRate), velocity: round(velocity) };
  }).sort((a, b) => b.score - a.score || b.shares - a.shares || b.dubs - a.dubs || a.sceneId.localeCompare(b.sceneId));
}

export function applyTrendingSnapshot(scenes: Scene[], snapshot: TrendingSnapshot | undefined): Scene[] {
  if (!snapshot) return scenes;
  const byId = new Map(scenes.map((scene) => [scene.id, scene]));
  const ranked = snapshot.entries.flatMap((entry) => {
    const scene = byId.get(entry.sceneId);
    if (!scene) return [];
    byId.delete(entry.sceneId);
    return [scene];
  });
  return [...ranked, ...scenes.filter((scene) => byId.has(scene.id))];
}
