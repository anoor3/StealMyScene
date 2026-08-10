import { NextResponse } from "next/server";
import { isSameOrigin, requireAdmin } from "@/lib/admin/auth";
import { publishSceneSchema } from "@/lib/admin/ingestion-schema";
import { publishScene } from "@/lib/admin/publisher";
import { checkRateLimit, requestFingerprint } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!checkRateLimit(`admin-publish:${requestFingerprint(request)}`, 10, 60_000)) return NextResponse.json({ error: "Too many publish requests" }, { status: 429 });
  const parsed = publishSceneSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Scene cannot be published until metadata, timings, and allowed rights are valid", issues: parsed.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json(await publishScene(parsed.data));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Publication failed" }, { status: 422 });
  }
}
