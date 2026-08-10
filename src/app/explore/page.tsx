import type { Metadata } from "next";
import { ExploreClient } from "@/components/explore-client";
import { getCategories, getPublishedScenes } from "@/lib/scenes/catalog";

export const metadata: Metadata = { title: "Explore scenes" };

export default function ExplorePage() {
  return (
    <div className="page shell">
      <header className="page-heading">
        <span className="eyebrow">The scene library</span>
        <h1>Find your line.</h1>
        <p>Every prompt here is an original StealMyScene scene, cleared for you to perform and download.</p>
      </header>
      <ExploreClient scenes={getPublishedScenes()} categories={getCategories()} />
    </div>
  );
}
