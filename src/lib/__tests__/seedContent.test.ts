// src/lib/__tests__/seedContent.test.ts
import { buildSeedRows } from "../seedContent";

describe("buildSeedRows", () => {
  it("returns an array of rows with page_slug, field_key, and value", () => {
    const rows = buildSeedRows();
    expect(Array.isArray(rows)).toBe(true);
    rows.forEach((row) => {
      expect(typeof row.page_slug).toBe("string");
      expect(typeof row.field_key).toBe("string");
      expect(typeof row.value).toBe("string");
    });
  });

  it("generates rows for all required page slugs", () => {
    const rows = buildSeedRows();
    const slugs = new Set(rows.map((r) => r.page_slug));
    expect(slugs.has("about")).toBe(true);
    expect(slugs.has("protocol")).toBe(true);
    expect(slugs.has("contact")).toBe(true);
    expect(slugs.has("terms")).toBe(true);
    expect(slugs.has("privacy")).toBe(true);
    expect(slugs.has("shipping")).toBe(true);
    expect(slugs.has("refund")).toBe(true);
    expect(slugs.has("contact-us")).toBe(true);
  });

  it("generates about page rows including all section fields", () => {
    const rows = buildSeedRows();
    const aboutRows = rows.filter((r) => r.page_slug === "about");
    const keys = new Set(aboutRows.map((r) => r.field_key));
    expect(keys.has("headline")).toBe(true);
    expect(keys.has("subheadline")).toBe(true);
    expect(keys.has("section_billboard_title")).toBe(true);
    expect(keys.has("section_billboard_body")).toBe(true);
    expect(keys.has("section_foundation_title")).toBe(true);
    expect(keys.has("section_meal_title")).toBe(true);
    expect(keys.has("section_silent-contract_title")).toBe(true);
    expect(keys.has("closing")).toBe(true);
  });

  it("generates protocol rows including all rule fields", () => {
    const rows = buildSeedRows();
    const protocolRows = rows.filter((r) => r.page_slug === "protocol");
    const keys = new Set(protocolRows.map((r) => r.field_key));
    expect(keys.has("header")).toBe(true);
    expect(keys.has("title")).toBe(true);
    expect(keys.has("rule_01")).toBe(true);
    expect(keys.has("rule_02")).toBe(true);
    expect(keys.has("rule_03")).toBe(true);
    expect(keys.has("cta")).toBe(true);
    expect(keys.has("ctaSubtext")).toBe(true);
  });

  it("all rows have non-empty values", () => {
    const rows = buildSeedRows();
    rows.forEach((row) => {
      expect(row.value.trim().length).toBeGreaterThan(0);
    });
  });

  it("no duplicate page_slug + field_key pairs", () => {
    const rows = buildSeedRows();
    const seen = new Set<string>();
    rows.forEach((row) => {
      const key = `${row.page_slug}::${row.field_key}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    });
  });
});
