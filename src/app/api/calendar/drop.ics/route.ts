import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

function pad(n: number) { return String(n).padStart(2, "0"); }

function toICSDate(date: Date, tz = "America/New_York") {
  // Format as local time in the given timezone for TZID events
  // We'll use UTC representation and let the TZID handle the display
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${y}${m}${d}T${h}${min}00`;
}

function icsEscape(str: string) {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET() {
  const drops = await sql`SELECT * FROM initiation_drops ORDER BY drop_month DESC LIMIT 1`;
  const drop = drops[0];

  if (!drop) {
    return new NextResponse("No active drop", { status: 404 });
  }

  // Normalize drop_month to YYYY-MM-DD string
  const rawMonth = drop.drop_month;
  const dropDateStr =
    rawMonth instanceof Date
      ? `${rawMonth.getUTCFullYear()}-${pad(rawMonth.getUTCMonth() + 1)}-${pad(rawMonth.getUTCDate())}`
      : String(rawMonth).slice(0, 10);

  const [yr, mo, dy] = dropDateStr.split("-").map(Number);
  const prevDay = dy - 1;

  // Early access: 11:45pm night before
  const earlyStart = `${yr}${pad(mo)}${pad(prevDay)}T234500`;
  const earlyEnd   = `${yr}${pad(mo)}${pad(dy)}T003000`;

  // Vault open: midnight on drop day
  const openStart = `${yr}${pad(mo)}${pad(dy)}T000000`;
  const openEnd   = `${yr}${pad(mo)}${pad(dy)}T003000`;

  const now = toICSDate(new Date());
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://poppertulimond.com";
  const tz = String(drop.timezone ?? "America/New_York");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Popper Tulimond//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "",
    // Event 1 — early access reminder
    "BEGIN:VEVENT",
    `DTSTART;TZID=${tz}:${earlyStart}`,
    `DTEND;TZID=${tz}:${earlyEnd}`,
    `DTSTAMP:${now}Z`,
    `UID:pt-early-access-${dropDateStr}@poppertulimond.com`,
    `SUMMARY:${icsEscape("Early Access — Popper Tulimond Vault")}`,
    `DESCRIPTION:${icsEscape("Your early access link opens in 15 minutes. You're going in before anyone else.\n\n" + baseUrl)}`,
    `URL:${baseUrl}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape("The Vault opens in 15 minutes.")}`,
    "END:VALARM",
    "END:VEVENT",
    "",
    // Event 2 — vault opens
    "BEGIN:VEVENT",
    `DTSTART;TZID=${tz}:${openStart}`,
    `DTEND;TZID=${tz}:${openEnd}`,
    `DTSTAMP:${now}Z`,
    `UID:pt-vault-open-${dropDateStr}@poppertulimond.com`,
    `SUMMARY:${icsEscape("Popper Tulimond — Vault Opens for New Members")}`,
    `DESCRIPTION:${icsEscape("Tonight is the night. The Vault opens for new members at midnight.\n\nLimited spots available. Your early access link:\n" + baseUrl)}`,
    `URL:${baseUrl}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape("The Vault opens in 30 minutes.")}`,
    "END:VALARM",
    "END:VEVENT",
    "",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="popper-tulimond-drop.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
