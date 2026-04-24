import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/adminAuth";
import { sql } from "@/lib/db";

/** GET /api/edit-pages/drafts?page=about — returns draft rows for this user + page */
export async function GET(req: NextRequest) {
  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const pageSlug = req.nextUrl.searchParams.get("page");
  if (!pageSlug) return NextResponse.json({ error: "page param required" }, { status: 400 });

  const rows = await sql`
    SELECT field_key, value
    FROM page_drafts
    WHERE user_id = ${sessionOrResponse.userId}
      AND page_slug = ${pageSlug}
  `;

  const draft: Record<string, string> = {};
  for (const row of rows) draft[row.field_key] = row.value;

  return NextResponse.json(draft);
}

/** POST /api/edit-pages/drafts — body: { pageSlug, fields: Record<string, string> } */
export async function POST(req: NextRequest) {
  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const { pageSlug, fields } = await req.json() as {
    pageSlug: string;
    fields: Record<string, string>;
  };

  for (const [fieldKey, value] of Object.entries(fields)) {
    await sql`
      INSERT INTO page_drafts (user_id, page_slug, field_key, value)
      VALUES (${sessionOrResponse.userId}, ${pageSlug}, ${fieldKey}, ${value})
      ON CONFLICT (user_id, page_slug, field_key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `;
  }

  return NextResponse.json({ ok: true });
}
