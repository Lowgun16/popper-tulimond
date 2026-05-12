# Phase D-1: Core Commerce Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up end-to-end checkout (Stripe + Apple Pay / Google Pay), member record creation, passkey registration, and member Vault access.

**Architecture:** Cart state lives in localStorage via React context. Stripe Payment Intents handle all payment paths. On payment success the server creates a `members` row and returns a setup token; the client redirects to `/membership-setup` where the member registers a passkey using the existing WebAuthn infrastructure pointed at a new `members` table. Store open/closed state is computed at runtime from the `initiation_drops` row.

**Tech Stack:** Stripe (Payment Intents, Payment Element, Payment Request Button), `@simplewebauthn/server` + `@simplewebauthn/browser`, `date-fns-tz`, `resend` + `@react-email/components`, Twilio (already wired), Neon Postgres (existing `sql` helper), Next.js App Router API routes.

**Scope note:** This plan covers DB through working checkout + member registration. Admin panel extensions (Initiation Night tab, Members tab, Orders tab, copy editor) and cron jobs are Phase D-2.

---

## File Map

**New files:**
- `scripts/migrate-phase-d.sql` — all new table DDL
- `src/lib/formatPrice.ts` — `formatPrice(cents)` helper
- `src/lib/storeState.ts` — compute store phase from drop row + clock
- `src/lib/memberSession.ts` — JWT for member sessions (mirrors `session.ts`)
- `src/lib/memberAuth.ts` — `requireMemberSession`, `getMemberSession` (mirrors `adminAuth.ts`)
- `src/contexts/CartContext.tsx` — cart state + localStorage persistence
- `src/hooks/useMemberSession.ts` — client-side member auth state
- `src/components/vault/SizeSelector.tsx` — inline size picker on vault product cards
- `src/app/api/store/active-drop/route.ts` — GET current drop data
- `src/app/api/checkout/payment-intent/route.ts` — create Stripe PaymentIntent
- `src/app/api/orders/confirm/route.ts` — post-payment: create order + member row
- `src/app/api/stripe/webhook/route.ts` — Stripe webhook handler (authoritative record)
- `src/app/api/member/webauthn/register-options/route.ts`
- `src/app/api/member/webauthn/register-verify/route.ts`
- `src/app/api/member/webauthn/auth-options/route.ts`
- `src/app/api/member/webauthn/auth-verify/route.ts`
- `src/app/api/member/webauthn/logout/route.ts`
- `src/app/api/member/login-link/route.ts` — new device recovery (sends magic link text)
- `src/app/checkout/page.tsx` — card checkout page (Stripe PaymentElement)
- `src/app/membership-setup/page.tsx` — post-purchase passkey registration
- `src/emails/OrderConfirmation.tsx` — React Email template
- `src/emails/MembershipReminder.tsx` — React Email template (day 1 / 3 / 6)
- `src/emails/EmailLayout.tsx` — shared branded wrapper

**Modified files:**
- `src/data/inventory.ts` — add `initiationPriceCents`, `memberPriceCents`; remove `price`
- `src/components/studio/studioTypes.ts` — update `LookbookContext` price fields
- `src/lib/productOverrides.ts` — update `ProductOverride` type + merge logic
- `src/components/overlays/VaultOverlay.tsx` — replace "Find Your Size" → `SizeSelector`
- `src/components/CartDrawer.tsx` — update `CartItem` type, connect to CartContext, wire real Stripe actions
- `src/app/ClientPage.tsx` — wrap in CartProvider, connect member session, fix payment handlers
- `src/app/layout.tsx` — wrap in CartProvider
- `src/components/SmsSignupSheet.tsx` — add first name field
- `src/app/api/sms-signup/route.ts` — accept + save `firstName`
- `src/components/AtelierNav.tsx` — add Member Login link + cart count badge
- `src/components/ProtocolGate.tsx` — dynamic copy from store state

---

## Task 1: Install Packages

**Files:** `package.json`

- [ ] Run: `npm install stripe @stripe/stripe-js @stripe/react-stripe-js date-fns-tz resend @react-email/components`
- [ ] Verify `@simplewebauthn/browser` is already installed: `cat package.json | grep simplewebauthn`
  - If missing: `npm install @simplewebauthn/browser`
- [ ] Commit:
```bash
git add package.json package-lock.json
git commit -m "chore: install stripe, date-fns-tz, resend, react-email"
```

---

## Task 2: DB Migration

**Files:**
- Create: `scripts/migrate-phase-d.sql`

- [ ] Create `scripts/migrate-phase-d.sql`:

```sql
-- Phase D migration

-- Members table
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  setup_token UUID UNIQUE,
  setup_token_expires_at TIMESTAMPTZ,
  passkey_registered BOOLEAN NOT NULL DEFAULT false,
  member_since TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Member WebAuthn credentials (mirrors webauthn_credentials)
CREATE TABLE member_webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id),
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id),
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  shipping_address JSONB NOT NULL,
  items JSONB NOT NULL,
  total_cents INTEGER NOT NULL,
  fulfilled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Initiation drops
CREATE TABLE initiation_drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_month DATE NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  open_time TEXT NOT NULL DEFAULT '00:00',
  early_access_time TEXT NOT NULL DEFAULT '23:45',
  close_time TEXT NOT NULL DEFAULT '00:29',
  available_count INTEGER NOT NULL DEFAULT 500,
  sold_count INTEGER NOT NULL DEFAULT 0,
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Early access tokens
CREATE TABLE early_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  drop_id UUID NOT NULL REFERENCES initiation_drops(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Update sms_signups: add name column
ALTER TABLE sms_signups ADD COLUMN IF NOT EXISTS name TEXT;

-- Update product_overrides: add dual-price columns
ALTER TABLE product_overrides
  ADD COLUMN IF NOT EXISTS initiation_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS member_price_cents INTEGER;
-- Note: existing price column is preserved for now; ProductEditor will be
-- updated in Phase D-2 to edit the new columns. Drop price column in Phase D-2.
```

- [ ] Run against production DB:
```bash
# Copy SQL, run in Neon console or via psql
psql $DATABASE_URL -f scripts/migrate-phase-d.sql
```
Expected: all statements complete with no errors.

- [ ] Commit:
```bash
git add scripts/migrate-phase-d.sql
git commit -m "feat: add Phase D DB migration — members, orders, drops, early_access_tokens"
```

---

## Task 3: Price Helpers + Inventory Type Update

**Files:**
- Create: `src/lib/formatPrice.ts`
- Modify: `src/data/inventory.ts`
- Modify: `src/components/studio/studioTypes.ts`

- [ ] Create `src/lib/formatPrice.ts`:

```ts
export function formatPrice(cents: number): string {
  return `$${Math.floor(cents / 100).toLocaleString("en-US")}`;
}
```

- [ ] Write the test `src/lib/__tests__/formatPrice.test.ts`:

```ts
import { formatPrice } from "../formatPrice";

test("formats cents as dollar string", () => {
  expect(formatPrice(12900)).toBe("$129");
  expect(formatPrice(22900)).toBe("$229");
  expect(formatPrice(15900)).toBe("$159");
  expect(formatPrice(25900)).toBe("$259");
});
```

- [ ] Run test: `npx jest src/lib/__tests__/formatPrice.test.ts`
  Expected: PASS

- [ ] Update `OutfitItem` in `src/data/inventory.ts` — replace `price: string` with dual-price fields:

```ts
export interface OutfitItem {
  id: string;
  name: string;
  collection: string;
  colorway: string;
  /** Initiation Night price in cents, e.g. 12900 for $129 */
  initiationPriceCents: number;
  /** Member price in cents, e.g. 22900 for $229 */
  memberPriceCents: number;
  type: AccessType;
  dotPosition: string;
  lookbook?: LookbookItem[];
  filterDimensions?: FilterDimension[];
  sizes: string[];
  sizeChart?: Record<string, { chest: string; length: string }>;
  materials?: string;
  story?: string;
  sizeGuide?: string;
  productImage?: string;
}
```

- [ ] Update every item in `MODEL_INVENTORY` — replace `price: "$129"` / `price: "$159"` with:
  - Short sleeve items (Showstopper Short, Heartbreaker Short): `initiationPriceCents: 12900, memberPriceCents: 22900`
  - Long sleeve items (Heartbreaker Long, Showstopper Long): `initiationPriceCents: 15900, memberPriceCents: 25900`

