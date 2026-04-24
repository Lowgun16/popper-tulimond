import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/adminAuth";
import { sql } from "@/lib/db";

type ProductOverride = {
  item_id: string;
  price: string | null;
  display_name: string | null;
  product_image: string | null;
  status: "active" | "sold_out" | "hidden";
  is_draft: boolean;
  updated_at: string;
};

/** GET /api/edit-pages/products — returns all product_overrides rows */
export async function GET(req: NextRequest) {
  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const rows: ProductOverride[] = await sql`
    SELECT item_id, price, display_name, product_image, status, is_draft, updated_at
    FROM product_overrides
  `;

  return NextResponse.json(rows ?? []);
}

/** POST /api/edit-pages/products — upserts a draft override for an item */
export async function POST(req: NextRequest) {
  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const { itemId, price, displayName, productImage, status } = await req.json() as {
    itemId: string;
    price?: string;
    displayName?: string;
    productImage?: string;
    status?: "active" | "sold_out" | "hidden";
  };

  await sql`
    INSERT INTO product_overrides (item_id, price, display_name, product_image, status, is_draft, updated_at)
    VALUES (
      ${itemId},
      ${price ?? null},
      ${displayName ?? null},
      ${productImage ?? null},
      ${status ?? "active"},
      true,
      now()
    )
    ON CONFLICT (item_id) DO UPDATE SET
      price         = COALESCE(EXCLUDED.price,         product_overrides.price),
      display_name  = COALESCE(EXCLUDED.display_name,  product_overrides.display_name),
      product_image = COALESCE(EXCLUDED.product_image, product_overrides.product_image),
      status        = EXCLUDED.status,
      is_draft      = true,
      updated_at    = now()
  `;

  return NextResponse.json({ ok: true });
}
