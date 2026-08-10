import "server-only";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminSession } from "./session";

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifyAdminSession(cookieStore.get(ADMIN_COOKIE)?.value, process.env.ADMIN_SESSION_SECRET);
}

export async function requireAdmin(): Promise<Response | undefined> {
  if (await isAdminAuthenticated()) return undefined;
  return Response.json({ error: "Authentication required" }, { status: 401 });
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  const originUrl = new URL(origin);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "");
  return originUrl.host === host && originUrl.protocol === `${protocol}:`;
}
