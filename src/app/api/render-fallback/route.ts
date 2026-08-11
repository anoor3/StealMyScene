import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/admin/auth";
import { createFallbackSchema, FALLBACK_TTL_MS, type FallbackRecord } from "@/lib/render-fallback/schema";
import { createFallbackUploads } from "@/lib/render-fallback/storage";
import { checkRateLimit, requestFingerprint } from "@/lib/security/rate-limit";
import { createShareIdentity } from "@/lib/shares/security";

export const runtime = "nodejs";

function extension(type: string) {
  if (type === "video/webm" || type.includes("webm")) return "webm";
  if (type === "video/quicktime") return "mov";
  return type.includes("mp4") ? "mp4" : "audio";
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!(await checkRateLimit(`render-fallback-create:${requestFingerprint(request)}`, 3, 10 * 60_000))) return NextResponse.json({ error: "Too many fallback renders" }, { status: 429 });
  const input = createFallbackSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Invalid fallback media" }, { status: 400 });
  try {
    const identity = createShareIdentity();
    const now = Date.now();
    const record: FallbackRecord = {
      version: 1, id: identity.id, tokenHash: identity.tokenHash, status: "pending", ...input.data,
      sourceKey: `render-fallback/${identity.id}/source.${extension(input.data.sourceType)}`,
      voiceKey: `render-fallback/${identity.id}/voice.${extension(input.data.voiceType)}`,
      createdAt: new Date(now).toISOString(), expiresAt: new Date(now + FALLBACK_TTL_MS).toISOString()
    };
    return NextResponse.json({ id: record.id, token: identity.token, uploads: await createFallbackUploads(record, identity.token) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Fallback could not start" }, { status: 503 });
  }
}
