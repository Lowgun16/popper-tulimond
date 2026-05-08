// src/lib/productOverrides.ts
// Merge utility: combines static MODEL_INVENTORY with database product overrides.

import type { ModelSlot, OutfitItem } from "@/data/inventory";

export type ProductOverride = {
  item_id: string;
  initiation_price_cents: number | null;
  member_price_cents: number | null;
  display_name: string | null;
  product_image: string | null;
  cart_image: string | null;
  status: "active" | "sold_out" | "hidden";
  is_draft: boolean;
};

/**
 * Merges static inventory slots with live database overrides.
 * - "hidden" items are removed from the outfit array entirely.
 * - "sold_out" / "active" items have their fields overridden and a
 *   `_vaultStatus` field attached for the overlay to consume.
 * - Slots with empty outfit arrays are kept (they still appear on stage).
 */
export function mergeInventoryWithOverrides(
  inventory: ModelSlot[],
  overrides: ProductOverride[]
): ModelSlot[] {
  const overrideMap = new Map<string, ProductOverride>(
    overrides.map((o) => [o.item_id, o])
  );

  return inventory.map((slot) => {
    const mergedOutfit = slot.outfit
      .filter((item) => {
        const override = overrideMap.get(item.id);
        return !override || override.status !== "hidden";
      })
      .map((item): OutfitItem & { _vaultStatus?: string } => {
        const override = overrideMap.get(item.id);
        if (!override) return item;
        return {
          ...item,
          initiationPriceCents: override.initiation_price_cents ?? item.initiationPriceCents,
          memberPriceCents: override.member_price_cents ?? item.memberPriceCents,
          name: override.display_name ?? item.name,
          productImage: override.product_image ?? item.productImage,
          cartImage: override.cart_image ?? override.product_image ?? item.productImage,
          _vaultStatus: override.status,
        };
      });

    return { ...slot, outfit: mergedOutfit };
  });
}
