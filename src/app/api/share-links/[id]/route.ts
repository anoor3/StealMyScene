import { NextResponse } from "next/server";
import { checkRateLimit, requestFingerprint } from "@/lib/security/rate-limit";
import { publicShareStatus, shareIdSchema } from "@/lib/shares/schema";
import { enforceShareExpiry, readShareRecord } from "@/lib/shares/storage";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkRateLimit(`share-status:${requestFingerprint(request)}`, 120, 60_000))) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const id = shareIdSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: "Temporary link not found" }, { status: 404 });
  try {
    return NextResponse.json(publicShareStatus(await enforceShareExpiry(await readShareRecord(id.data))), { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Temporary link not found" }, { status: 404 });
  }
}
