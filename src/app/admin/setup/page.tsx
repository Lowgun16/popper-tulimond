import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import AdminSetupClient from "./AdminSetupClient";

export default async function SetupPage() {
  // If any admin exists, this route is gone
  const existing = await sql`SELECT id FROM admin_users LIMIT 1`;
  if (existing.length > 0) {
    redirect("/");
  }
  return <AdminSetupClient />;
}
