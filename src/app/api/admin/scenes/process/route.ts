import { NextResponse } from "next/server";
import { isSameOrigin, requireAdmin } from "@/lib/admin/auth";
import { processSceneSchema } from "@/lib/admin/ingestion-schema";
import { processScene } from "@/lib/admin/processor";
import { checkRateLimit, requestFingerprint } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 600;

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!(await checkRateLimit(`admin-process:${requestFingerprint(request)}`, 10, 60_000))) return NextResponse.json({ error: "Too many processing requests" }, { status: 429 });
  const parsed = processSceneSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid trim selection", issues: parsed.error.flatten() }, { status: 400 });
  try {
    const draft = await processScene(parsed.data);
    return NextResponse.json({
      draftId: draft.draftId,
      duration: draft.duration,
      transcript: draft.transcript,
      wordTimings: draft.wordTimings,
      transcriptionEngine: draft.engine,
      clipUrl: `/api/admin/scenes/draft-asset?draftId=${draft.draftId}&asset=clip`,
      thumbnailUrl: `/api/admin/scenes/draft-asset?draftId=${draft.draftId}&asset=thumbnail`,
      audioUrl: `/api/admin/scenes/draft-asset?draftId=${draft.draftId}&asset=audio`
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Scene processing failed" }, { status: 422 });
  }
}
