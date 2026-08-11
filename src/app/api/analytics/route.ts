import { NextResponse } from "next/server";
import { analyticsBatchSchema } from "@/lib/analytics/events";
import { checkRateLimit, requestFingerprint } from "@/lib/security/rate-limit";
import { writeAnalyticsBatch } from "@/lib/analytics/storage";

export async function POST(request: Request) {
  const fingerprint = requestFingerprint(request);
  if (!(await checkRateLimit(`analytics:${fingerprint}`, 20, 60_000))) {
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

  try {
    await writeAnalyticsBatch(parsed.data);
    return new NextResponse(null, { status: 202 });
  } catch (error) {
    if (error instanceof Error && (error.name === "PreconditionFailed" || error.message.includes("exist"))) return new NextResponse(null, { status: 202 });
    return NextResponse.json({ error: "Analytics storage is unavailable" }, { status: 503 });
  }
}
