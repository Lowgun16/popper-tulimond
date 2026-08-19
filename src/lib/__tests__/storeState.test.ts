import { getStorePhase } from "../storeState";
import type { DropRow } from "../drops";

const base: DropRow = {
  id: "t",
  timezone: "America/New_York",
  opens_at: "2026-08-25T04:00:00Z",        // midnight EDT
  early_access_at: "2026-08-25T03:45:00Z", // 11:45pm EDT prev day
  closes_at: "2026-08-25T07:00:00Z",       // 3am EDT (3h window)
  window_minutes: 180,
  available_count: 500,
  sold_count: 0,
  is_open: true,
  status: "announced",
  announce_at: null, announce_message: null, announce_sent_at: null,
  reminder_at: null, reminder_sent_at: null, earlybird_sent_at: null,
  limit_one_per_nonmember: false,
};

test("signup before early access", () => {
  expect(getStorePhase(base, new Date("2026-08-25T03:00:00Z"))).toBe("signup");
});
test("early_access in the 15-min window", () => {
  expect(getStorePhase(base, new Date("2026-08-25T03:50:00Z"))).toBe("early_access");
});
test("open after opens_at", () => {
  expect(getStorePhase(base, new Date("2026-08-25T04:30:00Z"))).toBe("open");
});
test("sold_out after closes_at (3h window)", () => {
  expect(getStorePhase(base, new Date("2026-08-25T07:30:00Z"))).toBe("sold_out");
});
test("sold_out when inventory exhausted", () => {
  expect(getStorePhase({ ...base, sold_count: 500 }, new Date("2026-08-25T04:30:00Z"))).toBe("sold_out");
});
test("sold_out when is_open false (manual close)", () => {
  expect(getStorePhase({ ...base, is_open: false }, new Date("2026-08-25T04:30:00Z"))).toBe("sold_out");
});
