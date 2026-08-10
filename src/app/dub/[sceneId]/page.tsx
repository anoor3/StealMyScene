import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DubStudio } from "@/components/dub-studio";
import { getPublishedScenes, getSceneById } from "@/lib/scenes/catalog";

type DubPageProps = { params: Promise<{ sceneId: string }> };

export function generateStaticParams() {
  return getPublishedScenes().map(({ id }) => ({ sceneId: id }));
}

export async function generateMetadata({ params }: DubPageProps): Promise<Metadata> {
  const scene = getSceneById((await params).sceneId);
  return { title: scene ? `Dub ${scene.title}` : "Scene not found", robots: { index: false, follow: false } };
}

export default async function DubPage({ params }: DubPageProps) {
  const scene = getSceneById((await params).sceneId);
  if (!scene) notFound();
  return <DubStudio scene={scene} />;
}
