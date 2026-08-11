import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/admin/auth";
import { processFallback } from "@/lib/render-fallback/processor";
import { finalizeFallbackSchema } from "@/lib/render-fallback/schema";
import { checkRateLimit, requestFingerprint } from "@/lib/security/rate-limit";
import { shareIdSchema } from "@/lib/shares/schema";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!(await checkRateLimit(`render-fallback-finalize:${requestFingerprint(request)}`, 3, 10 * 60_000))) return NextResponse.json({ error: "Too many fallback renders" }, { status: 429 });
  const id = shareIdSchema.safeParse((await params).id);
  const input = finalizeFallbackSchema.safeParse(await request.json().catch(() => null));
  if (!id.success || !input.success) return NextResponse.json({ error: "Invalid fallback request" }, { status: 400 });
  try {
    const output = await processFallback(id.data, input.data.token);
    return new Response(new Uint8Array(output), { status: 200, headers: { "content-type": "video/mp4", "content-length": String(output.byteLength), "cache-control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Fallback render failed" }, { status: 422 });
  }
}
