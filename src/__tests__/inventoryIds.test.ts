import { MODEL_INVENTORY } from "@/data/inventory";

describe("MODEL_INVENTORY slot IDs", () => {
  const ids = MODEL_INVENTORY.map((s) => s.id);

  it("uses character names not location names", () => {
    expect(ids).not.toContain("lounge-model");
    expect(ids).not.toContain("center-model");
    expect(ids).not.toContain("vault-model");
    expect(ids).not.toContain("rack-model");
    expect(ids).toContain("angel");
    expect(ids).toContain("jerome");
    expect(ids).toContain("jack");
    expect(ids).toContain("ethan");
  });

  it("has renamed outfit IDs", () => {
    const outfitIds = MODEL_INVENTORY.flatMap((s) => s.outfit.map((o) => o.id));
    expect(outfitIds).not.toContain("lounge-showstopper");
    expect(outfitIds).not.toContain("center-showstopper");
    expect(outfitIds).not.toContain("vault-showstopper");
    expect(outfitIds).not.toContain("rack-showstopper");
    expect(outfitIds).toContain("angel-heartbreaker");
    expect(outfitIds).toContain("jerome-showstopper");
    expect(outfitIds).toContain("jack-showstopper");
    expect(outfitIds).toContain("ethan-heartbreaker");
  });
});
