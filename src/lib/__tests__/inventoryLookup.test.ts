import { getInventoryItem } from "../inventoryLookup";

test("finds a known Constable variant by id", () => {
  const item = getInventoryItem("angel-heartbreaker");
  expect(item?.collection).toBe("The Constable");
  expect(item?.type).toBe("public");
});
test("returns null for unknown id", () => {
  expect(getInventoryItem("does-not-exist")).toBeNull();
});
