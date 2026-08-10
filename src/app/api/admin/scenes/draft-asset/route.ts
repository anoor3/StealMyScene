import { readFileSync } from "node:fs";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { readDraft } from "@/lib/admin/processor";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const parameters = new URL(request.url).searchParams;
  const draftId = parameters.get("draftId") ?? "";
  const asset = parameters.get("asset");
  try {
    const draft = readDraft(draftId);
    const selected = asset === "clip"
      ? { path: draft.clipPath, type: "video/mp4" }
      : asset === "thumbnail"
        ? { path: draft.thumbnailPath, type: "image/jpeg" }
        : asset === "audio"
          ? { path: draft.audioPath, type: "audio/wav" }
          : undefined;
    if (!selected) return NextResponse.json({ error: "Unknown draft asset" }, { status: 400 });
    return new Response(readFileSync(selected.path), { headers: { "content-type": selected.type, "cache-control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Draft asset not found" }, { status: 404 });
  }
}
