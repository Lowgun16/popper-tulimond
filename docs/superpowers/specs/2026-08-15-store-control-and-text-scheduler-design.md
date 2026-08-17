# Build 1 — Store Control & 3-Text Scheduler

**Date:** 2026-08-15
**Phase:** D (Commerce & Member System)
**Status:** Design — awaiting review
**Author:** Brainstormed with Logan (founder)

---

## 1. Goal

Give Logan a self-serve way to **open the store whenever the moment is hot** — pick a date/time and a quantity, and let the site automatically warn the waiting list with a three-text sequence — without touching the database or writing any code. Also fold in two model changes decided during the brainstorm: **flat pricing** (membership is access, not a discount) and **access rules** (non-members can only buy The Constable during an open window; members buy anything, anytime).

This is the largest remaining piece of Phase D. The checkout-and-membership *transaction* is already built (see §3); this build adds the **control surface** and **notification engine** on top, plus the pricing/access refactor.

---

## 2. Background — what already exists (do NOT rebuild)

A prior session already shipped a working commerce/membership core. Verified in code as of 2026-08-15:

- **Real Stripe checkout** with Apple Pay / Google Pay (`src/components/CartDrawer.tsx`, `src/app/checkout/page.tsx`, `src/app/api/checkout/payment-intent/route.ts`) and a webhook + order-confirm path that mints members (`src/app/api/stripe/webhook/route.ts`, `src/app/api/orders/confirm/route.ts`).
- **Member accounts minted on purchase**, with passkey setup link, passkey login, and celebration (`src/app/membership-setup/page.tsx`, `src/app/api/member/webauthn/*`, `src/components/AtelierNav.tsx`, `src/lib/memberAuth.ts`, `src/lib/memberSession.ts`).
- **Store-phase logic** that gates non-members by time window (`src/lib/storeState.ts`, `getStorePhase()`).
- **Early-access token flow** (`src/app/early-access/[token]/`, `early_access_tokens` table) that sets an `early_access_session` cookie.
- **Reservation / "we'll hold your selection"** flow with a Resend email (`src/app/api/checkout/reserve/route.ts`, `src/components/ReservationSheet.tsx`).
- **DB tables from `scripts/migrate-phase-d.sql`:** `members`, `member_webauthn_credentials`, `orders`, `initiation_drops`, `early_access_tokens`, plus `checkout_intents`.

**Two confirmed gaps this build fills:**
1. **Admin drop control is read-only** — the only endpoint is `GET /api/store/active-drop`. Openings are created/edited by hand-editing the DB. There is no "open the store" UI.
2. **No scheduled SMS blast** — Twilio only fires on individual triggers (signup, order, login link). Nothing texts the waiting list when an opening is scheduled. There is no cron infrastructure (no `vercel.json`).

---

## 3. Scope

### In scope (Build 1)
1. **Store Control admin panel** — schedule, edit, cancel, and manually open/close store openings.
2. **Opening data-model evolution** — explicit open/early-access timestamps, quantity, per-opening "limit 1 per non-member" toggle, and text-scheduling state.
3. **3-Text Scheduler** — automated heads-up / day-of / early-door texts to non-members, driven by a Vercel Cron job.
4. **Flat-pricing refactor** — one price per item; remove the two-tier initiation/member pricing logic.
5. **Access-rule refactor** — non-members can only buy The Constable during an open window; members can buy anything, anytime. Enforced server-side.

### Out of scope (separate specs)
- **Build 2 — Member device visibility:** soft-flag at 5 distinct passkeys + admin view/revoke.
- **Build 3 — Member backorders + member notification stream:** members reserve sold-out items, fulfilled ahead of non-members; separate member (non-pledge) text channel.
- **Future — The Refinery:** invite-only tier beyond the Vault for top-10% customers (~1 year out). Design stays tier-aware but nothing is built.

---

## 4. Settled decisions (from the brainstorm)

