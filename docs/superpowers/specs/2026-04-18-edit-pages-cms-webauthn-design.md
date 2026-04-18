# Popper Tulimond — Build 2 Phase B Design Spec
**Date:** 2026-04-18
**Scope:** Edit Pages CMS + WebAuthn Admin Auth + SMS Signup (live wiring)
**Status:** Approved for implementation planning
**Builds on:** `feature/build2-phase-a` (nav, overlays, legal pages, staticContent.ts)

---

## Context

Phase A built all the brand page overlays (About, Protocol, Contact, Vault) and legal pages with static content hardcoded in `src/lib/staticContent.ts`. Phase B makes all of that content editable by the founder (Logan) and designer (Faith) without touching code or triggering a deploy.

Two admins. No passwords. Face ID or fingerprint only. Publish goes live in under 2 seconds.

Lookbook management (uploading/reordering garment images and videos) is explicitly deferred to Phase C.

---

## 1. Architecture

### Core principle
Phase B layers on top of Phase A. The overlay components (AboutOverlay, ProtocolOverlay, etc.) do not change their visual design or props interface. The only change is where their content comes from: previously `staticContent.ts` at build time, now Neon Postgres at render time via Next.js server components.

### Content serving flow
1. On first Phase B deploy: a seeding script reads `staticContent.ts` and writes every field into the `page_content` table. This runs once. After seeding, `staticContent.ts` is never read by the live site again — it stays in the codebase as a historical record.
2. When a visitor opens an overlay: a Next.js server component fetches that page's content from Neon. Next.js caches the result automatically.
3. When an admin publishes: one API call writes the draft to `page_content` and calls `revalidatePath()` for the affected paths. The cache drops. The next request fetches fresh content. Live in under 2 seconds. No deploy, no Vercel build involved.

### Technical choice
Server components fetch directly from Neon at render time (Option A). Not API routes (Option B) or ISR (Option C). This is the idiomatic Next.js App Router pattern and gives the fastest publish experience.

---

## 2. Database Schema

Provider: **Neon Postgres** via Vercel Marketplace (free tier, zero cold starts, scales to zero).

### `page_content` — the live published version (what visitors see)

```sql
CREATE TABLE page_content (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug   TEXT NOT NULL,      -- "about", "protocol", "contact", "vault", "terms", "privacy", "shipping", "refund", "contact-us"
  field_key   TEXT NOT NULL,      -- "headline", "subheadline", "section_billboard_title", "section_billboard_body", "rule_01", etc.
  value       TEXT NOT NULL,      -- rich text (HTML from TipTap) or plain text
  updated_at  TIMESTAMP DEFAULT now(),
  updated_by  UUID REFERENCES admin_users(id),
  UNIQUE (page_slug, field_key)
);
```

### `page_drafts` — per-user in-progress versions (independent per admin)

```sql
CREATE TABLE page_drafts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES admin_users(id),
  page_slug   TEXT NOT NULL,
  field_key   TEXT NOT NULL,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMP DEFAULT now(),
  UNIQUE (user_id, page_slug, field_key)
);
```

Logan's draft and Faith's draft are entirely separate rows. Neither affects the other. Publishing either person's draft writes to `page_content` and becomes the new baseline both see.

### `brand_palette` — custom colors shared across all pages

```sql
CREATE TABLE brand_palette (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hex         TEXT NOT NULL,       -- e.g. "#C0392B"
  label       TEXT,                -- optional name, e.g. "Deep Crimson"
  created_by  UUID REFERENCES admin_users(id),
  created_at  TIMESTAMP DEFAULT now()
);
```

Custom colors added on any page are immediately available on all other pages. The five brand base colors (Parchment, Gold, Red Gun, Muted, Soft) are hardcoded in the editor — not stored in this table, cannot be removed.

### `admin_users`

```sql
CREATE TABLE admin_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('owner', 'editor')),
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT now()
);
```

### `webauthn_credentials`

```sql
CREATE TABLE webauthn_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES admin_users(id),
  credential_id   TEXT UNIQUE NOT NULL,
  public_key      TEXT NOT NULL,
  counter         INTEGER DEFAULT 0,
  device_name     TEXT,            -- e.g. "Logan's iPhone 16 Pro"
  created_at      TIMESTAMP DEFAULT now()
);
```

Each physical device (iPhone, Mac, iPad) gets its own row. Revoking a device deletes its row — that device can no longer authenticate.

### `admin_recovery` — recovery code for locked-out owner

