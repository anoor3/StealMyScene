import { NextResponse } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/admin/auth";
import { ADMIN_COOKIE, createAdminSession, secureEqual } from "@/lib/admin/session";
import { checkRateLimit, requestFingerprint } from "@/lib/security/rate-limit";

const loginSchema = z.object({ password: z.string().min(1).max(500) });

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const fingerprint = requestFingerprint(request);
  if (!checkRateLimit(`admin-login:${fingerprint}`, 5, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429 });
  }

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Password is required" }, { status: 400 });
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!configuredPassword || !sessionSecret || sessionSecret.length < 32) {
    return NextResponse.json({ error: "Admin authentication is not configured" }, { status: 503 });
  }
  if (!secureEqual(parsed.data.password, configuredPassword)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, createAdminSession(sessionSecret), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60
  });
  return response;
}
