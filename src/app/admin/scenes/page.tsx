import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminSceneDesk } from "@/components/admin-scene-desk";
import { isAdminAuthenticated } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Scene ingestion", robots: { index: false, follow: false } };

export default async function AdminScenesPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  return <div className="admin-page shell"><AdminSceneDesk /></div>;
}