```sql
CREATE TABLE admin_recovery (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES admin_users(id),
  code_hash     TEXT NOT NULL,    -- bcrypt hash of the one-time recovery code
  used          BOOLEAN DEFAULT false,
  created_at    TIMESTAMP DEFAULT now()
);
```

Generated once at initial setup. Displayed to Logan once in plaintext — never stored in plaintext. If Logan loses all devices, he visits `/admin/recover`, enters the code, and can register a new device. After use, `used` is set to `true` and the code is permanently invalid.

### `sms_signups`

```sql
CREATE TABLE sms_signups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       TEXT NOT NULL,
  email       TEXT,
  source      TEXT NOT NULL CHECK (source IN ('protocol_cta', 'blocked_purchase')),
  created_at  TIMESTAMP DEFAULT now()
);
```

---

## 3. WebAuthn Admin Authentication

Library: **SimpleWebAuthn** (open source, well-maintained, Next.js App Router compatible).

Session: secure `httpOnly` cookie, 24-hour expiry. No username, no password.

### Initial setup (one time only)

1. Logan visits `/admin/setup` in a browser on his Mac or iPhone
2. Enters name and email
3. OS-native biometric prompt (Face ID / fingerprint) appears
4. Credential saved to `webauthn_credentials`, user row created in `admin_users` as `role: "owner"`
5. `/admin/setup` permanently disables itself — once any admin user exists, the route returns 404

**Recovery code:** During setup, a one-time recovery code is generated and displayed once. Logan saves it (password manager, notes app, printed copy). If Logan ever loses access to all registered devices, he visits `/admin/recover`, enters the recovery code, and can register a new device. The recovery code is stored as a bcrypt hash in a separate `admin_recovery` table.

### Adding Faith (one time, after Logan is set up)

1. Logan logs in, goes to Admin Management within Edit Pages
2. Clicks "Generate Invite Link" — a one-time link is created, valid for 48 hours
3. Logan sends it to Faith (text, email, Zoom chat)
4. Faith opens the link, enters her name, completes biometric registration
5. Her credential is saved as `role: "editor"`. Link expires immediately after use.

### Daily login

1. Admin clicks "Edit Pages" button on the site
2. If no valid session: OS-native biometric prompt appears
3. Device verifies → session cookie issued (24 hours)
4. Panel opens

### Admin Management (owner-only section within Edit Pages)

Accessible via "Admin" link at the bottom of the sidebar. Only visible to `role: "owner"`.

**Capabilities:**
- View all active admin users and their registered devices
- Revoke a specific device (deletes that credential row — that device can no longer authenticate)
- Remove a user entirely (deletes all their credentials, invalidates any active session)
- Promote an editor to owner (updates `role` field)
- Demote an owner to editor
- Generate invite links for new admins

**Self-service (any admin):**
- Register additional devices under their own account
- Revoke their own old devices (e.g., after getting a new phone)

---

## 4. Edit Pages Panel

### Access
- Triggered by "Edit Pages" button in Studio controls (bottom-right of screen)
- Gated behind `NEXT_PUBLIC_STUDIO_ENABLED === "true"` — same gate as Studio Mode
- Additionally gated behind WebAuthn session — clicking Edit Pages when not authenticated triggers biometric prompt first

### Panel layout — desktop

Full-screen overlay sliding in from the right (same animation pattern as brand overlays).

**Left sidebar (170px):**
- Page list grouped into two sections: Brand Pages (About, The Protocol, Contact, Vault) and Legal (Terms of Use, Privacy Policy, Shipping, Refund Policy, Contact Us)
- Active page highlighted with gold left border
- "Admin" link pinned to sidebar bottom — visible only to owner role

**Main area — split view:**
- **Left column:** Live preview of the selected page's overlay, rendered faithfully (real fonts, colors, spacing). A "Live version" badge sits at the top. Every text element is hoverable — gold outline on hover, gold highlight on click.
- **Right column (340px):** Edit fields for every element on that page. Clicking any element in the left preview highlights its corresponding field on the right and focuses the input.

**Each field:**
- Label (e.g. "Section 1 — Body")
- Original box (faded, read-only): shows the currently published text with an "live" tag. Always visible — this is the baseline Logan and Faith compare their edits against.
- TipTap rich text editor below the original box, with formatting toolbar

**Toolbar (per field):**
- Bold, Italic, Underline buttons
- Separator
- Five brand base color dots: Parchment, Gold, Red Gun, Muted, Soft (hover shows name; these cannot be removed)
- Separator
- Saved custom color dots (from `brand_palette` table)
- `+` button: opens color picker popup with hex input + preset swatches + Save button. Saved colors are written to `brand_palette` and immediately available on all pages.

