// src/app/api/seed-content/route.ts
// Idempotent seeding endpoint. Seeds page_content from staticContent.ts.
// Safe to call multiple times — uses ON CONFLICT DO NOTHING.
// Protected by SEED_SECRET header to prevent unauthorized DB load.
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { buildSeedRows } from "@/lib/seedContent";

export async function POST(req: NextRequest) {
  const secret = process.env.SEED_SECRET;
  if (secret) {
    const provided = req.headers.get("x-seed-secret");
    if (provided !== secret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const rows = buildSeedRows();
    let seeded = 0;

    for (const row of rows) {
      const result = await sql`
        INSERT INTO page_content (page_slug, field_key, value)
        VALUES (${row.page_slug}, ${row.field_key}, ${row.value})
        ON CONFLICT (page_slug, field_key) DO NOTHING
        RETURNING id
      `;
      if (result.length > 0) seeded++;
    }

    return NextResponse.json({ ok: true, seeded, total: rows.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
