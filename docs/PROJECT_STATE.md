# Popper Tulimond — Project State & Handoff Document

> **For any new session:** Read this file first. It is the source of truth for what's been built,
> what patterns to follow, and what comes next. Do not change anything based on this file alone —
> use it only to orient yourself before the user gives a specific task.

---

## Live URLs
- **Production:** https://poppertulimond.com
- **Vercel alias:** https://fashion-brand-six.vercel.app
- **GitHub:** https://github.com/Lowgun16/popper-tulimond
- **Main branch:** `main` (staging is kept in sync)

---

## What's Been Built — Complete

### Phase A — Brand Site (complete, live)
- Full-bleed cinematic bar scene, scroll zoom, 4 models with outfit hotspot dots
- Nav bar with brand page overlays: About, The Protocol, Contact, Vault
- Footer system
- Legal pages (Terms, Privacy, Shipping, Refund, Contact Us) — in-overlay + standalone routes (`/terms`, `/privacy`, `/shipping`, `/refund`, `/contact-us`)
- SMS Signup Sheet — collects phone numbers for the Pledge list
- Protocol Gate — blocks non-member checkout (currently a gate stub; wired to real auth in Phase D)
- Studio Mode (gated behind `NEXT_PUBLIC_STUDIO_ENABLED` env var)
- All content in `src/lib/staticContent.ts` as fallback

### Phase B1 — Database & SMS (complete, live)
- Neon Postgres DB — lazy singleton at `src/lib/db.ts`
- Content types at `src/lib/contentTypes.ts`
- All overlay content served from DB at runtime, falls back to `staticContent.ts` if DB unreachable
- SMS API route `/api/sms-signup` — saves phone to DB, sends Twilio welcome text
- Seed endpoint `/api/seed-content` — protected by `SEED_SECRET` header

### Phase B2 — WebAuthn Admin Auth + Edit Pages CMS (complete, live)
- WebAuthn passkey registration and authentication (Face ID / fingerprint)
- Admin session via signed JWT cookie (`admin_session`)
- Admin user roles: `owner` and `editor`
- Invite system — owner generates single-use invite links for new devices/users
- Recovery code system for owner lockout
- Edit Pages panel — full CMS for all brand pages (About, Protocol, Contact, Vault, legal pages)
- TipTap rich text editor for body fields
- Draft/publish pipeline — edits saved as drafts per user, published to `page_content` table
- `revalidatePath()` called on publish to bust Next.js ISR cache
- Admin panel (owner only) — manage users, generate invite links
- Preview pane — full-screen preview of draft content before publishing
- Mobile-responsive layout with combined top bar (page selector + Save + Publish)

**Key auth files:**
- `src/lib/adminAuth.ts` — `requireSession`, `requireOwner`
- `src/lib/session.ts` — JWT sign/verify using `SESSION_SECRET` env var
- `src/app/api/admin/webauthn/` — auth-options, auth-verify, register-options, register-verify, logout
- `src/hooks/useAdminSession.ts` — client-side auth state
- `src/components/edit-pages/EditPagesPanel.tsx` — main CMS shell
- `src/components/edit-pages/PageEditor.tsx` — per-page editor with forwardRef handle
- `src/components/edit-pages/EditPagesSidebar.tsx` — page navigation
- `src/components/edit-pages/PreviewPane.tsx` — draft preview overlay

**Critical WebAuthn note:** Challenge is stored in a short-lived HttpOnly cookie (`webauthn_auth_challenge` / `webauthn_reg_challenge`), NOT in-memory. In-memory Maps fail on Vercel because requests can land on different function instances. Do not revert this to in-memory.

**Critical registration note:** `credential.id` from `@simplewebauthn/server` v9+ is already a `Base64URLString` (plain string). Store it directly — do NOT pass it through `isoBase64URL.fromBuffer()`. The `publicKey` field IS a `Uint8Array` and should be converted via `fromBuffer`. Same pattern applies to `verifyAuthenticationResponse`: pass `credential.id` as the string directly, convert `publicKey` via `toBuffer`.

### Phase C — Product Editor (complete, live)
- `product_overrides` table in Neon (migration: `scripts/migrate-phase-c.sql` — already run in production)
- Three product statuses: `active`, `sold_out`, `hidden`
- `src/lib/productOverrides.ts` — `ProductOverride` type + `mergeInventoryWithOverrides()` utility
- Published overrides fetched server-side in `fetchAllPageContent()` and merged into inventory
- Vault overlay shows sold-out badges, hides hidden items, shows product thumbnails
- Products tab in Edit Pages panel (owner only) — edit price, image path, status per item
- API routes: `GET/POST /api/edit-pages/products` (owner only), `POST /api/edit-pages/products/publish`
- `revalidatePath("/")` on publish to bust cache

---

## Database Schema (Neon Postgres)

```sql
-- Content
page_content (page_slug, field_key, value, updated_at, updated_by)
page_drafts (user_id, page_slug, field_key, value, updated_at)

-- Auth
admin_users (id, name, email, role, active, created_at)
webauthn_credentials (id, user_id, credential_id, public_key, counter, created_at)
admin_invites (id, created_by, token, role, used, expires_at, created_at)
admin_recovery (id, user_id, code_hash, created_at)

-- SMS
sms_signups (id, phone, segment, created_at)
  -- segment values: 'pledge', 'member' (more planned)

-- Products
product_overrides (item_id, price, display_name, product_image, status, is_draft, updated_at)
  -- status: 'active' | 'sold_out' | 'hidden'
```

