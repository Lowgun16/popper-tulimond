import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const rows = await sql`
    SELECT ar.id, ar.code_hash, au.email, au.name
    FROM admin_recovery ar
    JOIN admin_users au ON au.id = ar.user_id
    WHERE ar.used = false
    ORDER BY ar.created_at DESC
    LIMIT 1
  `;

  if (rows.length === 0) return NextResponse.json({ error: "No valid recovery code found" }, { status: 400 });

  const valid = await bcrypt.compare(code, rows[0].code_hash);
  if (!valid) return NextResponse.json({ error: "Invalid recovery code" }, { status: 401 });

  // Mark as used
  await sql`UPDATE admin_recovery SET used = true WHERE id = ${rows[0].id}`;

  return NextResponse.json({ email: rows[0].email, name: rows[0].name });
}
