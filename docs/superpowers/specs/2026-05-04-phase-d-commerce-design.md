# Phase D — Commerce & Member System Design
_Popper Tulimond — Approved 2026-05-04, updated 2026-05-04_

---

## Overview

Phase D is the full business engine. It wires checkout, member accounts, and the Initiation Night ritual into a self-running system. Once set up, it requires zero manual action from Logan month to month unless he wants to change the drop settings.

**Core rule: nothing customer-facing is hardcoded.** Every message, every time, every piece of copy is editable from the admin panel without a code change.

---

## Guiding Principles

- The gate is at **checkout**, not at browsing or cart-building. Non-members browse, add items, build carts freely.
- Cart persists in `localStorage` indefinitely. A Pledge who builds their cart on the 14th returns on the 15th and picks up exactly where they left off.
- Every month's drop runs automatically. Logan only logs in if he wants to adjust numbers or copy.
- The checkout never leaves poppertulimond.com.
- Membership setup happens at peak intent — immediately after payment. Text and email are the safety net, not the primary path.
- **No code change should ever be required to adjust customer-facing text or store timing.**
- **Customers should type as little as possible.** Apple Pay / Google Pay users type nothing — name, email, and shipping address come from their device automatically. Card users get browser autofill and Google Places autocomplete. The goal is six taps and zero typing for the majority of customers.

---

## 1. Data Model

### New Tables

**`members`**
```sql
id              uuid primary key
phone           text not null unique
email           text not null
name            text
setup_token     uuid unique
setup_token_expires_at timestamptz
passkey_registered boolean default false
member_since    timestamptz
created_at      timestamptz default now()
```
Created at the moment payment is confirmed. `setup_token` is valid for 7 days and consumed on passkey registration.

**`member_webauthn_credentials`**
```sql
id              uuid primary key
member_id       uuid references members(id)
credential_id   text not null unique
public_key      bytea not null
counter         integer not null default 0
created_at      timestamptz default now()
```
Mirrors `webauthn_credentials` for admins. Same WebAuthn infrastructure, separate table.

**`orders`**
```sql
id                        uuid primary key
member_id                 uuid references members(id) -- nullable until passkey registered
stripe_payment_intent_id  text not null unique
name                      text not null
phone                     text not null
email                     text not null
shipping_address          jsonb not null
  -- {line1, line2, city, state, postal_code, country}
items                     jsonb not null
  -- [{item_id, display_name, size, price_cents, quantity}]
total_cents               integer not null
fulfilled                 boolean not null default false
created_at                timestamptz default now()
```
`shipping_address` is pulled automatically from Apple Pay / Google Pay with no customer typing. For card payments, Stripe's Address Element with Google Places autocomplete handles it. `fulfilled` is toggled manually from the Orders tab in the admin panel.

**`initiation_drops`**
```sql
id                     uuid primary key
drop_month             date not null unique   -- the 16th of the target month
-- Wall-clock times + timezone (no hardcoded UTC offsets)
timezone               text not null default 'America/New_York'
open_time              text not null default '00:00'   -- midnight on drop_month
early_access_time      text not null default '23:45'   -- night before (15th)
close_time             text not null default '00:29'   -- after midnight on drop_month
-- Inventory
available_count        integer not null
sold_count             integer not null default 0
is_open                boolean not null default true   -- manual kill switch
created_at             timestamptz default now()
```

**Timezone approach:** Times are stored as wall-clock strings ("00:00", "23:45") with an IANA timezone name. The system converts to UTC at runtime using `date-fns-tz`. "Midnight New York" always means midnight in `America/New_York` — DST is handled automatically, no manual adjustment ever needed. To expand to European customers, change the timezone field to `Europe/London` or any IANA zone.

**Auto-carry forward:** If no row exists for the current month, the system creates one by copying all settings (timezone, times, available_count) from the previous month's row. Logan sees it pre-populated and can adjust before the 15th.

**Sellout check (atomic, race-safe):**
```sql
UPDATE initiation_drops
SET sold_count = sold_count + 1
WHERE id = ? AND sold_count < available_count
RETURNING *
```
If this returns no rows, the drop is sold out — reject the purchase.

**`early_access_tokens`**
```sql
id          uuid primary key
phone       text not null
token       uuid not null unique
drop_id     uuid references initiation_drops(id)
created_at  timestamptz default now()
```
Generated by the cron job on the 15th. Embedded in the Twilio text. Grants an `early_access_session` cookie valid from `early_access_time` until the drop closes.

### Changes to Existing Tables / Files

- `src/data/inventory.ts`: replace `price` with `initiationPrice` and `memberPrice` per item
- `product_overrides`: add `initiation_price` and `member_price` columns, drop `price` column
- `sms_signups`: add `name text` column for first name collected at signup
- `sms_signups.segment`: no schema change needed — existing `'pledge'` → `'member'` migration handled in code
- `page_content` / `page_drafts`: extended to cover store and membership copy fields (see Section 3)

