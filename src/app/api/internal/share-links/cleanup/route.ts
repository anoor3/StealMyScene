import { NextResponse } from "next/server";
import { cleanupExpiredShares } from "@/lib/shares/storage";
import { secretMatches } from "@/lib/shares/security";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!secretMatches(token, process.env.SHARE_CLEANUP_SECRET)) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  return NextResponse.json(await cleanupExpiredShares());
}
