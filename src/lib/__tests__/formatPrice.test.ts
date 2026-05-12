import { formatPrice } from "../formatPrice";

test("formats cents as dollar string", () => {
  expect(formatPrice(12900)).toBe("$129");
  expect(formatPrice(22900)).toBe("$229");
  expect(formatPrice(15900)).toBe("$159");
  expect(formatPrice(25900)).toBe("$259");
});
