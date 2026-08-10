import { NextResponse } from "next/server";
import { isSameOrigin, requireAdmin } from "@/lib/admin/auth";
import { completeMultipartUpload } from "@/lib/admin/storage";
import { completeUploadSchema } from "@/lib/admin/upload-schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const parsed = completeUploadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid multipart completion" }, { status: 400 });
  try {
    return NextResponse.json(await completeMultipartUpload(parsed.data));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not complete upload" }, { status: 503 });
  }
}
