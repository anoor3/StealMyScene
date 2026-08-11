"use client";

import { useEffect, useState } from "react";
import { SceneCard } from "@/components/scene-card";
import type { Scene } from "@/lib/scenes/schema";

export function TrendingGrid({ scenes }: { scenes: Scene[] }) {
  const [ranked, setRanked] = useState(scenes.slice(0, 24));
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/trending", { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{ sceneIds: string[] }> : Promise.reject())
      .then(({ sceneIds }) => {
        const byId = new Map(scenes.map((scene) => [scene.id, scene]));
        const ordered = sceneIds.flatMap((id) => byId.get(id) ? [byId.get(id)!] : []);
        if (ordered.length) setRanked(ordered);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [scenes]);
  return <div className="scene-grid scene-grid--wide">{ranked.map((scene) => <SceneCard key={scene.id} scene={scene} />)}</div>;
}
