import type { DropRow } from "@/lib/drops";

export type DueText = "announce" | "reminder" | "earlybird";

export function dueTextsFor(drop: DropRow, now: Date): DueText[] {
  if (drop.status === "canceled" || drop.status === "closed") return [];
  const due: DueText[] = [];
  const passed = (iso: string | null) => iso != null && now >= new Date(iso);

  // Text 1 — heads-up. Sending it "locks" the plan (handled by the caller setting status/announce_sent_at).
  if (drop.status === "scheduled" && !drop.announce_sent_at && passed(drop.announce_at)) {
    due.push("announce");
  }
  // Texts 2 & 3 only after the plan is announced (locked).
  const announced = !!drop.announce_sent_at || drop.status === "announced";
  if (announced && !drop.reminder_sent_at && passed(drop.reminder_at)) due.push("reminder");
  if (announced && !drop.earlybird_sent_at && passed(drop.early_access_at)) due.push("earlybird");
  return due;
}
