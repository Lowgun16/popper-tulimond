import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/adminAuth";
import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

const PAGE_PATHS: Record<string, string[]> = {
  about: ["/"],
  protocol: ["/"],
  contact: ["/"],
  vault: ["/"],
  terms: ["/terms"],
  privacy: ["/privacy"],
  shipping: ["/shipping"],
  refund: ["/refund"],
  "contact-us": ["/contact-us"],
};

/** POST /api/edit-pages/publish — body: { pageSlug } */
export async function POST(req: NextRequest) {
  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const { pageSlug } = await req.json() as { pageSlug: string };

  // Fetch this user's draft for the page
  const draftRows = await sql`
    SELECT field_key, value
    FROM page_drafts
    WHERE user_id = ${sessionOrResponse.userId}
      AND page_slug = ${pageSlug}
  `;

  if (draftRows.length === 0) {
    return NextResponse.json({ error: "No draft to publish" }, { status: 400 });
  }

  // Write to page_content (upsert)
  for (const row of draftRows) {
    await sql`
      INSERT INTO page_content (page_slug, field_key, value, updated_by)
      VALUES (${pageSlug}, ${row.field_key}, ${row.value}, ${sessionOrResponse.userId})
      ON CONFLICT (page_slug, field_key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = now(), updated_by = EXCLUDED.updated_by
    `;
  }

  // Clear this user's draft for this page
  await sql`
    DELETE FROM page_drafts
    WHERE user_id = ${sessionOrResponse.userId} AND page_slug = ${pageSlug}
  `;

  // Revalidate affected paths
  const paths = PAGE_PATHS[pageSlug] ?? ["/"];
  for (const path of paths) {
    revalidatePath(path);
  }

  return NextResponse.json({ ok: true });
}
