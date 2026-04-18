# Build 2 Phase B1 — DB + Content Serving + SMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace static content in all overlays and legal pages with Neon Postgres DB content, and wire the SMS signup to a real Twilio-backed API.

**Architecture:** A seeding script writes all current `staticContent.ts` values into Neon once. All overlay and legal page components are refactored to accept content as props instead of importing from `staticContent.ts`. `page.tsx` is split into a server component (fetches content) + `ClientPage.tsx` (client component, current logic). On publish (Phase B2), `revalidatePath()` drops the cache and the next request fetches fresh content in under 2 seconds.

**Tech Stack:** Next.js 16 App Router, `@neondatabase/serverless`, `twilio`, React `cache()` for dedup, `revalidatePath()` for cache invalidation, Jest 29 for unit tests.

**Branch:** Create `feature/build2-phase-b1` branched from `feature/build2-phase-a`. Do NOT branch from `main` or `staging` — Phase A work lives on `feature/build2-phase-a`.

---

## File Structure

**New files:**
- `src/lib/db.ts` — Neon client singleton
- `src/lib/contentTypes.ts` — TypeScript types for each page's content shape
- `src/lib/seedContent.ts` — converts `staticContent.ts` exports → flat DB rows
- `src/lib/pageContent.ts` — server-side fetch helpers (uses React `cache()`)
- `src/lib/__tests__/seedContent.test.ts` — unit tests for `buildSeedRows`
- `src/lib/__tests__/pageContent.test.ts` — unit tests for parse helpers
- `src/app/ClientPage.tsx` — current `page.tsx` logic moved here (receives `allContent` prop)
- `src/app/api/seed-content/route.ts` — POST endpoint to seed DB (idempotent, one-time)
- `src/app/api/sms-signup/route.ts` — real SMS signup handler (Neon + Twilio)
- `scripts/migrate-b1.sql` — SQL to create `page_content` and `sms_signups` tables

**Modified files:**
- `src/app/page.tsx` — becomes async server component; fetches content; renders `<ClientPage>`
- `src/components/Portal.tsx` — adds `allContent: AllPageContent` prop; passes to `CollectionOverlay`
- `src/components/CollectionOverlay.tsx` — adds `allContent: AllPageContent` prop; passes content slices to each overlay
- `src/components/overlays/AboutOverlay.tsx` — accepts `content: AboutContent` prop, removes `staticContent` import
- `src/components/overlays/ProtocolOverlay.tsx` — accepts `content: ProtocolContent` prop
- `src/components/overlays/ContactOverlay.tsx` — accepts `content: ContactContent` prop
- `src/components/overlays/LegalContentOverlay.tsx` — accepts `allLegal: AllLegalContent` prop
- `src/app/terms/page.tsx` — fetches from DB
- `src/app/privacy/page.tsx` — fetches from DB
- `src/app/shipping/page.tsx` — fetches from DB
- `src/app/refund/page.tsx` — fetches from DB
- `src/app/contact-us/page.tsx` — fetches from DB
- `src/components/SmsSignupSheet.tsx` — calls `/api/sms-signup` instead of console.log stub

---

## Task 1: Worktree setup + install packages

**Files:**
- Create: `.worktrees/build2-phase-b1/` (worktree)

- [ ] **Step 1: Create worktree branched from Phase A**

```bash
git worktree add .worktrees/build2-phase-b1 -b feature/build2-phase-b1 feature/build2-phase-a
cd .worktrees/build2-phase-b1
npm install
```

- [ ] **Step 2: Verify tests pass before touching anything**

```bash
npm test
```

Expected: all existing tests pass (at minimum `overlayState.test.ts` — 2 tests).

- [ ] **Step 3: Install new packages**

```bash
npm install @neondatabase/serverless twilio
npm install --save-dev @types/twilio
```

- [ ] **Step 4: Verify install succeeded**

```bash
cat package.json | grep -E "neon|twilio"
```

Expected output includes:
```
"@neondatabase/serverless": "...",
"twilio": "...",
```

- [ ] **Step 5: Add env vars to `.env.local`**

Create or append to `.env.local` in the worktree root:

```bash
# Neon Postgres
DATABASE_URL=

# Twilio (leave blank for now — fill in before deploying)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

Do NOT commit `.env.local`. Confirm it is in `.gitignore`:

```bash
grep ".env.local" .gitignore
```

Expected: `.env.local` appears in `.gitignore`. If missing, add it.

---

## Task 2: DB schema — create Neon tables

**Files:**
- Create: `scripts/migrate-b1.sql`

- [ ] **Step 1: Write the migration file**

Create `scripts/migrate-b1.sql`:

```sql
-- Build 2 Phase B1 migration
-- Run once against your Neon database via the Neon SQL editor or psql.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS page_content (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug   TEXT NOT NULL,
  field_key   TEXT NOT NULL,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by  UUID,
  UNIQUE (page_slug, field_key)
);

CREATE TABLE IF NOT EXISTS sms_signups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       TEXT NOT NULL,
  email       TEXT,
  source      TEXT NOT NULL CHECK (source IN ('protocol_cta', 'blocked_purchase')),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

- [ ] **Step 2: Run the migration in Neon**

