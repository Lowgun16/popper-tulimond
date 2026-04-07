// src/components/builder/__tests__/builderUtils.test.ts
import { makeCorrectionEntry } from "../builderUtils";

describe("makeCorrectionEntry", () => {
  it("creates a log entry with all required fields", () => {
    const entry = makeCorrectionEntry("angel", "constable-henley", "sleeve-length", "increase", 1);
    expect(entry.characterId).toBe("angel");
    expect(entry.garmentId).toBe("constable-henley");
    expect(entry.editType).toBe("sleeve-length");
    expect(entry.direction).toBe("increase");
    expect(entry.magnitude).toBe(1);
    expect(typeof entry.id).toBe("string");
    expect(entry.id.length).toBeGreaterThan(0);
    expect(typeof entry.timestamp).toBe("number");
  });

  it("generates unique ids for each entry", () => {
    const a = makeCorrectionEntry("angel", "g1", "hue", "set", 10);
    const b = makeCorrectionEntry("angel", "g1", "hue", "set", 10);
    expect(a.id).not.toBe(b.id);
  });
});
