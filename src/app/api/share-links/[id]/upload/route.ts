import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/admin/auth";
import { shareIdSchema } from "@/lib/shares/schema";
import { saveLocalShareUpload } from "@/lib/shares/storage";

export const runtime = "nodejs";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!request.body) return NextResponse.json({ error: "Upload body is required" }, { status: 400 });
  const id = shareIdSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: "Unknown temporary link" }, { status: 404 });
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const bytes = Number(request.headers.get("content-length"));
  try {
    await saveLocalShareUpload(id.data, token, request.body, bytes);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}
