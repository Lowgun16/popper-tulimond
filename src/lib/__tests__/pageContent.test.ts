// src/lib/__tests__/pageContent.test.ts
import {
  rowsToMap,
  parseAbout,
  parseProtocol,
  parseContact,
  parseLegal,
  parseContactUs,
} from "../pageContent";
import {
  ABOUT_CONTENT,
  PROTOCOL_CONTENT,
  CONTACT_CONTENT,
  TERMS_CONTENT,
} from "../staticContent";

describe("rowsToMap", () => {
  it("converts row array to key-value map", () => {
    const rows = [
      { field_key: "headline", value: "Test" },
      { field_key: "subheadline", value: "Sub" },
    ];
    expect(rowsToMap(rows)).toEqual({ headline: "Test", subheadline: "Sub" });
  });

  it("returns empty object for empty array", () => {
    expect(rowsToMap([])).toEqual({});
  });

  it("last row wins on duplicate field_key", () => {
    const rows = [
      { field_key: "headline", value: "First" },
      { field_key: "headline", value: "Second" },
    ];
    expect(rowsToMap(rows)).toEqual({ headline: "Second" });
  });
});

describe("parseAbout", () => {
  it("assembles AboutContent from DB rows", () => {
    const rows = [
      { field_key: "headline", value: "Custom headline" },
      { field_key: "subheadline", value: "Custom sub" },
      { field_key: "section_billboard_title", value: "Billboard" },
      { field_key: "section_billboard_body", value: "Billboard body" },
      { field_key: "section_foundation_title", value: "Foundation" },
      { field_key: "section_foundation_body", value: "Foundation body" },
      { field_key: "section_meal_title", value: "Meal" },
      { field_key: "section_meal_body", value: "Meal body" },
      { field_key: "section_silent-contract_title", value: "Silent" },
      { field_key: "section_silent-contract_body", value: "Silent body" },
      { field_key: "closing", value: "Custom closing" },
    ];
    const result = parseAbout(rows);
    expect(result.headline).toBe("Custom headline");
    expect(result.subheadline).toBe("Custom sub");
    expect(result.sections).toHaveLength(4);
    expect(result.sections[0].id).toBe("billboard");
    expect(result.sections[0].title).toBe("Billboard");
    expect(result.sections[0].body).toBe("Billboard body");
    expect(result.closing).toBe("Custom closing");
  });

  it("falls back to static values for missing fields", () => {
    const result = parseAbout([]);
    expect(result.headline).toBe(ABOUT_CONTENT.headline);
    expect(result.subheadline).toBe(ABOUT_CONTENT.subheadline);
    expect(result.sections).toHaveLength(4);
    expect(result.sections[0].title).toBe(ABOUT_CONTENT.sections[0].title);
    expect(result.closing).toBe(ABOUT_CONTENT.closing);
  });
});

describe("parseProtocol", () => {
  it("assembles ProtocolContent from DB rows", () => {
    const rows = [
      { field_key: "header", value: "Custom header" },
      { field_key: "title", value: "THE PROTOCOL" },
      { field_key: "rule_01", value: "Rule one text" },
      { field_key: "rule_02", value: "Rule two text" },
      { field_key: "rule_03", value: "Rule three text" },
      { field_key: "cta", value: "Tap here" },
      { field_key: "ctaSubtext", value: "Text CONSTABLE" },
    ];
    const result = parseProtocol(rows);
    expect(result.header).toBe("Custom header");
    expect(result.rules).toHaveLength(3);
    expect(result.rules[0].text).toBe("Rule one text");
    expect(result.cta).toBe("Tap here");
  });

  it("falls back to static values for missing fields", () => {
    const result = parseProtocol([]);
    expect(result.header).toBe(PROTOCOL_CONTENT.header);
    expect(result.rules[0].text).toBe(PROTOCOL_CONTENT.rules[0].text);
  });
});

describe("parseContact", () => {
  it("assembles ContactContent from DB rows", () => {
    const rows = [
      { field_key: "headline", value: "Contact" },
      { field_key: "address_line1", value: "123 Main St" },
      { field_key: "address_line2", value: "City, ST 12345" },
      { field_key: "phone", value: "(555) 555-5555" },
      { field_key: "email", value: "test@test.com" },
      { field_key: "note", value: "We read every message." },
    ];
    const result = parseContact(rows);
    expect(result.address.line1).toBe("123 Main St");
    expect(result.address.line2).toBe("City, ST 12345");
    expect(result.phone).toBe("(555) 555-5555");
  });

  it("falls back to static values for missing fields", () => {
    const result = parseContact([]);
    expect(result.headline).toBe(CONTACT_CONTENT.headline);
    expect(result.address.line1).toBe(CONTACT_CONTENT.address.line1);
  });
});

describe("parseLegal", () => {
  it("assembles LegalContent from DB rows", () => {
    const rows = [
      { field_key: "title", value: "Terms of Use" },
      { field_key: "lastUpdated", value: "May 2026" },
      { field_key: "body", value: "Body text here" },
    ];
    const result = parseLegal(rows, TERMS_CONTENT);
    expect(result.title).toBe("Terms of Use");
    expect(result.lastUpdated).toBe("May 2026");
    expect(result.body).toBe("Body text here");
  });

  it("falls back to static fallback for missing fields", () => {
    const result = parseLegal([], TERMS_CONTENT);
    expect(result.title).toBe(TERMS_CONTENT.title);
    expect(result.body).toBe(TERMS_CONTENT.body);
  });
});

describe("parseContactUs", () => {
  it("assembles ContactUsContent from DB rows", () => {
    const rows = [
      { field_key: "address_line1", value: "456 Oak Ave" },
      { field_key: "address_line2", value: "Las Vegas, NV 89147" },
      { field_key: "phone", value: "(702) 000-0000" },
      { field_key: "email", value: "support@test.com" },
      { field_key: "note", value: "We read every message." },
    ];
    const result = parseContactUs(rows);
    expect(result.address.line1).toBe("456 Oak Ave");
    expect(result.phone).toBe("(702) 000-0000");
  });

  it("falls back to static values for missing fields", () => {
    const result = parseContactUs([]);
    expect(result.address.line1).toBe(CONTACT_CONTENT.address.line1);
  });
});
