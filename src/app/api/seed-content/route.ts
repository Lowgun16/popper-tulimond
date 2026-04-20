// src/app/api/seed-content/route.ts
// Idempotent seeding endpoint. Seeds page_content from staticContent.ts.
// Safe to call multiple times — uses ON CONFLICT DO NOTHING.
// After seeding once, calling again returns { ok: true, seeded: 0 }.
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { buildSeedRows } from "@/lib/seedContent";

export async function POST() {
  try {
    const rows = buildSeedRows();
    let seeded = 0;

    for (const row of rows) {
      const result = await sql`
        INSERT INTO page_content (page_slug, field_key, value)
        VALUES (${row.page_slug}, ${row.field_key}, ${row.value})
        ON CONFLICT (page_slug, field_key) DO NOTHING
      `;
      // Neon returns affected row count in the result
      if (Array.isArray(result) && result.length > 0) seeded++;
    }

    return NextResponse.json({ ok: true, seeded, total: rows.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
