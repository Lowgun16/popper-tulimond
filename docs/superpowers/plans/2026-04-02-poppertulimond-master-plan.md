# PopperTulimond.com — Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully immersive, commerce-enabled luxury speakeasy website with Fight Night membership mechanics, Stripe/Apple Pay checkout, Passkey authentication, and a real-time admin war room.

**Architecture:** Next.js 16 + Framer Motion frontend (already built) layered with Supabase (database + real-time + auth), Stripe (payments + Apple Pay/Google Pay), Twilio (SMS), and a private admin dashboard. The existing Portal/store experience is complete — all new work is additive.

**Tech Stack:** Next.js 16, React 19, Framer Motion 12, Tailwind CSS 4, Supabase (Postgres + Realtime + Passkeys via WebAuthn), Stripe (Payment Intents + Apple Pay + Google Pay), Twilio SMS, Vercel deployment.

---

## THE VISION IN ONE SENTENCE

A visitor walks up to the storefront, scrolls into the speakeasy, sees characters wearing the clothes, taps a glowing dot, reads the price tag, opens the Lookbook, buys with their face, and either joins the brotherhood or waits for next month's Fight Night.

---

## SYSTEM ARCHITECTURE MAP

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND (existing)                │
│  Portal → Storefront zoom → Inside store            │
│  Characters + Hotspots → Obsidian Card → Lookbook   │
└──────────────────────┬──────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ Supabase │  │  Stripe  │  │  Twilio  │
   │ Database │  │ Payments │  │   SMS    │
   │ Realtime │  │ Apple Pay│  │          │
   │ WebAuthn │  │ Goog Pay │  └──────────┘
   └──────────┘  └──────────┘
         │
   ┌──────────┐
   │  Admin   │
   │Dashboard │
   │ /war-room│
   └──────────┘
```

---

## FILE STRUCTURE (New Files to Create)

```
src/
  app/
    api/
      auth/
        register/route.ts          # Passkey registration endpoint
        authenticate/route.ts      # Passkey login endpoint
        recover/route.ts           # Lost device recovery via email
      cart/
        route.ts                   # Cart read/write
      checkout/
        session/route.ts           # Stripe Payment Intent creation
        webhook/route.ts           # Stripe webhook (purchase confirmed)
      fight-night/
        status/route.ts            # Current FN state (active, inventory, counter)
        purchase/route.ts          # Record unique purchase, decrement counter
      admin/
        stats/route.ts             # Live visitor count, purchase count
        inventory/route.ts         # Adjust N mid-event
        fight-night/route.ts       # Toggle / configure next FN
      sms/
        subscribe/route.ts         # Add to SMS list
        send/route.ts              # Trigger day-of blast (cron)
    war-room/
      page.tsx                     # Admin dashboard (Owner + Operator)
    vault/
      page.tsx                     # Members-only vault interior
  components/
    LookbookOverlay.tsx            # MODIFY: 9:16 modal, sticky carousel, scrollable product detail
    CartDrawer.tsx                 # NEW: slide-in cart with Apple/Google Pay CTAs
    CheckoutModal.tsx              # NEW: Stripe Payment Element (minimalist)
    FightNightBanner.tsx           # NEW: countdown timer + live counter overlay
    VaultDoor.tsx                  # NEW: animated vault door (locked/unlocked state)
    PasskeySetup.tsx               # NEW: post-purchase passkey enrollment flow
    PasskeyLogin.tsx               # NEW: Face ID / fingerprint login prompt
    AdminWarRoom.tsx               # NEW: real-time dashboard component
    SMSSubscribeForm.tsx           # NEW: phone number capture + opt-in
  lib/
    supabase.ts                    # Supabase client (server + browser)
    stripe.ts                      # Stripe server client
    twilio.ts                      # Twilio SMS client
    fight-night.ts                 # FN state logic (active window, counter, pricing)
    passkey.ts                     # WebAuthn registration + authentication helpers
  data/
    inventory.ts                   # MODIFY: add size variants, materials, story copy per item
```

---

## PHASE 1 — Database Foundation (Supabase)

### Task 1: Supabase Project Setup
- [ ] Create Supabase project at supabase.com
- [ ] Add environment variables to `.env.local` and Vercel dashboard:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Install: `npm install @supabase/supabase-js`
- [ ] Create `src/lib/supabase.ts` with browser + server clients

### Task 2: Database Schema

Run this SQL in Supabase dashboard:

```sql
-- Members
create table members (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now(),
  is_owner boolean default false,
  is_operator boolean default false
);

-- Passkey credentials (WebAuthn)
create table passkey_credentials (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  credential_id text unique not null,
  public_key text not null,
  counter bigint default 0,
  device_name text,
  created_at timestamptz default now()
);

-- Purchases
create table purchases (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id),
  stripe_payment_intent text unique not null,
  item_id text not null,
  item_name text not null,
  colorway text not null,
  size text,
  price_cents integer not null,
  fight_night_price boolean default false,
  fight_night_id uuid,
  created_at timestamptz default now()
);

