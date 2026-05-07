import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { DropRow } from "@/lib/storeState";

export async function GET() {
  try {
    const rows = await sql`
      SELECT * FROM initiation_drops
      ORDER BY drop_month DESC
      LIMIT 1
    `;
    if (rows.length === 0) return NextResponse.json({ drop: null });
    return NextResponse.json({ drop: rows[0] as DropRow });
  } catch (err) {
    console.error("[active-drop]", err);
    return NextResponse.json({ drop: null });
  }
}
