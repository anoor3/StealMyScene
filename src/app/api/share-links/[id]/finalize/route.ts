import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/admin/auth";
import { checkRateLimit, requestFingerprint } from "@/lib/security/rate-limit";
import { processTemporaryShare } from "@/lib/shares/processor";
import { finalizeShareSchema, shareIdSchema } from "@/lib/shares/schema";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!(await checkRateLimit(`share-finalize:${requestFingerprint(request)}`, 10, 10 * 60_000))) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const id = shareIdSchema.safeParse((await params).id);
  const body = finalizeShareSchema.safeParse(await request.json().catch(() => null));
  if (!id.success || !body.success) return NextResponse.json({ error: "Invalid finalization request" }, { status: 400 });
  try {
    const result = await processTemporaryShare(id.data, body.data.token, body.data.transcriptHint);
    return NextResponse.json(result, { status: result.status === "ready" ? 201 : result.status === "rejected" ? 422 : 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Temporary link processing failed" }, { status: 422 });
  }
}
