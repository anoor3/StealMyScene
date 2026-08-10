"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { analytics } from "@/lib/analytics/client";

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    analytics.track("page_view", { path: pathname });
  }, [pathname]);

  useEffect(() => () => {
    void analytics.flush();
  }, []);

  return children;
}
