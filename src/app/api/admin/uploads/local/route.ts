import { NextResponse } from "next/server";
import { isSameOrigin, requireAdmin } from "@/lib/admin/auth";
import { saveAndInspectLocalUpload } from "@/lib/admin/local-upload";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const key = new URL(request.url).searchParams.get("key") ?? "";
  const bytes = Number(request.headers.get("content-length"));
  if (!request.body) return NextResponse.json({ error: "Upload body is required" }, { status: 400 });
  try {
    return NextResponse.json(await saveAndInspectLocalUpload(key, request.body, bytes));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload validation failed" }, { status: 400 });
  }
}
