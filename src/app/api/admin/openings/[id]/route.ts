import { NextRequest, NextResponse } from "next/server";
import { fromZonedTime } from "date-fns-tz";
import { requireOwner } from "@/lib/adminAuth";
import { sql } from "@/lib/db";
import type { DropRow } from "@/lib/drops";

async function load(id: string): Promise<DropRow | null> {
  const rows = await sql`SELECT * FROM initiation_drops WHERE id = ${id}`;
  return (rows[0] as DropRow) ?? null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const drop = await load(id);
  if (!drop) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (drop.announce_sent_at) return NextResponse.json({ error: "Opening is locked (announce sent)" }, { status: 409 });

  const b = await req.json();
  const tz = b.timezone ?? drop.timezone;
  const opensAt = b.opensAtLocal ? fromZonedTime(b.opensAtLocal, tz) : new Date(drop.opens_at);
  const windowMinutes = Number(b.windowMinutes ?? drop.window_minutes);
  const leadMin = Number(b.earlyAccessLeadMin ?? 15);
  const earlyAt = new Date(opensAt.getTime() - leadMin * 60000);
  const closesAt = new Date(opensAt.getTime() + windowMinutes * 60000);
  const announceAt = b.announceAtLocal
    ? fromZonedTime(b.announceAtLocal, tz)
    : drop.announce_at
    ? new Date(drop.announce_at)
    : null;
  const reminderAt = b.reminderLocal
    ? fromZonedTime(b.reminderLocal, tz)
    : drop.reminder_at
    ? new Date(drop.reminder_at)
    : null;

  const rows = await sql`
    UPDATE initiation_drops SET
      timezone           = ${tz},
      opens_at           = ${opensAt.toISOString()},
      early_access_at    = ${earlyAt.toISOString()},
      closes_at          = ${closesAt.toISOString()},
      window_minutes     = ${windowMinutes},
      available_count    = ${Number(b.availableCount ?? drop.available_count)},
      announce_at        = ${announceAt ? announceAt.toISOString() : null},
      announce_message   = ${b.announceMessage ?? drop.announce_message},
      reminder_at        = ${reminderAt ? reminderAt.toISOString() : null},
      limit_one_per_nonmember = ${b.limitOnePerNonmember ?? drop.limit_one_per_nonmember}
    WHERE id = ${id} AND announce_sent_at IS NULL
    RETURNING *
  `;
  if (rows.length === 0) return NextResponse.json({ error: "Opening is locked" }, { status: 409 });
  return NextResponse.json({ opening: rows[0] as DropRow });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const { action } = await req.json();

  if (action === "cancel") {
    const rows = await sql`
      UPDATE initiation_drops SET status = 'canceled'
      WHERE id = ${id} AND announce_sent_at IS NULL
      RETURNING *
    `;
    if (rows.length === 0) return NextResponse.json({ error: "Cannot cancel a locked opening" }, { status: 409 });
    return NextResponse.json({ opening: rows[0] as DropRow });
  }

  if (action === "close-now") {
    const rows = await sql`
      UPDATE initiation_drops SET is_open = false, status = 'closed'
      WHERE id = ${id}
      RETURNING *
    `;
    if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ opening: rows[0] as DropRow });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
