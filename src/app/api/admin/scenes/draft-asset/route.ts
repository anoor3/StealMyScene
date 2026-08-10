import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { readDraft } from "@/lib/admin/processor";
import { parseByteRange } from "@/lib/http/byte-range";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const parameters = new URL(request.url).searchParams;
  const draftId = parameters.get("draftId") ?? "";
  const asset = parameters.get("asset");
  let selectedSize: number | undefined;
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
    selectedSize = statSync(selected.path).size;
    const range = parseByteRange(request.headers.get("range"), selectedSize);
    const start = range?.start ?? 0;
    const end = range?.end ?? selectedSize - 1;
    const body = Readable.toWeb(createReadStream(selected.path, { start, end })) as ReadableStream<Uint8Array>;
    return new Response(body, {
      status: range ? 206 : 200,
      headers: {
        "accept-ranges": "bytes",
        "cache-control": "private, no-store",
        "content-length": String(end - start + 1),
        "content-type": selected.type,
        ...(range ? { "content-range": `bytes ${start}-${end}/${selectedSize}` } : {})
      }
    });
  } catch (error) {
    if (error instanceof RangeError) {
      return new Response(null, { status: 416, headers: { "content-range": `bytes */${selectedSize ?? 0}` } });
    }
    return NextResponse.json({ error: "Draft asset not found" }, { status: 404 });
  }
}
