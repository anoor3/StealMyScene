import manifestJson from "../../../public/data/scenes.json";
import { sceneManifestSchema, type Scene } from "./schema";

const manifest = sceneManifestSchema.parse(manifestJson);

export function getPublishedScenes(): Scene[] {
  return manifest.scenes.filter(
    (scene) => scene.published && (scene.rightsStatus === "cleared" || scene.rightsStatus === "licensed")
  );
}

export function getSceneBySlug(slug: string): Scene | undefined {
  return getPublishedScenes().find((scene) => scene.slug === slug);
}

export function getSceneById(id: string): Scene | undefined {
  return getPublishedScenes().find((scene) => scene.id === id);
}

export function getCategories(): string[] {
  return [...new Set(getPublishedScenes().map((scene) => scene.category))].sort();
}

export function getRelatedScenes(scene: Scene, limit = 4): Scene[] {
  return getPublishedScenes()
    .filter((candidate) => candidate.id !== scene.id)
    .sort((a, b) => Number(b.category === scene.category) - Number(a.category === scene.category))
    .slice(0, limit);
}