**Top bar (above split view):**
- Page title (e.g. "About")
- Save Draft button (no confirmation) — writes current field values to `page_drafts` for the logged-in user
- Publish button — triggers confirmation modal

**Publish confirmation modal:**
> "You are about to publish your changes to the [Page] page. Visitors will see the new version immediately. The current live version will become the new baseline."
> 
> [Cancel] [Yes, Publish]

On confirm: draft fields written to `page_content`, `revalidatePath()` called for affected paths, draft cleared for that user and page.

### Panel layout — mobile / iPad

Same sidebar page list, but collapses to a dropdown at the top on narrow screens. No split view — single scrollable column.

**Each field on mobile:**
- Label
- Original box (faded, read-only) — always visible above the edit input
- Edit input directly below

The original always stays visible above the edit field. No toggling, no tabs, no swiping required. Logan or Faith can compare their draft against the live version at a glance while typing on their phone.

### Pages and their fields

| Page | Fields |
|---|---|
| About | headline, subheadline, section_billboard_title, section_billboard_body, section_foundation_title, section_foundation_body, section_meal_title, section_meal_body, section_silent_contract_title, section_silent_contract_body, closing |
| The Protocol | header, title, rule_01, rule_02, rule_03, cta_text, cta_subtext |
| Contact | headline, address_line1, address_line2, phone, email, note |
| Vault | (descriptions and labels — exact fields TBD during implementation based on inventory structure) |
| Terms of Use | title, last_updated, body |
| Privacy Policy | title, last_updated, body |
| Shipping & Fulfillment | title, last_updated, body |
| Refund Policy | title, last_updated, body |
| Contact Us | address_line1, address_line2, phone, email |

---

## 5. Draft System

### Per-user independence
Logan's drafts and Faith's drafts are stored as separate rows in `page_drafts`. They never see each other's drafts within the editor. They can Zoom screen-share to discuss and compare — but each has their own sandbox.

### Draft persistence
Drafts survive sessions. Save Draft on Monday, come back Wednesday — it's exactly where you left it. The draft editor shows the draft values in the edit fields and the published values in the original boxes above.

### Publish behavior
When either admin publishes a page:
1. Their draft for that page is written to `page_content` (becomes live)
2. `revalidatePath()` is called — live site updates in under 2 seconds
3. Their draft for that page is cleared (no longer needed — it's now the live version)
4. The other admin's draft for that page is **not** cleared — they still have their independent work in progress. However, the "live" original boxes they see now show the newly published content as their baseline.

### No revert feature
A confirmation modal on Publish is sufficient. The modal copy: *"You are about to publish your changes to the [Page] page. Visitors will see the new version immediately. The current live version will become the new baseline."* There is no undo from within the editor after confirming — if a mistake is made, the correct fix is to edit and publish again.

---

## 6. SMS Signup — Phase A Stub → Phase B Live

The SMS signup sheet was fully built in Phase A but stubbed (console.log only). Phase B wires it to real infrastructure:

- Phone/email written to `sms_signups` table on submit
- Welcome text sent via **Twilio** (SMS provider — standard, well-documented, Next.js compatible)
- TCPA disclosure already present in Phase A UI — no UI changes needed
- Both trigger sources remain: Protocol CTA and blocked purchase attempt

Twilio credentials stored as Vercel environment variables (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`).

---

## 7. Out of Scope (Phase C)

**Lookbook management** — designer uploads/reorders lookbook images and videos per garment. Deferred. Phase A lookbook data remains static (images hardcoded in inventory.ts) until Phase C.

---

## 8. Future Compatibility

The `admin_users` and `webauthn_credentials` tables built here are the same infrastructure that will authenticate Vault members in a future build. Vault members will get a separate `members` table with their own credentials — the credential verification mechanism is identical.

---

## Key Decisions Summary

| Decision | Choice | Reason |
|---|---|---|
| Content serving | Server components + revalidatePath | Idiomatic Next.js App Router, fastest publish |
| Auth library | SimpleWebAuthn | Open source, Next.js compatible, well-maintained |
| Rich text editor | TipTap | Headless, React-native, fully styleable |
| Desktop editor layout | Side-by-side (preview left, fields right) | Click-to-jump, compare original vs draft |
| Mobile editor layout | Original above, edit below (single column) | Always-visible comparison without toggling |
| Draft system | Per-user, persists between sessions | Logan/Faith work independently, compare on Zoom |
| Lookbook management | Deferred to Phase C | Logan's immediate need is text editing |
| SMS provider | Twilio | Standard, well-documented |
| DB provider | Neon Postgres via Vercel Marketplace | Zero cold starts, free tier, Vercel-native |