- [ ] Update `LookbookContext` in `src/components/studio/studioTypes.ts`:

```ts
export interface LookbookContext {
  name: string;
  collection: string;
  colorway: string;
  initiationPriceCents: number;
  memberPriceCents: number;
  type: AccessType;
  lookbook: LookbookItem[];
  filterDimensions?: FilterDimension[];
  story?: string;
  materials?: string;
  sizeGuide?: string;
  sizes: string[];
  sizeChart?: Record<string, { chest: string; length: string }>;
}
```

- [ ] Fix any TypeScript errors from the `price` removal: `npx tsc --noEmit 2>&1 | head -40`
  Common hits: `VaultOverlay.tsx` (uses `item.price`), `LookbookOverlay.tsx` (uses `ctx.price`), `productOverrides.ts` (uses `override.price`). Fix each — replace `item.price` with `formatPrice(item.initiationPriceCents)` imported from `@/lib/formatPrice`.

- [ ] Commit:
```bash
git add src/lib/formatPrice.ts src/lib/__tests__/formatPrice.test.ts src/data/inventory.ts src/components/studio/studioTypes.ts
git commit -m "feat: replace price string with initiationPriceCents/memberPriceCents on OutfitItem"
```

---

## Task 4: Update productOverrides

**Files:** Modify `src/lib/productOverrides.ts`

- [ ] Update `ProductOverride` type and merge logic:

```ts
export type ProductOverride = {
  item_id: string;
  initiation_price_cents: number | null;
  member_price_cents: number | null;
  display_name: string | null;
  product_image: string | null;
  status: "active" | "sold_out" | "hidden";
  is_draft: boolean;
};

export function mergeInventoryWithOverrides(
  inventory: ModelSlot[],
  overrides: ProductOverride[]
): ModelSlot[] {
  const overrideMap = new Map<string, ProductOverride>(
    overrides.map((o) => [o.item_id, o])
  );

  return inventory.map((slot) => {
    const mergedOutfit = slot.outfit
      .filter((item) => {
        const override = overrideMap.get(item.id);
        return !override || override.status !== "hidden";
      })
      .map((item): OutfitItem & { _vaultStatus?: string } => {
        const override = overrideMap.get(item.id);
        if (!override) return item;
        return {
          ...item,
          initiationPriceCents: override.initiation_price_cents ?? item.initiationPriceCents,
          memberPriceCents: override.member_price_cents ?? item.memberPriceCents,
          name: override.display_name ?? item.name,
          productImage: override.product_image ?? item.productImage,
          _vaultStatus: override.status,
        };
      });
    return { ...slot, outfit: mergedOutfit };
  });
}
```

- [ ] Run `npx tsc --noEmit` — fix any remaining errors from the `price` removal.
- [ ] Commit:
```bash
git add src/lib/productOverrides.ts
git commit -m "feat: update ProductOverride to dual-price cents fields"
```

---

## Task 5: CartContext with localStorage

**Files:** Create `src/contexts/CartContext.tsx`

- [ ] Create `src/contexts/CartContext.tsx`:

```tsx
"use client";

import { createContext, useContext, useEffect, useReducer, useCallback, useState } from "react";

const STORAGE_KEY = "pt_cart";

export interface CartItem {
  id: string;           // unique instance: itemId + size + random suffix
  itemId: string;       // OutfitItem.id
  name: string;
  collection: string;
  colorway: string;
  size: string;
  initiationPriceCents: number;
  memberPriceCents: number;
  productImage?: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

type CartAction =
  | { type: "ADD"; item: CartItem }
  | { type: "REMOVE"; id: string }
  | { type: "CLEAR" }
  | { type: "OPEN" }
  | { type: "CLOSE" }
  | { type: "HYDRATE"; items: CartItem[] };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "HYDRATE": return { ...state, items: action.items };
    case "ADD":     return { ...state, items: [...state.items, action.item], isOpen: true };
    case "REMOVE":  return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    case "CLEAR":   return { ...state, items: [] };
    case "OPEN":    return { ...state, isOpen: true };
    case "CLOSE":   return { ...state, isOpen: false };
  }
}

interface CartContextValue extends CartState {
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], isOpen: false });
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) dispatch({ type: "HYDRATE", items: JSON.parse(stored) });
    } catch { /* ignore parse errors */ }
    setHydrated(true);
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  }, [state.items, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, "id">) => {
    dispatch({ type: "ADD", item: { ...item, id: `${item.itemId}-${item.size}-${Math.random().toString(36).slice(2, 7)}` } });
  }, []);

  const removeItem = useCallback((id: string) => dispatch({ type: "REMOVE", id }), []);
  const clearCart  = useCallback(() => dispatch({ type: "CLEAR" }), []);
  const openCart   = useCallback(() => dispatch({ type: "OPEN" }), []);
  const closeCart  = useCallback(() => dispatch({ type: "CLOSE" }), []);

  return (
    <CartContext.Provider value={{ ...state, addItem, removeItem, clearCart, openCart, closeCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
```

- [ ] Wrap the app in `CartProvider`. In `src/app/layout.tsx`, import `CartProvider` and wrap `{children}`:

```tsx
import { CartProvider } from "@/contexts/CartContext";
// ...inside the body:
<CartProvider>{children}</CartProvider>
```

- [ ] Commit:
```bash
git add src/contexts/CartContext.tsx src/app/layout.tsx
git commit -m "feat: add CartContext with localStorage persistence"
```

---

## Task 6: VaultOverlay — Replace "Find Your Size" with SizeSelector

**Files:**
- Create: `src/components/vault/SizeSelector.tsx`
- Modify: `src/components/overlays/VaultOverlay.tsx`

- [ ] Create `src/components/vault/SizeSelector.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { CSSProperties } from "react";

interface SizeSelectorProps {
  sizes: string[];
  onAddToCart: (size: string) => void;
  disabled?: boolean;
}

const GOLD = "#C4A456";

export default function SizeSelector({ sizes, onAddToCart, disabled }: SizeSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    if (!selected) return;
    onAddToCart(selected);
    setAdded(true);
    setTimeout(() => { setAdded(false); setSelected(null); }, 1500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {sizes.map((size) => (
          <button
            key={size}
            onClick={() => setSelected(size)}
            disabled={disabled}
            style={{
              width: 40, height: 36,
              background: selected === size ? "rgba(196,164,86,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${selected === size ? GOLD : "rgba(255,255,255,0.12)"}`,
              color: selected === size ? GOLD : "rgba(240,232,215,0.55)",
              fontFamily: "var(--font-title, serif)",
              fontSize: "10px",
              letterSpacing: "0.1em",
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            {size}
          </button>
        ))}
      </div>
      {selected && (
        <button
          onClick={handleAdd}
          style={{
            padding: "10px 20px",
            background: added ? "rgba(196,164,86,0.2)" : "rgba(196,164,86,0.1)",
            border: `1px solid ${GOLD}`,
            color: GOLD,
            fontFamily: "var(--font-title, serif)",
            fontSize: "10px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          {added ? "Added" : `Add to Cart — ${selected}`}
        </button>
      )}
    </div>
  );
}
```

- [ ] Update `VaultOverlay.tsx` — replace the "Find Your Size" button with `SizeSelector`. Remove the `onProtocolGate` prop and its usages from the vault card. The `onAddToCart` prop is added instead.

  Add to `VaultOverlayProps`:
  ```ts
  onAddToCart: (item: OutfitItem, size: string) => void;
  ```
  Remove: `onProtocolGate: () => void;`

  Replace the button block at the bottom of each item card:
  ```tsx
  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
    <button
      type="button"
      style={isSoldOut ? { ...lookbookBtnStyle, opacity: 0.4, pointerEvents: "none" } : lookbookBtnStyle}
      disabled={isSoldOut}
      onClick={() => onOpenLookbook({ ...item, lookbook: item.lookbook ?? [] })}
    >
      Lookbook
    </button>
    {!isSoldOut && (
      <SizeSelector
        sizes={item.sizes}
        onAddToCart={(size) => onAddToCart(item, size)}
      />
    )}
  </div>
  ```
  Also replace the price display line — replace `{item.price}` with `{formatPrice(item.initiationPriceCents)}` (import `formatPrice` from `@/lib/formatPrice`).

  Add import at top of `VaultOverlay.tsx`:
  ```ts
  import SizeSelector from "@/components/vault/SizeSelector";
  import { formatPrice } from "@/lib/formatPrice";
  ```

- [ ] Commit:
```bash
git add src/components/vault/SizeSelector.tsx src/components/overlays/VaultOverlay.tsx
git commit -m "feat: replace Protocol Gate trigger with inline SizeSelector on vault cards"
```

---

## Task 7: Wire CartContext into ClientPage + CartDrawer

**Files:**
- Modify: `src/app/ClientPage.tsx`
- Modify: `src/components/CartDrawer.tsx`

- [ ] Update `CartDrawer.tsx` — import `useCart` instead of taking items/callbacks as props. The new `CartDrawerProps` is just `{ onCheckout: () => void }`. CartDrawer reads from context internally.

  Update the `CartItem` import to use the context type:
  ```tsx
  import { useCart, type CartItem } from "@/contexts/CartContext";
  import { formatPrice } from "@/lib/formatPrice";
  ```

  The component reads `const { items, isOpen, closeCart, removeItem } = useCart();`

  Update the price display line in the item list:
  ```tsx
  {formatPrice(item.initiationPriceCents)}
  ```

  Update the total calculation:
  ```tsx
  const total = items.reduce((acc, item) => acc + item.initiationPriceCents, 0);
  ```

  The Apple Pay, Google Pay, and "Pay another way" handlers now call `props.onCheckout` or trigger the real Stripe payment request (wired in Task 16).

- [ ] Update `ClientPage.tsx`:

```tsx
"use client";

