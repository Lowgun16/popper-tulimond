import type { DropRow } from "@/lib/drops";

export type StorePhase = "signup" | "early_access" | "open" | "sold_out";
export type { DropRow }; // back-compat re-export for existing importers

export function getStorePhase(drop: DropRow, now: Date): StorePhase {
  if (!drop.is_open) return "sold_out";
  if (drop.sold_count >= drop.available_count) return "sold_out";

  const opensAt = new Date(drop.opens_at);
  const earlyAt = new Date(drop.early_access_at);
  const closesAt = new Date(drop.closes_at);

  if (now >= closesAt) return "sold_out";
  if (now >= opensAt) return "open";
  if (now >= earlyAt) return "early_access";
  return "signup";
}

export function isSoldOut(drop: DropRow): boolean {
  return !drop.is_open || drop.sold_count >= drop.available_count;
}