- **Checkout:** hosted/express Stripe with Apple Pay / Google Pay first — already built, keep.
- **Opening cadence:** no fixed calendar. Logan picks an arbitrary date/time per opening.
- **Store hours apply to non-members only.** Members shop 24/7 and bypass the window.
- **Opening is fully automatic — no manual "open" step.** The store opens to non-members by itself at the exact date/time announced in Text 1 (`opens_at`). Logan never has to press "open."
- **Auto-close after a 3-hour non-member window (default midnight–3am ET) or sellout, whichever comes first.** Logan can also close early manually at any time. There is no way to *extend* past the window except by scheduling a new opening.
- **Pricing is flat.** Membership benefit is *access*, not a discount. The old "1st Constable at initiation price, 2nd at member price" rule is removed.
- **Access:** non-members → The Constable (2 colors) only, only during an open window. Members → anything, anytime.
- **Per-non-member cap:** removed by default; exposed as a per-opening toggle Logan can flip when queue-to-inventory is tight.
- **3-text model (Option C):** Logan authors only Text 1 and sets its send time; sending Text 1 locks the plan and auto-commits Texts 2 & 3.
- **Login:** passkey-to-shop; code/link only bootstraps a passkey; no hard device cap, soft-flag at 5 (the flag itself is Build 2).

---

## 5. Data model

### 5.1 `initiation_drops` — evolve to explicit timestamps

The current table derives timing from `drop_month` (a DATE, "always the 16th") plus wall-clock time strings and a brittle "previous day" calculation. Arbitrary openings need explicit moments. Add timestamp columns and a lifecycle + text-scheduling state. Migration is additive and backfills existing rows.

New/changed columns on `initiation_drops`:

| Column | Type | Meaning |
|---|---|---|
| `opens_at` | `TIMESTAMPTZ` | The moment the store opens to the general (non-member) public. |
| `early_access_at` | `TIMESTAMPTZ` | When early-access-link holders can start buying. Default `opens_at − 15 min`. |
| `closes_at` | `TIMESTAMPTZ NOT NULL` | When the non-member window ends. Defaults to `opens_at + window_minutes` (3h). The store also closes earlier on sellout or a manual close. |
| `window_minutes` | `INTEGER NOT NULL DEFAULT 180` | Non-member window length. Editable before lock; drives `closes_at`. |
| `limit_one_per_nonmember` | `BOOLEAN NOT NULL DEFAULT false` | Per-opening cap toggle. |
| `status` | `TEXT NOT NULL DEFAULT 'draft'` | Lifecycle: `draft` → `scheduled` → `announced` (Text 1 sent, locked) → `closed` / `canceled`. |
| `announce_at` | `TIMESTAMPTZ NULL` | When Text 1 (heads-up) should send. |
| `announce_message` | `TEXT NULL` | Editable body for Text 1. Falls back to default template. |
| `announce_sent_at` | `TIMESTAMPTZ NULL` | Set when Text 1 sends. Presence = **locked**. |
| `reminder_at` | `TIMESTAMPTZ NOT NULL` | When Text 2 (day-of reminder) sends. Defaults to opening-day **3:45pm ET**; editable before lock. |
| `reminder_sent_at` | `TIMESTAMPTZ NULL` | Set when Text 2 sends. |
| `earlybird_sent_at` | `TIMESTAMPTZ NULL` | Set when Text 3 (early-door) sends. |

Existing columns kept for backfill/compat (`drop_month`, `open_time`, `early_access_time`, `close_time`, `timezone`, `available_count`, `sold_count`, `is_open`). `available_count` / `sold_count` / `is_open` remain the non-member inventory + kill-switch. `drop_month`'s `UNIQUE` constraint is dropped (multiple openings over time are allowed; at most one is "current").

