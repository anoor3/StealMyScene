import { NextResponse } from "next/server";
import { isSameOrigin, requireAdmin } from "@/lib/admin/auth";
import { createUploadTarget } from "@/lib/admin/storage";
import { presignUploadSchema } from "@/lib/admin/upload-schema";
import { checkRateLimit, requestFingerprint } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!(await checkRateLimit(`admin-presign:${requestFingerprint(request)}`, 30, 60_000))) return NextResponse.json({ error: "Too many upload requests" }, { status: 429 });
  const parsed = presignUploadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid video metadata", issues: parsed.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json(await createUploadTarget(parsed.data));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create upload" }, { status: 503 });
  }
}