### Updated Inventory Pricing

| Item | Initiation Price | Member Price |
|------|-----------------|--------------|
| Heartbreaker Long | $159 | $259 |
| Showstopper Short | $129 | $229 |
| Showstopper Long | $159 | $259 |
| Heartbreaker Short | $129 | $229 |

---

## 2. Store State Machine

Store state is **computed** from the clock + active drop row. Nothing requires manual toggling for a standard month.

| Period | Non-member sees | Member sees |
|--------|----------------|-------------|
| 17th → early_access_time on 15th | Sign-up CTA (editable copy) | Live Vault, shop anytime |
| early_access_time → open_time | Checkout open (Pledges with link only) | Live Vault |
| open_time → close_time | Checkout open for everyone | Live Vault |
| Sold out OR close_time hit | Sold-out message (editable copy) | Live Vault |

**Protocol Gate** fires only when a non-member attempts to complete checkout — not on browsing, size selection, or add-to-cart.

**Gate logic (in order):**
1. Is the user a logged-in member? → Always pass.
2. Is the drop sold out (`sold_count >= available_count`) or `is_open = false`? → Block with sold-out copy.
3. Is current time past `close_time`? → Block with sold-out copy.
4. Does the user have a valid `early_access_session` cookie? → Pass if current time ≥ `early_access_time`.
5. Is current time ≥ `open_time` and ≤ `close_time`? → Pass.
6. Otherwise → Block with "sign up for early access" copy.

---

## 3. Editable Customer-Facing Copy

All customer-facing text lives in the existing `page_content` table under a new `page_slug` of `store` and `membership`. It flows through the same draft/publish pipeline as every other page. Logan edits it in the **Store & Membership** section of Edit Pages, just like editing the About or Protocol pages today.

### Store messages (`page_slug = 'store'`)

| field_key | Default copy | Where it appears |
|-----------|-------------|-----------------|
| `gate.signup_headline` | "The Vault is members only." | Protocol Gate — not yet open |
| `gate.signup_body` | "Sign up for texts to get early access on New Member Initiation Night." | Protocol Gate — not yet open |
| `gate.early_access_pending` | "Your early access begins at 11:45pm EST." | Pledge with link, before window opens |
| `gate.sold_out_headline` | "This month's initiation is complete." | After sellout or close_time |
| `gate.sold_out_body` | "See you next month. Members shop the Vault anytime." | After sellout or close_time |
| `cart.second_constable_note` | "1 Constable per initiation. This item is billed at member price." | Cart — 2nd Constable |
| `cart.members_only_label` | "Members only" | Grayed-out non-Constable items in non-member cart |

### Membership registration (`page_slug = 'membership'`)

| field_key | Default copy | Where it appears |
|-----------|-------------|-----------------|
| `setup.headline` | "You're in. Finish your registration." | `/membership-setup` page |
| `setup.body` | "Register now and you can shop the Vault any time — not just once a month. This takes 10 seconds." | `/membership-setup` page |
| `setup.cta_label` | "Activate My Membership" | Button on `/membership-setup` |
| `setup.success_message` | "Welcome to the Vault. You can shop anytime." | After passkey registered |
| `setup.expired_token` | "This link has expired. Contact us to get a new one." | Expired/used token error |

### SMS templates (`page_slug = 'sms'`)

Stored as plain text with `{link}` and `{name}` as substitution placeholders.

| field_key | Default copy |
|-----------|-------------|
| `blast.early_access` | "Tonight is New Member Initiation. Here is your early access link to shop at 11:45pm EST before everyone else. — Popper Tulimond {link}" |
| `reminder.membership_setup` | "You're almost a member. Finish your registration: {link} — shop the Vault anytime instead of waiting until next month." |

### Email templates (`page_slug = 'email'`)

The React Email component provides the layout and brand styling (dark background, gold type, Popper Tulimond aesthetic). The `subject` and `body` fields below are the editable content injected into that template.

| field_key | Default |
|-----------|---------|
| `membership_reminder.day1.subject` | "Your membership is waiting." |
| `membership_reminder.day1.body` | Full editable body copy for day-1 email |
| `membership_reminder.day3.subject` | "Still time to activate." |
| `membership_reminder.day3.body` | Full editable body copy for day-3 email |
| `membership_reminder.day6.subject` | "Your link expires tomorrow." |
| `membership_reminder.day6.body` | Full editable body copy for day-6 email |
| `order_confirmation.subject` | "Your order is confirmed." |
| `order_confirmation.body` | Full editable body copy for order receipt email |

---

## 4. Cart

