import { NextResponse } from "next/server";
import { analyticsBatchSchema } from "@/lib/analytics/events";
import { checkRateLimit, requestFingerprint } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const fingerprint = requestFingerprint(request);
  if (!checkRateLimit(`analytics:${fingerprint}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 32_000) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const parsed = analyticsBatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event batch" }, { status: 400 });
  }

  // Phase 1 intentionally avoids a live analytics database. Production log drains can
  // aggregate this structured, anonymous batch without blocking the response.
  console.info(JSON.stringify({ type: "analytics_batch", count: parsed.data.events.length, events: parsed.data.events }));
  return new NextResponse(null, { status: 202 });
}
