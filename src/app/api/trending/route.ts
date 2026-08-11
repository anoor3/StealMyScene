import { NextResponse } from "next/server";
import { getPublishedScenes } from "@/lib/scenes/catalog";
import { readTrendingSnapshot } from "@/lib/analytics/storage";
import { applyTrendingSnapshot } from "@/lib/scenes/trending";
import { checkRateLimit, requestFingerprint } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await checkRateLimit(`trending:${requestFingerprint(request)}`, 120, 60_000))) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const scenes = applyTrendingSnapshot(getPublishedScenes(), await readTrendingSnapshot()).slice(0, 24);
  return NextResponse.json({ sceneIds: scenes.map((scene) => scene.id) }, {
    headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=3600" }
  });
}
