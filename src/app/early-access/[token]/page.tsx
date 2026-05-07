import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";

export default async function EarlyAccessPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const rows = await sql`
    SELECT eat.id, eat.drop_id
    FROM early_access_tokens eat
    JOIN initiation_drops id ON id.id = eat.drop_id
    WHERE eat.token = ${token}
    ORDER BY id.drop_month DESC
    LIMIT 1
  `;

  if (rows.length === 0) {
    redirect("/");
  }

  // Set the early_access_session cookie (value = the token, HttpOnly)
  const cookieStore = await cookies();
  cookieStore.set("early_access_session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4, // 4 hours
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/");
}