-- Fight Night events
create table fight_nights (
  id uuid primary key default gen_random_uuid(),
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  inventory_limit integer not null default 1000,
  unique_purchases integer default 0,
  status text default 'scheduled', -- scheduled | early_access | open | sold_out | closed
  created_at timestamptz default now()
);

-- SMS subscribers
create table sms_subscribers (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  subscribed_at timestamptz default now(),
  active boolean default true
);

-- Live presence (Fight Night counter)
-- Handled via Supabase Realtime channels, no table needed
```

---

## PHASE 2 — Passkey Authentication

### Task 3: Passkey Registration (post-purchase)
- Install: `npm install @simplewebauthn/server @simplewebauthn/browser`
- `src/app/api/auth/register/route.ts` — generates registration options, stores credential
- `src/components/PasskeySetup.tsx` — shown immediately after Stripe confirms payment
- Flow: Purchase confirmed → "Set up your Face ID / Touch ID to access your membership" → one prompt → done

### Task 4: Passkey Login
- `src/app/api/auth/authenticate/route.ts` — verifies assertion, issues Supabase session
- `src/components/PasskeyLogin.tsx` — triggered when member taps "Enter the Vault"
- Returns JWT stored in httpOnly cookie (7 day session)

### Task 5: Lost Device Recovery
- `src/app/api/auth/recover/route.ts` — sends one-time magic link to purchase email
- Link expires in 15 minutes, grants session, prompts new passkey enrollment on new device
- Copy: "Lost your device? We'll send a secure link to the email used at purchase."

---

## PHASE 3 — Fight Night Engine

### Task 6: Fight Night State Logic
- `src/lib/fight-night.ts`:
  - `getFightNightStatus()` — returns current state + time remaining + inventory
  - `isEarlyAccessWindow()` — true if within 15 min before open (SMS subscribers only)
  - `getPriceForMember(memberId, itemId)` — returns $129 or $229 based on purchase history
  - `decrementInventory(fightNightId)` — atomic decrement with sold-out check

### Task 7: Fight Night API Routes
- `GET /api/fight-night/status` — public, returns: `{ status, opensAt, closesAt, remaining, total }`
- `POST /api/fight-night/purchase` — records unique purchase, triggers sold-out if N reached
- Auto-scheduler: Vercel Cron job in `vercel.json`:
  ```json
  {
    "crons": [
      { "path": "/api/fight-night/open", "schedule": "45 4 16 * *" },
      { "path": "/api/fight-night/close", "schedule": "45 7 16 * *" }
    ]
  }
  ```
  (4:45am UTC = 11:45pm ET, 7:45am UTC = 3:45am ET — early access + auto-close)

### Task 8: FightNightBanner Component
- Fixed overlay when FN is active: countdown timer, live purchase counter (Supabase Realtime)
- SMS subscribe form visible when FN is NOT active ("Get early access next month")
- Storefront green light signal: CSS glow on door lamp image during early access window

---

## PHASE 4 — Stripe Checkout

### Task 9: Stripe Setup
- `npm install stripe @stripe/stripe-js @stripe/react-stripe-js`
- Environment variables: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- Configure Apple Pay domain verification file at `/.well-known/apple-developer-merchantid-domain-association`
- Register domain in Stripe dashboard for Apple Pay

### Task 10: Cart & Checkout Flow
- `src/components/CartDrawer.tsx`:
  - Slides in from right (Framer Motion)
  - Shows item(s), size, price
  - Primary CTA: Apple Pay button (full width, prominent)
  - Secondary CTA: Google Pay
  - Tertiary: "Pay another way" → opens Stripe Payment Element
- `src/app/api/checkout/session/route.ts`:
  - Creates Stripe PaymentIntent with correct amount ($129 or $229)
  - Attaches metadata: `memberId`, `fightNightId`, `itemId`
- `src/app/api/checkout/webhook/route.ts`:
  - On `payment_intent.succeeded`:
    - Records purchase in Supabase
    - If first purchase → creates member record
    - Triggers PasskeySetup flow
    - Sends confirmation email (Stripe built-in receipt + custom template)
    - Decrements Fight Night counter if applicable

---

## PHASE 5 — Lookbook Window Upgrade

### Task 11: Modify LookbookOverlay to 9:16 spec
- **Dimensions:** Fixed 9:16 aspect ratio modal, centered, max-height 90vh
- **Top half (sticky):** Carousel component
  - Manual navigation: black circle chevron buttons left and right
  - Swipe gesture support (touch + trackpad)
  - Still images: pinch-to-zoom enabled
  - Video items: autoplay muted loop (10s clips)
  - Dot indicators at bottom of carousel
- **Bottom half (scrollable):** Product detail panel
  - Item name, collection, colorway
  - The story of the item (brand copy)
  - Materials & construction
  - Size chart + "How to pick your size" guide
  - Size selector (S / M / L / XL) — radio button style, gold accent
  - "Add to Cart" → triggers CartDrawer
- Top half stays fixed while bottom scrolls — CSS `position: sticky` on carousel

---

## PHASE 6 — Vault Door

### Task 12: VaultDoor Component
- Vault door rendered inside CollectionOverlay at a specific position in the store
- **Locked state:** Closed door, subtle ambient glow, "Members Only" label
- **On member tap:** PasskeyLogin prompt
- **On authentication:** Framer Motion door-open animation (rotate on hinge, 1.2s)
- **Vault interior:** Separate route `/vault` with its own CollectionOverlay variant
- Members-only middleware: redirect to login if no valid session

---

## PHASE 7 — SMS System

### Task 13: Twilio SMS Integration
- `npm install twilio`
- `src/lib/twilio.ts` — Twilio REST client
- `src/components/SMSSubscribeForm.tsx` — phone number input, opt-in checkbox, submit
- `src/app/api/sms/subscribe/route.ts` — validates number, stores in `sms_subscribers`
- `src/app/api/sms/send/route.ts` — bulk send to all active subscribers
- Vercel Cron: fires at noon ET on the 15th of each month
- Message template:
  ```
  🥃 Fight Night is tonight. Doors open at midnight ET — sharp.
  Your early access link: [URL]
  Add to calendar: [Google Cal link] | [.ics download]
  Reply STOP to unsubscribe.
  ```

---

## PHASE 8 — Admin War Room

### Task 14: Admin Dashboard `/war-room`
- Protected route: Owner + Operator passkey sessions only
- **Live Stats Panel** (Supabase Realtime):
  - Visitors on site right now (presence channel)
  - Fight Night status + time remaining
  - Unique purchases this Fight Night / inventory limit
  - Revenue counter (live)
- **Inventory Control:**
  - Number input + "Update" button — adjusts `inventory_limit` mid-event
  - Confirmation modal before applying
- **SMS Management:**
  - Subscriber count
  - "Send Day-Of Reminder" manual trigger button
- **Member List:**
  - Searchable table: email, joined date, purchase count
  - Ability to revoke membership (Owner only)
- **Fight Night Config:**
  - Set next Fight Night inventory for upcoming month
  - Preview the SMS message before it sends

---

## PHASE 9 — Inventory Data Completion

### Task 15: Populate inventory.ts with real product content
- Add per-item fields to `OutfitItem`:
  - `sizes: string[]` — available sizes
  - `materials: string` — fabric composition
  - `story: string` — brand narrative copy
  - `sizeGuide: string` — how to pick your size
  - `lookbook: string[]` — actual image/video paths once assets are ready
- Fill in Jack_L01 (The Constable, Ivory) as first complete entry using ASSET_MANIFEST

---

## AGENTS & SKILLS REQUIRED FOR EXECUTION

| Agent/Skill | Purpose |
|---|---|
| `superpowers:subagent-driven-development` | Execute each Phase as an isolated subagent task |
| `superpowers:systematic-debugging` | Invoke on any Stripe webhook, Passkey, or Realtime issue |
| `superpowers:verification-before-completion` | Run before every deployment to Vercel |
| `superpowers:finishing-a-development-branch` | After each Phase is complete and tested |
| `@STRATEGIST` | Fight Night pricing logic review, Stripe fee calculations |
| `@RESEARCHER` | Twilio vs ContentCreatorMachine final cost comparison |
| `@WRITER` | All SMS copy, confirmation email copy, vault/membership UI copy |

---

## EXECUTION ORDER

| Phase | What Gets Built | Dependency |
|---|---|---|
| 1 | Database schema | None — start here |
| 2 | Passkey auth | Phase 1 |
| 3 | Fight Night engine | Phase 1 |
| 4 | Stripe checkout | Phase 1, 2 |
| 5 | Lookbook upgrade | None — independent |
| 6 | Vault door | Phase 2 |
| 7 | SMS system | Phase 1 |
| 8 | Admin war room | Phase 1, 3, 7 |
| 9 | Inventory data | Phase 5 |

Phases 5 and 9 can run in parallel with everything else — they're pure frontend/content work with no backend dependency.

---

## VERIFICATION

Each phase is verified by:
1. Running `npm run build` — zero TypeScript errors
2. Running `npm run dev` and walking the full user journey for that phase
3. Stripe: test mode purchase with card `4242 4242 4242 4242` → confirm webhook fires → confirm member created in Supabase
4. Fight Night: manually set `opens_at` to 2 minutes from now in Supabase dashboard, verify counter decrements, verify sold-out state triggers
5. Passkey: register on iPhone Safari, close browser, reopen, authenticate — verify session granted
6. Deploy to Vercel preview URL, test Apple Pay on physical iPhone (required — Apple Pay does not work in simulator)
