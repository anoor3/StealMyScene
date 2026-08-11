import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { enforceShareExpiry, readShareRecord, shareMediaUrl } from "@/lib/shares/storage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shared scene", robots: { index: false, follow: false } };

export default async function SharedScenePage({ params }: { params: Promise<{ id: string }> }) {
  let record;
  try {
    record = await enforceShareExpiry(await readShareRecord((await params).id));
  } catch {
    notFound();
  }

  if (record.status !== "ready" || !record.expiresAt) {
    return (
      <div className="empty-state empty-state--page shell">
        <span aria-hidden="true">⌛</span>
        <h1>{record.status === "rejected" ? "This link was not published." : "This temporary link is unavailable."}</h1>
        <p>{record.status === "expired" ? "It expired and the uploaded video was deleted." : "Create a fresh local dub whenever you are ready."}</p>
        <Link className="button" href="/create">Dub your own video</Link>
      </div>
    );
  }

  return (
    <div className="shared-scene page shell">
      <header className="page-heading">
        <span className="eyebrow">A temporary StealMyScene link</span>
        <h1>{record.title}</h1>
        <p>This user-created dub expires {new Date(record.expiresAt).toLocaleString()}.</p>
      </header>
      <video src={await shareMediaUrl(record)} controls playsInline preload="metadata" aria-label={`${record.title} shared dub`} />
      <div className="button-row"><Link className="button" href="/create">Make your own dub</Link><Link className="button button--secondary" href="/explore">Explore scenes</Link></div>
    </div>
  );
}
