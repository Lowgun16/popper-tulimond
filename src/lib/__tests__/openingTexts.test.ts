import { dueTextsFor } from "../openingTexts";
import type { DropRow } from "../drops";

const base: DropRow = {
  id: "t", timezone: "America/New_York",
  opens_at: "2026-08-25T04:00:00Z", early_access_at: "2026-08-25T03:45:00Z",
  closes_at: "2026-08-25T07:00:00Z", window_minutes: 180,
  available_count: 500, sold_count: 0, is_open: true, status: "scheduled",
  announce_at: "2026-08-22T20:00:00Z", announce_message: null, announce_sent_at: null,
  reminder_at: "2026-08-24T19:45:00Z", reminder_sent_at: null, earlybird_sent_at: null,
  limit_one_per_nonmember: false,
};

test("announce due when announce_at passed and unsent", () => {
  expect(dueTextsFor(base, new Date("2026-08-22T20:01:00Z"))).toEqual(["announce"]);
});
test("nothing due before announce_at", () => {
  expect(dueTextsFor(base, new Date("2026-08-22T19:00:00Z"))).toEqual([]);
});
test("announce not re-sent once announce_sent_at set", () => {
  const d = { ...base, announce_sent_at: "2026-08-22T20:00:30Z", status: "announced" as const };
  expect(dueTextsFor(d, new Date("2026-08-22T21:00:00Z"))).toEqual([]);
});
test("reminder only after announced + reminder_at", () => {
  const d = { ...base, announce_sent_at: "2026-08-22T20:00:30Z", status: "announced" as const };
  expect(dueTextsFor(d, new Date("2026-08-24T19:46:00Z"))).toEqual(["reminder"]);
});
test("earlybird after announced + early_access_at", () => {
  const d = { ...base, announce_sent_at: "x", reminder_sent_at: "y", status: "announced" as const };
  expect(dueTextsFor(d, new Date("2026-08-25T03:46:00Z"))).toEqual(["earlybird"]);
});
test("canceled openings are never due", () => {
  expect(dueTextsFor({ ...base, status: "canceled" }, new Date("2026-08-25T03:46:00Z"))).toEqual([]);
});
