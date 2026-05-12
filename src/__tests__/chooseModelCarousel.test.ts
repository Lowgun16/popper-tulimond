import { MODEL_CAROUSEL_ORDER } from "@/components/overlays/ChooseModelModal";

describe("MODEL_CAROUSEL_ORDER", () => {
  it("is jerome angel jack ethan in that order", () => {
    expect(MODEL_CAROUSEL_ORDER).toEqual(["jerome", "angel", "jack", "ethan"]);
  });

  it("has exactly 4 models", () => {
    expect(MODEL_CAROUSEL_ORDER).toHaveLength(4);
  });
});
