import type { OutfitItem } from "@/data/inventory";

/** Flat price: membership is access, not a discount. Single price = initiation price. */
export function itemPriceCents(item: Pick<OutfitItem, "initiationPriceCents">): number {
  return item.initiationPriceCents;
}

/** Non-members may only buy public (Constable) items; "vault" items are member-only. */
export function canNonMemberPurchase(item: Pick<OutfitItem, "type">): boolean {
  return item.type === "public";
}
