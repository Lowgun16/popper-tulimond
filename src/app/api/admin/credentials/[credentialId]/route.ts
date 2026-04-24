import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/adminAuth";
import { sql } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ credentialId: string }> }
) {
  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const { credentialId } = await params;

  // Owners can revoke any credential; editors can only revoke their own
  if (sessionOrResponse.role === "owner") {
    await sql`DELETE FROM webauthn_credentials WHERE id = ${credentialId}`;
  } else {
    await sql`
      DELETE FROM webauthn_credentials
      WHERE id = ${credentialId} AND user_id = ${sessionOrResponse.userId}
    `;
  }

  return NextResponse.json({ ok: true });
}