- State: React context + `localStorage`. Survives tab close, browser restart.
- Non-members: Constable items only. Non-Constable items visible but grayed out (label from `cart.members_only_label`).
- Pricing rule: 1 Constable per cart at initiation price. A 2nd Constable auto-prices at member rate with the note from `cart.second_constable_note`.
- Size selection (S/M/L/XL/XXL) is required before "Add to Cart" activates.
- Cart persists until the user clears cache or completes checkout.

---

## 5. Checkout Flow

All on-site. Never redirects to Stripe-hosted pages.

**Step 1 — Cart review**
Slide-in panel (consistent with existing overlay pattern). Shows: product photo, item name, size, price. "Checkout" CTA at bottom.

**Step 2 — Checkout screen**
Full-page. Order summary at top. Payment options:
- **Apple Pay** button (shown only when browser supports Payment Request API)
- **Google Pay** button (shown only when available)
- **"Pay another way"** — expands to Stripe Payment Element (card form)

**Step 3 — Payment**
- Apple Pay / Google Pay: native OS sheet, Face ID / double-click to confirm.
- Card: fill form, submit. Stripe confirms Payment Intent client-side.

**Step 4 — Order confirmation**
On client-side payment success, call `/api/orders/confirm`:
- Creates `orders` row
- Creates `members` row with `setup_token` (UUID, 7-day expiry)
- Atomically increments `sold_count` on active drop
- Returns `setup_token`

Redirect immediately to `/membership-setup?token={setupToken}`.

Stripe webhook fires in background as the authoritative record — idempotent, handles any edge cases.

**Stripe integration:**
- Payment Intents API
- Stripe Elements (Payment Element for card, Payment Request Button for wallets)
- Webhook endpoint: `/api/stripe/webhook`
- New env vars: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`

---

## 6. Membership Registration Flow

**`/membership-setup?token={setupToken}`**

All copy on this page comes from the `membership` content fields (Section 3). Logan can edit headline, body, CTA label, and error messages in Edit Pages without a code change.

Single CTA → WebAuthn passkey registration (same flow as admin, pointed at `members` table).

On success: token consumed, `passkey_registered` set to true, `member_since` stamped, `orders.member_id` backfilled. Redirect to Vault as logged-in member.

If token expired or already used: show `setup.expired_token` copy.

**Failsafe sequence (if tab closed before registering):**

| Timing | Channel | Template field |
|--------|---------|---------------|
| ~5 min after purchase | Twilio SMS | `sms.reminder.membership_setup` |
| +1 day | Email (Resend) | `email.membership_reminder.day1.*` |
| +3 days | Email (Resend) | `email.membership_reminder.day3.*` |
| +6 days | Email (Resend) | `email.membership_reminder.day6.*` |
| Day 7 | Token expires | — |

Email layout is a React Email component (branded: dark background, gold type, brand voice). Only the subject and body fields are injected from the DB — Logan edits those in Edit Pages, the template handles the rest.

New env vars: `RESEND_API_KEY`, `FROM_EMAIL`

---

## 7. Cron Jobs

All run on Vercel Cron (UTC schedule).

**Drop setup cron — 1st of each month, 9am EST**
- Checks if an `initiation_drops` row exists for this month
- If not, creates one by copying all settings from the previous month's row
- Logan sees it pre-populated in the admin panel and can adjust before the 15th

**Pledge blast cron — 15th of each month, fixed UTC time**
```
45 20 15 * *
```
The cron fires at a fixed UTC time. The route handler reads the active drop's `timezone` and `early_access_time` to determine whether to send now or queue for the correct local time. This means the blast always goes out relative to the timezone Logan has set, not hardcoded EST.

Steps:
1. Pull all `sms_signups` where `segment = 'pledge'`
2. Generate one `early_access_token` per phone for this month's drop
3. Fire Twilio text using the `sms.blast.early_access` template, substituting `{link}`

**Membership reminder cron — daily at 10am EST**
- Finds all `members` where `passkey_registered = false` and token not yet expired
- Sends the appropriate email based on days since `created_at` (day 1, 3, 6)
- Uses the editable email templates from `page_content`

---

## 8. Admin Panel Additions

Three new sections in the Edit Pages panel (owner only).

---

**Store & Membership tab (Edit Pages sidebar)**

Works identically to the existing page editor. Logan edits copy fields, saves a draft, previews, then publishes. Changes go live immediately via `revalidatePath`. Fields covered: all `store.*`, `membership.*`, `sms.*`, and `email.*` fields from Section 3.

---

**Initiation Night tab**

**Store settings (global defaults, carried forward each month):**
- Timezone — dropdown of IANA timezone names (default: America/New_York). Changing this updates all time display and calculations.
- Early access time — time picker (default: 23:45)
- Open time — time picker (default: 00:00)
- Close time — time picker (default: 00:29)

**This month's drop:**
- Available count — integer input (pre-filled from last month)
- All times shown in the selected timezone with a live preview: "Opens at 12:00am EST (05:00 UTC)"
- Save button

**Live during the drop (auto-refreshes every 30 seconds):**
- "X / Y sold" progress
- Store status badge: Open / Closed / Sold Out
- Time remaining until auto-close
- Kill switch: "Close Store Now" / "Reopen Store"

---

**Members tab**
- Table: name, phone, email, member since, passkey registered (yes/no)
- "Resend Setup Link" button per row (for support cases — resends SMS with current setup token, or generates a new one if expired)
- Read-only. No editing member data from this panel.

---

## 9. SMS Segmentation

On purchase confirmed (webhook):
- Update `sms_signups` row for this phone: `segment = 'member'`
- If no `sms_signups` row exists (they checked out without signing up for texts): insert one with `segment = 'member'`

Future: **The Refinery** segment for top 20% lifetime value — schema already supports it via the `segment` text field.

---

## 10. Bug Fix — Protocol Gate

**Current behavior (wrong):** Gate fires on "Find Your Size" and add-to-cart actions.
**Correct behavior:** Gate fires only when a non-member attempts to complete checkout.

Fix: remove gate check from product card and Vault actions. Gate check lives exclusively in the checkout route and `/api/orders/confirm`.

---

## 11. New Environment Variables

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe server-side key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe client-side key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `RESEND_API_KEY` | Transactional email |
| `FROM_EMAIL` | Sender address for member emails |

Existing Twilio vars (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`) are already planned and just need to be set in Vercel.

