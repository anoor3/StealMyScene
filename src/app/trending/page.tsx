import type { Metadata } from "next";
import { SceneCard } from "@/components/scene-card";
import { getPublishedScenes } from "@/lib/scenes/catalog";

export const metadata: Metadata = { title: "Trending scenes" };

export default function TrendingPage() {
  const scenes = getPublishedScenes().slice(0, 12);
  return (
    <div className="page shell">
      <header className="page-heading">
        <span className="eyebrow">Volume one</span>
        <h1>Trending now.</h1>
        <p>Phase 1 starts with an editorial order. Anonymous, batched activity will power the live ranking in Phase 2.</p>
      </header>
      <div className="scene-grid scene-grid--wide">
        {scenes.map((scene) => <SceneCard key={scene.id} scene={scene} />)}
      </div>
    </div>
  );
}
