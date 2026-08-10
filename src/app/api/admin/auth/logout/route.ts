import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/admin/auth";
import { ADMIN_COOKIE } from "@/lib/admin/session";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
}
