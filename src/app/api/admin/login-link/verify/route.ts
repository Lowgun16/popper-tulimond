import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import crypto from "crypto";
import { signSession } from "@/lib/session";
import { buildSessionCookieHeader } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/admin/login?error=invalid", req.nextUrl.origin));

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const rows = await sql`
    SELECT ll.id, ll.user_id, au.role
    FROM admin_login_links ll
    JOIN admin_users au ON au.id = ll.user_id
    WHERE ll.token_hash = ${tokenHash}
      AND ll.used = false
      AND ll.expires_at > now()
      AND au.active = true
  `;

  if (rows.length === 0) {
    return NextResponse.redirect(new URL("/admin/login?error=expired", req.nextUrl.origin));
  }

  await sql`UPDATE admin_login_links SET used = true WHERE id = ${rows[0].id}`;

  const sessionToken = await signSession({ userId: rows[0].user_id, role: rows[0].role });
  const response = NextResponse.redirect(new URL("/", req.nextUrl.origin));
  response.headers.set("Set-Cookie", buildSessionCookieHeader(sessionToken));
  return response;
}