1. Open [console.neon.tech](https://console.neon.tech) → your project → SQL Editor
2. Paste the contents of `scripts/migrate-b1.sql` and run it
3. Confirm both tables appear in the Tables panel

Note: If Neon isn't provisioned yet, provision it via the Vercel Marketplace: Vercel dashboard → Storage → Browse Marketplace → Neon. The `DATABASE_URL` will be auto-added to Vercel env vars. Copy it to your `.env.local`.

- [ ] **Step 3: Commit the migration file**

```bash
git add scripts/migrate-b1.sql
git commit -m "chore: add Phase B1 DB migration — page_content and sms_signups tables"
```

---

## Task 3: DB client singleton

**Files:**
- Create: `src/lib/db.ts`
- Test: `src/lib/__tests__/db.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/db.test.ts`:

```typescript
// src/lib/__tests__/db.test.ts
// We can't test the actual Neon connection in unit tests.
// We verify the module exports the expected shape.

describe("db module", () => {
  it("exports a sql tagged template function", () => {
    // Mock the env var so the module doesn't throw during import
    process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { sql } = require("../db");
    expect(typeof sql).toBe("function");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="src/lib/__tests__/db.test.ts"
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/lib/db.ts`**

```typescript
// src/lib/db.ts
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export const sql = neon(process.env.DATABASE_URL);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern="src/lib/__tests__/db.test.ts"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.ts src/lib/__tests__/db.test.ts
git commit -m "feat: add Neon DB client singleton"
```

---

## Task 4: Content type definitions

**Files:**
- Create: `src/lib/contentTypes.ts`

- [ ] **Step 1: Write `src/lib/contentTypes.ts`**

This file defines TypeScript types that match the shape of each page's content. They mirror what `staticContent.ts` exports — same field names, same structure.

```typescript
// src/lib/contentTypes.ts

export type AboutContent = {
  headline: string;
  subheadline: string;
  sections: Array<{ id: string; title: string; body: string }>;
  closing: string;
};

export type ProtocolContent = {
  header: string;
  title: string;
  rules: Array<{ number: string; text: string }>;
  cta: string;
  ctaSubtext: string;
};

export type ContactContent = {
  headline: string;
  address: { line1: string; line2: string };
  phone: string;
  email: string;
  note: string;
};

export type LegalContent = {
  title: string;
  lastUpdated: string;
  body: string;
};

export type ContactUsContent = {
  address: { line1: string; line2: string };
  phone: string;
  email: string;
  note: string;
};

export type AllLegalContent = {
  terms: LegalContent;
  privacy: LegalContent;
  shipping: LegalContent;
  refund: LegalContent;
  contactUs: ContactUsContent;
};

export type AllPageContent = {
  about: AboutContent;
  protocol: ProtocolContent;
  contact: ContactContent;
  terms: LegalContent;
  privacy: LegalContent;
  shipping: LegalContent;
  refund: LegalContent;
  contactUs: ContactUsContent;
};
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/contentTypes.ts
git commit -m "feat: add content type definitions for all pages"
```

---

## Task 5: Seed content utilities + tests

**Files:**
- Create: `src/lib/seedContent.ts`
- Create: `src/lib/__tests__/seedContent.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/seedContent.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="seedContent.test.ts"
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/lib/seedContent.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="seedContent.test.ts"
```

Expected: PASS — all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seedContent.ts src/lib/__tests__/seedContent.test.ts
git commit -m "feat: add DB seeding utility — converts staticContent to page_content rows"
```

---

## Task 6: Content fetching helpers + tests

**Files:**
- Create: `src/lib/pageContent.ts`
- Create: `src/lib/__tests__/pageContent.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/pageContent.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="pageContent.test.ts"
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/lib/pageContent.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="pageContent.test.ts"
```

Expected: PASS — all tests pass.

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/pageContent.ts src/lib/__tests__/pageContent.test.ts
git commit -m "feat: add content fetching helpers — DB-backed with static fallback"
```

---

## Task 7: Seed API route + run seeding

**Files:**
- Create: `src/app/api/seed-content/route.ts`

- [ ] **Step 1: Create `src/app/api/seed-content/route.ts`**

```typescript
// src/app/api/seed-content/route.ts
// Idempotent seeding endpoint. Seeds page_content from staticContent.ts.
// Safe to call multiple times — uses ON CONFLICT DO NOTHING.
// After seeding once, calling again returns { ok: true, seeded: 0 }.
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { buildSeedRows } from "@/lib/seedContent";

export async function POST() {
  try {
    const rows = buildSeedRows();
    let seeded = 0;

    for (const row of rows) {
      const result = await sql`
        INSERT INTO page_content (page_slug, field_key, value)
        VALUES (${row.page_slug}, ${row.field_key}, ${row.value})
        ON CONFLICT (page_slug, field_key) DO NOTHING
      `;
      // Neon returns affected row count in the result
      if (Array.isArray(result) && result.length > 0) seeded++;
    }

    return NextResponse.json({ ok: true, seeded, total: rows.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Start dev server and run the seed**

```bash
npm run dev
```

In a separate terminal:

```bash
curl -X POST http://localhost:3000/api/seed-content
```

Expected response:
```json
{ "ok": true, "seeded": <number>, "total": <number> }
```

`seeded` should be equal to `total` on first run (all rows inserted).

- [ ] **Step 3: Run seed again to confirm idempotency**

```bash
curl -X POST http://localhost:3000/api/seed-content
```

Expected response:
```json
{ "ok": true, "seeded": 0, "total": <number> }
```

`seeded: 0` confirms ON CONFLICT DO NOTHING is working — no duplicates created.

- [ ] **Step 4: Verify rows in Neon**

Open Neon console → SQL Editor and run:

```sql
SELECT page_slug, COUNT(*) as field_count FROM page_content GROUP BY page_slug ORDER BY page_slug;
```

Expected: rows for about, contact, contact-us, privacy, protocol, refund, shipping, terms.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/seed-content/route.ts
git commit -m "feat: add seed-content API route — idempotent DB seeding from staticContent"
```

---

## Task 8: Refactor AboutOverlay to accept content as props

**Files:**
- Modify: `src/components/overlays/AboutOverlay.tsx`

- [ ] **Step 1: Update `AboutOverlay.tsx`**

Remove the `staticContent` import. Add `content: AboutContent` prop. Replace all `ABOUT_CONTENT.x` references with `content.x`. The rendering logic does not change — only the data source.

```typescript
// src/components/overlays/AboutOverlay.tsx
"use client";

import type { CSSProperties } from "react";
import OverlayShell from "./OverlayShell";
import type { AboutContent } from "@/lib/contentTypes";

interface AboutOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  content: AboutContent;
}

const eyebrow: CSSProperties = {
  fontFamily: "var(--font-title, serif)",
  fontSize: "9px",
  letterSpacing: "0.35em",
  textTransform: "uppercase",
  color: "rgba(196,164,86,0.7)",
};

const sectionTitle: CSSProperties = {
  fontFamily: "var(--font-display, serif)",
  fontSize: "18px",
  color: "rgba(240,232,215,0.9)",
  letterSpacing: "0.06em",
  marginBottom: "16px",
  marginTop: "40px",
};

const bodyText: CSSProperties = {
  fontFamily: "var(--font-body, sans-serif)",
  fontSize: "14px",
  color: "rgba(240,232,215,0.65)",
  lineHeight: "1.85",
  letterSpacing: "0.02em",
  whiteSpace: "pre-line",
};

export default function AboutOverlay({ isOpen, onClose, content }: AboutOverlayProps) {
  return (
    <OverlayShell isOpen={isOpen} onClose={onClose} label="About Popper Tulimond">
      <p style={eyebrow}>Popper Tulimond</p>
      <h1 style={{
        fontFamily: "var(--font-display, serif)",
        fontSize: "clamp(28px, 5vw, 44px)",
        color: "rgba(240,232,215,0.95)",
        letterSpacing: "0.04em",
        marginTop: "12px",
        marginBottom: "6px",
        fontWeight: 300,
      }}>
        {content.headline}
      </h1>
      <p style={{ ...eyebrow, color: "rgba(240,232,215,0.35)", marginBottom: "40px" }}>
        {content.subheadline}
      </p>

      <div style={{ width: "48px", height: "1px", background: "rgba(196,164,86,0.5)", marginBottom: "40px" }} />

      {content.sections.map((section) => (
        <div key={section.id}>
          <h2 style={sectionTitle}>{section.title}</h2>
          <p style={bodyText}>{section.body}</p>
        </div>
      ))}

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "48px", paddingTop: "32px" }}>
        <p style={{ ...bodyText, color: "rgba(196,164,86,0.5)", whiteSpace: "pre-line" }}>
          {content.closing}
        </p>
      </div>
    </OverlayShell>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: errors only for downstream callers of `AboutOverlay` that haven't been updated yet (they're missing the `content` prop). That's expected — they'll be fixed in Task 12.

- [ ] **Step 3: Commit**

```bash
git add src/components/overlays/AboutOverlay.tsx
git commit -m "refactor: AboutOverlay accepts content as prop instead of importing staticContent"
```

---

## Task 9: Refactor ProtocolOverlay to accept content as props

**Files:**
- Modify: `src/components/overlays/ProtocolOverlay.tsx`

- [ ] **Step 1: Update `ProtocolOverlay.tsx`**

Remove the `staticContent` import. Add `content: ProtocolContent` prop. Replace all `PROTOCOL_CONTENT.x` references with `content.x`. The RedGunSvg component and all styling remain unchanged.

```typescript
// src/components/overlays/ProtocolOverlay.tsx
"use client";

import type { CSSProperties } from "react";
import OverlayShell from "./OverlayShell";
import type { ProtocolContent } from "@/lib/contentTypes";

interface ProtocolOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestSmsSignup: () => void;
  content: ProtocolContent;
}