import { useCallback } from "react";
import { useCart } from "@/contexts/CartContext";
import Portal from "@/components/Portal";
import CartDrawer from "@/components/CartDrawer";
import type { AllPageContent } from "@/lib/contentTypes";
import type { ProductOverride } from "@/lib/productOverrides";
import type { OutfitItem } from "@/data/inventory";

interface ClientPageProps {
  allContent: AllPageContent;
  productOverrides: ProductOverride[];
}

export default function ClientPage({ allContent, productOverrides }: ClientPageProps) {
  const { addItem } = useCart();

  const handleAddToCart = useCallback((item: OutfitItem, size: string) => {
    addItem({
      itemId: item.id,
      name: item.name,
      collection: item.collection,
      colorway: item.colorway,
      size,
      initiationPriceCents: item.initiationPriceCents,
      memberPriceCents: item.memberPriceCents,
      productImage: item.productImage,
    });
  }, [addItem]);

  return (
    <main>
      <Portal onAddToCart={handleAddToCart} allContent={allContent} productOverrides={productOverrides} />
      <CartDrawer />
    </main>
  );
}
```

  Note: `Portal.tsx` passes `onAddToCart` down to `VaultOverlay`. Update `Portal.tsx`'s `VaultOverlay` usage to pass `onAddToCart` and remove `onProtocolGate`. Search `src/components/Portal.tsx` for `onProtocolGate` and update accordingly.

- [ ] Run `npx tsc --noEmit` and fix any remaining TypeScript errors.
- [ ] Start dev server: `npm run dev`. Open the site. Verify:
  - Size selector appears on each vault card
  - Selecting a size + "Add to Cart" opens cart drawer
  - Cart persists on page refresh (check localStorage `pt_cart`)
  - Removing an item works
- [ ] Commit:
```bash
git add src/app/ClientPage.tsx src/components/CartDrawer.tsx src/components/Portal.tsx
git commit -m "feat: connect CartContext to CartDrawer and ClientPage"
```

---

## Task 8: Store State Machine

**Files:** Create `src/lib/storeState.ts`

- [ ] Create `src/lib/storeState.ts`:

```ts
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { parseISO, addDays, subDays } from "date-fns";

export type StorePhase =
  | "signup"        // between drops — show sign-up CTA
  | "early_access"  // 11:45pm–midnight on the 15th — Pledges with link only
  | "open"          // midnight–closes_at on the 16th — everyone
  | "sold_out";     // sold out OR past closes_at — show sold-out message

export interface DropRow {
  id: string;
  drop_month: string;       // "2026-05-16" (always the 16th)
  timezone: string;         // "America/New_York"
  open_time: string;        // "00:00"
  early_access_time: string; // "23:45"
  close_time: string;       // "00:29"
  available_count: number;
  sold_count: number;
  is_open: boolean;
}

function wallClockToDate(dateStr: string, timeStr: string, tz: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const base = parseISO(dateStr);
  base.setHours(h, m, 0, 0);
  return fromZonedTime(base, tz);
}

