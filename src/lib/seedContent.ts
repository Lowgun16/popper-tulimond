// src/lib/seedContent.ts
// Converts staticContent.ts exports into flat DB rows for initial seeding.
// Run once via POST /api/seed-content on first deploy.

import {
  ABOUT_CONTENT,
  PROTOCOL_CONTENT,
  CONTACT_CONTENT,
  TERMS_CONTENT,
  PRIVACY_CONTENT,
  SHIPPING_CONTENT,
  REFUND_CONTENT,
} from "./staticContent";

export type SeedRow = {
  page_slug: string;
  field_key: string;
  value: string;
};

export function buildSeedRows(): SeedRow[] {
  const rows: SeedRow[] = [];

  // ── About ──────────────────────────────────────────────────────────────
  rows.push({ page_slug: "about", field_key: "headline", value: ABOUT_CONTENT.headline });
  rows.push({ page_slug: "about", field_key: "subheadline", value: ABOUT_CONTENT.subheadline });
  rows.push({ page_slug: "about", field_key: "closing", value: ABOUT_CONTENT.closing });
  for (const section of ABOUT_CONTENT.sections) {
    rows.push({ page_slug: "about", field_key: `section_${section.id}_title`, value: section.title });
    rows.push({ page_slug: "about", field_key: `section_${section.id}_body`, value: section.body });
  }

  // ── Protocol ───────────────────────────────────────────────────────────
  rows.push({ page_slug: "protocol", field_key: "header", value: PROTOCOL_CONTENT.header });
  rows.push({ page_slug: "protocol", field_key: "title", value: PROTOCOL_CONTENT.title });
  rows.push({ page_slug: "protocol", field_key: "cta", value: PROTOCOL_CONTENT.cta });
  rows.push({ page_slug: "protocol", field_key: "ctaSubtext", value: PROTOCOL_CONTENT.ctaSubtext });
  for (const rule of PROTOCOL_CONTENT.rules) {
    rows.push({ page_slug: "protocol", field_key: `rule_${rule.number}`, value: rule.text });
  }

  // ── Contact ────────────────────────────────────────────────────────────
  rows.push({ page_slug: "contact", field_key: "headline", value: CONTACT_CONTENT.headline });
  rows.push({ page_slug: "contact", field_key: "address_line1", value: CONTACT_CONTENT.address.line1 });
  rows.push({ page_slug: "contact", field_key: "address_line2", value: CONTACT_CONTENT.address.line2 });
  rows.push({ page_slug: "contact", field_key: "phone", value: CONTACT_CONTENT.phone });
  rows.push({ page_slug: "contact", field_key: "email", value: CONTACT_CONTENT.email });
  rows.push({ page_slug: "contact", field_key: "note", value: CONTACT_CONTENT.note });

  // ── Legal pages ────────────────────────────────────────────────────────
  const legalPages = [
    { slug: "terms", content: TERMS_CONTENT },
    { slug: "privacy", content: PRIVACY_CONTENT },
    { slug: "shipping", content: SHIPPING_CONTENT },
    { slug: "refund", content: REFUND_CONTENT },
  ] as const;

  for (const { slug, content } of legalPages) {
    rows.push({ page_slug: slug, field_key: "title", value: content.title });
    rows.push({ page_slug: slug, field_key: "lastUpdated", value: content.lastUpdated });
    rows.push({ page_slug: slug, field_key: "body", value: content.body });
  }

  // ── Contact Us (legal route — mirrors contact data, independently editable) ──
  rows.push({ page_slug: "contact-us", field_key: "address_line1", value: CONTACT_CONTENT.address.line1 });
  rows.push({ page_slug: "contact-us", field_key: "address_line2", value: CONTACT_CONTENT.address.line2 });
  rows.push({ page_slug: "contact-us", field_key: "phone", value: CONTACT_CONTENT.phone });
  rows.push({ page_slug: "contact-us", field_key: "email", value: CONTACT_CONTENT.email });
  rows.push({ page_slug: "contact-us", field_key: "note", value: CONTACT_CONTENT.note });

  return rows;
}