function RedGunSvg() {
  return (
    <svg width="22" height="38" viewBox="0 0 44 76" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="17" y="2" width="10" height="28" rx="2" stroke="#8B1A1A" strokeWidth="2.5" fill="none"/>
      <rect x="14" y="8" width="16" height="22" rx="2" stroke="#8B1A1A" strokeWidth="2" fill="none"/>
      <rect x="16" y="12" width="8" height="8" rx="1" stroke="#8B1A1A" strokeWidth="1.5" fill="none"/>
      <rect x="16" y="28" width="16" height="10" rx="1" stroke="#8B1A1A" strokeWidth="2" fill="none"/>
      <path d="M20 38 Q14 46 20 52 L28 52" stroke="#8B1A1A" strokeWidth="2" fill="none"/>
      <line x1="24" y1="39" x2="24" y2="48" stroke="#8B1A1A" strokeWidth="2.5" strokeLinecap="round"/>
      <rect x="18" y="50" width="12" height="22" rx="2" stroke="#8B1A1A" strokeWidth="2" fill="none"/>
      <line x1="19" y1="56" x2="29" y2="56" stroke="#8B1A1A" strokeWidth="1" strokeOpacity="0.6"/>
      <line x1="19" y1="61" x2="29" y2="61" stroke="#8B1A1A" strokeWidth="1" strokeOpacity="0.6"/>
      <line x1="19" y1="66" x2="29" y2="66" stroke="#8B1A1A" strokeWidth="1" strokeOpacity="0.6"/>
      <circle cx="24" cy="8" r="3" stroke="#8B1A1A" strokeWidth="2" fill="none"/>
      <rect x="20" y="0" width="4" height="4" rx="1" fill="#8B1A1A"/>
    </svg>
  );
}

