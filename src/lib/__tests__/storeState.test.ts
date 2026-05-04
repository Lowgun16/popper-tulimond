import { getStorePhase, type DropRow } from "../storeState";

const baseDrop: DropRow = {
  id: "test",
  drop_month: "2026-05-16",
  timezone: "America/New_York",
  open_time: "00:00",
  early_access_time: "23:45",
  close_time: "00:29",
  available_count: 500,
  sold_count: 0,
  is_open: true,
};

test("returns signup during off-period", () => {
  const now = new Date("2026-05-14T20:00:00Z"); // afternoon on the 14th
  expect(getStorePhase(baseDrop, now)).toBe("signup");
});

test("returns early_access at 11:45pm EST on the 15th", () => {
  // 11:46pm EDT on May 15 = 03:46 UTC on May 16
  const now = new Date("2026-05-16T03:46:00Z");
  expect(getStorePhase(baseDrop, now)).toBe("early_access");
});

test("returns open at midnight on the 16th", () => {
  // midnight EDT on May 16 = 04:00 UTC
  const now = new Date("2026-05-16T04:01:00Z");
  expect(getStorePhase(baseDrop, now)).toBe("open");
});

test("returns sold_out after close_time", () => {
  // 12:30am EDT = 04:30 UTC
  const now = new Date("2026-05-16T04:30:00Z");
  expect(getStorePhase(baseDrop, now)).toBe("sold_out");
});

test("returns sold_out when inventory exhausted", () => {
  const now = new Date("2026-05-16T04:01:00Z"); // store open
  expect(getStorePhase({ ...baseDrop, sold_count: 500 }, now)).toBe("sold_out");
});

test("returns sold_out when is_open is false", () => {
  const now = new Date("2026-05-16T04:01:00Z");
  expect(getStorePhase({ ...baseDrop, is_open: false }, now)).toBe("sold_out");
});