export function getStorePhase(drop: DropRow, now: Date): StorePhase {
  if (!drop.is_open) return "sold_out";
  if (drop.sold_count >= drop.available_count) return "sold_out";

  const dropDate = drop.drop_month; // e.g. "2026-05-16"
  const prevDate = parseISO(dropDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = prevDate.toISOString().slice(0, 10); // "2026-05-15"

  const earlyAccessStart = wallClockToDate(prevDateStr, drop.early_access_time, drop.timezone);
  const openAt           = wallClockToDate(dropDate, drop.open_time, drop.timezone);
  const closeAt          = wallClockToDate(dropDate, drop.close_time, drop.timezone);

  if (now >= closeAt)          return "sold_out";
  if (now >= openAt)           return "open";
  if (now >= earlyAccessStart) return "early_access";
  return "signup";
}

export function isSoldOut(drop: DropRow): boolean {
  return !drop.is_open || drop.sold_count >= drop.available_count;
}
```

- [ ] Write test `src/lib/__tests__/storeState.test.ts`:

```ts
import { getStorePhase, type DropRow } from "../storeState";

const baseDrop: DropRow = {
  id: "test",
  drop_month: "2026-05-16",
  timezone: "America/New_York",
  open_time: "00:00",
  early_access_time: "23:45",
  close_time: "00:29",
  available_count: 500,
  sold_count: 0,
  is_open: true,
};

test("returns signup during off-period", () => {
  const now = new Date("2026-05-14T20:00:00Z"); // afternoon on the 14th
  expect(getStorePhase(baseDrop, now)).toBe("signup");
});

test("returns early_access at 11:45pm EST on the 15th", () => {
  // 11:46pm EDT on May 15 = 03:46 UTC on May 16
  const now = new Date("2026-05-16T03:46:00Z");
  expect(getStorePhase(baseDrop, now)).toBe("early_access");
});

test("returns open at midnight on the 16th", () => {
  // midnight EDT on May 16 = 04:00 UTC
  const now = new Date("2026-05-16T04:01:00Z");
  expect(getStorePhase(baseDrop, now)).toBe("open");
});

test("returns sold_out after close_time", () => {
  // 12:30am EDT = 04:30 UTC
  const now = new Date("2026-05-16T04:30:00Z");
  expect(getStorePhase(baseDrop, now)).toBe("sold_out");
});

test("returns sold_out when inventory exhausted", () => {
  const now = new Date("2026-05-16T04:01:00Z"); // store open
  expect(getStorePhase({ ...baseDrop, sold_count: 500 }, now)).toBe("sold_out");
});

test("returns sold_out when is_open is false", () => {
  const now = new Date("2026-05-16T04:01:00Z");
  expect(getStorePhase({ ...baseDrop, is_open: false }, now)).toBe("sold_out");
});
```

- [ ] Run tests: `npx jest src/lib/__tests__/storeState.test.ts`
  Expected: all 6 PASS

- [ ] Commit:
```bash
git add src/lib/storeState.ts src/lib/__tests__/storeState.test.ts
git commit -m "feat: add storeState utility — compute store phase from drop row and clock"
```

---

## Task 9: Active Drop API Route

**Files:** Create `src/app/api/store/active-drop/route.ts`

- [ ] Create `src/app/api/store/active-drop/route.ts`:

```ts
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { DropRow } from "@/lib/storeState";

export async function GET() {
  try {
    const rows = await sql`
      SELECT * FROM initiation_drops
      ORDER BY drop_month DESC
      LIMIT 1
    `;
    if (rows.length === 0) return NextResponse.json({ drop: null });
    return NextResponse.json({ drop: rows[0] as DropRow });
  } catch (err) {
    console.error("[active-drop]", err);
    return NextResponse.json({ drop: null });
  }
}
```

- [ ] Test manually: `curl http://localhost:3000/api/store/active-drop`
  Expected: `{"drop":null}` (no drop created yet — that's fine)
- [ ] Commit:
```bash
git add src/app/api/store/active-drop/route.ts
git commit -m "feat: add GET /api/store/active-drop"
```

---

## Task 10: Member Session Library

**Files:**
- Create: `src/lib/memberSession.ts`
- Create: `src/lib/memberAuth.ts`
- Create: `src/hooks/useMemberSession.ts`

- [ ] Create `src/lib/memberSession.ts` (mirrors `session.ts`):

```ts
import { SignJWT, jwtVerify } from "jose";

export const MEMBER_SESSION_COOKIE = "member_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET env var is not set");
  return new TextEncoder().encode(secret);
}

export type MemberSessionPayload = { memberId: string };

export async function signMemberSession(payload: MemberSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifyMemberSession(token: string): Promise<MemberSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { memberId: payload.memberId as string };
  } catch {
    return null;
  }
}

export { SESSION_MAX_AGE as MEMBER_SESSION_MAX_AGE };
```

- [ ] Create `src/lib/memberAuth.ts` (mirrors `adminAuth.ts`):

```ts
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  verifyMemberSession,
  signMemberSession,
  MEMBER_SESSION_COOKIE,
  MEMBER_SESSION_MAX_AGE,
  type MemberSessionPayload,
} from "./memberSession";

export async function getMemberSession(): Promise<MemberSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(MEMBER_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyMemberSession(token);
}

export async function requireMemberSession(
  req: NextRequest
): Promise<MemberSessionPayload | NextResponse> {
  const token = req.cookies.get(MEMBER_SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifyMemberSession(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return session;
}

export function buildMemberSessionCookieHeader(token: string): string {
  return `${MEMBER_SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${MEMBER_SESSION_MAX_AGE}${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
}

export function buildClearMemberSessionCookieHeader(): string {
  return `${MEMBER_SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}
```

- [ ] Create `src/hooks/useMemberSession.ts` (mirrors `useAdminSession.ts` — read that file and follow the same pattern, replacing admin-specific fields with `memberId`):

```ts
"use client";
import { useState, useEffect, useCallback } from "react";

export type MemberSession = { memberId: string } | null;

export function useMemberSession() {
  const [session, setSession] = useState<MemberSession>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/member/session");
      if (res.ok) {
        const data = await res.json();
        setSession(data.memberId ? { memberId: data.memberId } : null);
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { session, loading, refresh };
}
```

- [ ] Create `src/app/api/member/session/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getMemberSession } from "@/lib/memberAuth";

export async function GET() {
  const session = await getMemberSession();
  if (!session) return NextResponse.json({ memberId: null });
  return NextResponse.json({ memberId: session.memberId });
}
```

- [ ] Commit:
```bash
git add src/lib/memberSession.ts src/lib/memberAuth.ts src/hooks/useMemberSession.ts src/app/api/member/session/route.ts
git commit -m "feat: add member session library and useMemberSession hook"
```

---

## Task 11: Member WebAuthn — Register Routes

**Files:**
- Create: `src/app/api/member/webauthn/register-options/route.ts`
- Create: `src/app/api/member/webauthn/register-verify/route.ts`

These mirror the admin WebAuthn routes. Key difference: no invite token required — any valid `setup_token` from the `members` table is the authorization.

- [ ] Create `src/app/api/member/webauthn/register-options/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { sql } from "@/lib/db";

export const REG_CHALLENGE_COOKIE = "member_reg_challenge";

export async function POST(req: NextRequest) {
  const { setupToken } = await req.json() as { setupToken: string };

  const rows = await sql`
    SELECT id, phone, name FROM members
    WHERE setup_token = ${setupToken}
      AND setup_token_expires_at > now()
      AND passkey_registered = false
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "Invalid or expired setup link" }, { status: 400 });
  }

  const member = rows[0];

  const options = await generateRegistrationOptions({
    rpName: process.env.WEBAUTHN_RP_NAME!,
    rpID: process.env.WEBAUTHN_RP_ID!,
    userName: member.phone,
    userDisplayName: member.name ?? member.phone,
    attestationType: "none",
    authenticatorSelection: { userVerification: "required", residentKey: "preferred" },
  });

  const response = NextResponse.json(options);
  response.headers.set(
    "Set-Cookie",
    `${REG_CHALLENGE_COOKIE}=${options.challenge}; HttpOnly; SameSite=Lax; Path=/; Max-Age=300${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );
  return response;
}
```

- [ ] Create `src/app/api/member/webauthn/register-verify/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { sql } from "@/lib/db";
import { REG_CHALLENGE_COOKIE } from "../register-options/route";
import { signMemberSession } from "@/lib/memberSession";
import { buildMemberSessionCookieHeader } from "@/lib/memberAuth";

export async function POST(req: NextRequest) {
  const { setupToken, registrationResponse } = await req.json();

  const expectedChallenge = req.cookies.get(REG_CHALLENGE_COOKIE)?.value;
  if (!expectedChallenge) {
    return NextResponse.json({ error: "No challenge — start registration again" }, { status: 400 });
  }

  const rows = await sql`
    SELECT id FROM members
    WHERE setup_token = ${setupToken}
      AND setup_token_expires_at > now()
      AND passkey_registered = false
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: "Invalid or expired setup link" }, { status: 400 });
  }

  const memberId = rows[0].id;

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge,
      expectedOrigin: process.env.WEBAUTHN_ORIGIN!,
      expectedRPID: process.env.WEBAUTHN_RP_ID!,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;
  const credentialId = credential.id;
  const publicKey = isoBase64URL.fromBuffer(credential.publicKey);

  await sql`
    INSERT INTO member_webauthn_credentials (member_id, credential_id, public_key, counter)
    VALUES (${memberId}, ${credentialId}, ${publicKey}, ${credential.counter})
    ON CONFLICT (credential_id) DO NOTHING
  `;

  await sql`
    UPDATE members
    SET passkey_registered = true,
        member_since = now(),
        setup_token = NULL,
        setup_token_expires_at = NULL
    WHERE id = ${memberId}
  `;

  // Backfill member_id on their order
  await sql`
    UPDATE orders SET member_id = ${memberId}
    WHERE phone = (SELECT phone FROM members WHERE id = ${memberId})
      AND member_id IS NULL
  `;

  const token = await signMemberSession({ memberId });
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", buildMemberSessionCookieHeader(token));
  response.headers.append("Set-Cookie", `${REG_CHALLENGE_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  return response;
}
```

- [ ] Commit:
```bash
git add src/app/api/member/webauthn/register-options/route.ts src/app/api/member/webauthn/register-verify/route.ts
git commit -m "feat: add member WebAuthn registration routes"
```

---

## Task 12: Member WebAuthn — Auth Routes

**Files:**
- Create: `src/app/api/member/webauthn/auth-options/route.ts`
- Create: `src/app/api/member/webauthn/auth-verify/route.ts`
- Create: `src/app/api/member/webauthn/logout/route.ts`

- [ ] Create `src/app/api/member/webauthn/auth-options/route.ts`:

```ts
import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";

export const AUTH_CHALLENGE_COOKIE = "member_auth_challenge";

export async function POST() {
  const options = await generateAuthenticationOptions({
    rpID: process.env.WEBAUTHN_RP_ID!,
    userVerification: "required",
  });

  const response = NextResponse.json(options);
  response.headers.set(
    "Set-Cookie",
    `${AUTH_CHALLENGE_COOKIE}=${options.challenge}; HttpOnly; SameSite=Lax; Path=/; Max-Age=300${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );
  return response;
}
```

- [ ] Create `src/app/api/member/webauthn/auth-verify/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { sql } from "@/lib/db";
import { AUTH_CHALLENGE_COOKIE } from "../auth-options/route";
import { signMemberSession } from "@/lib/memberSession";
import { buildMemberSessionCookieHeader } from "@/lib/memberAuth";