export default function ProtocolOverlay({ isOpen, onClose, onRequestSmsSignup, content }: ProtocolOverlayProps) {
  return (
    <OverlayShell isOpen={isOpen} onClose={onClose} label="The Protocol">
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100%" }}>
        <div style={{
          background: "linear-gradient(160deg, #EDE8DC, #E0D9C8)",
          padding: "36px 36px 52px 40px",
          maxWidth: "380px",
          width: "100%",
          position: "relative",
          transform: "rotate(-1.2deg)",
          boxShadow: "4px 8px 32px rgba(0,0,0,0.8), inset 0 0 40px rgba(0,0,0,0.04)",
          borderRadius: "1px 3px 3px 1px",
        }}>
          <div style={{
            position: "absolute", top: "-7px", left: "50%", transform: "translateX(-50%)",
            width: "11px", height: "11px", borderRadius: "50%",
            background: "#8B1A1A", boxShadow: "0 2px 6px rgba(0,0,0,0.6)",
          }} />

          <p style={{
            fontFamily: "'Courier New', monospace",
            fontSize: "8px", letterSpacing: "0.3em",
            color: "#4a3f2f", textTransform: "uppercase" as CSSProperties["textTransform"], marginBottom: "10px",
          }}>
            {content.header}
          </p>

          <h2 style={{
            fontFamily: "'Courier New', monospace",
            fontSize: "20px", color: "#1a140a",
            marginBottom: "18px", letterSpacing: "0.08em", fontWeight: 700,
          }}>
            {content.title}
          </h2>

          <div style={{ width: "100%", height: "1px", background: "#9a8a6a", marginBottom: "22px" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "26px" }}>
            {content.rules.map((rule) => (
              <div key={rule.number} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <span style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: "11px", color: "#8B1A1A",
                  fontWeight: 700, minWidth: "28px", paddingTop: "1px",
                }}>
                  {rule.number} —
                </span>
                <p style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: "11.5px", color: "#1a140a", lineHeight: 1.65,
                }}>
                  {rule.text}
                </p>
              </div>
            ))}
          </div>

          <div style={{ width: "100%", height: "1px", background: "#9a8a6a", marginBottom: "18px" }} />

          <div style={{ fontFamily: "'Courier New', monospace", fontSize: "10px", color: "#4a3f2f", lineHeight: 1.65 }}>
            <button
              type="button"
              onClick={onRequestSmsSignup}
              style={{
                background: "none", border: "none", padding: 0, cursor: "pointer",
                fontFamily: "'Courier New', monospace",
                fontSize: "10px", color: "#1a140a", fontWeight: 700,
                textDecoration: "underline", textUnderlineOffset: "3px",
              }}
            >
              {content.cta}
            </button>
            <br />
            <span style={{ color: "#4a3f2f" }}>{content.ctaSubtext}</span>
          </div>

          <div style={{ position: "absolute", bottom: "16px", right: "18px", opacity: 0.15 }}>
            <RedGunSvg />
          </div>
        </div>
      </div>
    </OverlayShell>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: same pattern as Task 8 — errors only for callers not yet updated.

- [ ] **Step 3: Commit**

```bash
git add src/components/overlays/ProtocolOverlay.tsx
git commit -m "refactor: ProtocolOverlay accepts content as prop instead of importing staticContent"
```

---

## Task 10: Refactor ContactOverlay to accept content as props

**Files:**
- Modify: `src/components/overlays/ContactOverlay.tsx`

- [ ] **Step 1: Update `ContactOverlay.tsx`**

