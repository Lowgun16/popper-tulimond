import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/adminAuth";
import { sql } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const sessionOrResponse = await requireOwner(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const { userId } = await params;
  const { role } = await req.json() as { role: "owner" | "editor" };

  if (!["owner", "editor"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  await sql`UPDATE admin_users SET role = ${role} WHERE id = ${userId}`;
  return NextResponse.json({ ok: true });
}
