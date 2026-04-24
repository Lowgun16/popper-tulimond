import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/adminAuth";
import { sql } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const sessionOrResponse = await requireOwner(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const { userId } = await params;
  // Prevent self-deletion
  if (userId === sessionOrResponse.userId) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  await sql`DELETE FROM admin_users WHERE id = ${userId}`;
  return NextResponse.json({ ok: true });
}