```typescript
// src/components/overlays/ContactOverlay.tsx
"use client";

import type { CSSProperties } from "react";
import OverlayShell from "./OverlayShell";
import type { ContactContent } from "@/lib/contentTypes";

interface ContactOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  content: ContactContent;
}

const eyebrowStyle: CSSProperties = {
  fontFamily: "var(--font-title, serif)",
  fontSize: "9px",
  letterSpacing: "0.35em",
  textTransform: "uppercase",
  color: "rgba(196,164,86,0.6)",
  marginBottom: "8px",
};

const fieldLabelStyle: CSSProperties = {
  fontFamily: "var(--font-title, serif)",
  fontSize: "9px",
  letterSpacing: "0.35em",
  textTransform: "uppercase",
  color: "rgba(196,164,86,0.6)",
  marginBottom: "8px",
};

const valueStyle: CSSProperties = {
  fontFamily: "var(--font-body, sans-serif)",
  fontSize: "15px",
  color: "rgba(240,232,215,0.85)",
  lineHeight: "1.6",
};

export default function ContactOverlay({ isOpen, onClose, content }: ContactOverlayProps) {
  return (
    <OverlayShell isOpen={isOpen} onClose={onClose} label="Contact Popper Tulimond">
      <p style={{ ...eyebrowStyle, marginBottom: "16px" }}>Popper Tulimond</p>
      <h1 style={{
        fontFamily: "var(--font-display, serif)",
        fontSize: "clamp(24px, 4vw, 36px)",
        color: "rgba(240,232,215,0.95)",
        letterSpacing: "0.04em",
        marginBottom: "48px",
        fontWeight: 300,
      }}>
        {content.headline}
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        <div>
          <p style={fieldLabelStyle}>Headquarters</p>
          <p style={valueStyle}>
            {content.address.line1}<br />
            {content.address.line2}
          </p>
        </div>

        {content.phone && (
          <div>
            <p style={fieldLabelStyle}>Phone</p>
            <a href={`tel:${content.phone}`} style={{ ...valueStyle, textDecoration: "none" }}>
              {content.phone}
            </a>
          </div>
        )}

        {content.email && (
          <div>
            <p style={fieldLabelStyle}>Email</p>
            <a href={`mailto:${content.email}`} style={{ ...valueStyle, textDecoration: "none" }}>
              {content.email}
            </a>
          </div>
        )}

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "24px", marginTop: "8px" }}>
          <p style={{
            fontFamily: "var(--font-body, sans-serif)",
            fontSize: "13px",
            color: "rgba(240,232,215,0.4)",
            lineHeight: "1.7",
            fontStyle: "italic",
          }}>
            {content.note}
          </p>
        </div>
      </div>
    </OverlayShell>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/overlays/ContactOverlay.tsx
git commit -m "refactor: ContactOverlay accepts content as prop instead of importing staticContent"
```

---

## Task 11: Refactor LegalContentOverlay to accept content as props

**Files:**
- Modify: `src/components/overlays/LegalContentOverlay.tsx`

- [ ] **Step 1: Update `LegalContentOverlay.tsx`**

```typescript
// src/components/overlays/LegalContentOverlay.tsx
"use client";

import type { CSSProperties } from "react";
import OverlayShell from "./OverlayShell";
import type { AllLegalContent, LegalContent, ContactUsContent } from "@/lib/contentTypes";

export type LegalPage = "terms" | "privacy" | "shipping" | "refund" | "contact-us";

interface LegalContentOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  page: LegalPage | null;
  allLegal: AllLegalContent;
}

const GOLD = "rgba(196,164,86,0.7)";

const eyebrow: CSSProperties = {
  fontFamily: "var(--font-title, serif)",
  fontSize: "9px",
  letterSpacing: "0.3em",
  textTransform: "uppercase",
  color: GOLD,
  marginBottom: "16px",
};

const heading: CSSProperties = {
  fontFamily: "var(--font-display, serif)",
  fontSize: "clamp(24px, 4vw, 36px)",
  color: "rgba(240,232,215,0.95)",
  fontWeight: 300,
  letterSpacing: "0.04em",
  marginBottom: "40px",
};

const body: CSSProperties = {
  fontFamily: "var(--font-body, sans-serif)",
  fontSize: "14px",
  lineHeight: "1.85",
  color: "rgba(240,232,215,0.65)",
  whiteSpace: "pre-line",
};

function LegalTextContent({ content }: { content: LegalContent }) {
  return (
    <>
      <p style={eyebrow}>Popper Tulimond — {content.lastUpdated}</p>
      <h1 style={heading}>{content.title}</h1>
      <p style={body}>{content.body}</p>
    </>
  );
}

function ContactUsPageContent({ content }: { content: ContactUsContent }) {
  const optionalLines = [
    content.phone ? `Phone: ${content.phone}` : null,
    content.email ? `Email: ${content.email}` : null,
  ].filter((x): x is string => x !== null);
  const lines = [
    content.address.line1,
    content.address.line2,
    ...(optionalLines.length ? ["", ...optionalLines] : []),
    "",
    content.note,
  ].join("\n");
  return (
    <>
      <p style={eyebrow}>Popper Tulimond</p>
      <h1 style={heading}>Contact Us</h1>
      <p style={body}>{lines}</p>
    </>
  );
}

function LegalContent({ page, allLegal }: { page: LegalPage; allLegal: AllLegalContent }) {
  switch (page) {
    case "terms":    return <LegalTextContent content={allLegal.terms} />;
    case "privacy":  return <LegalTextContent content={allLegal.privacy} />;
    case "shipping": return <LegalTextContent content={allLegal.shipping} />;
    case "refund":   return <LegalTextContent content={allLegal.refund} />;
    case "contact-us": return <ContactUsPageContent content={allLegal.contactUs} />;
    default:         return null;
  }
}

export default function LegalContentOverlay({ isOpen, onClose, page, allLegal }: LegalContentOverlayProps) {
  return (
    <OverlayShell isOpen={isOpen} onClose={onClose} label={page ? `Legal — ${page}` : "Legal"}>
      {page && <LegalContent page={page} allLegal={allLegal} />}
    </OverlayShell>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/overlays/LegalContentOverlay.tsx
git commit -m "refactor: LegalContentOverlay accepts allLegal as prop instead of importing staticContent"
```

