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
  ModelProfile,
} from "./contentTypes";
import type { ProductOverride } from "./productOverrides";
import { MODEL_INVENTORY } from "@/data/inventory";
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

function toHtml(text: string): string {
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return text
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

// Strip HTML tags from fields that must be plain text (phone, email, titles, etc.)
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// ── Page-specific parsers ─────────────────────────────────────────────────────

const LEGACY_SECTION_IDS = ["billboard", "foundation", "meal", "silent-contract"] as const;

export function parseAbout(rows: ContentRow[]): AboutContent {
  const m = rowsToMap(rows);
  const sectionCount = parseInt(m["section_count"] ?? "4", 10);

  const sections = Array.from({ length: sectionCount }, (_, i) => {
    const legacyId = LEGACY_SECTION_IDS[i];
    const rawTitle =
      m[`section_${i}_title`] ??
      (legacyId ? m[`section_${legacyId}_title`] : undefined) ??
      ABOUT_CONTENT.sections[i]?.title ??
      "";
    const rawBody =
      m[`section_${i}_body`] ??
      (legacyId ? m[`section_${legacyId}_body`] : undefined) ??
      ABOUT_CONTENT.sections[i]?.body ??
      "";
    return { id: `section-${i}`, title: stripHtml(rawTitle), body: toHtml(rawBody) };
  });

  return {
    headline: m["headline"] ?? ABOUT_CONTENT.headline,
    subheadline: m["subheadline"] ?? ABOUT_CONTENT.subheadline,
    sections,
    closing: toHtml(m["closing"] ?? ABOUT_CONTENT.closing),
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
      line1: stripHtml(m["address_line1"] ?? CONTACT_CONTENT.address.line1),
      line2: stripHtml(m["address_line2"] ?? CONTACT_CONTENT.address.line2),
    },
    phone: stripHtml(m["phone"] ?? CONTACT_CONTENT.phone),
    email: stripHtml(m["email"] ?? CONTACT_CONTENT.email),
    note: m["note"] ?? CONTACT_CONTENT.note,
  };
}

export function parseLegal(
  rows: ContentRow[],
  fallback: { title: string; lastUpdated: string; body: string }
): LegalContent {
  const m = rowsToMap(rows);
  return {
    title: stripHtml(m["title"] ?? fallback.title),
    lastUpdated: stripHtml(m["last_updated"] ?? m["lastUpdated"] ?? fallback.lastUpdated),
    body: m["body"] ?? fallback.body,
  };
}

export function parseContactUs(rows: ContentRow[]): ContactUsContent {
  const m = rowsToMap(rows);
  return {
    address: {
      line1: stripHtml(m["address_line1"] ?? CONTACT_CONTENT.address.line1),
      line2: stripHtml(m["address_line2"] ?? CONTACT_CONTENT.address.line2),
    },
    phone: stripHtml(m["phone"] ?? CONTACT_CONTENT.phone),
    email: stripHtml(m["email"] ?? CONTACT_CONTENT.email),
    note: stripHtml(m["note"] ?? CONTACT_CONTENT.note),
  };
}

// ── Cached DB fetcher ─────────────────────────────────────────────────────────

const fetchPublishedOverrides = cache(async (): Promise<ProductOverride[]> => {
  try {
    const rows = await sql`SELECT * FROM product_overrides WHERE is_draft = false`;
    return rows as ProductOverride[];
  } catch {
    return [];
  }
});

const fetchRows = cache(async (slug: string): Promise<ContentRow[]> => {
  try {
    const rows = await sql`
      SELECT field_key, value FROM page_content WHERE page_slug = ${slug}
    `;
    return rows as ContentRow[];
  } catch {
    // If DB is unreachable, fall back gracefully to static content
    return [];
  }
});

// ── Model profiles ────────────────────────────────────────────────────────────

const MODEL_DEFAULT_SIZES: Record<string, string> = {
  angel: "S",
  jack: "M",
  ethan: "L",
  jerome: "XL",
};

export async function fetchModelProfiles(): Promise<ModelProfile[]> {
  const rows = await fetchRows("models");
  const m: Record<string, string> = rowsToMap(rows);

  return MODEL_INVENTORY.map((slot) => ({
    id: slot.id,
    displayName: slot.displayName ?? slot.id,
    imageSrc: slot.imageSrc,
    tagline: m[`${slot.id}_tagline`] ?? "",
    height: m[`${slot.id}_height`] ?? "",
    weight: m[`${slot.id}_weight`] ?? "",
    bodyType: m[`${slot.id}_body_type`] ?? "",
    bio: m[`${slot.id}_bio`] ?? "",
    videoUrl: m[`${slot.id}_video_url`] ?? "",
    defaultSize: MODEL_DEFAULT_SIZES[slot.id] ?? "M",
  }));
}

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
    productOverrides,
    modelProfiles,
  ] = await Promise.all([
    fetchRows("about"),
    fetchRows("protocol"),
    fetchRows("contact"),
    fetchRows("terms"),
    fetchRows("privacy"),
    fetchRows("shipping"),
    fetchRows("refund"),
    fetchRows("contact-us"),
    fetchPublishedOverrides(),
    fetchModelProfiles(),
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
    productOverrides,
    modelProfiles,
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
