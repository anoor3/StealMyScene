"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";

const links = [
  ["Explore", "/explore"],
  ["Trending", "/trending"],
  ["How it works", "/how-it-works"]
] as const;

export function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isHome = pathname === "/";

  return (
    <header className={isHome ? "site-header site-header--home" : "site-header"}>
      <Link className="brand" href="/" aria-label="StealMyScene home" onClick={() => setOpen(false)}>
        <BrandLogo priority />
      </Link>
      <button
        className="menu-button"
        type="button"
        aria-expanded={open}
        aria-controls="primary-navigation"
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">{open ? "×" : "☰"}</span>
        <span className="sr-only">{open ? "Close navigation" : "Open navigation"}</span>
      </button>
      <nav id="primary-navigation" className={open ? "primary-nav is-open" : "primary-nav"} aria-label="Primary navigation">
        {links.map(([label, href]) => (
          <Link
            key={href}
            className={pathname === href ? "is-active" : undefined}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            {label}
          </Link>
        ))}
      </nav>
      <Link className="button button--compact header-cta" href="/explore">
        {isHome ? "Try it now" : "Start dubbing"} <span aria-hidden="true">ϟ</span>
      </Link>
    </header>
  );
}
