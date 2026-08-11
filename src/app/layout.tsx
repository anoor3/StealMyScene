import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { BrandLogo } from "@/components/brand-logo";
import { Navigation } from "@/components/navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "StealMyScene — Your voice. Their scene.",
    template: "%s — StealMyScene"
  },
  description: "Pick a short original scene, perform the timed line, and download your dub in under a minute.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <AnalyticsProvider>
          <Navigation />
          <main id="main-content">{children}</main>
        </AnalyticsProvider>
        <footer className="site-footer">
          <Link className="brand brand--small" href="/" aria-label="StealMyScene home">
            <BrandLogo size="small" />
          </Link>
          <p>Original scenes. Your performance. Nothing uploaded unless you choose it.</p>
          <nav aria-label="Footer navigation">
            <Link href="/explore">Explore</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/admin/scenes" prefetch={false}>Admin</Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
