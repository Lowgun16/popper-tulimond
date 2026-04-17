# Popper Tulimond — Build 2 Design Spec
**Date:** 2026-04-17  
**Scope:** Navigation, Footer, Legal Pages, Edit Pages CMS, Admin Auth, SMS Signup  
**Status:** Approved for implementation planning

---

## Context

The site is a cinematic Next.js experience where scrolling zooms the user from outside the storefront into the bar. Scroll is reserved for this animation — there is no traditional page scroll. All navigation must work within this constraint. The site is live at `fashion-brand-six.vercel.app` on Vercel.

The founder (`Logan`) and one designer need admin access. All other users are customers — public or future Vault members.

---

## 1. Navigation Bar

### Link Structure
```
Vault  ·  About  ·  • The Protocol  ·  Contact          Legal ↗
```

- **Vault · About · Contact** — parchment color, same eyebrow style as current nav
- **• The Protocol** — red dot (brand Red Gun color `#8B1A1A`) before the text, parchment text. The red dot is the only visual differentiator. No borders, no gold — the dot does the work.
- **Legal** — subtle separator (`|`) then small "Legal" text at far right, lower opacity than main links. Opens footer overlay.
- Nav only appears once user is inside the store (`navOpacity > 0.05`) — unchanged from current behavior.

### Behavior
Each link opens its corresponding overlay. Links are not `<a href>` routes — they trigger overlay state in `CollectionOverlay`. Legal opens the footer overlay.

---

## 2. Brand Page Overlays

All brand pages (Vault, About, The Protocol, Contact) open as **full-screen overlays** that slide over the store. The store dims behind them. Closing returns the user instantly to the store with no scroll reset.

### Overlay Shell (shared component)
- Slides in from the right or fades up — to be finalized in implementation
- Dark obsidian background (`rgba(12,12,12,0.97)`) with backdrop blur
- Gold hairline border top
- Close button top-right (×), same style as LookbookOverlay
- Logo remains visible in nav above overlay

---

### 2a. Vault

**Purpose:** Members-only catalog. Public can browse but not purchase.

**Content:**
- Grid of all collection items (currently: The Constable short sleeve + long sleeve, Showstopper ivory + Heartbreaker Guilt Grey)
- Each item card shows: name, colorway, price, a "Lookbook" button
- Clicking "Lookbook" opens the existing LookbookOverlay for that item (deep dive: images, video, story, materials, size guide)
- Non-members who attempt to interact with a purchase get the Protocol popup (see Section 6)
- Future items (jackets, bags, boots, etc.) slot in as they're added via Edit Pages

**Gate logic (current build):** No auth yet — Vault is visible to everyone but purchase interactions trigger the Protocol popup. Full Vault auth is a future build.

---

### 2b. About

**Purpose:** Brand philosophy. Converting visitors to the philosophy — not through selling, but through recognition. These men have *felt* this, but nobody gave it a name until now. The About page names it.

**Reference document:** [`context/DISPATCH_001_THE_VOID.md`](../../context/DISPATCH_001_THE_VOID.md) — the canonical voice and soul of the brand. All About page copy and any build decision touching brand voice should be informed by this dispatch.

**Content (editable via Edit Pages):**
- Brand statement / manifesto — drawn from Dispatch 001 tone and language
- "Pas pour tout le monde" — Not for everyone. The meaning behind the name.
- The Hierarchy of Competence philosophy
- The Silent Contract — what Popper Tulimond is and is not
- The Red Gun — what it means, where to find it on the garment

**Format:** Long-form editorial. Rich text blocks, optional images. No purchase CTAs. No references to the Patron characters — the About page is about the man reading it, not the models wearing the clothes.

---

### 2c. The Protocol

**Purpose:** Explains the Fight Night / new member initiation system. Critical for new visitors who can't figure out why they can't buy.

**Visual design:** Index card on dark background. Clean edges — no torn effect.
- Paper: aged cream gradient (`#EDE8DC → #E0D9C8`)
- Font: `Courier New` monospace throughout
- Rotation: `-1.2deg` (slightly crooked — intentional)
- Edges: clean, straight. No torn SVG effect.
- Pin: red circle (`#8B1A1A`) at top center — the Red Gun color
- **Bottom-right image slot:** swappable image area for either the red gun outline SVG or a red wax seal. Size and position adjustable via Edit Pages. Default: red gun outline at ~15% opacity.
- Rule numbers: `01 —`, `02 —`, `03 —` in Red Gun red
- Card is displayed centered on the dark overlay background

**Card image swap:** The entire card background can be replaced with a custom photo (e.g. a real photographed business card, aged paper, etc.) via Edit Pages. When a custom image is set it replaces the CSS gradient — all text remains on top, editable.

**The three rules (editable):**
```
01 — We open once a month. The 15th turns to the 16th at midnight EST.
02 — Slots are finite. Once we sell out, we close. No exceptions.
03 — The Constable is your only way in.
```