---

## Task 12: Split page.tsx + thread allContent props through Portal and CollectionOverlay

**Files:**
- Create: `src/app/ClientPage.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/Portal.tsx`
- Modify: `src/components/CollectionOverlay.tsx`

This is the most structural change in B1. `page.tsx` becomes an async server component that fetches content and renders `<ClientPage>`. All current `page.tsx` logic moves to `ClientPage.tsx`. The `allContent` prop threads through `Portal` → `CollectionOverlay` → each overlay.

- [ ] **Step 1: Create `src/app/ClientPage.tsx`**

This is the current `page.tsx` logic unchanged, plus `allContent: AllPageContent` as a prop passed to `Portal`.

```typescript
// src/app/ClientPage.tsx
"use client";

import { useState, useCallback } from "react";
import Portal from "@/components/Portal";
import CartDrawer, { type CartItem } from "@/components/CartDrawer";
import ProtocolGate from "@/components/ProtocolGate";
import type { LookbookContext } from "@/components/studio/studioTypes";
import type { AllPageContent } from "@/lib/contentTypes";

interface ClientPageProps {
  allContent: AllPageContent;
}

export default function ClientPage({ allContent }: ClientPageProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [protocolGateOpen, setProtocolGateOpen] = useState(false);

  const handleAddToCart = useCallback((item: LookbookContext, size: string) => {
    const newItem: CartItem = {
      id: `${item.name}-${Math.random().toString(36).slice(2, 9)}`,
      name: item.name,
      collection: item.collection,
      colorway: item.colorway,
      size,
      price: item.price,
    };
    setCartItems((prev) => [...prev, newItem]);
    setIsCartOpen(true);
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return (
    <main>
      <Portal onAddToCart={handleAddToCart} allContent={allContent} />
      <CartDrawer
        isOpen={isCartOpen}
        items={cartItems}
        onClose={() => setIsCartOpen(false)}
        onRemoveItem={handleRemoveItem}
        onApplePay={() => { setIsCartOpen(false); setProtocolGateOpen(true); }}
        onGooglePay={() => { setIsCartOpen(false); setProtocolGateOpen(true); }}
        onPayOtherWay={() => { setIsCartOpen(false); setProtocolGateOpen(true); }}
      />
      <ProtocolGate
        isOpen={protocolGateOpen}
        onClose={() => setProtocolGateOpen(false)}
        onViewProtocol={() => setProtocolGateOpen(false)}
        onRequestSmsSignup={() => setProtocolGateOpen(false)}
      />
    </main>
  );
}
```

- [ ] **Step 2: Update `src/app/page.tsx` to be a server component**

```typescript
// src/app/page.tsx
import { fetchAllPageContent } from "@/lib/pageContent";
import ClientPage from "./ClientPage";

export default async function Page() {
  const allContent = await fetchAllPageContent();
  return <ClientPage allContent={allContent} />;
}
```

- [ ] **Step 3: Update `src/components/Portal.tsx`**

Add `allContent: AllPageContent` to `PortalProps` and pass it to `CollectionOverlay`. Find the line where `CollectionOverlay` is rendered inside Portal and add the prop.

Read the current `Portal.tsx` to find the exact CollectionOverlay usage, then add:

```typescript
// Add to PortalProps interface:
allContent: AllPageContent;

// Add import at top:
import type { AllPageContent } from "@/lib/contentTypes";

// Add to CollectionOverlay render call (find it in Portal.tsx and add):
allContent={allContent}
```

Specifically, inside `Portal.tsx`:

1. Add to imports: `import type { AllPageContent } from "@/lib/contentTypes";`
2. Add `allContent: AllPageContent;` to the `PortalProps` interface
3. Destructure `allContent` from props: `export default function Portal({ onAddToCart, allContent }: PortalProps)`
4. Pass to CollectionOverlay: add `allContent={allContent}` to the `<CollectionOverlay ... />` JSX

- [ ] **Step 4: Update `src/components/CollectionOverlay.tsx`**

Add `allContent: AllPageContent` to the component's props interface. Find the existing `CollectionOverlayProps` interface and add the field. Then pass content slices to each overlay.

```typescript
// Add import at top of CollectionOverlay.tsx:
import type { AllPageContent } from "@/lib/contentTypes";

// Add to CollectionOverlayProps interface (find existing interface):
allContent: AllPageContent;

// Destructure in function signature:
export default function CollectionOverlay({ opacity, onAddToCart, allContent }: CollectionOverlayProps)

// Find each overlay usage and add the content prop:
// AboutOverlay:
<AboutOverlay isOpen={activeOverlay === "about"} onClose={() => setActiveOverlay(null)} content={allContent.about} />

// ProtocolOverlay:
<ProtocolOverlay
  isOpen={activeOverlay === "protocol"}
  onClose={() => setActiveOverlay(null)}
  onRequestSmsSignup={() => { setActiveOverlay(null); setSmsSource("protocol_cta"); setSmsOpen(true); }}
  content={allContent.protocol}
/>

// ContactOverlay:
<ContactOverlay isOpen={activeOverlay === "contact"} onClose={() => setActiveOverlay(null)} content={allContent.contact} />

// LegalContentOverlay — pass allLegal built from allContent:
<LegalContentOverlay
  isOpen={activeLegalPage !== null}
  onClose={() => setActiveLegalPage(null)}
  page={activeLegalPage}
  allLegal={{
    terms: allContent.terms,
    privacy: allContent.privacy,
    shipping: allContent.shipping,
    refund: allContent.refund,
    contactUs: allContent.contactUs,
  }}
/>
```