---

## 12. Checkout — Data Collection (Zero Typing)

**Apple Pay / Google Pay (primary path — majority of mobile users):**
Stripe pulls name, email, billing address, and shipping address automatically from the customer's device account. The customer confirms with Face ID. They type nothing.

**Card ("Pay another way") path:**
- Name and email: browser autofill (Safari, Chrome fill these automatically on second use)
- Card details: browser autofill or manual entry on first use
- Shipping address: Stripe Address Element with Google Places autocomplete — type 3 characters, tap the suggestion. No manual address typing.

**SMS signup form update:**
Add a "First name" field alongside the existing phone field. Two fields total. First name enables personalization in texts ("Tonight is the night" → optional future use). On mobile, autofill typically handles this automatically.

Name and email collected at checkout are saved to the `members` record, so Logan has complete customer profiles by the time someone registers their passkey.

---

## 13. Order Confirmation Email

Sent immediately after payment is confirmed (triggered by the Stripe webhook, not the client). Uses the same Resend + React Email stack as membership emails — fully branded.

Content: order number, item(s) purchased, size(s), price, shipping address, estimated fulfillment note.

Template subject and body copy are editable in Edit Pages under `email.order_confirmation.*`.

---

## 14. Orders Tab (Admin Panel)

A new tab in the Edit Pages panel (owner only). Shows all orders across all drops.

**Columns:** Order date, name, email, phone, items + sizes, total, shipping address, fulfilled (yes/no).

**Actions:**
- Toggle "Fulfilled" checkbox per order
- "Export CSV" button — downloads all orders (or filtered by drop month) for fulfillment handoff

Orders are read-only. Refunds are handled directly in the Stripe dashboard using the `stripe_payment_intent_id` shown on each row.

---

## 15. Member Login (Returning Visits)

Members need a way to identify themselves on subsequent visits so they can access member pricing and skip the Protocol Gate.

**Entry point:** A "Member Login" link in the site nav (or on the Protocol Gate screen when a non-member hits checkout). Subtle — consistent with the brand's restraint.

**Flow:** Tap "Member Login" → WebAuthn prompt → Face ID → member session cookie set → Vault unlocks at member pricing.

**New device recovery:** If a member is on a new phone and their passkey doesn't work:
1. They tap "Log in on a new device" on the login screen
2. They enter their phone number (one field)
3. If it matches a `members` record, a one-time magic link is texted to them
4. They tap the link → it opens the site → WebAuthn registration for the new device runs
5. New credential saved to `member_webauthn_credentials`, old one retained (multi-device support)

The phone number entry is the only typing required in this flow. Everything else is taps.

---

## 16. SMS Signup Form Update

Add "First name" field to the existing SMS signup form. Two fields total: first name, phone number.

On mobile, autofill handles name automatically in most cases. The form should be styled to feel like a single fluid input pair, not a form — consistent with the brand's premium feel.

Data saved to `sms_signups` with a new `name` column.

---

## Out of Scope (Phase E)

- Shop Pay integration
- The Refinery segment logic
- Per-size inventory tracking
- Lookbook / garment image uploads (Phase C item)