**CTA (bottom of card):**
```
Text CONSTABLE for early access.
15 minutes before the door opens to the public.
```
Clicking this CTA triggers the SMS signup sheet (Section 6).

**All text is editable via Edit Pages.** The bottom-right image slot (gun or wax seal) is also swappable and resizable via Edit Pages without a deploy.

---

### 2d. Contact

**Purpose:** Last resort human contact. Chatbot is a future build — for now, direct contact info.

**Content (editable via Edit Pages):**
- HQ address (required for Stripe/Apple Pay/Google Pay compliance)
- Phone number
- Email address
- Note: "For fastest response, [chatbot placeholder text]" — to be replaced when chatbot is built

**Note:** This is the Contact overlay accessed from the nav. Separate from the `/contact-us` legal route (same info, different context).

---

## 3. Footer Overlay

The footer cannot be reached by scrolling — scrolling is reserved for the cinematic portal animation. The footer is a **toggle overlay** triggered from two places.

### Triggers
1. **Bottom bar** — a slim fixed bar pinned to the bottom of the viewport, always visible once inside the store. Single line of small parchment text: `"View Footer"`. When footer is open, text changes to `"Close Footer"`. Elegant, not a button — styled as fine print.
2. **Nav link** — `"Legal"` text at far right of nav row, separated by a faint `|`. Same toggle behavior.

### Overlay Design
- Slides up from the bottom, covers the lower ~40% of the store
- Dark background with backdrop blur — store visible above
- Five links arranged cleanly:
  - Terms of Use
  - Privacy Policy
  - Shipping & Fulfillment
  - Refund Policy
  - Contact Us
- Each link navigates to its separate route (Section 4)
- Consistent gold hairline top border

### Why This Approach
Stripe, Apple Pay, and Google Pay auditors require legal pages to be clearly accessible from any page. Two trigger points (bottom bar + nav) ensures this passes review without cluttering the store aesthetic.

---

## 4. Legal Pages (Separate Routes)

Legal pages are separate Next.js routes — server-rendered for SEO, indexable by Google, shareable as direct links.

| Route | Page |
|---|---|
| `/terms` | Terms of Use |
| `/privacy` | Privacy Policy |
| `/shipping` | Shipping & Fulfillment |
| `/refund` | Refund Policy |
| `/contact-us` | Contact Us (address, phone, email) |

### Design
- Minimal branded layout — logo at top, parchment on obsidian, no cinematic animation
- Back link returns to store
- Content managed via Edit Pages CMS (Section 5)
- Content stored in database as rich text — no rebuild needed to update

### Compliance Note
These pages must exist and be accessible before Stripe will activate Apple Pay and Google Pay for the merchant account. The HQ address, phone, and email must appear on `/contact-us`.

---

## 5. Edit Pages CMS

A content management interface for the founder and designer to edit all site pages and publish changes instantly.

### Access
- Gated behind WebAuthn admin auth (Section 7)
- Accessible via **"Edit Pages"** button in the Studio controls stack (bottom-right, next to "Studio Mode" button)
- Visible only when `NEXT_PUBLIC_STUDIO_ENABLED === "true"` — same gate as Studio Mode

