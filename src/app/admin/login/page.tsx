import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLogin } from "@/components/admin-login";
import { isAdminAuthenticated } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Admin login", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) redirect("/admin/scenes");
  return <div className="admin-page shell"><AdminLogin /></div>;
}
