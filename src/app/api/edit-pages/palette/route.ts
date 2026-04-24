import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/adminAuth";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const rows = await sql`SELECT id, hex, label FROM brand_palette ORDER BY created_at ASC`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const { hex, label } = await req.json() as { hex: string; label?: string };

  // Validate hex format
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    return NextResponse.json({ error: "Invalid hex color" }, { status: 400 });
  }

  const [row] = await sql`
    INSERT INTO brand_palette (hex, label, created_by)
    VALUES (${hex}, ${label ?? null}, ${sessionOrResponse.userId})
    RETURNING id, hex, label
  `;

  return NextResponse.json(row);
}
