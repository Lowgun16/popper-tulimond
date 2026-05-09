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

// Static defaults for every editable field, keyed by page slug then field_key.
// The editor shows these when nothing has been saved to the DB yet.
const STATIC_DEFAULTS: Record<string, Record<string, string>> = {
  about: {
    headline: ABOUT_CONTENT.headline,
    subheadline: ABOUT_CONTENT.subheadline,
    section_billboard_title: ABOUT_CONTENT.sections[0].title,
    section_billboard_body: ABOUT_CONTENT.sections[0].body,
    section_foundation_title: ABOUT_CONTENT.sections[1].title,
    section_foundation_body: ABOUT_CONTENT.sections[1].body,
    section_meal_title: ABOUT_CONTENT.sections[2].title,
    section_meal_body: ABOUT_CONTENT.sections[2].body,
    section_silent_contract_title: ABOUT_CONTENT.sections[3].title,
    section_silent_contract_body: ABOUT_CONTENT.sections[3].body,
    closing: ABOUT_CONTENT.closing,
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
    body: TERMS_CONTENT.body,
  },
  privacy: {
    title: PRIVACY_CONTENT.title,
    last_updated: PRIVACY_CONTENT.lastUpdated,
    body: PRIVACY_CONTENT.body,
  },
  shipping: {
    title: SHIPPING_CONTENT.title,
    last_updated: SHIPPING_CONTENT.lastUpdated,
    body: SHIPPING_CONTENT.body,
  },
  refund: {
    title: REFUND_CONTENT.title,
    last_updated: REFUND_CONTENT.lastUpdated,
    body: REFUND_CONTENT.body,
  },
  "membership-celebration": {
    congratulations_headline: MEMBERSHIP_CELEBRATION_CONTENT.congratulations_headline,
    subtitle: MEMBERSHIP_CELEBRATION_CONTENT.subtitle,
    body_1: MEMBERSHIP_CELEBRATION_CONTENT.body_1,
    body_2: MEMBERSHIP_CELEBRATION_CONTENT.body_2,
    closing_line: MEMBERSHIP_CELEBRATION_CONTENT.closing_line,
    cta_text: MEMBERSHIP_CELEBRATION_CONTENT.cta_text,
  },
  reservation: {
    headline: RESERVATION_CONTENT.headline,
    body_1: RESERVATION_CONTENT.body_1,
    body_2: RESERVATION_CONTENT.body_2,
    cta_text: RESERVATION_CONTENT.cta_text,
    fine_print: RESERVATION_CONTENT.fine_print,
    success_headline: RESERVATION_CONTENT.success_headline,
    success_body: RESERVATION_CONTENT.success_body,
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

  return NextResponse.json(content);
}
