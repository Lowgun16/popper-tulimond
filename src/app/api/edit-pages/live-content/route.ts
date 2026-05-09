import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/adminAuth";
import { sql } from "@/lib/db";
import {
  ABOUT_CONTENT,
  PROTOCOL_CONTENT,
  CONTACT_CONTENT,
  TERMS_CONTENT,
  PRIVACY_CONTENT,
  SHIPPING_CONTENT,
  REFUND_CONTENT,
  MEMBERSHIP_CELEBRATION_CONTENT,
  RESERVATION_CONTENT,
} from "@/lib/staticContent";

// Convert plain text (with \n paragraph breaks) to HTML <p> tags so TipTap
// initializes with proper paragraph structure and the overlays render correctly.
function toHtml(text: string): string {
  if (/<[a-z][\s\S]*>/i.test(text)) return text; // already HTML
  return text
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

// Static defaults for every editable field, keyed by page slug then field_key.
// The editor shows these when nothing has been saved to the DB yet.
const STATIC_DEFAULTS: Record<string, Record<string, string>> = {
  about: {
    headline: ABOUT_CONTENT.headline,
    subheadline: ABOUT_CONTENT.subheadline,
    section_count: "4",
    section_0_title: ABOUT_CONTENT.sections[0].title,
    section_0_body: toHtml(ABOUT_CONTENT.sections[0].body),
    section_1_title: ABOUT_CONTENT.sections[1].title,
    section_1_body: toHtml(ABOUT_CONTENT.sections[1].body),
    section_2_title: ABOUT_CONTENT.sections[2].title,
    section_2_body: toHtml(ABOUT_CONTENT.sections[2].body),
    section_3_title: ABOUT_CONTENT.sections[3].title,
    section_3_body: toHtml(ABOUT_CONTENT.sections[3].body),
    closing: toHtml(ABOUT_CONTENT.closing),
  },
  protocol: {
    header: PROTOCOL_CONTENT.header,
    title: PROTOCOL_CONTENT.title,
    rule_01: PROTOCOL_CONTENT.rules[0].text,
    rule_02: PROTOCOL_CONTENT.rules[1].text,
    rule_03: PROTOCOL_CONTENT.rules[2].text,
    cta_text: PROTOCOL_CONTENT.cta,
    cta_subtext: PROTOCOL_CONTENT.ctaSubtext,
  },
  contact: {
    headline: CONTACT_CONTENT.headline,
    address_line1: CONTACT_CONTENT.address.line1,
    address_line2: CONTACT_CONTENT.address.line2,
    phone: CONTACT_CONTENT.phone,
    email: CONTACT_CONTENT.email,
    note: CONTACT_CONTENT.note,
  },
  "contact-us": {
    address_line1: CONTACT_CONTENT.address.line1,
    address_line2: CONTACT_CONTENT.address.line2,
    phone: CONTACT_CONTENT.phone,
    email: CONTACT_CONTENT.email,
  },
  terms: {
    title: TERMS_CONTENT.title,
    last_updated: TERMS_CONTENT.lastUpdated,
    body: toHtml(TERMS_CONTENT.body),
  },
  privacy: {
    title: PRIVACY_CONTENT.title,
    last_updated: PRIVACY_CONTENT.lastUpdated,
    body: toHtml(PRIVACY_CONTENT.body),
  },
  shipping: {
    title: SHIPPING_CONTENT.title,
    last_updated: SHIPPING_CONTENT.lastUpdated,
    body: toHtml(SHIPPING_CONTENT.body),
  },
  refund: {
    title: REFUND_CONTENT.title,
    last_updated: REFUND_CONTENT.lastUpdated,
    body: toHtml(REFUND_CONTENT.body),
  },
  "membership-celebration": {
    congratulations_headline: MEMBERSHIP_CELEBRATION_CONTENT.congratulations_headline,
    subtitle: MEMBERSHIP_CELEBRATION_CONTENT.subtitle,
    body_1: toHtml(MEMBERSHIP_CELEBRATION_CONTENT.body_1),
    body_2: toHtml(MEMBERSHIP_CELEBRATION_CONTENT.body_2),
    closing_line: MEMBERSHIP_CELEBRATION_CONTENT.closing_line,
    cta_text: MEMBERSHIP_CELEBRATION_CONTENT.cta_text,
  },
  reservation: {
    headline: RESERVATION_CONTENT.headline,
    body_1: toHtml(RESERVATION_CONTENT.body_1),
    body_2: toHtml(RESERVATION_CONTENT.body_2),
    cta_text: RESERVATION_CONTENT.cta_text,
    fine_print: RESERVATION_CONTENT.fine_print,
    success_headline: RESERVATION_CONTENT.success_headline,
    success_body: toHtml(RESERVATION_CONTENT.success_body),
  },
};

export async function GET(req: NextRequest) {
  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const pageSlug = req.nextUrl.searchParams.get("page");
  if (!pageSlug) return NextResponse.json({ error: "page required" }, { status: 400 });

  const rows = await sql`
    SELECT field_key, value FROM page_content WHERE page_slug = ${pageSlug}
  `;

  // Start with static defaults so every field has a value, then overlay whatever
  // has been saved to the DB. This means the editor always shows real content.
  const defaults = STATIC_DEFAULTS[pageSlug] ?? {};
  const content: Record<string, string> = { ...defaults };
  for (const row of rows) content[row.field_key] = row.value;

  // Translate legacy about section keys (section_billboard_*) to numbered format
  if (pageSlug === "about") {
    const legacyIds = ["billboard", "foundation", "meal", "silent-contract"];
    legacyIds.forEach((id, i) => {
      if (!content[`section_${i}_title`] && content[`section_${id}_title`]) {
        content[`section_${i}_title`] = content[`section_${id}_title`];
      }
      if (!content[`section_${i}_body`] && content[`section_${id}_body`]) {
        content[`section_${i}_body`] = content[`section_${id}_body`];
      }
    });
    if (!content["section_count"]) content["section_count"] = "4";
  }

  return NextResponse.json(content);
}
