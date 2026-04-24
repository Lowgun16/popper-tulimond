import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/adminAuth";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const pageSlug = req.nextUrl.searchParams.get("page");
  if (!pageSlug) return NextResponse.json({ error: "page required" }, { status: 400 });

  const rows = await sql`
    SELECT field_key, value FROM page_content WHERE page_slug = ${pageSlug}
  `;

  const content: Record<string, string> = {};
  for (const row of rows) content[row.field_key] = row.value;

  return NextResponse.json(content);
}
