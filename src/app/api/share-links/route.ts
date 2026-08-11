import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/admin/auth";
import { checkRateLimit, requestFingerprint } from "@/lib/security/rate-limit";
import { createShareSchema, SHARE_UPLOAD_TTL_MS, type ShareRecord } from "@/lib/shares/schema";
import { createShareIdentity } from "@/lib/shares/security";
import { createShareUpload } from "@/lib/shares/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!(await checkRateLimit(`share-create:${requestFingerprint(request)}`, 5, 10 * 60_000))) {
    return NextResponse.json({ error: "Too many temporary links. Try again later." }, { status: 429 });
  }
  const parsed = createShareSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid temporary-link file" }, { status: 400 });
  try {
    const identity = createShareIdentity();
    const now = Date.now();
    const record: ShareRecord = {
      version: 1,
      id: identity.id,
      status: "pending_upload",
      tokenHash: identity.tokenHash,
      title: parsed.data.title,
      fileName: parsed.data.fileName,
      contentType: parsed.data.contentType,
      bytes: parsed.data.size,
      mediaKey: `shares/${identity.id}/output.mp4`,
      createdAt: new Date(now).toISOString(),
      uploadExpiresAt: new Date(now + SHARE_UPLOAD_TTL_MS).toISOString(),
      moderation: "pending"
    };
    const target = await createShareUpload(record, identity.token);
    return NextResponse.json({ id: record.id, token: identity.token, ...target }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create temporary link" }, { status: 503 });
  }
}