**Text 2 timing:** stored in `reminder_at`, defaulting to **3:45pm ET on the opening day** (derived from `opens_at`'s calendar day in `timezone`) and **editable per opening** before the plan locks.

**"Current opening" selection:** the opening whose window is active now, else the next upcoming `scheduled`/`announced` opening. Query by `opens_at`, not `drop_month DESC`. Centralize this in one helper (e.g. `getCurrentDrop()` in `src/lib/storeState.ts`) and update **every** existing caller that currently does `SELECT * FROM initiation_drops ORDER BY drop_month DESC LIMIT 1` — `payment-intent`, `checkout/reserve`, and `store/active-drop` — to use it.

### 5.2 Flat pricing on inventory

`src/data/inventory.ts` currently carries `initiationPriceCents` and `memberPriceCents` per `OutfitItem`. Collapse to a single canonical `priceCents`. Downstream types that carry both (`CartItem` in `src/contexts/CartContext.tsx`, the payment-intent payload, the reserve email) collapse to one price. Members and non-members pay the same amount for the Constable.

### 5.3 Per-item access flag

Add an access marker to `OutfitItem`, e.g. `publicDuringDrops: boolean` (true for the two Constable colors; false = member-only). All current items are `true`. This makes the access rule enforceable now and future member-only items automatic later.

---

## 6. Store-phase logic refactor

Rewrite `getStorePhase(drop, now)` in `src/lib/storeState.ts` to compare `now` against the explicit timestamps:

```
if !is_open OR sold_count >= available_count → "sold_out"
if closes_at set and now >= closes_at        → "sold_out"
if now >= opens_at                           → "open"
if now >= early_access_at                    → "early_access"
else                                         → "signup"
```

Drop the `date-fns-tz` "previous day" derivation; timestamps are already absolute. Keep the existing `storeState.test.ts` and extend it for the new fields. Member purchases continue to bypass phase entirely (already true in `payment-intent`).

**Opening and closing are both automatic**, purely a function of `now` vs. the stored timestamps — no admin action triggers them. The store opens itself at `opens_at`, and closes itself at `closes_at` (= `opens_at + window_minutes`, default 3h) or on sellout, whichever is first. The only manual lever is an early **close** (kill switch). There is no manual "open."

---

## 7. Pricing & access enforcement

Server-side, in `src/app/api/checkout/payment-intent/route.ts`:

- **Pricing:** every line item uses its single `priceCents`. Remove the `constableCount` two-tier loop.
- **Access:** if the buyer is **not** a member, reject the request when the cart contains any item with `publicDuringDrops === false` (member-only). Non-members may only check out items flagged public, and only when the store phase is `open` or `early_access` (already enforced). Members bypass both checks.
- Keep the existing early-access-cookie/token validation for the `early_access` phase.

`orders/confirm` continues to atomically decrement `sold_count` for non-member purchases and leaves member purchases untracked against the drop counter (member inventory semantics are a Build 3 concern — see §12).

---

## 8. Admin Store Control panel

A new **owner-only** tab in the existing Edit Pages shell (`src/components/edit-pages/EditPagesPanel.tsx`), alongside Products and Lookbook Media. Reuses admin auth (`requireOwner` from `src/lib/adminAuth.ts`) and the existing panel patterns.

### 8.1 UI

- **Schedule an Opening** form:
  - Opening date + time (→ `opens_at`, in `timezone`, default America/New_York).
  - Quantity available (→ `available_count`).
  - "Limit 1 per non-member" toggle (→ `limit_one_per_nonmember`).
  - Heads-up text date + time (→ `announce_at`) and an editable Text 1 body (→ `announce_message`, pre-filled with the default template and a live preview showing the resolved date/time).
  - Early-access lead time (default 15 min before open → `early_access_at`).
  - Non-member window length (default **180 min / 3 hours** → `window_minutes`, which sets `closes_at`).
  - Day-of reminder time (default **3:45pm ET** → `reminder_at`), editable per opening.
- **Opening list / detail:** shows each opening's status (`draft`/`scheduled`/`announced`/`closed`/`canceled`), the three text states (pending/sent + timestamps), and live `sold_count / available_count` during an active window.
- **Edit / Cancel:** allowed only while `announce_sent_at IS NULL` (before Text 1 fires). After that the opening is **locked** (open/close times and quantity can't change — only an early manual close).
- **Manual override (always available):** a single **"Close now"** kill switch (sets `is_open = false`), allowed even when locked. There is **no** manual "open" — opening is automatic at `opens_at`.

### 8.2 API routes (owner-only)

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/openings` | `GET` | List openings with status + text state. |
| `/api/admin/openings` | `POST` | Create a `scheduled` opening. |
| `/api/admin/openings/[id]` | `PATCH` | Edit — rejected if locked (`announce_sent_at` set). |
| `/api/admin/openings/[id]` | `POST` (action) | `cancel` (before lock) or `close-now` (early kill switch). No `open-now` — opening is automatic. |

All guarded by `requireOwner`; all DB access via the `sql` tagged template.

---

## 9. The 3-Text Scheduler

### 9.1 Audience

**Non-members only** = current pledges: `sms_signups` rows that are not members (`segment = 'pledge'`, and/or phone not present in `members`). Members are excluded from every opening text — they have their own channel (Build 3).

### 9.2 The three texts and their timing

| Text | Fires when | Audience | Purpose |
|---|---|---|---|
| **1 — Heads-Up** | `announce_at` (Logan-set, days ahead) | pledges | *"The Store will be open on {date} at {time}."* Sending this **locks** the opening. |
| **2 — Day-Of Reminder** | `reminder_at` (default 3:45pm ET on the opening day, editable) | pledges | Reminder + **early-access link** (per-recipient token). |
| **3 — Early Door** | `early_access_at` (open − 15 min) | early-access-link holders (pledges texted in Text 2) | *"The door is open early for you — 15 minutes before the public. Move before we sell out."* |

**Lock mechanic:** Texts 2 and 3 have no independently-set times — they derive from `opens_at`. They are only *committed* once Text 1 sends (`announce_sent_at` set). Before that, editing/canceling the opening rescinds them.

### 9.3 Driver — a scheduled ping every ~5 minutes

The three texts (and the automatic open/close, which are already time-derived by `getStorePhase` and need no trigger) are driven by a small scheduled job hitting `GET /api/cron/opening-texts`.

**Cadence: every ~5 minutes.** Confirmed acceptable by Logan at current volume — Text 3 (early door) may fire up to ~5 minutes late, which is immaterial while non-member turnout is small; anyone who arrives a few minutes late still gets a shirt. Revisit minute-level precision once turnout is consistently in the thousands.

**Decision — free external scheduler for now.** Because any Vercel cron more frequent than once per day requires the Pro plan, we avoid upgrading by pointing a **free external scheduler** (e.g. cron-job.org or a GitHub Actions scheduled workflow) at `https://poppertulimond.com/api/cron/opening-texts` every 5 minutes. If it proves flaky, the fallback is a one-line `vercel.json` cron (`{ "crons": [{ "path": "/api/cron/opening-texts", "schedule": "*/5 * * * *" }] }`) once the project is on Vercel Pro — same endpoint, no code change.

The route is protected: it requires an `Authorization: Bearer ${CRON_SECRET}` header, configured on the external scheduler. Reject anything without it.
- Each run, in one pass:
  1. **Text 1:** openings with `announce_at <= now` and `announce_sent_at IS NULL` and `status='scheduled'` → send to pledges, set `announce_sent_at`, `status='announced'`.
  2. **Text 2:** `announced` openings where `reminder_at <= now` and `reminder_sent_at IS NULL` → generate a per-pledge `early_access_tokens` row + link, send, set `reminder_sent_at`.
  3. **Text 3:** `announced` openings where `early_access_at <= now` and `earlybird_sent_at IS NULL` → send early-door text (reuse each pledge's token link), set `earlybird_sent_at`.

### 9.4 Idempotency & concurrency

- The `*_sent_at` columns are the guard. Each step flips its flag inside a conditional `UPDATE ... WHERE <flag> IS NULL RETURNING id` so two overlapping cron runs can't double-send.
- Per-recipient send failures are logged and skipped, not fatal to the batch.

### 9.5 SMS sending helper

- Introduce `src/lib/sms.ts` centralizing Twilio send (currently duplicated inline in `sms-signup` and `orders/confirm`). Refactor those call sites to use it.
- For blasts, send through a **Twilio Messaging Service** (`TWILIO_MESSAGING_SERVICE_SID`) for throughput, number pooling, and built-in STOP/HELP compliance. Send in rate-limited batches; a failed recipient does not abort the run.
- Respect opt-outs (Twilio handles STOP automatically via the Messaging Service).

### 9.6 Default message copy (brand voice — restrained, noir)

- **Text 1:** `The Store opens {date} at {time} ET. You'll get your early-access link the day of. — Popper Tulimond`
- **Text 2:** `Tonight. The Vault opens at {time} ET. Your early-access link — fifteen minutes before the public: {link} — Popper Tulimond`
- **Text 3:** `The door is open for you. Fifteen minutes before the public. Move before we sell out: {link} — Popper Tulimond`

Text 1 is editable per opening; Texts 2 & 3 use templates (editable later if wanted). `{date}`/`{time}` resolve from `opens_at` in `timezone`.

---

## 10. Error handling & edge cases

- **No pledges to text:** cron marks the step sent and no-ops (still advances state).
- **Opening canceled before Text 1:** `status='canceled'`; cron ignores it.
- **Sellout before/at open:** `getStorePhase` returns `sold_out`; non-member checkout is refused with the existing 403 path → reservation flow. Members unaffected.
- **Cron misfire / late run:** because triggers are `<= now`, a delayed run still sends (slightly late) rather than skipping. Acceptable for Texts 1 and 2; Text 3's value degrades if very late, but the guard still prevents duplicates.
- **Auto-close:** when `now >= closes_at` (3h after open by default) or `sold_count >= available_count`, `getStorePhase` returns `sold_out` and non-member checkout is refused — no admin action needed.
- **Manual "Close now" during a live window:** sets `is_open=false`; phase becomes `sold_out`; door shuts for non-members immediately, even inside the 3-hour window.
- **Timezone:** all display and 3:45pm-ET logic use the opening's `timezone` (default America/New_York) via `date-fns-tz`.

---

## 11. Testing

- **Unit:** extend `src/lib/storeState.test.ts` for the timestamp-based `getStorePhase` (all four phases, sellout, hard-close, kill switch).
- **Unit:** pricing/access logic in `payment-intent` — flat price applied; non-member cart with a member-only item rejected; member bypass.
- **Unit:** cron step selection + idempotency (a second run does not re-send).
- **Manual/integration:** schedule a near-future opening in a test env, confirm the three texts fire to a pledge test number in order with correct links, and that editing is blocked after Text 1.

---

## 12. Out of scope / known limitations (flagged for later)

- **Member purchase inventory is not tracked against the drop counter.** Members can buy anytime and `sold_count` only reflects non-member purchases. Real per-item stock accounting is a **Build 3** concern (ties into member backorders).
- **Member device flagging (soft-flag at 5)** — Build 2.
- **Member notification stream & sold-out backorders** — Build 3.
- **The Refinery tier** — future; design stays tier-aware only.

---

## 13. New environment variables

| Variable | Purpose |
|---|---|
| `CRON_SECRET` | Shared secret to authorize the Vercel cron route. |
| `TWILIO_MESSAGING_SERVICE_SID` | Twilio Messaging Service for compliant, higher-throughput blasts. |

(`STRIPE_*`, `TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER`, `RESEND_API_KEY`, `SESSION_SECRET`, `WEBAUTHN_*` already exist.)

---

## 14. Open questions

None blocking. Both prior questions are resolved:
- **Scheduler:** free external scheduler pinging `/api/cron/opening-texts` every 5 min, secured by `CRON_SECRET`; Vercel Pro cron is the drop-in fallback (§9.3).
- **Text 2 time:** editable per opening via `reminder_at`, default 3:45pm ET (§5.1, §9.2).
