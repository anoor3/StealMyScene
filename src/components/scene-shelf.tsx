import Link from "next/link";
import type { Scene } from "@/lib/scenes/schema";
import { SceneCard } from "./scene-card";

export function SceneShelf({
  eyebrow,
  title,
  scenes,
  viewAllHref = "/explore"
}: {
  eyebrow: string;
  title: string;
  scenes: Scene[];
  viewAllHref?: string;
}) {
  return (
    <section className="section shell" aria-labelledby={`shelf-${title.replaceAll(" ", "-").toLowerCase()}`}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2 id={`shelf-${title.replaceAll(" ", "-").toLowerCase()}`}>{title}</h2>
        </div>
        <Link className="text-link" href={viewAllHref}>View all <span aria-hidden="true">→</span></Link>
      </div>
      <div className="scene-grid">
        {scenes.map((scene, index) => <SceneCard key={scene.id} scene={scene} priority={index < 2} />)}
      </div>
    </section>
  );
}
