import { itemPriceCents, canNonMemberPurchase } from "../pricing";

test("flat price is the initiation price", () => {
  expect(itemPriceCents({ initiationPriceCents: 15900, memberPriceCents: 25900 })).toBe(15900);
});
test("public items are non-member purchasable", () => {
  expect(canNonMemberPurchase({ type: "public" })).toBe(true);
});
test("vault items are member-only", () => {
  expect(canNonMemberPurchase({ type: "vault" })).toBe(false);
});