---

## Inventory (current — `src/data/inventory.ts`)

One collection: **The Constable**

| Item | Model | Style | Price |
|------|-------|-------|-------|
| Heartbreaker Long | Angel | Long Sleeve | $159 |
| Showstopper Short | Jerome | Short Sleeve | $129 |
| Showstopper Long | Jack | Long Sleeve | $159 |
| Heartbreaker Short | Ethan | Short Sleeve | $129 |

Phase D will add `initiationPrice` and `memberPrice` fields, replacing the single `price` field.

---

## Environment Variables (set in Vercel)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres connection string |
| `SESSION_SECRET` | JWT signing secret for admin sessions |
| `WEBAUTHN_ORIGIN` | Exact origin string, e.g. `https://poppertulimond.com` |
| `WEBAUTHN_RP_ID` | RP ID for passkeys, e.g. `poppertulimond.com` |
| `WEBAUTHN_RP_NAME` | Display name shown during passkey registration |
| `NEXT_PUBLIC_STUDIO_ENABLED` | Feature flag for Studio Mode (production only) |

Phase D will need: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

---

## Technical Patterns — Follow These

**DB access:** Always use the `sql` tagged template from `src/lib/db.ts`. Never use raw strings.

**Auth guard:** `requireSession` for any authenticated route, `requireOwner` for owner-only routes. Both are in `src/lib/adminAuth.ts`.

**Cache busting:** Call `revalidatePath("/")` after any publish action that affects the homepage. Legal pages use their specific paths (`/terms`, etc.).

**Fixed position + Framer Motion:** Framer Motion's `useAnimate` scope sets `will-change: transform` which breaks `position: fixed` containment. Any panel that needs `fixed` positioning must render via `OverlayPortal` (createPortal to document.body). See `src/components/Portal.tsx`.

**Product overrides merge:** Always use `mergeInventoryWithOverrides()` from `src/lib/productOverrides.ts`. It filters hidden items, attaches `_vaultStatus` for sold-out display, and uses O(1) Map lookup.

**No in-memory state for cross-request data on Vercel.** Vercel routes requests across multiple function instances. Use cookies, DB, or external store.

---

## What's Next — Phase D: Commerce & Member System

This is the full business engine. Do not start building this without a full brainstorm and plan session first.

### New Member Initiation Night
- Store opens once a month: the 16th (midnight EST)
- **Pledges** (SMS signups who aren't members) get a 15-minute head start
- **Scheduled text on the 15th at 3:45pm EST:** "Tonight is New Member Initiation. Here is your early access link to shop at 11:45pm EST before everyone else. - Popper Tulimond"
- Early access link activates at 11:45pm EST. Session persists past midnight.
- If Initiation inventory sells out, non-members are locked out — even with an early access link.
- Members shop the Vault 24/7/365 and are never affected by sellout.

### Pricing Rules
- **Short Sleeve Constable:** $129 Initiation price → $229 member price
- **Long Sleeve Constable:** $159 Initiation price → $259 member price
- 1 Constable per person at Initiation price. A 2nd Constable in the same cart reverts to member pricing.
- `inventory.ts` needs `initiationPrice` and `memberPrice` fields per item.

### Member System
- Buying a Constable on Initiation Night = becoming a member
- Members get WebAuthn login (Face ID / fingerprint) — same infrastructure as admin auth
- Members shop the Vault 24/7 at member pricing
- Member accounts are separate from admin accounts

### SMS List Segmentation
| List | Who | What they get |
|------|-----|---------------|
| Pledges | SMS signups, not yet members | Initiation Night texts + early access links |
| Members | Anyone who bought a Constable | Vault updates, limited releases, special drops |
| The Refinery (future) | Top 20% lifetime value | Most exclusive access |

- When a Pledge buys a Constable, they auto-migrate to the Members list
- Twilio handles blasts. Cron job on the 15th triggers the Pledge blast.
- DB `sms_signups.segment` field already exists to support this.

### Discovery Funnel (no advertising)
- Logan posts content → specific type of man finds the brand organically
- Visitor feels like they found something hidden — intentional
- Can browse but can't buy (Protocol Gate)
- Signs up for texts to get early access
- Returns on Initiation Night, buys a Constable, becomes a member

### Phase D requires a brainstorm session covering:
- Stripe checkout integration (payment intents, webhooks)
- Member WebAuthn registration flow (separate from admin — no invite needed, triggered by purchase)
- Early access link generation and session validation
- Cron job scheduling for the 15th (Vercel Cron or external)
- Inventory tracking for Initiation Night (how many Constables are available per drop)
- Protocol Gate wired to real member session check
- Member-only Vault view vs. public Vault view

---

## Pending Minor Items (non-blocking, fix when relevant)
- `display_name` input field missing from ProductEditor UI
- Empty-state message in VaultOverlay when all items are hidden
- Unit tests for `mergeInventoryWithOverrides`
- The redundant `productOverrides` prop threading in `page.tsx` / `ClientPage.tsx` (it's already in `allContent`)
