import { fromZonedTime } from "date-fns-tz";
import { parseISO } from "date-fns";

export type StorePhase =
  | "signup"        // between drops — show sign-up CTA
  | "early_access"  // 11:45pm–midnight on the 15th — Pledges with link only
  | "open"          // midnight–closes_at on the 16th — everyone
  | "sold_out";     // sold out OR past closes_at — show sold-out message

export interface DropRow {
  id: string;
  drop_month: string;       // "2026-05-16" (always the 16th)
  timezone: string;         // "America/New_York"
  open_time: string;        // "00:00"
  early_access_time: string; // "23:45"
  close_time: string;       // "00:29"
  available_count: number;
  sold_count: number;
  is_open: boolean;
}

function wallClockToDate(dateStr: string, timeStr: string, tz: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const base = parseISO(dateStr);
  base.setHours(h, m, 0, 0);
  return fromZonedTime(base, tz);
}

export function getStorePhase(drop: DropRow, now: Date): StorePhase {
  if (!drop.is_open) return "sold_out";
  if (drop.sold_count >= drop.available_count) return "sold_out";

  const dropDate = drop.drop_month; // e.g. "2026-05-16"
  const prevDate = parseISO(dropDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = prevDate.toISOString().slice(0, 10); // "2026-05-15"

  const earlyAccessStart = wallClockToDate(prevDateStr, drop.early_access_time, drop.timezone);
  const openAt           = wallClockToDate(dropDate, drop.open_time, drop.timezone);
  const closeAt          = wallClockToDate(dropDate, drop.close_time, drop.timezone);

  if (now >= closeAt)          return "sold_out";
  if (now >= openAt)           return "open";
  if (now >= earlyAccessStart) return "early_access";
  return "signup";
}

export function isSoldOut(drop: DropRow): boolean {
  return !drop.is_open || drop.sold_count >= drop.available_count;
}
