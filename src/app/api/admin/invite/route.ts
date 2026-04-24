import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/adminAuth";
import { sql } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const sessionOrResponse = await requireOwner(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  await sql`
    INSERT INTO admin_invites (token, created_by, expires_at)
    VALUES (${token}, ${sessionOrResponse.userId}, ${expiresAt.toISOString()})
  `;

  const origin = req.nextUrl.origin;
  return NextResponse.json({ inviteUrl: `${origin}/admin/invite/${token}` });
}