export async function POST(req: NextRequest) {
  const { authenticationResponse } = await req.json();

  const expectedChallenge = req.cookies.get(AUTH_CHALLENGE_COOKIE)?.value;
  if (!expectedChallenge) {
    return NextResponse.json({ error: "Challenge not found — try again" }, { status: 400 });
  }

  const credentialId = authenticationResponse.id;

  const rows = await sql`
    SELECT mwc.id, mwc.credential_id, mwc.public_key, mwc.counter,
           m.id as member_id
    FROM member_webauthn_credentials mwc
    JOIN members m ON m.id = mwc.member_id
    WHERE mwc.credential_id = ${credentialId}
      AND m.passkey_registered = true
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "Credential not found" }, { status: 401 });
  }

  const cred = rows[0];

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: authenticationResponse,
      expectedChallenge,
      expectedOrigin: process.env.WEBAUTHN_ORIGIN!,
      expectedRPID: process.env.WEBAUTHN_RP_ID!,
      credential: {
        id: cred.credential_id,
        publicKey: isoBase64URL.toBuffer(cred.public_key),
        counter: cred.counter,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }

  await sql`
    UPDATE member_webauthn_credentials
    SET counter = ${verification.authenticationInfo.newCounter}
    WHERE credential_id = ${credentialId}
  `;

  const token = await signMemberSession({ memberId: cred.member_id });
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", buildMemberSessionCookieHeader(token));
  response.headers.append("Set-Cookie", `${AUTH_CHALLENGE_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  return response;
}
```

- [ ] Create `src/app/api/member/webauthn/logout/route.ts`:

```ts
import { NextResponse } from "next/server";
import { buildClearMemberSessionCookieHeader } from "@/lib/memberAuth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", buildClearMemberSessionCookieHeader());
  return response;
}
```

- [ ] Commit:
```bash
git add src/app/api/member/webauthn/
git commit -m "feat: add member WebAuthn auth and logout routes"
```

---

## Task 13: Stripe — Payment Intent + Env Vars

**Files:**
- Create: `src/app/api/checkout/payment-intent/route.ts`

- [ ] Add to Vercel env vars (and `.env.local` for dev):
  ```
  STRIPE_SECRET_KEY=sk_test_...
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  ```

- [ ] Create `src/app/api/checkout/payment-intent/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sql } from "@/lib/db";
import { getStorePhase, type DropRow } from "@/lib/storeState";
import { getMemberSession } from "@/lib/memberAuth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const { items, phone } = await req.json() as {
    items: Array<{ itemId: string; name: string; size: string; initiationPriceCents: number; memberPriceCents: number }>;
    phone?: string;
  };

  if (!items?.length) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  // Check member session
  const memberSession = await getMemberSession();
  const isMember = !!memberSession;

  // Check store state for non-members
  if (!isMember) {
    const dropRows = await sql`SELECT * FROM initiation_drops ORDER BY drop_month DESC LIMIT 1`;
    if (dropRows.length === 0) {
      return NextResponse.json({ error: "Store is not open" }, { status: 403 });
    }
    const drop = dropRows[0] as DropRow;
    const phase = getStorePhase(drop, new Date());

    // Check early access cookie for early_access phase
    const earlyAccessToken = req.cookies.get("early_access_session")?.value;
    if (phase === "early_access" && !earlyAccessToken) {
      return NextResponse.json({ error: "Early access required" }, { status: 403 });
    }
    if (phase !== "open" && phase !== "early_access") {
      return NextResponse.json({ error: "Store is closed" }, { status: 403 });
    }
    if (phase === "early_access" && earlyAccessToken) {
      // Validate token against DB
      const tokenRows = await sql`
        SELECT id FROM early_access_tokens WHERE token = ${earlyAccessToken} AND drop_id = ${drop.id}
      `;
      if (tokenRows.length === 0) {
        return NextResponse.json({ error: "Invalid early access token" }, { status: 403 });
      }
    }
  }

  // Compute prices
  // Non-members: 1st Constable at initiation price, 2nd at member price
  // Members: always member price
  let constableCount = 0;
  const lineItems = items.map((item) => {
    if (!isMember) {
      constableCount++;
      const priceCents = constableCount === 1 ? item.initiationPriceCents : item.memberPriceCents;
      return { ...item, priceCents };
    }
    return { ...item, priceCents: item.memberPriceCents };
  });

  const totalCents = lineItems.reduce((sum, i) => sum + i.priceCents, 0);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalCents,
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    metadata: {
      items: JSON.stringify(lineItems.map((i) => ({ itemId: i.itemId, name: i.name, size: i.size, priceCents: i.priceCents }))),
      phone: phone ?? "",
      is_member: isMember ? "true" : "false",
    },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
```

- [ ] Commit:
```bash
git add src/app/api/checkout/payment-intent/route.ts
git commit -m "feat: add POST /api/checkout/payment-intent"
```

---

## Task 14: Checkout Page (Card Form)

**Files:** Create `src/app/checkout/page.tsx`

- [ ] Create `src/app/checkout/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  AddressElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/formatPrice";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const DARK = "#0e0e0e";
const GOLD = "#C4A456";

function CheckoutForm({ totalCents }: { totalCents: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<"idle" | "processing" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setStatus("processing");
    setErrorMsg(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message ?? "Payment failed. Please try again.");
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      // Create order + member record
      const res = await fetch("/api/orders/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
      });
      const data = await res.json();
      clearCart();
      if (data.setupToken) {
        router.push(`/membership-setup?token=${data.setupToken}`);
      } else {
        router.push("/"); // already a member
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <AddressElement options={{ mode: "shipping" }} />
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || status === "processing"}
        style={{
          width: "100%",
          padding: "16px",
          background: "rgba(196,164,86,0.1)",
          border: `1px solid ${GOLD}`,
          color: GOLD,
          fontFamily: "var(--font-title, serif)",
          fontSize: "11px",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          cursor: status === "processing" ? "not-allowed" : "pointer",
          opacity: status === "processing" ? 0.6 : 1,
        }}
      >
        {status === "processing" ? "Processing..." : `Complete Purchase — ${formatPrice(totalCents)}`}
      </button>
      {errorMsg && <p style={{ color: "#e05555", fontSize: "13px" }}>{errorMsg}</p>}
    </form>
  );
}

export default function CheckoutPage() {
  const { items } = useCart();
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalCents = items.reduce((sum, i) => sum + i.initiationPriceCents, 0);

  useEffect(() => {
    if (items.length === 0) { router.push("/"); return; }
    fetch("/api/checkout/payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.clientSecret) setClientSecret(d.clientSecret);
        else setError(d.error ?? "Unable to start checkout");
      })
      .catch(() => setError("Network error. Please try again."));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div style={{ minHeight: "100dvh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 440, color: "rgba(240,232,215,0.7)", fontFamily: "var(--font-body, sans-serif)", textAlign: "center" }}>
          <p style={{ color: "#e05555", marginBottom: 12 }}>{error}</p>
          <button onClick={() => router.back()} style={{ background: "none", border: `1px solid ${GOLD}`, color: GOLD, padding: "10px 24px", cursor: "pointer", fontFamily: "inherit" }}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div style={{ minHeight: "100dvh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "rgba(240,232,215,0.4)", fontFamily: "var(--font-body, sans-serif)" }}>Preparing checkout...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: DARK, padding: "40px 24px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "9px", letterSpacing: "0.35em", textTransform: "uppercase", color: GOLD, marginBottom: 32 }}>
          Popper Tulimond
        </p>
        <h1 style={{ fontFamily: "var(--font-display, serif)", fontSize: "24px", fontWeight: 300, color: "rgba(240,232,215,0.95)", marginBottom: 32 }}>
          Complete Your Order
        </h1>

        {/* Order summary */}
        <div style={{ marginBottom: 32, borderBottom: "1px solid rgba(196,164,86,0.2)", paddingBottom: 20 }}>
          {items.map((item) => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "rgba(240,232,215,0.7)", fontFamily: "var(--font-body, sans-serif)", fontSize: "14px" }}>
                {item.name} — {item.colorway} / {item.size}
              </span>
              <span style={{ color: GOLD, fontFamily: "var(--font-display, serif)", fontSize: "14px" }}>
                {formatPrice(item.initiationPriceCents)}
              </span>
            </div>
          ))}
        </div>

        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "night", variables: { colorPrimary: GOLD } } }}>
          <CheckoutForm totalCents={totalCents} />
        </Elements>
      </div>
    </div>
  );
}
```

- [ ] Update `CartDrawer.tsx` — the "Pay another way" button navigates to `/checkout`:

```tsx
import { useRouter } from "next/navigation";
// ...
const router = useRouter();
// in "Pay another way" onClick:
onClick={() => { closeCart(); router.push("/checkout"); }}
```

- [ ] Commit:
```bash
git add src/app/checkout/page.tsx src/components/CartDrawer.tsx
git commit -m "feat: add card checkout page with Stripe PaymentElement and AddressElement"
```

---

## Task 15: Apple Pay / Google Pay in CartDrawer

**Files:** Modify `src/components/CartDrawer.tsx`

The CartDrawer's Apple Pay and Google Pay buttons use Stripe's Payment Request API. This must be a client component that initializes Stripe.

- [ ] Update `CartDrawer.tsx` to use real Stripe payment request:

```tsx
"use client";
import { useEffect, useState, useRef } from "react";
import { loadStripe, type Stripe, type PaymentRequest } from "@stripe/stripe-js";
// ... existing imports ...

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Inside CartDrawer component, add:
const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
const [canPayApple, setCanPayApple] = useState(false);
const [canPayGoogle, setCanPayGoogle] = useState(false);
const stripeRef = useRef<Stripe | null>(null);
const router = useRouter();

