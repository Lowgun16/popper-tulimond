import { formatInTimeZone } from "date-fns-tz";

const OPT_OUT = "Reply STOP to opt out.";

function dateStr(d: Date, tz: string) { return formatInTimeZone(d, tz, "MMMM d"); }
function timeStr(d: Date, tz: string) { return formatInTimeZone(d, tz, "h:mm a"); }

/** Ensure a marketing message carries opt-out language exactly once (carrier requirement). */
function withOptOut(msg: string): string {
  return /stop to opt|reply stop/i.test(msg) ? msg : `${msg.trimEnd()} ${OPT_OUT}`;
}

export function announceMessage(opensAt: Date, tz: string, custom?: string | null): string {
  if (custom && custom.trim()) return withOptOut(custom.trim());
  return withOptOut(
    `The Store opens ${dateStr(opensAt, tz)} at ${timeStr(opensAt, tz)} ET. You'll get your early-access link the day of. — Popper Tulimond`
  );
}

export function reminderMessage(opensAt: Date, tz: string, link: string): string {
  return withOptOut(
    `Tonight. The Vault opens at ${timeStr(opensAt, tz)} ET. Your early-access link — fifteen minutes before the public: ${link} — Popper Tulimond`
  );
}

export function earlybirdMessage(link: string): string {
  return withOptOut(
    `The door is open for you. Fifteen minutes before the public. Move before we sell out: ${link} — Popper Tulimond`
  );
}
