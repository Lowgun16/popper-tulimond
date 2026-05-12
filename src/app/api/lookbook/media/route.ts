import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { LookbookMediaItem } from "@/lib/contentTypes";

export async function GET() {
  const rows = await sql`
    SELECT field_key, value
    FROM page_content
    WHERE page_slug IN ('lookbook', 'models')
      AND field_key LIKE 'lookbook_%'
  `;

  const media: Record<string, LookbookMediaItem[]> = {};
  for (const row of rows) {
    const outfitItemId = (row.field_key as string).replace(/^lookbook_/, "");
    try {
      media[outfitItemId] = JSON.parse(row.value as string) as LookbookMediaItem[];
    } catch {
      media[outfitItemId] = [];
    }
  }

  return NextResponse.json(media);
}