useEffect(() => {
  if (items.length === 0) return;
  const totalCents = items.reduce((sum, i) => sum + i.initiationPriceCents, 0);

  stripePromise.then((stripe) => {
    if (!stripe) return;
    stripeRef.current = stripe;

    const pr = stripe.paymentRequest({
      country: "US",
      currency: "usd",
      total: { label: "Popper Tulimond", amount: totalCents },
      requestPayerName: true,
      requestPayerEmail: true,
      requestPayerPhone: true,
      requestShipping: true,
      shippingOptions: [{ id: "standard", label: "Standard Shipping", detail: "", amount: 0 }],
    });

    pr.canMakePayment().then((result) => {
      if (!result) return;
      setPaymentRequest(pr);
      setCanPayApple(!!result.applePay);
      setCanPayGoogle(!!result.googlePay);
    });

    pr.on("paymentmethod", async (ev) => {
      // Create payment intent
      const piRes = await fetch("/api/checkout/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const { clientSecret, error: piError } = await piRes.json();
      if (piError) { ev.complete("fail"); return; }

      const { error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: ev.paymentMethod.id,
      }, { handleActions: false });

      if (error) { ev.complete("fail"); return; }
      ev.complete("success");

      // Confirm order server-side
      const confirmRes = await fetch("/api/orders/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId: clientSecret.split("_secret_")[0],
          shippingAddress: ev.shippingAddress,
          payerEmail: ev.payerEmail,
          payerName: ev.payerName,
          payerPhone: ev.payerPhone,
        }),
      });
      const data = await confirmRes.json();
      clearCart();
      closeCart();
      if (data.setupToken) {
        router.push(`/membership-setup?token=${data.setupToken}`);
      } else {
        router.push("/");
      }
    });
  });
}, [items]); // eslint-disable-line react-hooks/exhaustive-deps

// Update Apple Pay button:
<button
  onClick={() => paymentRequest?.show()}
  disabled={!canPayApple}
  style={{ display: canPayApple ? "flex" : "none", /* existing styles */ }}
>
   Pay
</button>

// Update Google Pay button:
<button
  onClick={() => paymentRequest?.show()}
  disabled={!canPayGoogle}
  style={{ display: canPayGoogle ? "block" : "none", /* existing styles */ }}
>
  G Pay
</button>
```

- [ ] Note: Apple Pay requires domain verification in your Stripe dashboard. In Stripe → Settings → Payment methods → Apple Pay, add `poppertulimond.com` and follow the domain verification step (Stripe provides a file to upload to `/public/.well-known/`).

- [ ] Test on a real iOS device with Safari to verify Apple Pay sheet appears.
- [ ] Commit:
```bash
git add src/components/CartDrawer.tsx
git commit -m "feat: wire Apple Pay and Google Pay via Stripe Payment Request API"
```

---

## Task 16: Order Confirm API + Stripe Webhook

**Files:**
- Create: `src/app/api/orders/confirm/route.ts`
- Create: `src/app/api/stripe/webhook/route.ts`

- [ ] Create `src/app/api/orders/confirm/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sql } from "@/lib/db";
import { getMemberSession } from "@/lib/memberAuth";
import { v4 as uuidv4 } from "uuid";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const { paymentIntentId, shippingAddress, payerEmail, payerName, payerPhone } = await req.json();

  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (pi.status !== "succeeded") {
    return NextResponse.json({ error: "Payment not confirmed" }, { status: 400 });
  }

  const metadata = pi.metadata as Record<string, string>;
  const items = JSON.parse(metadata.items || "[]");
  const totalCents = pi.amount;

  const phone = payerPhone ?? metadata.phone ?? "";
  const email = payerEmail ?? pi.receipt_email ?? "";
  const name = payerName ?? "";

  const shipping = shippingAddress ?? { line1: "", city: "", state: "", postal_code: "", country: "US" };

  // Check if order already exists (idempotent)
  const existing = await sql`SELECT id FROM orders WHERE stripe_payment_intent_id = ${paymentIntentId}`;
  let memberRow;

  if (existing.length === 0) {
    // Atomic inventory decrement for non-members
    if (metadata.is_member !== "true") {
      const decremented = await sql`
        UPDATE initiation_drops
        SET sold_count = sold_count + 1
        WHERE id = (SELECT id FROM initiation_drops ORDER BY drop_month DESC LIMIT 1)
          AND sold_count < available_count
        RETURNING id
      `;
      if (decremented.length === 0) {
        return NextResponse.json({ error: "Sold out" }, { status: 409 });
      }
    }

    // Create order
    await sql`
      INSERT INTO orders (stripe_payment_intent_id, name, phone, email, shipping_address, items, total_cents)
      VALUES (${paymentIntentId}, ${name}, ${phone}, ${email}, ${JSON.stringify(shipping)}, ${JSON.stringify(items)}, ${totalCents})
    `;
  }

  // Get or create member
  const memberSession = await getMemberSession();
  if (memberSession) {
    return NextResponse.json({ setupToken: null }); // already a member
  }

  const existingMember = await sql`SELECT id, passkey_registered, setup_token FROM members WHERE phone = ${phone}`;

  if (existingMember.length > 0) {
    const m = existingMember[0];
    if (m.passkey_registered) return NextResponse.json({ setupToken: null });
    return NextResponse.json({ setupToken: m.setup_token });
  }

  // Create new member record
  const setupToken = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const newMember = await sql`
    INSERT INTO members (phone, email, name, setup_token, setup_token_expires_at)
    VALUES (${phone}, ${email}, ${name}, ${setupToken}, ${expiresAt})
    RETURNING id
  `;

  memberRow = newMember[0];

  // Migrate from Pledge to Member in sms_signups
  await sql`
    UPDATE sms_signups SET segment = 'member' WHERE phone = ${phone}
  `;

  // Send Twilio setup text (non-blocking)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://poppertulimond.com";
  const setupUrl = `${baseUrl}/membership-setup?token=${setupToken}`;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (accountSid && authToken && fromNumber && phone) {
    try {
      const twilio = (await import("twilio")).default;
      const client = twilio(accountSid, authToken);
      await client.messages.create({
        body: `You're almost a member. Finish your registration: ${setupUrl} — shop the Vault anytime instead of waiting until next month.`,
        from: fromNumber,
        to: phone,
      });
    } catch (err) {
      console.error("[orders/confirm] Twilio error:", err);
    }
  }

  return NextResponse.json({ setupToken });
}
```

- [ ] Add `uuid` package: `npm install uuid @types/uuid`

- [ ] Create `src/app/api/stripe/webhook/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sql } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: `Webhook error: ${String(err)}` }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    // Ensure order exists (idempotent — /api/orders/confirm may have already run)
    const existing = await sql`SELECT id FROM orders WHERE stripe_payment_intent_id = ${pi.id}`;
    if (existing.length === 0) {
      // Client-side confirm didn't run (e.g. browser closed) — call our own confirm logic
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: pi.id }),
      });
    }
  }

  return NextResponse.json({ received: true });
}
```

- [ ] In `next.config.js` (or `next.config.ts`), add the Stripe webhook route to the body parser exclusion if needed. For Next.js App Router, raw body is available via `req.text()` — no extra config needed.

- [ ] Register webhook in Stripe dashboard: `https://poppertulimond.com/api/stripe/webhook`, event: `payment_intent.succeeded`.

