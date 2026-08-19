import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { DropRow } from "@/lib/drops";
import { dueTextsFor } from "@/lib/openingTexts";
import { announceMessage, reminderMessage, earlybirdMessage } from "@/lib/openingMessages";
import { sendSmsBatch } from "@/lib/sms";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://poppertulimond.com";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Actionable openings: not canceled/closed, within a sane window of now.
  const drops = (await sql`
    SELECT * FROM initiation_drops
    WHERE status IN ('scheduled','announced')
      AND opens_at IS NOT NULL
      AND closes_at > now() - INTERVAL '1 day'
  `) as DropRow[];

  let processed = 0;
  const now = new Date();

  for (const drop of drops) {
    for (const due of dueTextsFor(drop, now)) {
      // Claim the step atomically so overlapping runs can't double-send.
      const claimed = await claim(drop.id, due);
      if (!claimed) continue;

      const pledges = await nonMemberPledges();
      if (due === "announce") {
        const body = announceMessage(new Date(drop.opens_at), drop.timezone, drop.announce_message);
        await sendSmsBatch(pledges.map((p) => ({ to: p.phone, body })));
        await sql`UPDATE initiation_drops SET status = 'announced' WHERE id = ${drop.id}`;
      } else if (due === "reminder") {
        const recips = await withEarlyAccessLinks(drop.id, pledges);
        await sendSmsBatch(recips.map((r) => ({ to: r.phone, body: reminderMessage(new Date(drop.opens_at), drop.timezone, r.link) })));
      } else if (due === "earlybird") {
        const recips = await withEarlyAccessLinks(drop.id, pledges);
        await sendSmsBatch(recips.map((r) => ({ to: r.phone, body: earlybirdMessage(r.link) })));
      }
      processed++;
    }
  }
  return NextResponse.json({ processed });
}

/** Flip the sent flag only if still null; returns true if THIS run won the claim. */
async function claim(id: string, due: "announce" | "reminder" | "earlybird"): Promise<boolean> {
  let rows;
  if (due === "announce") {
    rows = await sql`UPDATE initiation_drops SET announce_sent_at = now() WHERE id = ${id} AND announce_sent_at IS NULL RETURNING id`;
  } else if (due === "reminder") {
    rows = await sql`UPDATE initiation_drops SET reminder_sent_at = now() WHERE id = ${id} AND reminder_sent_at IS NULL RETURNING id`;
  } else {
    rows = await sql`UPDATE initiation_drops SET earlybird_sent_at = now() WHERE id = ${id} AND earlybird_sent_at IS NULL RETURNING id`;
  }
  return rows.length > 0;
}

async function nonMemberPledges(): Promise<Array<{ phone: string }>> {
  return (await sql`
    SELECT DISTINCT s.phone FROM sms_signups s
    LEFT JOIN members m ON m.phone = s.phone
    WHERE m.id IS NULL AND s.phone IS NOT NULL
  `) as Array<{ phone: string }>;
}

async function withEarlyAccessLinks(dropId: string, pledges: Array<{ phone: string }>) {
  const out: Array<{ phone: string; link: string }> = [];
  for (const p of pledges) {
    const rows = await sql`
      INSERT INTO early_access_tokens (phone, drop_id)
      VALUES (${p.phone}, ${dropId})
      RETURNING token`;
    out.push({ phone: p.phone, link: `${BASE}/early-access/${rows[0].token}` });
  }
  return out;
}
