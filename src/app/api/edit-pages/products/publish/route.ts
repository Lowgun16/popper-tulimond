import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/adminAuth";
import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

/** POST /api/edit-pages/products/publish — promotes all draft overrides to published */
export async function POST(req: NextRequest) {
  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  await sql`
    UPDATE product_overrides
    SET is_draft = false, updated_at = now()
    WHERE is_draft = true
  `;

  revalidatePath("/");

  return NextResponse.json({ ok: true });
}
