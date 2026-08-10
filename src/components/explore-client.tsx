"use client";

import { useMemo, useState } from "react";
import type { Scene } from "@/lib/scenes/schema";
import { SceneCard } from "./scene-card";

export function ExploreClient({ scenes, categories }: { scenes: Scene[]; categories: string[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const visibleScenes = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return scenes.filter((scene) => {
      const matchesCategory = category === "All" || scene.category === category;
      const haystack = `${scene.title} ${scene.quote} ${scene.category} ${scene.sourceTitle}`.toLocaleLowerCase();
      return matchesCategory && (!normalized || haystack.includes(normalized));
    });
  }, [category, query, scenes]);

  return (
    <>
      <div className="explore-controls">
        <label className="search-field">
          <span className="sr-only">Search scenes</span>
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Search a line, mood, or scene…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="category-tabs" role="group" aria-label="Filter by category">
          {["All", ...categories].map((item) => (
            <button
              key={item}
              className={category === item ? "is-active" : undefined}
              type="button"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <p className="results-count" aria-live="polite">
        {visibleScenes.length} {visibleScenes.length === 1 ? "scene" : "scenes"}
      </p>
      {visibleScenes.length > 0 ? (
        <div className="scene-grid scene-grid--wide">
          {visibleScenes.map((scene) => <SceneCard key={scene.id} scene={scene} />)}
        </div>
      ) : (
        <div className="empty-state">
          <span aria-hidden="true">◌</span>
          <h2>No scene found</h2>
          <p>Try a different word or clear the category filter.</p>
          <button type="button" className="button button--secondary" onClick={() => { setQuery(""); setCategory("All"); }}>
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}