### Interface
Opens as a separate panel/overlay (not related to Studio Mode's inspector).

**Page selector:** Dropdown or sidebar list of all editable pages:
- Vault
- About
- The Protocol
- Contact
- Terms of Use
- Privacy Policy
- Shipping & Fulfillment
- Refund Policy
- Contact Us

**Editor (per page):** Renders the page's editable fields:
- **Text blocks** — rich text editor (bold, italic, line breaks, basic formatting)
- **Image slots** — upload button, preview, swap. Stores to Vercel Blob.
- **The Protocol card** — individual fields for each rule line, header, CTA text. Special case: option to upload a "torn card" background image.

**Lookbook management (designer-facing):**
- Select a garment → upload lookbook images/videos
- Reorder images via drag
- Add/remove items
- This replaces the manual process of the designer sending files to the founder

**Publish flow:**
1. Edit content in the panel
2. Click **"Publish"**
3. API route writes to database
4. Response confirms save
5. Changes are live in under 2 seconds — no rebuild, no deploy hook

### Data Model (Edit Pages content)
```
page_content
  id          UUID primary key
  page_slug   TEXT (e.g. "about", "terms", "protocol")
  field_key   TEXT (e.g. "rule_01", "hero_text", "address")
  value       TEXT (rich text or image URL)
  updated_at  TIMESTAMP
  updated_by  UUID (references admin_users.id)
```

---

## 6. Action-Triggered SMS Signup

The SMS signup sheet **never appears unsolicited.** It is triggered by one of two specific actions:

### Trigger 1 — Protocol CTA
User reads The Protocol and clicks "Text CONSTABLE for early access." The signup sheet appears immediately.

### Trigger 2 — Blocked Purchase Attempt
Non-member attempts to interact with a purchase (add to cart, click "Find Your Size" on a Vault item, or attempt checkout). A polite modal appears:

> *"We see you. The Constable isn't available right now — but it will be. On the 16th of every month at midnight EST, we open the door for a limited number of new members. Text CONSTABLE to get 15 minutes of early access before the public. That's usually enough time."*

**Tone:** Respectful. A doorman giving insider information, not a salesman asking for a favor.

### Signup Sheet Design
- Minimal overlay — phone number field (required), email field (optional)
- Submit button: `"Get Early Access"`
- Fine print: frequency disclosure, opt-out instructions (required by TCPA)
- On submit: stores to `sms_signups` table, triggers welcome text (Twilio or similar — integration to be determined)

### Database Table
```
sms_signups
  id          UUID primary key
  phone       TEXT (required)
  email       TEXT (optional)
  source      TEXT ("protocol_cta" | "blocked_purchase")
  created_at  TIMESTAMP
```

---

## 7. Admin Authentication (WebAuthn / Passkey)

Protects Edit Pages and Studio Mode. Uses the WebAuthn browser standard — Face ID on iPhone/Mac, fingerprint on laptop keyboard, Windows Hello on PC.

### How it works
- Admin visits the site → clicks Edit Pages or Studio Mode button
- If no valid session: WebAuthn prompt appears (OS-native face/fingerprint dialog)
- Device verifies biometric → session token issued (24-hour expiry)
- Session stored in secure httpOnly cookie

### Library
`SimpleWebAuthn` (open source, well-maintained, Next.js compatible)

### Users
Two admin accounts registered at setup:
1. Founder (Logan) — full access: Edit Pages + Studio Mode
2. Designer — full access: Edit Pages + Studio Mode (specifically for lookbook uploads)

Adding a 3rd user: admin registers their device via a one-time setup link. No code changes required.

### Database Tables
```
admin_users
  id           UUID primary key
  name         TEXT
  email        TEXT unique
  role         TEXT ("owner" | "editor")
  created_at   TIMESTAMP

webauthn_credentials
  id              UUID primary key
  user_id         UUID references admin_users
  credential_id   TEXT unique
  public_key      TEXT
  counter         INTEGER
  device_name     TEXT (e.g. "Logan's iPhone")
  created_at      TIMESTAMP
```

### Future compatibility
This WebAuthn infrastructure is the same system that will authenticate Vault members when the member auth build is implemented. The `admin_users` system and `webauthn_credentials` table are reused — Vault members get a separate `members` table with their own credentials registered at purchase.

---

## 8. Database

**Provider:** Neon Postgres via Vercel Marketplace (zero cold starts, scales to zero, free tier covers this build)

### All tables (this build)
- `page_content` — Edit Pages CMS content
- `admin_users` — Edit Pages + Studio Mode access
- `webauthn_credentials` — biometric credentials per device per user
- `sms_signups` — phone/email collected via Protocol and blocked purchase

### Future tables (not built now, designed to slot in)
- `members` — Vault member profiles (name, email, purchase date, tier)
- `member_webauthn_credentials` — biometric credentials for Vault members
- `orders` — purchase history, lifetime spend, tier calculation
- `refinery_access` — invite list for The Refinery
- `chatbot_logs` — interaction records, escalations, resolution status

---

## 9. Future Builds (Documented, Not In Scope)

| Build | Description |
|---|---|
| Vault Member Auth | WebAuthn login for members, passkey set at purchase, Vault access gate |
| The Refinery | Invite-only or subscription tier, ultra-limited pieces, third door in the store |
| Customer CRM Layer | Tier tracking (Member → Top 20% → Refinery), lifetime spend, journey stage, birthday perks |
| Email Sequences | Automated journeys based on tier and behavior (Klaviyo or custom) |
| Chatbot / AI CS | Resolves 95%+ of inquiries, sends order confirmations, surfaces summaries to founder |
| Reporting Dashboard | Sales, signups, chatbot resolution rate, tier distribution |
| Shop Pay | Shopify Storefront API embedded checkout for customers who prefer Shop Pay |

---

## Open Questions (Not Blocking)

1. **SMS provider** — Twilio is standard. Confirm before implementation.
2. **The Protocol card** — CSS torn edge is in spec. Option to swap in a photographed torn business card image via Edit Pages exists and is recommended for maximum realism.
3. **Vault page layout** — Grid vs. editorial scroll within overlay. Can be decided in implementation.
4. **Legal page content** — Founder has existing copy from prior site. Will be entered via Edit Pages at launch.
5. **"Fight Night" store state** — Whether the store visually changes on the 16th (countdown, different lighting, etc.) is a future enhancement, not in this build.
