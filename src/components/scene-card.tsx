import Image from "next/image";
import Link from "next/link";
import type { Scene } from "@/lib/scenes/schema";

export function SceneCard({ scene, priority = false }: { scene: Scene; priority?: boolean }) {
  return (
    <article className="scene-card">
      <Link href={`/scene/${scene.slug}`} aria-label={`Open ${scene.title}`}>
        <div className="scene-card__media">
          <Image
            src={scene.thumbnailUrl}
            alt=""
            fill
            priority={priority}
            sizes="(max-width: 720px) 92vw, (max-width: 1100px) 45vw, 320px"
          />
          <span className="scene-card__play" aria-hidden="true">▶</span>
          <span className="scene-card__duration">{scene.duration.toFixed(1)}s</span>
        </div>
        <div className="scene-card__content">
          <span className="eyebrow">{scene.category}</span>
          <h3>{scene.title}</h3>
          <p>“{scene.quote}”</p>
        </div>
      </Link>
    </article>
  );
}