- [ ] Commit:
```bash
git add src/app/api/orders/confirm/route.ts src/app/api/stripe/webhook/route.ts package.json package-lock.json
git commit -m "feat: add order confirm route and Stripe webhook handler"
```

---

## Task 17: Membership Setup Page

**Files:** Create `src/app/membership-setup/page.tsx`

- [ ] Create `src/app/membership-setup/page.tsx`:

```tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";

const GOLD = "#C4A456";
const DARK = "#0e0e0e";

export default function MembershipSetupPage() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const router = useRouter();

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleActivate = async () => {
    setStatus("loading");
    setErrorMsg(null);

    try {
      // Get registration options
      const optRes = await fetch("/api/member/webauthn/register-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupToken: token }),
      });
      if (!optRes.ok) {
        const d = await optRes.json();
        throw new Error(d.error ?? "Failed to start registration");
      }
      const options = await optRes.json();

      // Trigger Face ID / fingerprint
      const registrationResponse = await startRegistration({ optionsJSON: options });

      // Verify
      const verifyRes = await fetch("/api/member/webauthn/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupToken: token, registrationResponse }),
      });
      if (!verifyRes.ok) {
        const d = await verifyRes.json();
        throw new Error(d.error ?? "Verification failed");
      }

      setStatus("success");
      setTimeout(() => router.push("/"), 2000);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  };

  if (!token) {
    return (
      <div style={{ minHeight: "100dvh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <p style={{ color: "rgba(240,232,215,0.5)", fontFamily: "var(--font-body, sans-serif)" }}>
          Invalid setup link. Contact us to get a new one.
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 440, width: "100%" }}>
        <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "9px", letterSpacing: "0.35em", textTransform: "uppercase", color: GOLD, marginBottom: 16 }}>
          Popper Tulimond
        </p>

        {status === "success" ? (
          <>
            <h1 style={{ fontFamily: "var(--font-display, serif)", fontSize: "28px", fontWeight: 300, color: "rgba(240,232,215,0.95)", marginBottom: 16 }}>
              Welcome to the Vault.
            </h1>
            <p style={{ fontFamily: "var(--font-body, sans-serif)", color: "rgba(240,232,215,0.55)", fontSize: "14px" }}>
              You can shop anytime. Redirecting...
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontFamily: "var(--font-display, serif)", fontSize: "28px", fontWeight: 300, color: "rgba(240,232,215,0.95)", marginBottom: 16, lineHeight: 1.3 }}>
              You're in. Finish your registration.
            </h1>
            <p style={{ fontFamily: "var(--font-body, sans-serif)", color: "rgba(240,232,215,0.6)", fontSize: "15px", lineHeight: 1.7, marginBottom: 32 }}>
              Register now and you can shop the Vault any time — not just once a month. This takes 10 seconds.
            </p>

            <button
              onClick={handleActivate}
              disabled={status === "loading"}
              style={{
                width: "100%",
                padding: "16px",
                background: "rgba(196,164,86,0.1)",
                border: `1px solid ${GOLD}`,
                color: GOLD,
                fontFamily: "var(--font-title, serif)",
                fontSize: "11px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: status === "loading" ? "not-allowed" : "pointer",
                opacity: status === "loading" ? 0.6 : 1,
                marginBottom: 16,
              }}
            >
              {status === "loading" ? "Activating..." : "Activate My Membership"}
            </button>

            {errorMsg && (
              <p style={{ color: "#e05555", fontSize: "13px", fontFamily: "var(--font-body, sans-serif)" }}>
                {errorMsg}
              </p>
            )}

            <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "rgba(240,232,215,0.25)", lineHeight: 1.6 }}>
              This link expires in 7 days. If you don't register now, we'll send you a reminder.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] Verify: After a test purchase (use Stripe test card `4242 4242 4242 4242`), you should be redirected to `/membership-setup?token=...`. Tapping "Activate My Membership" should trigger Face ID. On success, redirect to home.
- [ ] Commit:
```bash
git add src/app/membership-setup/page.tsx
git commit -m "feat: add membership setup page with WebAuthn passkey registration"
```

---

## Task 18: Member Login — Nav Entry + New Device Recovery

**Files:**
- Modify: `src/components/AtelierNav.tsx`
- Create: `src/app/api/member/login-link/route.ts`

- [ ] Read `src/components/AtelierNav.tsx` to understand the existing nav structure, then add a "Member Login" link that opens a modal when clicked. The modal triggers WebAuthn auth.

  Add to `AtelierNav.tsx`:
  ```tsx
  const { session: memberSession, refresh: refreshMember } = useMemberSession();
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // In nav links area — subtle, consistent with brand:
  {!memberSession && (
    <button
      onClick={() => setLoginModalOpen(true)}
      style={{ background: "none", border: "none", color: "rgba(240,232,215,0.35)", fontFamily: "var(--font-title, serif)", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer" }}
    >
      Member Login
    </button>
  )}
  {memberSession && (
    <button
      onClick={async () => { await fetch("/api/member/webauthn/logout", { method: "POST" }); refreshMember(); }}
      style={{ /* same subtle style */ }}
    >
      Sign Out
    </button>
  )}
  ```

  The login modal calls `/api/member/webauthn/auth-options` then `startAuthentication` from `@simplewebauthn/browser`, then `/api/member/webauthn/auth-verify`. On success, calls `refreshMember()`.

- [ ] Create `src/app/api/member/login-link/route.ts` — new device recovery:

```ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import twilio from "twilio";

export async function POST(req: NextRequest) {
  const { phone } = await req.json() as { phone: string };
  if (!phone?.trim()) return NextResponse.json({ error: "Phone required" }, { status: 400 });

  const rows = await sql`
    SELECT id, setup_token, setup_token_expires_at, passkey_registered
    FROM members WHERE phone = ${phone.trim()}
  `;

  if (rows.length === 0) {
    // Don't reveal whether phone exists
    return NextResponse.json({ ok: true });
  }

  const member = rows[0];

  // Generate a new setup token (re-register passkey on new device)
  const newToken = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await sql`
    UPDATE members
    SET setup_token = ${newToken}, setup_token_expires_at = ${expiresAt}
    WHERE id = ${member.id}
  `;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://poppertulimond.com";
  const setupUrl = `${baseUrl}/membership-setup?token=${newToken}`;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (accountSid && authToken && fromNumber) {
    try {
      const client = twilio(accountSid, authToken);
      await client.messages.create({
        body: `Set up your Popper Tulimond membership on this device: ${setupUrl}`,
        from: fromNumber,
        to: phone.trim(),
      });
    } catch (err) {
      console.error("[login-link] Twilio error:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] Commit:
```bash
git add src/components/AtelierNav.tsx src/app/api/member/login-link/route.ts
git commit -m "feat: add member login entry to nav and new device recovery route"
```

---

## Task 19: SMS Signup Name Field

**Files:**
- Modify: `src/components/SmsSignupSheet.tsx`
- Modify: `src/app/api/sms-signup/route.ts`

- [ ] In `SmsSignupSheet.tsx`, add a first name input above the phone input:

```tsx
const [firstName, setFirstName] = useState("");

// In state reset:
setFirstName("");

// In form body (before phone input):
<input
  type="text"
  placeholder="First name *"
  value={firstName}
  onChange={(e) => setFirstName(e.target.value)}
  required
  style={inputStyle}
  aria-label="First name"
/>
```

  Update the fetch body:
  ```tsx
  body: JSON.stringify({ firstName: firstName.trim(), phone: phone.trim(), email: email.trim() || null, source }),
  ```

- [ ] In `src/app/api/sms-signup/route.ts`, accept and save `firstName`:

  Add `firstName` to the destructured body. Add validation:
  ```ts
  if (typeof firstName !== "string" || firstName.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "First name required" }, { status: 400 });
  }
  ```

  Update the INSERT:
  ```ts
  await sql`
    INSERT INTO sms_signups (phone, email, name, source)
    VALUES (${cleanPhone}, ${cleanEmail}, ${firstName.trim()}, ${source})
  `;
  ```

- [ ] Verify the form on the live site — submit with name + phone, check DB.
- [ ] Commit:
```bash
git add src/components/SmsSignupSheet.tsx src/app/api/sms-signup/route.ts
git commit -m "feat: add first name field to SMS signup form"
```

---

## Task 20: Order Confirmation Email

**Files:**
- Create: `src/emails/EmailLayout.tsx`
- Create: `src/emails/OrderConfirmation.tsx`
- Modify: `src/app/api/orders/confirm/route.ts`

- [ ] Add Resend env vars to Vercel + `.env.local`:
  ```
  RESEND_API_KEY=re_...
  FROM_EMAIL=orders@poppertulimond.com
  NEXT_PUBLIC_BASE_URL=https://poppertulimond.com
  ```

- [ ] Create `src/emails/EmailLayout.tsx`:

```tsx
import { Html, Head, Body, Container, Section, Text, Hr } from "@react-email/components";
import type { ReactNode } from "react";

export default function EmailLayout({ children }: { children: ReactNode }) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#0a0a0a", fontFamily: "Georgia, serif", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 560, margin: "40px auto", padding: "0 24px" }}>
          <Text style={{ fontSize: 9, letterSpacing: "0.35em", textTransform: "uppercase", color: "rgba(196,164,86,0.8)", marginBottom: 32 }}>
            POPPER TULIMOND
          </Text>
          <Hr style={{ borderColor: "rgba(196,164,86,0.2)", marginBottom: 32 }} />
          {children}
          <Hr style={{ borderColor: "rgba(196,164,86,0.1)", marginTop: 40, marginBottom: 24 }} />
          <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
            poppertulimond.com
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] Create `src/emails/OrderConfirmation.tsx`:

```tsx
import { Text, Section } from "@react-email/components";
import EmailLayout from "./EmailLayout";
import type { CartItem } from "@/contexts/CartContext";

interface OrderConfirmationProps {
  name: string;
  orderId: string;
  items: Array<{ name: string; size: string; priceCents: number }>;
  totalCents: number;
  shippingAddress: { line1: string; city: string; state: string; postal_code: string };
}

function fmt(cents: number) { return `$${Math.floor(cents / 100)}`; }

export default function OrderConfirmation({ name, orderId, items, totalCents, shippingAddress }: OrderConfirmationProps) {
  return (
    <EmailLayout>
      <Text style={{ fontSize: 22, fontWeight: 300, color: "rgba(240,232,215,0.95)", marginBottom: 8 }}>
        Your order is confirmed.
      </Text>
      <Text style={{ fontSize: 13, color: "rgba(240,232,215,0.5)", marginBottom: 32 }}>
        Order #{orderId.slice(0, 8).toUpperCase()}
      </Text>

      {items.map((item, i) => (
        <Section key={i} style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 14, color: "rgba(240,232,215,0.85)", margin: 0 }}>
            {item.name} — Size {item.size}
          </Text>
          <Text style={{ fontSize: 13, color: "rgba(196,164,86,0.9)", margin: 0 }}>
            {fmt(item.priceCents)}
          </Text>
        </Section>
      ))}

      <Text style={{ fontSize: 16, color: "rgba(196,164,86,0.95)", marginTop: 16, marginBottom: 24 }}>
        Total: {fmt(totalCents)}
      </Text>

      <Text style={{ fontSize: 12, color: "rgba(240,232,215,0.4)", lineHeight: 1.7 }}>
        Shipping to: {shippingAddress.line1}, {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postal_code}
      </Text>
    </EmailLayout>
  );
}
```

- [ ] In `src/app/api/orders/confirm/route.ts`, send the order confirmation after creating the order. Add after the INSERT:

```ts
const { Resend } = await import("resend");
const { render } = await import("@react-email/components");
const OrderConfirmationEmail = (await import("@/emails/OrderConfirmation")).default;

const resend = new Resend(process.env.RESEND_API_KEY);
const html = await render(
  OrderConfirmationEmail({
    name,
    orderId: paymentIntentId,
    items: items.map((i: { name: string; size: string; priceCents: number }) => i),
    totalCents,
    shippingAddress: shipping,
  })
);

await resend.emails.send({
  from: process.env.FROM_EMAIL!,
  to: email,
  subject: "Your order is confirmed — Popper Tulimond",
  html,
}).catch((err) => console.error("[orders/confirm] Resend error:", err));
```

- [ ] Commit:
```bash
git add src/emails/ src/app/api/orders/confirm/route.ts
git commit -m "feat: send branded order confirmation email via Resend on purchase"
```

---

## Task 21: Early Access Link Handler

**Files:** Create `src/app/early-access/[token]/page.tsx`

When a Pledge taps the early access link from the 3:45pm text, this route validates the token and sets an `early_access_session` cookie, then redirects to the home page so they can shop.

- [ ] Create `src/app/early-access/[token]/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";

export default async function EarlyAccessPage({ params }: { params: { token: string } }) {
  const { token } = params;

  const rows = await sql`
    SELECT eat.id, eat.drop_id, id.early_access_time, id.timezone, id.drop_month
    FROM early_access_tokens eat
    JOIN initiation_drops id ON id.id = eat.drop_id
    WHERE eat.token = ${token}
    ORDER BY id.drop_month DESC
    LIMIT 1
  `;

  if (rows.length === 0) {
    // Invalid token — redirect home with no session
    redirect("/");
  }

  // Set the early_access_session cookie (value = the token, HttpOnly)
  const cookieStore = await cookies();
  cookieStore.set("early_access_session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4, // 4 hours — covers the window
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/");
}
```

- [ ] Test: insert a test row into `early_access_tokens`, visit `/early-access/{token}`, confirm cookie is set in browser devtools, confirm checkout proceeds.
- [ ] Commit:
```bash
git add src/app/early-access/
git commit -m "feat: add early access link handler — sets early_access_session cookie"
```

---

## Task 22: Final Integration Verification

- [ ] Set all required env vars in Vercel:
  - `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
  - `RESEND_API_KEY`, `FROM_EMAIL`, `NEXT_PUBLIC_BASE_URL`
  - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` (if not already set)

- [ ] Full test run in staging:
  1. Visit `/` → open Vault → select size → confirm item adds to cart (no Protocol Gate)
  2. Open cart → "Pay another way" → lands on `/checkout` with order summary
  3. Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP
  4. Fill shipping address via autocomplete
  5. Submit → lands on `/membership-setup?token=...`
  6. Tap "Activate My Membership" → Face ID prompt → success → redirects to home
  7. Refresh page → "Member Login" appears in nav → tap → Face ID → session active
  8. Check DB: `orders`, `members`, `member_webauthn_credentials` all populated
  9. Check email inbox for order confirmation

- [ ] Test Apple Pay on real iOS device (must be on HTTPS / production domain):
  1. Same flow — tap Apple Pay in cart → native sheet → confirm → `/membership-setup`

- [ ] Verify early access flow: insert a test `initiation_drops` row and `early_access_tokens` row, visit `/early-access/{token}`, confirm the gate allows checkout.

- [ ] Deploy to production: `vercel --prod`

- [ ] Commit any final fixes, then tag the release:
```bash
git tag phase-d1-launch
git push origin main --tags
```

**Note:** Membership reminder emails (day 1/3/6 via Resend) require the daily cron job — that's Phase D-2. The immediate Twilio setup text (fired from `/api/orders/confirm`) is active in this phase as the primary failsafe.

---

## Phase D-2 Preview

Phase D-2 covers everything needed to run the operation month-to-month without manual intervention:

- **Admin Initiation Night tab** — set available count, close time, timezone, kill switch, live sold counter
- **Admin Members tab** — view all members, resend setup links
- **Admin Orders tab** — full order list, fulfilled toggle, CSV export
- **Store & Membership copy editor** — all customer-facing text editable in Edit Pages
- **Vercel Cron jobs** — drop auto-setup (1st), pledge blast (15th), membership reminder (daily)

The site can go live and take orders before Phase D-2 is built. Phase D-2 should be planned and built as a separate session.
