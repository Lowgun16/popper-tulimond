import { NextRequest, NextResponse } from "next/server";
import { fromZonedTime } from "date-fns-tz";
import { requireOwner } from "@/lib/adminAuth";
import { sql } from "@/lib/db";
import type { DropRow } from "@/lib/drops";

export async function GET(req: NextRequest) {
  const auth = await requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const rows = await sql`SELECT * FROM initiation_drops WHERE status != 'canceled' ORDER BY opens_at DESC NULLS LAST`;
  return NextResponse.json({ openings: rows as DropRow[] });
}

export async function POST(req: NextRequest) {
  const auth = await requireOwner(req);
  if (auth instanceof NextResponse) return auth;

  const b = await req.json();
  const tz = b.timezone || "America/New_York";
  const opensAt = fromZonedTime(b.opensAtLocal, tz);
  if (isNaN(opensAt.getTime())) return NextResponse.json({ error: "Invalid opens time" }, { status: 400 });

  const windowMinutes = Number(b.windowMinutes ?? 180);
  const leadMin = Number(b.earlyAccessLeadMin ?? 15);
  const earlyAt = new Date(opensAt.getTime() - leadMin * 60000);
  const closesAt = new Date(opensAt.getTime() + windowMinutes * 60000);
  const announceAt = fromZonedTime(b.announceAtLocal, tz);
  // default reminder: 3:45pm ET on opening day
  const reminderAt = b.reminderLocal ? fromZonedTime(b.reminderLocal, tz) : defaultReminder(opensAt, tz);

  const rows = await sql`
    INSERT INTO initiation_drops
      (timezone, opens_at, early_access_at, closes_at, window_minutes,
       available_count, sold_count, is_open, status,
       announce_at, announce_message, reminder_at, limit_one_per_nonmember)
    VALUES
      (${tz}, ${opensAt.toISOString()}, ${earlyAt.toISOString()}, ${closesAt.toISOString()}, ${windowMinutes},
       ${Number(b.availableCount)}, 0, true, 'scheduled',
       ${announceAt.toISOString()}, ${b.announceMessage || null}, ${reminderAt.toISOString()}, ${!!b.limitOnePerNonmember})
    RETURNING *
  `;
  return NextResponse.json({ opening: rows[0] as DropRow });
}

function defaultReminder(opensAt: Date, tz: string): Date {
  // opening day's calendar date in tz, at 15:45 local
  const { formatInTimeZone } = require("date-fns-tz");
  const day = formatInTimeZone(opensAt, tz, "yyyy-MM-dd");
  return fromZonedTime(`${day}T15:45`, tz);
}
