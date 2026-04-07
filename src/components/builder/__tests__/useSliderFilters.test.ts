// src/components/builder/__tests__/useSliderFilters.test.ts
import { buildCSSFilter } from "../useSliderFilters";
import type { SliderState } from "../builderTypes";

const base: SliderState = {
  hue: 0,
  saturation: 0,
  brightness: 0,
  contrast: 0,
  fabricRoughness: 0,
  heatherIntensity: 0,
  warmth: 0,
};

describe("buildCSSFilter", () => {
  it("returns empty string for all-zero state", () => {
    expect(buildCSSFilter(base)).toBe("");
  });

  it("includes hue-rotate when hue is non-zero", () => {
    const result = buildCSSFilter({ ...base, hue: 30 });
    expect(result).toContain("hue-rotate(30deg)");
  });

  it("includes saturate adjusted from 100%", () => {
    const result = buildCSSFilter({ ...base, saturation: 50 });
    expect(result).toContain("saturate(150%)");
  });

  it("handles negative saturation (desaturate)", () => {
    const result = buildCSSFilter({ ...base, saturation: -50 });
    expect(result).toContain("saturate(50%)");
  });

  it("includes brightness adjusted from 100%", () => {
    const result = buildCSSFilter({ ...base, brightness: 20 });
    expect(result).toContain("brightness(120%)");
  });

  it("includes contrast adjusted from 100%", () => {
    const result = buildCSSFilter({ ...base, contrast: -30 });
    expect(result).toContain("contrast(70%)");
  });

  it("combines multiple active filters", () => {
    const result = buildCSSFilter({ ...base, hue: 15, brightness: 10 });
    expect(result).toContain("hue-rotate(15deg)");
    expect(result).toContain("brightness(110%)");
  });
});