- [ ] **Step 5: TypeScript check — should now be clean**

```bash
npx tsc --noEmit
```

Expected: 0 errors. All prop types are satisfied.

- [ ] **Step 6: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 7: Verify the site works end-to-end**

```bash
npm run dev
```

Open `http://localhost:3000`. Verify:
- Store loads normally
- About overlay opens and shows the correct content
- Protocol overlay opens and shows the correct content
- Contact overlay opens
- Footer → Terms opens the legal overlay

- [ ] **Step 8: Commit**

```bash
git add src/app/ClientPage.tsx src/app/page.tsx src/components/Portal.tsx src/components/CollectionOverlay.tsx
git commit -m "feat: serve all overlay content from Neon DB via server component — page.tsx split into server + ClientPage"
```

---

## Task 13: Update legal app routes to fetch from DB

**Files:**
- Modify: `src/app/terms/page.tsx`
- Modify: `src/app/privacy/page.tsx`
- Modify: `src/app/shipping/page.tsx`
- Modify: `src/app/refund/page.tsx`
- Modify: `src/app/contact-us/page.tsx`

All five follow the same pattern: become async server components, fetch from DB, fall back to static on error.

- [ ] **Step 1: Update `src/app/terms/page.tsx`**

```typescript
// src/app/terms/page.tsx
import LegalPageLayout from "@/components/LegalPageLayout";
import { fetchLegalContent } from "@/lib/pageContent";

export const metadata = { title: "Terms of Use — Popper Tulimond" };

export default async function TermsPage() {
  const content = await fetchLegalContent("terms");
  return (
    <LegalPageLayout title={content.title} lastUpdated={content.lastUpdated}>
      {content.body}
    </LegalPageLayout>
  );
}
```

- [ ] **Step 2: Update `src/app/privacy/page.tsx`**

```typescript
// src/app/privacy/page.tsx
import LegalPageLayout from "@/components/LegalPageLayout";
import { fetchLegalContent } from "@/lib/pageContent";

export const metadata = { title: "Privacy Policy — Popper Tulimond" };

export default async function PrivacyPage() {
  const content = await fetchLegalContent("privacy");
  return (
    <LegalPageLayout title={content.title} lastUpdated={content.lastUpdated}>
      {content.body}
    </LegalPageLayout>
  );
}
```

- [ ] **Step 3: Update `src/app/shipping/page.tsx`**

```typescript
// src/app/shipping/page.tsx
import LegalPageLayout from "@/components/LegalPageLayout";
import { fetchLegalContent } from "@/lib/pageContent";

export const metadata = { title: "Shipping & Fulfillment — Popper Tulimond" };

export default async function ShippingPage() {
  const content = await fetchLegalContent("shipping");
  return (
    <LegalPageLayout title={content.title} lastUpdated={content.lastUpdated}>
      {content.body}
    </LegalPageLayout>
  );
}
```

- [ ] **Step 4: Update `src/app/refund/page.tsx`**

```typescript
// src/app/refund/page.tsx
import LegalPageLayout from "@/components/LegalPageLayout";
import { fetchLegalContent } from "@/lib/pageContent";

export const metadata = { title: "Refund Policy — Popper Tulimond" };

export default async function RefundPage() {
  const content = await fetchLegalContent("refund");
  return (
    <LegalPageLayout title={content.title} lastUpdated={content.lastUpdated}>
      {content.body}
    </LegalPageLayout>
  );
}
```

- [ ] **Step 5: Update `src/app/contact-us/page.tsx`**

```typescript
// src/app/contact-us/page.tsx
import LegalPageLayout from "@/components/LegalPageLayout";
import { fetchContactUsContent } from "@/lib/pageContent";

export const metadata = { title: "Contact Us — Popper Tulimond" };

export default async function ContactUsPage() {
  const content = await fetchContactUsContent();
  const optionalLines = [
    content.phone ? `Phone: ${content.phone}` : null,
    content.email ? `Email: ${content.email}` : null,
  ].filter((x): x is string => x !== null);
  const lines = [
    content.address.line1,
    content.address.line2,
    ...(optionalLines.length ? ["", ...optionalLines] : []),
    "",
    content.note,
  ].join("\n");

  return (
    <LegalPageLayout title="Contact Us" lastUpdated="">
      {lines}
    </LegalPageLayout>
  );
}
```

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 7: Verify legal pages load**

With dev server running, open:
- `http://localhost:3000/terms`
- `http://localhost:3000/privacy`
- `http://localhost:3000/contact-us`

Each should display the correct content from the DB.

- [ ] **Step 8: Commit**

