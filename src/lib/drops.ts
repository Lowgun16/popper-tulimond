import { sql } from "@/lib/db";

export interface DropRow {
  id: string;
  timezone: string;
  opens_at: string;        // ISO timestamptz
  early_access_at: string; // ISO
  closes_at: string;       // ISO
  window_minutes: number;
  available_count: number;
  sold_count: number;
  is_open: boolean;
  status: "draft" | "scheduled" | "announced" | "closed" | "canceled";
  announce_at: string | null;
  announce_message: string | null;
  announce_sent_at: string | null;
  reminder_at: string | null;
  reminder_sent_at: string | null;
  earlybird_sent_at: string | null;
  limit_one_per_nonmember: boolean;
}

/**
 * The active-or-next opening: the one whose window covers `now`, else the
 * soonest upcoming scheduled/announced opening, else the most recent.
 */
export async function getCurrentDrop(): Promise<DropRow | null> {
  const rows = await sql`
    SELECT * FROM initiation_drops
    WHERE status NOT IN ('canceled')
    ORDER BY
      (opens_at <= now() AND closes_at > now()) DESC,  -- currently live first
      CASE WHEN opens_at >= now() THEN 0 ELSE 1 END,   -- then upcoming
      ABS(EXTRACT(EPOCH FROM (opens_at - now())))      -- nearest in time
    LIMIT 1
  `;
  return (rows[0] as DropRow) ?? null;
}
