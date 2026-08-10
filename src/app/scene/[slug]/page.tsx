import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SceneShelf } from "@/components/scene-shelf";
import { getPublishedScenes, getRelatedScenes, getSceneBySlug } from "@/lib/scenes/catalog";

type ScenePageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getPublishedScenes().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: ScenePageProps): Promise<Metadata> {
  const scene = getSceneBySlug((await params).slug);
  if (!scene) return { title: "Scene not found" };
  return { title: scene.title, description: `Perform “${scene.quote}” in ${scene.title}.` };
}

export default async function ScenePage({ params }: ScenePageProps) {
  const scene = getSceneBySlug((await params).slug);
  if (!scene) notFound();

  return (
    <>
      <div className="scene-detail shell">
        <div className="scene-detail__video">
          <video src={scene.videoUrl} poster={scene.thumbnailUrl} controls playsInline preload="metadata">
            Your browser does not support HTML video.
          </video>
        </div>
        <div className="scene-detail__copy">
          <span className="eyebrow">{scene.category} · {scene.duration.toFixed(1)} seconds</span>
          <h1>{scene.title}</h1>
          <blockquote>“{scene.quote}”</blockquote>
          <p>{scene.sourceTitle}</p>
          <Link className="button button--large" href={`/dub/${scene.id}`}>
            <span aria-hidden="true">●</span> Add your voice
          </Link>
          <ul className="trust-list">
            <li><span aria-hidden="true">✓</span> No account required</li>
            <li><span aria-hidden="true">✓</span> Recording stays on your device</li>
            <li><span aria-hidden="true">✓</span> Unlimited retakes</li>
          </ul>
        </div>
      </div>
      <SceneShelf eyebrow="Keep performing" title="Related scenes" scenes={getRelatedScenes(scene)} />
    </>
  );
}