```bash
git add src/app/terms/page.tsx src/app/privacy/page.tsx src/app/shipping/page.tsx src/app/refund/page.tsx src/app/contact-us/page.tsx
git commit -m "feat: legal page routes fetch content from Neon DB"
```

---

## Task 14: SMS signup API route

**Files:**
- Create: `src/app/api/sms-signup/route.ts`

- [ ] **Step 1: Create `src/app/api/sms-signup/route.ts`**

```typescript
// src/app/api/sms-signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import twilio from "twilio";

export async function POST(req: NextRequest) {
  let body: { phone?: unknown; email?: unknown; source?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { phone, email, source } = body;

  // Validate phone
  if (typeof phone !== "string" || phone.trim().length < 7) {
    return NextResponse.json(
      { ok: false, error: "Valid phone number required" },
      { status: 400 }
    );
  }

  // Validate source
  if (source !== "protocol_cta" && source !== "blocked_purchase") {
    return NextResponse.json(
      { ok: false, error: "Invalid source" },
      { status: 400 }
    );
  }

  const cleanPhone = phone.trim();
  const cleanEmail = typeof email === "string" && email.trim().length > 0
    ? email.trim()
    : null;

  // Save to DB
  try {
    await sql`
      INSERT INTO sms_signups (phone, email, source)
      VALUES (${cleanPhone}, ${cleanEmail}, ${source})
    `;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  // Send welcome SMS via Twilio (non-blocking — if Twilio fails, signup is still saved)
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (accountSid && authToken && fromNumber) {
    try {
      const client = twilio(accountSid, authToken);
      await client.messages.create({
        body: "You're in. Text CONSTABLE when we send you the number on the 16th. — Popper Tulimond",
        from: fromNumber,
        to: cleanPhone,
      });
    } catch (twilioErr) {
      // Log but don't fail the request — signup is already saved
      console.error("[sms-signup] Twilio error:", twilioErr);
    }
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Test the endpoint with dev server running**

```bash
curl -X POST http://localhost:3000/api/sms-signup \
  -H "Content-Type: application/json" \
  -d '{"phone":"+17025461344","email":"test@test.com","source":"protocol_cta"}'
```

Expected: `{ "ok": true }`

Verify the row appears in Neon:
```sql
SELECT * FROM sms_signups ORDER BY created_at DESC LIMIT 5;
```

- [ ] **Step 3: Test validation — missing phone**

```bash
curl -X POST http://localhost:3000/api/sms-signup \
  -H "Content-Type: application/json" \
  -d '{"source":"protocol_cta"}'
```

Expected: `{ "ok": false, "error": "Valid phone number required" }` with status 400.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/sms-signup/route.ts
git commit -m "feat: add SMS signup API route — saves to Neon, sends Twilio welcome text"
```

---

## Task 15: Wire SmsSignupSheet to real API + final verification

**Files:**
- Modify: `src/components/SmsSignupSheet.tsx`

- [ ] **Step 1: Update the `handleSubmit` function in `SmsSignupSheet.tsx`**

Find the `handleSubmit` function. Replace the Phase A stub (the `console.log` + fake timeout) with a real `fetch` call.

The current stub (lines ~44-49):
```typescript
// Phase B will wire this to the real API route.
const payload = { phone: phone.trim(), email: email.trim() || null, source };
console.log("[SmsSignup] Payload (Phase A stub):", payload);
await new Promise<void>((r) => setTimeout(r, 600));
setSubmitted(true);
```

Replace with:
```typescript
const res = await fetch("/api/sms-signup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ phone: phone.trim(), email: email.trim() || null, source }),
});
if (!res.ok) {
  const data = await res.json().catch(() => ({}));
  throw new Error((data as { error?: string }).error || "Submission failed");
}
setSubmitted(true);
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: End-to-end smoke test**

With dev server running:
1. Open `http://localhost:3000`
2. Click "The Protocol" in the nav
3. Click the CTA button on the card
4. Fill in a phone number and submit
5. Confirm success state appears
6. Check Neon `sms_signups` table has the row

- [ ] **Step 4: Production build check**

```bash
npm run build
```

Expected: build succeeds with 0 TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/SmsSignupSheet.tsx
git commit -m "feat: wire SmsSignupSheet to real /api/sms-signup endpoint — Phase A stub removed"
```

- [ ] **Step 6: Final commit — add Vercel env vars reminder**

Create `docs/phase-b1-deploy-checklist.md`:

```markdown
# Phase B1 Deploy Checklist

Before merging to staging, confirm these environment variables are set in Vercel:

- [ ] `DATABASE_URL` — Neon connection string (added automatically via Vercel Marketplace)
- [ ] `TWILIO_ACCOUNT_SID` — from Twilio console
- [ ] `TWILIO_AUTH_TOKEN` — from Twilio console
- [ ] `TWILIO_FROM_NUMBER` — E.164 format e.g. +17025461344

After first Vercel deploy:
- [ ] Hit `POST /api/seed-content` once to seed the DB
- [ ] Verify content shows in all overlays and legal pages
```

```bash
git add docs/phase-b1-deploy-checklist.md
git commit -m "docs: add Phase B1 deploy checklist"
```

---

*End of Plan B1. After all tasks complete, use `superpowers:finishing-a-development-branch` to merge `feature/build2-phase-b1` → staging → main.*
