// src/lib/pageContent.ts
// Server-only content fetching helpers. Uses React cache() for request-level dedup.
// On publish, revalidatePath() is called to drop Next.js cache.
import { cache } from "react";
import { sql } from "./db";
import type {
  AboutContent,
  ProtocolContent,
  ContactContent,
  LegalContent,
  ContactUsContent,
  AllPageContent,
} from "./contentTypes";
import {
  ABOUT_CONTENT,
  PROTOCOL_CONTENT,
  CONTACT_CONTENT,
  TERMS_CONTENT,
  PRIVACY_CONTENT,
  SHIPPING_CONTENT,
  REFUND_CONTENT,
} from "./staticContent";

// ── Row utilities ─────────────────────────────────────────────────────────────

type ContentRow = { field_key: string; value: string };

export function rowsToMap(rows: ContentRow[]): Record<string, string> {
  return Object.fromEntries(rows.map((r) => [r.field_key, r.value]));
}

// ── Page-specific parsers ─────────────────────────────────────────────────────

const SECTION_IDS = ["billboard", "foundation", "meal", "silent-contract"] as const;

export function parseAbout(rows: ContentRow[]): AboutContent {
  const m = rowsToMap(rows);
  return {
    headline: m["headline"] ?? ABOUT_CONTENT.headline,
    subheadline: m["subheadline"] ?? ABOUT_CONTENT.subheadline,
    sections: SECTION_IDS.map((id, i) => ({
      id,
      title: m[`section_${id}_title`] ?? ABOUT_CONTENT.sections[i]?.title ?? "",
      body: m[`section_${id}_body`] ?? ABOUT_CONTENT.sections[i]?.body ?? "",
    })),
    closing: m["closing"] ?? ABOUT_CONTENT.closing,
  };
}

export function parseProtocol(rows: ContentRow[]): ProtocolContent {
  const m = rowsToMap(rows);
  return {
    header: m["header"] ?? PROTOCOL_CONTENT.header,
    title: m["title"] ?? PROTOCOL_CONTENT.title,
    rules: PROTOCOL_CONTENT.rules.map((r) => ({
      number: r.number,
      text: m[`rule_${r.number}`] ?? r.text,
    })),
    cta: m["cta"] ?? PROTOCOL_CONTENT.cta,
    ctaSubtext: m["ctaSubtext"] ?? PROTOCOL_CONTENT.ctaSubtext,
  };
}

export function parseContact(rows: ContentRow[]): ContactContent {
  const m = rowsToMap(rows);
  return {
    headline: m["headline"] ?? CONTACT_CONTENT.headline,
    address: {
      line1: m["address_line1"] ?? CONTACT_CONTENT.address.line1,
      line2: m["address_line2"] ?? CONTACT_CONTENT.address.line2,
    },
    phone: m["phone"] ?? CONTACT_CONTENT.phone,
    email: m["email"] ?? CONTACT_CONTENT.email,
    note: m["note"] ?? CONTACT_CONTENT.note,
  };
}

export function parseLegal(
  rows: ContentRow[],
  fallback: { title: string; lastUpdated: string; body: string }
): LegalContent {
  const m = rowsToMap(rows);
  return {
    title: m["title"] ?? fallback.title,
    lastUpdated: m["lastUpdated"] ?? fallback.lastUpdated,
    body: m["body"] ?? fallback.body,
  };
}

export function parseContactUs(rows: ContentRow[]): ContactUsContent {
  const m = rowsToMap(rows);
  return {
    address: {
      line1: m["address_line1"] ?? CONTACT_CONTENT.address.line1,
      line2: m["address_line2"] ?? CONTACT_CONTENT.address.line2,
    },
    phone: m["phone"] ?? CONTACT_CONTENT.phone,
    email: m["email"] ?? CONTACT_CONTENT.email,
    note: m["note"] ?? CONTACT_CONTENT.note,
  };
}

// ── Cached DB fetcher ─────────────────────────────────────────────────────────

const fetchRows = cache(async (slug: string): Promise<ContentRow[]> => {
  try {
    const rows = await sql<ContentRow[]>`
      SELECT field_key, value FROM page_content WHERE page_slug = ${slug}
    `;
    return rows;
  } catch {
    // If DB is unreachable, fall back gracefully to static content
    return [];
  }
});

// ── Main export used by page.tsx ──────────────────────────────────────────────

export async function fetchAllPageContent(): Promise<AllPageContent> {
  const [
    aboutRows,
    protocolRows,
    contactRows,
    termsRows,
    privacyRows,
    shippingRows,
    refundRows,
    contactUsRows,
  ] = await Promise.all([
    fetchRows("about"),
    fetchRows("protocol"),
    fetchRows("contact"),
    fetchRows("terms"),
    fetchRows("privacy"),
    fetchRows("shipping"),
    fetchRows("refund"),
    fetchRows("contact-us"),
  ]);

  return {
    about: parseAbout(aboutRows),
    protocol: parseProtocol(protocolRows),
    contact: parseContact(contactRows),
    terms: parseLegal(termsRows, TERMS_CONTENT),
    privacy: parseLegal(privacyRows, PRIVACY_CONTENT),
    shipping: parseLegal(shippingRows, SHIPPING_CONTENT),
    refund: parseLegal(refundRows, REFUND_CONTENT),
    contactUs: parseContactUs(contactUsRows),
  };
}

// ── Per-page fetchers used by legal app routes ────────────────────────────────

export async function fetchLegalContent(slug: "terms" | "privacy" | "shipping" | "refund") {
  const fallbacks = {
    terms: TERMS_CONTENT,
    privacy: PRIVACY_CONTENT,
    shipping: SHIPPING_CONTENT,
    refund: REFUND_CONTENT,
  };
  const rows = await fetchRows(slug);
  return parseLegal(rows, fallbacks[slug]);
}

export async function fetchContactUsContent(): Promise<ContactUsContent> {
  const rows = await fetchRows("contact-us");
  return parseContactUs(rows);
}
