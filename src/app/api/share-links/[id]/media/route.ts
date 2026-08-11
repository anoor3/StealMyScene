import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { parseByteRange } from "@/lib/http/byte-range";
import { shareIdSchema } from "@/lib/shares/schema";
import { enforceShareExpiry, localShareMediaPath, readShareRecord, shareMediaUrl, shareStorageDriver } from "@/lib/shares/storage";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = shareIdSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: "Temporary link not found" }, { status: 404 });
  let total = 0;
  try {
    const record = await enforceShareExpiry(await readShareRecord(id.data));
    if (record.status !== "ready") return NextResponse.json({ error: "Temporary link is unavailable" }, { status: 410 });
    if (shareStorageDriver() === "s3") return NextResponse.redirect(await shareMediaUrl(record), 307);
    const path = localShareMediaPath(record.id);
    total = statSync(path).size;
    const range = parseByteRange(request.headers.get("range"), total);
    const start = range?.start ?? 0;
    const end = range?.end ?? total - 1;
    const body = Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream<Uint8Array>;
    return new Response(body, {
      status: range ? 206 : 200,
      headers: {
        "accept-ranges": "bytes",
        "cache-control": "public, max-age=300",
        "content-length": String(end - start + 1),
        "content-type": "video/mp4",
        ...(range ? { "content-range": `bytes ${start}-${end}/${total}` } : {})
      }
    });
  } catch (error) {
    if (error instanceof RangeError) return new Response(null, { status: 416, headers: { "content-range": `bytes */${total}` } });
    return NextResponse.json({ error: "Temporary link not found" }, { status: 404 });
  }
}
