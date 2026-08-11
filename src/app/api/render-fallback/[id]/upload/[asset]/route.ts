import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/admin/auth";
import { saveLocalFallbackAsset } from "@/lib/render-fallback/storage";
import { checkRateLimit, requestFingerprint } from "@/lib/security/rate-limit";
import { shareIdSchema } from "@/lib/shares/schema";

export const runtime = "nodejs";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; asset: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!(await checkRateLimit(`render-fallback-upload:${requestFingerprint(request)}`, 6, 10 * 60_000))) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const values = await params;
  const id = shareIdSchema.safeParse(values.id);
  if (!id.success || (values.asset !== "source" && values.asset !== "voice") || !request.body) return NextResponse.json({ error: "Invalid fallback upload" }, { status: 400 });
  try {
    await saveLocalFallbackAsset(id.data, new URL(request.url).searchParams.get("token") ?? "", values.asset, request.body, Number(request.headers.get("content-length")));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Fallback upload failed" }, { status: 400 });
  }
}
