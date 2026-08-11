"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { analytics } from "@/lib/analytics/client";

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    analytics.start();
    analytics.track("page_view", { path: pathname });
    const sceneSlug = pathname.match(/^\/scene\/([^/]+)$/)?.[1];
    if (sceneSlug) analytics.track("scene_open", { sceneSlug: decodeURIComponent(sceneSlug) });
  }, [pathname]);

  useEffect(() => () => {
    void analytics.flush();
  }, []);

  return children;
}
