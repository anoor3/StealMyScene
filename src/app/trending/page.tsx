import type { Metadata } from "next";
import { TrendingGrid } from "@/components/trending-grid";
import { getPublishedScenes } from "@/lib/scenes/catalog";

export const metadata: Metadata = { title: "Trending scenes" };

export default function TrendingPage() {
  const scenes = getPublishedScenes();
  return (
    <div className="page shell">
      <header className="page-heading">
        <span className="eyebrow">Volume one</span>
        <h1>Trending now.</h1>
        <p>Ranked from recent dubs, shares, views, completion, and velocity. New activity is weighted more heavily.</p>
      </header>
      <TrendingGrid scenes={scenes} />
    </div>
  );
}
