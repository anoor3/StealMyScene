import "server-only";
import { closeSync, copyFileSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { sceneManifestSchema, sceneSchema, type SceneManifest } from "@/lib/scenes/schema";
import { type PublishSceneInput } from "./ingestion-schema";
import { readDraft } from "./processor";
import { publishFile, publishManifest, storageDriver } from "./storage";

const manifestPath = resolve(/* turbopackIgnore: true */ process.env.CATALOG_PATH || resolve(process.cwd(), "public", "data", "scenes.json"));
const publicAssetRoot = resolve(/* turbopackIgnore: true */ process.env.PUBLIC_ASSET_ROOT || resolve(process.cwd(), "public"));
const lockPath = resolve(process.env.VAR_ROOT || resolve(process.cwd(), "var"), "publish.lock");

export async function publishScene(input: PublishSceneInput) {
  const rebuildHook = process.env.REBUILD_HOOK_URL;
  if (process.env.NODE_ENV === "production" && !rebuildHook && process.env.ALLOW_NO_REBUILD_HOOK !== "true") {
    throw new Error("REBUILD_HOOK_URL must be configured before production publication");
  }
  const draft = readDraft(input.draftId);
  const outputDirectory = join(publicAssetRoot, "scenes", "v2");
  const videoKey = `scenes/v2/${input.slug}.v2.mp4`;
  const thumbnailKey = `scenes/v2/${input.slug}.v2.jpg`;
  mkdirSync(dirname(lockPath), { recursive: true });
  let lock: number | undefined;
  try {
    lock = openSync(lockPath, "wx");
  } catch {
    throw new Error("Another scene is being published. Retry in a moment.");
  }

  try {
    const current = sceneManifestSchema.parse(JSON.parse(readFileSync(/* turbopackIgnore: true */ manifestPath, "utf8")));
    if (current.scenes.some((scene) => scene.slug === input.slug)) throw new Error("That scene slug is already published");
    const videoUrl = await publishFile(draft.clipPath, videoKey, "video/mp4");
    const thumbnailUrl = await publishFile(draft.thumbnailPath, thumbnailKey, "image/jpeg");
    if (storageDriver() === "local") {
      mkdirSync(outputDirectory, { recursive: true });
      copyFileSync(draft.clipPath, join(outputDirectory, `${input.slug}.v2.mp4`));
      copyFileSync(draft.thumbnailPath, join(outputDirectory, `${input.slug}.v2.jpg`));
    }

    const now = new Date().toISOString();
    const scene = sceneSchema.parse({
      id: `scene_${input.draftId}`,
      slug: input.slug,
      title: input.title,
      quote: input.quote,
      sourceTitle: input.sourceTitle,
      sourceType: input.sourceType,
      category: input.category,
      videoUrl,
      thumbnailUrl,
      duration: draft.duration,
      transcript: input.transcript,
      wordTimings: input.wordTimings,
      dubCount: 0,
      viewCount: 0,
      rightsStatus: input.rightsStatus,
      rightsOwner: input.rightsOwner,
      rightsBasis: input.rightsBasis,
      published: true,
      createdAt: now,
      updatedAt: now
    });
    const next: SceneManifest = { version: current.version + 1, generatedAt: now, scenes: [...current.scenes, scene] };
    const temporaryManifest = `${manifestPath}.${randomUUID()}.tmp`;
    writeFileSync(temporaryManifest, `${JSON.stringify(next, null, 2)}\n`, { flag: "wx" });
    renameSync(temporaryManifest, manifestPath);
    await publishManifest(manifestPath);

    let rebuildWarning: string | undefined;
    if (rebuildHook) {
      try {
        const response = await fetch(rebuildHook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason: "scene-published", slug: scene.slug }) });
        if (!response.ok) rebuildWarning = `Catalog was published, but rebuild hook returned ${response.status}`;
      } catch (error) {
        rebuildWarning = `Catalog was published, but the rebuild hook failed: ${error instanceof Error ? error.message : "unknown error"}`;
      }
    }
    return { scene, manifestVersion: next.version, rebuildTriggered: Boolean(rebuildHook) && !rebuildWarning, rebuildWarning };
  } finally {
    if (lock !== undefined) closeSync(lock);
    try { unlinkSync(lockPath); } catch {}
  }
}
