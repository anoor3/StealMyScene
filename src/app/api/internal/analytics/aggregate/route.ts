import { NextResponse } from "next/server";
import { aggregateTrending } from "@/lib/analytics/aggregate";
import { secureEqual } from "@/lib/admin/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.ANALYTICS_AGGREGATION_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !secureEqual(supplied, secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const snapshot = await aggregateTrending();
  return NextResponse.json({ generatedAt: snapshot.generatedAt, rankedScenes: snapshot.entries.length });
}
