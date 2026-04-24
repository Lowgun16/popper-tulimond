import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const rows = await sql`
    SELECT id FROM admin_invites
    WHERE token = ${token} AND used = false AND expires_at > now()
  `;
  if (rows.length === 0) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }
  return NextResponse.json({ valid: true });
}
