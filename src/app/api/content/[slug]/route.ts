import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

/** GET /api/content/[slug] — returns published content fields for a page slug */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const rows = await sql`
      SELECT field_key, value FROM page_content WHERE page_slug = ${slug}
    `;
    const content = Object.fromEntries(rows.map((r) => [r.field_key, r.value]));
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ content: {} });
  }
}
