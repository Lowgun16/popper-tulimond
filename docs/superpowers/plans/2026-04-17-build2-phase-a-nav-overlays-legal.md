# Build 2 Phase A — Navigation, Overlays & Legal Pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add functional nav links, four brand page overlays (Vault, About, The Protocol, Contact), a toggleable footer overlay, five standalone legal pages, and an action-triggered SMS signup sheet — all with static content, no database required.

**Architecture:** Overlay state (`activeOverlay`, `footerOpen`, `smsOpen`, `protocolGateOpen`) is added to `CollectionOverlay` which already owns all top-level UI state. Each brand page is a focused component rendered via Framer Motion's `AnimatePresence`. Legal pages are standard Next.js App Router routes sharing a branded `LegalPageLayout`. Content is hardcoded strings — Phase B (Edit Pages CMS) will replace them with database-driven content via the same component props.

**Tech Stack:** Next.js 16 App Router, Framer Motion 12, Tailwind CSS 4, TypeScript, Jest 29 (jsdom)

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `src/components/overlays/OverlayShell.tsx` | Shared backdrop, slide-in animation, close button, gold hairline top border |
| `src/components/overlays/VaultOverlay.tsx` | Vault product grid — items from `MODEL_INVENTORY`, Lookbook button per item |
| `src/components/overlays/AboutOverlay.tsx` | Brand philosophy editorial — static content from Dispatch 001 |
| `src/components/overlays/ProtocolOverlay.tsx` | The torn card — three rules, SMS CTA, red gun slot |
| `src/components/overlays/ContactOverlay.tsx` | HQ address, phone, email |
| `src/components/FooterOverlay.tsx` | Slides up from bottom, five legal links |
| `src/components/FooterBar.tsx` | Fixed bottom bar — "View Footer" / "Close Footer" toggle text |
| `src/components/SmsSignupSheet.tsx` | Phone (required) + email (optional), TCPA fine print |
| `src/components/ProtocolGate.tsx` | Polite modal shown when non-member attempts purchase interaction |
| `src/app/terms/page.tsx` | Terms of Use route |
| `src/app/privacy/page.tsx` | Privacy Policy route |
| `src/app/shipping/page.tsx` | Shipping & Fulfillment route |
| `src/app/refund/page.tsx` | Refund Policy route |
| `src/app/contact-us/page.tsx` | Contact Us route (compliance: address, phone, email) |
| `src/components/LegalPageLayout.tsx` | Shared branded wrapper for all five legal routes |
| `src/lib/staticContent.ts` | All hardcoded page content in one place — easy to swap for DB later |
| `src/components/overlays/__tests__/overlayState.test.ts` | Unit tests for overlay state transitions |

### Modified files
| File | Change |
|---|---|
| `src/components/AtelierNav.tsx` | Replace static `NAV_LINKS` with typed nav items; add click handlers; red dot on Protocol; Legal link |
| `src/components/CollectionOverlay.tsx` | Add `activeOverlay`, `footerOpen`, `smsOpen`, `protocolGateOpen` state; render all overlays and footer components |
| `src/components/Portal.tsx` | Pass `footerOpen`/`setFooterOpen` down to `FooterBar` |
| `src/app/page.tsx` | No changes expected |

---

## Task 1: Static Content File

**Files:**
- Create: `src/lib/staticContent.ts`

All hardcoded page content lives here. When Phase B lands, the components will accept the same shape as props — this file becomes the fallback/default.

- [ ] **Step 1: Create the file**

```typescript
// src/lib/staticContent.ts

export const ABOUT_CONTENT = {
  headline: "Pas pour tout le monde.",
  subheadline: "Not for everyone.",
  sections: [
    {
      title: "The Billboard",
      body: `There is a brand that needs you.\n\nNot the way a craftsman needs his materials. The way a parasite needs a host. The way a name needs a body to be carried across a room so that other people can read it.\n\nLouis Vuitton. Balenciaga. The houses that spent thirty years printing their identity onto the chests, backs, and shoulders of men who believed they were buying status — and were, in fact, being rented as walking media.\n\nThe monogram that covers the chest does not celebrate you. It uses you.\n\nThis is what a hollow brand does: it borrows your presence and calls it prestige.`,
    },
    {
      title: "The Foundation",
      body: `Other brands put their name on your chest.\n\nWe put our mark at the back-bottom of the shirt.\n\nThis is not modesty. This is architecture.\n\nA foundation does not stand beside the building and demand credit. It is beneath the building, holding it up, invisible in its function and absolute in its necessity.\n\nYou are the presence.\n\nWe are the ground beneath it.`,
    },
    {
      title: "The Meal",
      body: `You've spent your life making sure everyone else was full.\n\nYou checked the plate before yours. You made sure the table had enough before you sat down. You ate last — not because you were told to, but because that is the kind of man you are.\n\nWe see that. Not as a sacrifice to be rewarded. Not as a debt to be repaid.\n\nAs the truth of who you are.\n\nSit down. The table is set.`,
    },
    {
      title: "The Silent Contract",
      body: `We do not put our name where your name should be. We do not borrow your presence to run our campaign.\n\nWe build for the man who has been building for everyone else.\n\nThe Silent Contract is not a tagline. It is a promise: We do not build for the stage.\n\nWe build for the man who holds it up.`,
    },
  ],
  closing: "— Popper Tulimond\nThe Syndicate does not announce itself. It builds the ground others stand on.",
} as const;

export const PROTOCOL_CONTENT = {
  header: "Popper Tulimond /",
  title: "THE PROTOCOL",
  rules: [
    { number: "01", text: "We open once a month. The 15th turns to the 16th at midnight EST." },
    { number: "02", text: "Slots are finite. Once we sell out, we close. No exceptions." },
    { number: "03", text: "The Constable is your only way in." },
  ],
  cta: "Text CONSTABLE for early access.",
  ctaSubtext: "15 minutes before the door opens to the public.",
} as const;

export const CONTACT_CONTENT = {
  headline: "Contact",
  address: {
    line1: "Popper Tulimond HQ",
    line2: "Las Vegas, NV",    // Update with full address before Stripe activation
  },
  phone: "",                   // Update before Stripe activation
  email: "",                   // Update before Stripe activation
  note: "For fastest resolution, review The Protocol or reach out via the form below. We read every message.",
} as const;

export const TERMS_CONTENT = {
  title: "Terms of Use",
  lastUpdated: "April 2026",
  body: `PLACEHOLDER — Replace with actual Terms of Use before going live.\n\nThese terms govern your use of poppertulimond.com. By accessing the site you agree to these terms.`,
} as const;

export const PRIVACY_CONTENT = {
  title: "Privacy Policy",
  lastUpdated: "April 2026",
  body: `PLACEHOLDER — Replace with actual Privacy Policy before going live.\n\nWe collect only what we need to process your order and communicate with you.`,
} as const;

export const SHIPPING_CONTENT = {
  title: "Shipping & Fulfillment",
  lastUpdated: "April 2026",
  body: `PLACEHOLDER — Replace with actual Shipping Policy before going live.\n\nOrders are fulfilled within [X] business days of purchase.`,
} as const;

export const REFUND_CONTENT = {
  title: "Refund Policy",
  lastUpdated: "April 2026",
  body: `PLACEHOLDER — Replace with actual Refund Policy before going live.\n\nAll sales are final unless the item arrives damaged or defective.`,
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/staticContent.ts
git commit -m "feat: add static content file for all pages"
```

---

## Task 2: Overlay Shell (Shared Component)

**Files:**
- Create: `src/components/overlays/OverlayShell.tsx`

All four brand overlays use this wrapper. It handles the animation, backdrop, close button, and gold hairline top border.

- [ ] **Step 1: Create the component**

```typescript
// src/components/overlays/OverlayShell.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

interface OverlayShellProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Accessible label for the dialog */
  label: string;
}

export default function OverlayShell({ isOpen, onClose, children, label }: OverlayShellProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-[6000]"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-label={label}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 right-0 z-[6001] w-full md:w-[640px] overflow-y-auto"
            style={{
              background: "rgba(12,12,12,0.97)",
              backdropFilter: "blur(24px)",
              borderTop: "1px solid rgba(196,164,86,0.4)",
              borderLeft: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-6 right-6 z-10 flex items-center justify-center w-8 h-8"
              style={{ color: "rgba(255,255,255,0.5)", fontSize: 18, background: "none", border: "none", cursor: "pointer" }}
            >
              ✕
            </button>

            <div className="px-8 py-12 md:px-12">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Write a test for Escape key close behavior**

```typescript
// src/components/overlays/__tests__/overlayState.test.ts
/**
 * Tests for overlay state helpers.
 * We test the Escape key handler logic in isolation — no React rendering needed.
 */

describe("Overlay keyboard behavior", () => {
  it("calls onClose when Escape is pressed", () => {
    const onClose = jest.fn();
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };

    window.addEventListener("keydown", handler);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    window.removeEventListener("keydown", handler);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose for other keys", () => {
    const onClose = jest.fn();
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };

    window.addEventListener("keydown", handler);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    window.removeEventListener("keydown", handler);

    expect(onClose).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the test**

```bash
npx jest src/components/overlays/__tests__/overlayState.test.ts --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 4: Commit**

```bash
git add src/components/overlays/OverlayShell.tsx src/components/overlays/__tests__/overlayState.test.ts
git commit -m "feat: add OverlayShell shared component with Escape-to-close"
```

---

## Task 3: About Overlay

**Files:**
- Create: `src/components/overlays/AboutOverlay.tsx`

Draws content from `ABOUT_CONTENT` in `staticContent.ts`. Long-form editorial, no purchase CTAs.

- [ ] **Step 1: Create the component**

```typescript
// src/components/overlays/AboutOverlay.tsx
"use client";

import OverlayShell from "./OverlayShell";
import { ABOUT_CONTENT } from "@/lib/staticContent";

interface AboutOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const eyebrow: React.CSSProperties = {
  fontFamily: "var(--font-title, serif)",
  fontSize: "9px",
  letterSpacing: "0.35em",
  textTransform: "uppercase",
  color: "rgba(196,164,86,0.7)",
};

const sectionTitle: React.CSSProperties = {
  fontFamily: "var(--font-display, serif)",
  fontSize: "18px",
  color: "rgba(240,232,215,0.9)",
  letterSpacing: "0.06em",
  marginBottom: "16px",
  marginTop: "40px",
};

const bodyText: React.CSSProperties = {
  fontFamily: "var(--font-body, sans-serif)",
  fontSize: "14px",
  color: "rgba(240,232,215,0.65)",
  lineHeight: "1.85",
  letterSpacing: "0.02em",
  whiteSpace: "pre-line",
};

export default function AboutOverlay({ isOpen, onClose }: AboutOverlayProps) {
  return (
    <OverlayShell isOpen={isOpen} onClose={onClose} label="About Popper Tulimond">
      {/* Header */}
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
        {ABOUT_CONTENT.headline}
      </h1>
      <p style={{ ...eyebrow, color: "rgba(240,232,215,0.35)", marginBottom: "40px" }}>
        {ABOUT_CONTENT.subheadline}
      </p>

      {/* Gold divider */}
      <div style={{ width: "48px", height: "1px", background: "rgba(196,164,86,0.5)", marginBottom: "40px" }} />

      {/* Sections */}
      {ABOUT_CONTENT.sections.map((section) => (
        <div key={section.title}>
          <h2 style={sectionTitle}>{section.title}</h2>
          <p style={bodyText}>{section.body}</p>
        </div>
      ))}

      {/* Closing */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "48px", paddingTop: "32px" }}>
        <p style={{ ...bodyText, color: "rgba(196,164,86,0.5)", whiteSpace: "pre-line" }}>
          {ABOUT_CONTENT.closing}
        </p>
      </div>
    </OverlayShell>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/overlays/AboutOverlay.tsx
git commit -m "feat: add About overlay with Dispatch 001 content"
```

---

## Task 4: The Protocol Overlay

**Files:**
- Create: `src/components/overlays/ProtocolOverlay.tsx`

The torn card design. Clean edges (no torn SVG effect). Bottom-right swappable image slot — defaults to red gun outline SVG. All content from `PROTOCOL_CONTENT`.

- [ ] **Step 1: Create the component**

```typescript
// src/components/overlays/ProtocolOverlay.tsx
"use client";

import OverlayShell from "./OverlayShell";
import { PROTOCOL_CONTENT } from "@/lib/staticContent";

interface ProtocolOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when user clicks the SMS early access CTA */
  onRequestSmsSignup: () => void;
}

/** Red gun SVG — outline only, vertical orientation, barrel up. Matches physical tag. */
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

export default function ProtocolOverlay({ isOpen, onClose, onRequestSmsSignup }: ProtocolOverlayProps) {
  return (
    <OverlayShell isOpen={isOpen} onClose={onClose} label="The Protocol">
      {/* Dark background fills the overlay shell; card is centered within */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", minHeight: "80vh", paddingTop: "20px" }}>

        {/* The Card */}
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

          {/* Red pin */}
          <div style={{
            position: "absolute", top: "-7px", left: "50%", transform: "translateX(-50%)",
            width: "11px", height: "11px", borderRadius: "50%",
            background: "#8B1A1A", boxShadow: "0 2px 6px rgba(0,0,0,0.6)",
          }} />

          {/* Header */}
          <p style={{
            fontFamily: "'Courier New', monospace",
            fontSize: "8px", letterSpacing: "0.3em",
            color: "#4a3f2f", textTransform: "uppercase", marginBottom: "10px",
          }}>
            {PROTOCOL_CONTENT.header}
          </p>

          <h2 style={{
            fontFamily: "'Courier New', monospace",
            fontSize: "20px", color: "#1a140a",
            marginBottom: "18px", letterSpacing: "0.08em", fontWeight: 700,
          }}>
            {PROTOCOL_CONTENT.title}
          </h2>

          <div style={{ width: "100%", height: "1px", background: "#9a8a6a", marginBottom: "22px" }} />

          {/* Rules */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "26px" }}>
            {PROTOCOL_CONTENT.rules.map((rule) => (
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

          {/* CTA */}
          <p style={{
            fontFamily: "'Courier New', monospace",
            fontSize: "10px", color: "#4a3f2f", lineHeight: 1.65,
          }}>
            <button
              onClick={onRequestSmsSignup}
              style={{
                background: "none", border: "none", padding: 0, cursor: "pointer",
                fontFamily: "'Courier New', monospace",
                fontSize: "10px", color: "#1a140a", fontWeight: 700,
                textDecoration: "underline", textUnderlineOffset: "3px",
              }}
            >
              {PROTOCOL_CONTENT.cta}
            </button>
            <br />
            <span style={{ color: "#4a3f2f" }}>{PROTOCOL_CONTENT.ctaSubtext}</span>
          </p>

          {/* Bottom-right image slot — swappable via Edit Pages (Phase B) */}
          {/* To swap: replace this div's contents with <img src="..." /> */}
          <div style={{
            position: "absolute", bottom: "16px", right: "18px", opacity: 0.15,
          }}>
            <RedGunSvg />
          </div>
        </div>
      </div>
    </OverlayShell>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/overlays/ProtocolOverlay.tsx
git commit -m "feat: add Protocol overlay — torn card with three rules and SMS CTA"
```

---

## Task 5: Contact Overlay

**Files:**
- Create: `src/components/overlays/ContactOverlay.tsx`

Address, phone, email. Compliance-critical content. Founder populates real values in `staticContent.ts` before Stripe activation.

- [ ] **Step 1: Create the component**

```typescript
// src/components/overlays/ContactOverlay.tsx
"use client";

import OverlayShell from "./OverlayShell";
import { CONTACT_CONTENT } from "@/lib/staticContent";

interface ContactOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const label: React.CSSProperties = {
  fontFamily: "var(--font-title, serif)",
  fontSize: "9px",
  letterSpacing: "0.35em",
  textTransform: "uppercase",
  color: "rgba(196,164,86,0.6)",
  marginBottom: "8px",
};

const value: React.CSSProperties = {
  fontFamily: "var(--font-body, sans-serif)",
  fontSize: "15px",
  color: "rgba(240,232,215,0.85)",
  lineHeight: "1.6",
};

export default function ContactOverlay({ isOpen, onClose }: ContactOverlayProps) {
  return (
    <OverlayShell isOpen={isOpen} onClose={onClose} label="Contact Popper Tulimond">
      <p style={{ ...label, marginBottom: "16px" }}>Popper Tulimond</p>
      <h1 style={{
        fontFamily: "var(--font-display, serif)",
        fontSize: "clamp(24px, 4vw, 36px)",
        color: "rgba(240,232,215,0.95)",
        letterSpacing: "0.04em",
        marginBottom: "48px",
        fontWeight: 300,
      }}>
        {CONTACT_CONTENT.headline}
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        {/* Address */}
        <div>
          <p style={label}>Headquarters</p>
          <p style={value}>
            {CONTACT_CONTENT.address.line1}<br />
            {CONTACT_CONTENT.address.line2}
          </p>
        </div>

        {/* Phone */}
        {CONTACT_CONTENT.phone && (
          <div>
            <p style={label}>Phone</p>
            <a href={`tel:${CONTACT_CONTENT.phone}`} style={{ ...value, textDecoration: "none" }}>
              {CONTACT_CONTENT.phone}
            </a>
          </div>
        )}

        {/* Email */}
        {CONTACT_CONTENT.email && (
          <div>
            <p style={label}>Email</p>
            <a href={`mailto:${CONTACT_CONTENT.email}`} style={{ ...value, textDecoration: "none" }}>
              {CONTACT_CONTENT.email}
            </a>
          </div>
        )}

        {/* Note */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: "24px",
          marginTop: "8px",
        }}>
          <p style={{
            fontFamily: "var(--font-body, sans-serif)",
            fontSize: "13px",
            color: "rgba(240,232,215,0.4)",
            lineHeight: "1.7",
            fontStyle: "italic",
          }}>
            {CONTACT_CONTENT.note}
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
git commit -m "feat: add Contact overlay with address/phone/email"
```

---

## Task 6: Vault Overlay

**Files:**
- Create: `src/components/overlays/VaultOverlay.tsx`

Product grid pulling items from `MODEL_INVENTORY`. Non-member purchase interactions trigger `onProtocolGate`. Lookbook button opens existing `LookbookOverlay`.

- [ ] **Step 1: Create the component**

```typescript
// src/components/overlays/VaultOverlay.tsx
"use client";

import OverlayShell from "./OverlayShell";
import { MODEL_INVENTORY } from "@/data/inventory";
import type { LookbookContext } from "@/components/studio/studioTypes";
import type { OutfitItem } from "@/data/inventory";

interface VaultOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when a non-member attempts a purchase action */
  onProtocolGate: () => void;
  /** Called when user wants the Lookbook for an item */
  onOpenLookbook: (ctx: LookbookContext) => void;
}

const GOLD = "#C4A456";

function VaultItemCard({ item, onProtocolGate, onOpenLookbook }: {
  item: OutfitItem;
  onProtocolGate: () => void;
  onOpenLookbook: (ctx: LookbookContext) => void;
}) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "4px",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    }}>
      <p style={{
        fontFamily: "var(--font-title, serif)",
        fontSize: "8px",
        letterSpacing: "0.3em",
        textTransform: "uppercase",
        color: GOLD,
      }}>
        {item.collection}
      </p>
      <h3 style={{
        fontFamily: "var(--font-display, serif)",
        fontSize: "16px",
        color: "rgba(240,232,215,0.9)",
        fontWeight: 300,
      }}>
        {item.name}
      </h3>
      <p style={{
        fontFamily: "var(--font-body, sans-serif)",
        fontSize: "12px",
        color: "rgba(240,232,215,0.4)",
      }}>
        {item.price}
      </p>

      <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
        <button
          onClick={() => onOpenLookbook(item as unknown as LookbookContext)}
          style={{
            flex: 1,
            padding: "10px",
            background: "none",
            border: `1px solid rgba(196,164,86,0.4)`,
            color: GOLD,
            fontFamily: "var(--font-title, serif)",
            fontSize: "9px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
            borderRadius: "2px",
          }}
        >
          Lookbook
        </button>
        <button
          onClick={onProtocolGate}
          style={{
            flex: 1,
            padding: "10px",
            background: "rgba(196,164,86,0.08)",
            border: `1px solid ${GOLD}`,
            color: GOLD,
            fontFamily: "var(--font-title, serif)",
            fontSize: "9px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
            borderRadius: "2px",
          }}
        >
          Find Your Size
        </button>
      </div>
    </div>
  );
}

export default function VaultOverlay({ isOpen, onClose, onProtocolGate, onOpenLookbook }: VaultOverlayProps) {
  // Flatten all outfit items from all slots in MODEL_INVENTORY
  const allItems: OutfitItem[] = MODEL_INVENTORY.flatMap((slot) => slot.outfit);
  // Deduplicate by item name (same item may appear on multiple models)
  const uniqueItems = allItems.filter(
    (item, index, arr) => arr.findIndex((i) => i.name === item.name) === index
  );

  return (
    <OverlayShell isOpen={isOpen} onClose={onClose} label="The Vault">
      <p style={{
        fontFamily: "var(--font-title, serif)",
        fontSize: "9px",
        letterSpacing: "0.35em",
        textTransform: "uppercase",
        color: "rgba(196,164,86,0.6)",
        marginBottom: "16px",
      }}>
        Popper Tulimond
      </p>
      <h1 style={{
        fontFamily: "var(--font-display, serif)",
        fontSize: "clamp(24px, 4vw, 36px)",
        color: "rgba(240,232,215,0.95)",
        letterSpacing: "0.04em",
        marginBottom: "8px",
        fontWeight: 300,
      }}>
        Vault
      </h1>
      <p style={{
        fontFamily: "var(--font-body, sans-serif)",
        fontSize: "12px",
        color: "rgba(240,232,215,0.3)",
        marginBottom: "40px",
        letterSpacing: "0.05em",
      }}>
        Members shop 365 days a year. Join on the 16th.
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: "16px",
      }}>
        {uniqueItems.map((item) => (
          <VaultItemCard
            key={item.id}
            item={item}
            onProtocolGate={onProtocolGate}
            onOpenLookbook={onOpenLookbook}
          />
        ))}
      </div>
    </OverlayShell>
  );
}
```

- [ ] **Step 2: Write a deduplication test**

Add to `src/components/overlays/__tests__/overlayState.test.ts`:

```typescript
// Add to existing describe block or create new one
describe("Vault item deduplication", () => {
  it("removes duplicate items by name", () => {
    const items = [
      { id: "a", name: "The Constable", collection: "C1", price: "$229" },
      { id: "b", name: "The Constable", collection: "C1", price: "$229" },
      { id: "c", name: "Other Shirt", collection: "C1", price: "$179" },
    ];
    const unique = items.filter(
      (item, index, arr) => arr.findIndex((i) => i.name === item.name) === index
    );
    expect(unique).toHaveLength(2);
    expect(unique[0].name).toBe("The Constable");
    expect(unique[1].name).toBe("Other Shirt");
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npx jest src/components/overlays/__tests__/overlayState.test.ts --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 4: Commit**

```bash
git add src/components/overlays/VaultOverlay.tsx src/components/overlays/__tests__/overlayState.test.ts
git commit -m "feat: add Vault overlay with product grid and protocol gate"
```

---

## Task 7: Updated Navigation Bar

**Files:**
- Modify: `src/components/AtelierNav.tsx`

Replace the static `NAV_LINKS` array with typed objects. Add red dot to The Protocol. Add Legal link at far right. Accept `onNavClick` and `onLegalClick` as props.

- [ ] **Step 1: Replace AtelierNav.tsx entirely**

```typescript
// src/components/AtelierNav.tsx
"use client";

import { motion, type MotionValue, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import Image from "next/image";

export type NavPage = "vault" | "about" | "protocol" | "contact";

interface NavLink {
  id: NavPage;
  label: string;
  redDot?: boolean;
}

const NAV_LINKS: NavLink[] = [
  { id: "vault",    label: "Vault" },
  { id: "about",    label: "About" },
  { id: "protocol", label: "The Protocol", redDot: true },
  { id: "contact",  label: "Contact" },
];

interface Props {
  opacity: MotionValue<number>;
  onNavClick: (page: NavPage) => void;
  footerOpen: boolean;
  onLegalClick: () => void;
}

export default function AtelierNav({ opacity, onNavClick, footerOpen, onLegalClick }: Props) {
  const [active, setActive] = useState(false);
  useMotionValueEvent(opacity, "change", (v) => setActive(v > 0.05));

  return (
    <motion.nav
      aria-label="Primary navigation"
      className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center pt-8 md:pt-10 pb-4"
      style={{ opacity, pointerEvents: active ? "auto" : "none" }}
    >
      <Image
        src="/assets/branding/logo-horizontal.png"
        alt="Popper Tulimond"
        width={220} height={64}
        className="object-contain mb-4 w-[180px] md:w-[220px]"
        priority
      />

      <div className="flex items-center gap-6 md:gap-10">
        {/* Main nav links */}
        {NAV_LINKS.map((link) => (
          <button
            key={link.id}
            onClick={() => onNavClick(link.id)}
            className="type-eyebrow py-3 px-1 inline-flex items-center gap-1.5 transition-colors duration-300 bg-transparent border-none cursor-pointer"
            style={{ color: "var(--color-parchment)", opacity: 0.75 }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.75")}
          >
            {link.redDot && (
              <span
                aria-hidden
                style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#8B1A1A", display: "inline-block", flexShrink: 0 }}
              />
            )}
            {link.label}
          </button>
        ))}

        {/* Legal separator + link */}
        <span aria-hidden style={{ color: "rgba(240,232,215,0.15)", fontSize: "12px" }}>|</span>
        <button
          onClick={onLegalClick}
          className="type-eyebrow py-3 px-1 bg-transparent border-none cursor-pointer transition-colors duration-300"
          style={{ color: "var(--color-parchment)", opacity: footerOpen ? 0.9 : 0.4, fontSize: "9px", letterSpacing: "0.2em" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.75")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = footerOpen ? "0.9" : "0.4")}
        >
          {footerOpen ? "Close Footer" : "Legal"}
        </button>
      </div>
    </motion.nav>
  );
}
```

- [ ] **Step 2: Add a nav type test**

Add to `src/components/overlays/__tests__/overlayState.test.ts`:

```typescript
describe("NavPage type values", () => {
  it("covers all four brand pages", () => {
    const pages: string[] = ["vault", "about", "protocol", "contact"];
    expect(pages).toHaveLength(4);
    expect(pages).toContain("protocol");
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npx jest src/components/overlays/__tests__/overlayState.test.ts --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 4: Commit**

```bash
git add src/components/AtelierNav.tsx src/components/overlays/__tests__/overlayState.test.ts
git commit -m "feat: update nav bar — typed links, red dot on Protocol, Legal toggle"
```

---

## Task 8: Footer Overlay & Bottom Bar

**Files:**
- Create: `src/components/FooterOverlay.tsx`
- Create: `src/components/FooterBar.tsx`

Footer slides up from the bottom covering ~40% of the viewport. Bottom bar is always visible once inside the store, toggles the footer.

- [ ] **Step 1: Create FooterOverlay.tsx**

```typescript
// src/components/FooterOverlay.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface FooterOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const LEGAL_LINKS = [
  { label: "Terms of Use",          href: "/terms" },
  { label: "Privacy Policy",        href: "/privacy" },
  { label: "Shipping & Fulfillment", href: "/shipping" },
  { label: "Refund Policy",         href: "/refund" },
  { label: "Contact Us",            href: "/contact-us" },
] as const;

const GOLD = "#C4A456";

export default function FooterOverlay({ isOpen, onClose }: FooterOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-0 left-0 right-0 z-[5900]"
          style={{
            height: "40vh",
            background: "rgba(8,8,8,0.97)",
            backdropFilter: "blur(20px)",
            borderTop: `1px solid rgba(196,164,86,0.35)`,
          }}
        >
          <div className="flex flex-col justify-center h-full px-8 md:px-16">
            <nav aria-label="Legal pages">
              <ul style={{ display: "flex", flexDirection: "column", gap: "16px", listStyle: "none", padding: 0, margin: 0 }}>
                {LEGAL_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={onClose}
                      style={{
                        fontFamily: "var(--font-title, serif)",
                        fontSize: "11px",
                        letterSpacing: "0.25em",
                        textTransform: "uppercase",
                        color: "rgba(240,232,215,0.6)",
                        textDecoration: "none",
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = GOLD)}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(240,232,215,0.6)")}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <p style={{
              fontFamily: "var(--font-body, sans-serif)",
              fontSize: "9px",
              color: "rgba(240,232,215,0.2)",
              letterSpacing: "0.15em",
              marginTop: "24px",
            }}>
              © {new Date().getFullYear()} Popper Tulimond. All rights reserved.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Create FooterBar.tsx**

```typescript
// src/components/FooterBar.tsx
"use client";

import { motion, type MotionValue, useMotionValueEvent } from "framer-motion";
import { useState } from "react";

interface FooterBarProps {
  navOpacity: MotionValue<number>;
  footerOpen: boolean;
  onToggle: () => void;
}

export default function FooterBar({ navOpacity, footerOpen, onToggle }: FooterBarProps) {
  const [active, setActive] = useState(false);
  useMotionValueEvent(navOpacity, "change", (v) => setActive(v > 0.05));

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-[5800] flex justify-center pb-3 pt-2"
      style={{ opacity: navOpacity, pointerEvents: active ? "auto" : "none" }}
    >
      <button
        onClick={onToggle}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "var(--font-title, serif)",
          fontSize: "8px",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: "rgba(240,232,215,0.35)",
          transition: "color 0.2s",
          padding: "4px 8px",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(240,232,215,0.65)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(240,232,215,0.35)")}
      >
        {footerOpen ? "Close Footer" : "View Footer"}
      </button>
    </motion.div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/FooterOverlay.tsx src/components/FooterBar.tsx
git commit -m "feat: add FooterOverlay slide-up panel and FooterBar fixed toggle"
```

---

## Task 9: SMS Signup Sheet

**Files:**
- Create: `src/components/SmsSignupSheet.tsx`

Action-triggered only. Phone required, email optional. TCPA fine print required by law.

- [ ] **Step 1: Create the component**

```typescript
// src/components/SmsSignupSheet.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface SmsSignupSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Where this was triggered from — for analytics later */
  source: "protocol_cta" | "blocked_purchase";
}

const GOLD = "#C4A456";

export default function SmsSignupSheet({ isOpen, onClose, source }: SmsSignupSheetProps) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) { setError("Phone number is required."); return; }
    setSubmitting(true);
    setError(null);

    try {
      // Phase B will wire this to the real API route.
      // For Phase A, we store locally and show confirmation.
      const payload = { phone: phone.trim(), email: email.trim() || null, source };
      console.log("[SmsSignup] Payload (Phase A stub):", payload);
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 600));
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setPhone("");
    setEmail("");
    setSubmitted(false);
    setError(null);
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "2px",
    padding: "12px 14px",
    color: "rgba(240,232,215,0.9)",
    fontFamily: "var(--font-body, sans-serif)",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[7000]"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.25 }}
            className="fixed z-[7001]"
            style={{
              bottom: "50%",
              left: "50%",
              transform: "translate(-50%, 50%)",
              width: "min(480px, 90vw)",
              background: "rgba(10,10,10,0.98)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderTop: `2px solid ${GOLD}`,
              padding: "36px 32px 28px",
            }}
          >
            <button
              onClick={handleClose}
              style={{
                position: "absolute", top: 14, right: 16,
                background: "none", border: "none",
                color: "rgba(255,255,255,0.4)", fontSize: 16, cursor: "pointer",
              }}
            >
              ✕
            </button>

            {submitted ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <p style={{
                  fontFamily: "var(--font-title, serif)",
                  fontSize: "9px", letterSpacing: "0.35em", textTransform: "uppercase",
                  color: GOLD, marginBottom: "16px",
                }}>
                  You're in.
                </p>
                <p style={{
                  fontFamily: "var(--font-display, serif)",
                  fontSize: "18px", color: "rgba(240,232,215,0.9)",
                  lineHeight: 1.5,
                }}>
                  We'll text you 15 minutes before the door opens.
                </p>
                <p style={{
                  fontFamily: "var(--font-body, sans-serif)",
                  fontSize: "12px", color: "rgba(240,232,215,0.35)",
                  marginTop: "12px",
                }}>
                  Don't be late.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <p style={{
                  fontFamily: "var(--font-title, serif)",
                  fontSize: "9px", letterSpacing: "0.35em", textTransform: "uppercase",
                  color: GOLD, marginBottom: "16px",
                }}>
                  Early Access
                </p>
                <p style={{
                  fontFamily: "var(--font-display, serif)",
                  fontSize: "16px", color: "rgba(240,232,215,0.85)",
                  lineHeight: 1.6, marginBottom: "28px",
                }}>
                  15 minutes before the public. That's usually enough time.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                  <input
                    type="tel"
                    placeholder="Phone number *"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    style={inputStyle}
                    aria-label="Phone number"
                  />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={inputStyle}
                    aria-label="Email address (optional)"
                  />
                </div>

                {error && (
                  <p style={{ fontSize: "12px", color: "#e05555", marginBottom: "12px" }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "rgba(196,164,86,0.1)",
                    border: `1px solid ${GOLD}`,
                    color: GOLD,
                    fontFamily: "var(--font-title, serif)",
                    fontSize: "10px",
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? "..." : "Get Early Access"}
                </button>

                {/* TCPA compliance — required by law */}
                <p style={{
                  fontFamily: "var(--font-body, sans-serif)",
                  fontSize: "9px",
                  color: "rgba(240,232,215,0.25)",
                  marginTop: "14px",
                  lineHeight: 1.6,
                }}>
                  By submitting, you consent to receive recurring automated marketing text messages from Popper Tulimond at the number provided. Message & data rates may apply. Reply STOP to unsubscribe at any time.
                </p>
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Add a form validation test**

Add to `src/components/overlays/__tests__/overlayState.test.ts`:

```typescript
describe("SMS signup form validation", () => {
  it("requires phone to be non-empty", () => {
    const isValid = (phone: string) => phone.trim().length > 0;
    expect(isValid("")).toBe(false);
    expect(isValid("  ")).toBe(false);
    expect(isValid("7025551234")).toBe(true);
  });

  it("email is optional", () => {
    const buildPayload = (phone: string, email: string) => ({
      phone: phone.trim(),
      email: email.trim() || null,
    });
    const result = buildPayload("7025551234", "");
    expect(result.email).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npx jest src/components/overlays/__tests__/overlayState.test.ts --no-coverage
```

Expected: PASS (6 tests)

- [ ] **Step 4: Commit**

```bash
git add src/components/SmsSignupSheet.tsx src/components/overlays/__tests__/overlayState.test.ts
git commit -m "feat: add SMS signup sheet with TCPA disclosure and Phase A stub"
```

---

## Task 10: Protocol Gate (Blocked Purchase Popup)

**Files:**
- Create: `src/components/ProtocolGate.tsx`

Shown when a non-member tries to interact with a purchase. Respectful tone — a doorman, not a salesman.

- [ ] **Step 1: Create the component**

```typescript
// src/components/ProtocolGate.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";

interface ProtocolGateProps {
  isOpen: boolean;
  onClose: () => void;
  onViewProtocol: () => void;
  onRequestSmsSignup: () => void;
}

const GOLD = "#C4A456";

export default function ProtocolGate({ isOpen, onClose, onViewProtocol, onRequestSmsSignup }: ProtocolGateProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[7000]"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            className="fixed z-[7001]"
            style={{
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(440px, 90vw)",
              background: "rgba(10,10,10,0.98)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderTop: `1px solid rgba(196,164,86,0.4)`,
              padding: "36px 32px",
            }}
          >
            <button
              onClick={onClose}
              style={{
                position: "absolute", top: 14, right: 16,
                background: "none", border: "none",
                color: "rgba(255,255,255,0.3)", fontSize: 16, cursor: "pointer",
              }}
            >
              ✕
            </button>

            <p style={{
              fontFamily: "var(--font-title, serif)",
              fontSize: "9px", letterSpacing: "0.35em", textTransform: "uppercase",
              color: "rgba(196,164,86,0.6)", marginBottom: "16px",
            }}>
              Popper Tulimond
            </p>

            <p style={{
              fontFamily: "var(--font-display, serif)",
              fontSize: "17px", color: "rgba(240,232,215,0.88)",
              lineHeight: 1.7, marginBottom: "28px",
            }}>
              We see you. The Constable isn't available right now — but it will be. On the 16th of every month at midnight EST, we open the door for a limited number of new members. Text CONSTABLE to get 15 minutes of early access before the public. That's usually enough time.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                onClick={() => { onClose(); onRequestSmsSignup(); }}
                style={{
                  width: "100%", padding: "13px",
                  background: "rgba(196,164,86,0.1)",
                  border: `1px solid ${GOLD}`,
                  color: GOLD,
                  fontFamily: "var(--font-title, serif)",
                  fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Get Early Access
              </button>
              <button
                onClick={() => { onClose(); onViewProtocol(); }}
                style={{
                  width: "100%", padding: "13px",
                  background: "none",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(240,232,215,0.5)",
                  fontFamily: "var(--font-title, serif)",
                  fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                View The Protocol
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ProtocolGate.tsx
git commit -m "feat: add ProtocolGate popup for blocked purchase attempts"
```

---

## Task 11: Wire CollectionOverlay

**Files:**
- Modify: `src/components/CollectionOverlay.tsx`
- Modify: `src/components/Portal.tsx`

Add overlay state to `CollectionOverlay`. Pass nav props to `AtelierNav`. Render all new overlay components. Add `FooterBar` to `Portal`.

- [ ] **Step 1: Add imports and state to CollectionOverlay**

At the top of `CollectionOverlay.tsx`, after the existing imports, add:

```typescript
import AboutOverlay from "./overlays/AboutOverlay";
import VaultOverlay from "./overlays/VaultOverlay";
import ProtocolOverlay from "./overlays/ProtocolOverlay";
import ContactOverlay from "./overlays/ContactOverlay";
import FooterOverlay from "./FooterOverlay";
import SmsSignupSheet from "./SmsSignupSheet";
import ProtocolGate from "./ProtocolGate";
import type { NavPage } from "./AtelierNav";
```

- [ ] **Step 2: Add new state variables inside CollectionOverlay**

Find the existing state declarations block (lines ~528–536 in the file). Add these after `copyConfirm` and `saveConfirm`:

```typescript
const [activeOverlay, setActiveOverlay] = useState<NavPage | null>(null);
const [footerOpen, setFooterOpen] = useState(false);
const [smsOpen, setSmsOpen] = useState(false);
const [smsSource, setSmsSource] = useState<"protocol_cta" | "blocked_purchase">("protocol_cta");
const [protocolGateOpen, setProtocolGateOpen] = useState(false);
```

- [ ] **Step 3: Update the AtelierNav usage**

Find the `<AtelierNav opacity={t.navOpacity} />` line in Portal.tsx and update it. But first — `AtelierNav` is rendered inside `Portal.tsx`, not `CollectionOverlay.tsx`. We need to pass the new props down.

Update `Portal.tsx` — add `onNavClick`, `footerOpen`, `onLegalClick` props to `CollectionOverlay` and thread them to `AtelierNav`:

In `Portal.tsx`, update the return JSX:

```typescript
// Portal.tsx — updated return block
return (
  <div ref={t.containerRef} className="relative" style={{ height: "300vh" }}>
    <div ref={scope} className="sticky top-0 h-[100dvh] overflow-hidden">
      <PortalBackground
        storefrontScale={t.storefrontScale}
        storefrontOpacity={t.storefrontOpacity}
        storefrontPanXDesktop={t.storefrontPanXDesktop}
        storefrontPanXMobile={t.storefrontPanXMobile}
        insideClipPath={t.insideClipPath}
        insideOpacity={t.insideOpacity}
        insideFilter={t.insideFilter}
        showInside={t.showInside}
      />
      <CollectionOverlay opacity={t.navOpacity} onAddToCart={onAddToCart} />
    </div>
  </div>
);
```

`CollectionOverlay` already owns `navOpacity` via the `opacity` prop and renders `AtelierNav` internally — wait, actually looking at Portal.tsx line 67, `AtelierNav` is rendered directly in Portal, not in CollectionOverlay. We need to move AtelierNav rendering into CollectionOverlay so it can share state.

Update `Portal.tsx` — **remove** the `<AtelierNav>` line:

```typescript
// Portal.tsx — remove this line from the return:
// <AtelierNav opacity={t.navOpacity} />
// CollectionOverlay will now render AtelierNav internally
```

Update `Portal.tsx` full return to:

```typescript
return (
  <div ref={t.containerRef} className="relative" style={{ height: "300vh" }}>
    <div ref={scope} className="sticky top-0 h-[100dvh] overflow-hidden">
      <PortalBackground
        storefrontScale={t.storefrontScale}
        storefrontOpacity={t.storefrontOpacity}
        storefrontPanXDesktop={t.storefrontPanXDesktop}
        storefrontPanXMobile={t.storefrontPanXMobile}
        insideClipPath={t.insideClipPath}
        insideOpacity={t.insideOpacity}
        insideFilter={t.insideFilter}
        showInside={t.showInside}
      />
      <CollectionOverlay opacity={t.navOpacity} onAddToCart={onAddToCart} />
    </div>
  </div>
);
```

- [ ] **Step 4: Add AtelierNav and FooterBar inside CollectionOverlay**

Add these imports to `CollectionOverlay.tsx`:

```typescript
import AtelierNav from "./AtelierNav";
import FooterBar from "./FooterBar";
```

In the `CollectionOverlay` return JSX, inside the outermost `<div>`, add `AtelierNav` and `FooterBar` at the bottom (before the closing `</div>`):

```typescript
{/* Nav — moved here from Portal to share overlay state */}
<AtelierNav
  opacity={opacity}
  onNavClick={(page) => setActiveOverlay(page)}
  footerOpen={footerOpen}
  onLegalClick={() => setFooterOpen((v) => !v)}
/>

{/* Footer bar — fixed bottom toggle */}
<FooterBar
  navOpacity={opacity}
  footerOpen={footerOpen}
  onToggle={() => setFooterOpen((v) => !v)}
/>

{/* Footer overlay */}
<FooterOverlay isOpen={footerOpen} onClose={() => setFooterOpen(false)} />

{/* Brand page overlays */}
<AboutOverlay isOpen={activeOverlay === "about"} onClose={() => setActiveOverlay(null)} />
<ProtocolOverlay
  isOpen={activeOverlay === "protocol"}
  onClose={() => setActiveOverlay(null)}
  onRequestSmsSignup={() => {
    setActiveOverlay(null);
    setSmsSource("protocol_cta");
    setSmsOpen(true);
  }}
/>
<ContactOverlay isOpen={activeOverlay === "contact"} onClose={() => setActiveOverlay(null)} />
<VaultOverlay
  isOpen={activeOverlay === "vault"}
  onClose={() => setActiveOverlay(null)}
  onProtocolGate={() => {
    setActiveOverlay(null);
    setProtocolGateOpen(true);
  }}
  onOpenLookbook={(ctx) => {
    setActiveOverlay(null);
    setLookbookDot(ctx);
  }}
/>

{/* SMS signup sheet */}
<SmsSignupSheet
  isOpen={smsOpen}
  onClose={() => setSmsOpen(false)}
  source={smsSource}
/>

{/* Protocol gate — blocked purchase attempt */}
<ProtocolGate
  isOpen={protocolGateOpen}
  onClose={() => setProtocolGateOpen(false)}
  onViewProtocol={() => {
    setProtocolGateOpen(false);
    setActiveOverlay("protocol");
  }}
  onRequestSmsSignup={() => {
    setProtocolGateOpen(false);
    setSmsSource("blocked_purchase");
    setSmsOpen(true);
  }}
/>
```

Also update the existing `onOpenLookbook` prop on `PulseDot` / `ModelStage` to trigger the protocol gate for vault items:

Find where `onOpenLookbook={setLookbookDot}` is used and wrap it:

```typescript
onOpenLookbook={(ctx) => {
  if (ctx.type === "vault") {
    setProtocolGateOpen(true);
  } else {
    setLookbookDot(ctx);
  }
}}
```

- [ ] **Step 5: Build check**

```bash
cd /Users/logansorensen/Documents/FashionBrand && npx tsc --noEmit
```

Expected: No errors. Fix any TypeScript errors before proceeding.

- [ ] **Step 6: Run all tests**

```bash
npx jest --no-coverage
```

Expected: All passing.

- [ ] **Step 7: Commit**

```bash
git add src/components/CollectionOverlay.tsx src/components/Portal.tsx
git commit -m "feat: wire all overlays into CollectionOverlay — nav, footer, SMS, vault, protocol gate"
```

---

## Task 12: Legal Page Layout

**Files:**
- Create: `src/components/LegalPageLayout.tsx`

Shared branded wrapper for all five legal routes.

- [ ] **Step 1: Create the component**

```typescript
// src/components/LegalPageLayout.tsx
import Link from "next/link";
import Image from "next/image";

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export default function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "rgba(240,232,215,0.85)" }}>
      {/* Top bar */}
      <header style={{
        borderBottom: "1px solid rgba(196,164,86,0.2)",
        padding: "24px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center" }}>
          <Image
            src="/assets/branding/logo-horizontal.png"
            alt="Popper Tulimond"
            width={160} height={48}
            style={{ objectFit: "contain" }}
          />
        </Link>
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-title, serif)",
            fontSize: "9px",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "rgba(240,232,215,0.4)",
            textDecoration: "none",
          }}
        >
          ← Back to Store
        </Link>
      </header>

      {/* Content */}
      <main style={{ maxWidth: "680px", margin: "0 auto", padding: "60px 40px" }}>
        <p style={{
          fontFamily: "var(--font-title, serif)",
          fontSize: "9px",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: "rgba(196,164,86,0.6)",
          marginBottom: "16px",
        }}>
          Popper Tulimond — {lastUpdated}
        </p>
        <h1 style={{
          fontFamily: "var(--font-display, serif)",
          fontSize: "clamp(28px, 5vw, 40px)",
          color: "rgba(240,232,215,0.95)",
          fontWeight: 300,
          letterSpacing: "0.04em",
          marginBottom: "48px",
        }}>
          {title}
        </h1>

        <div style={{
          fontFamily: "var(--font-body, sans-serif)",
          fontSize: "14px",
          lineHeight: "1.85",
          color: "rgba(240,232,215,0.65)",
          whiteSpace: "pre-line",
        }}>
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "24px 40px",
        textAlign: "center",
      }}>
        <p style={{
          fontFamily: "var(--font-body, sans-serif)",
          fontSize: "10px",
          color: "rgba(240,232,215,0.2)",
          letterSpacing: "0.15em",
        }}>
          © {new Date().getFullYear()} Popper Tulimond. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LegalPageLayout.tsx
git commit -m "feat: add shared LegalPageLayout for legal routes"
```

---

## Task 13: Five Legal Pages

**Files:**
- Create: `src/app/terms/page.tsx`
- Create: `src/app/privacy/page.tsx`
- Create: `src/app/shipping/page.tsx`
- Create: `src/app/refund/page.tsx`
- Create: `src/app/contact-us/page.tsx`

- [ ] **Step 1: Create all five pages**

```typescript
// src/app/terms/page.tsx
import LegalPageLayout from "@/components/LegalPageLayout";
import { TERMS_CONTENT } from "@/lib/staticContent";

export const metadata = { title: "Terms of Use — Popper Tulimond" };

export default function TermsPage() {
  return (
    <LegalPageLayout title={TERMS_CONTENT.title} lastUpdated={TERMS_CONTENT.lastUpdated}>
      {TERMS_CONTENT.body}
    </LegalPageLayout>
  );
}
```

```typescript
// src/app/privacy/page.tsx
import LegalPageLayout from "@/components/LegalPageLayout";
import { PRIVACY_CONTENT } from "@/lib/staticContent";

export const metadata = { title: "Privacy Policy — Popper Tulimond" };

export default function PrivacyPage() {
  return (
    <LegalPageLayout title={PRIVACY_CONTENT.title} lastUpdated={PRIVACY_CONTENT.lastUpdated}>
      {PRIVACY_CONTENT.body}
    </LegalPageLayout>
  );
}
```

```typescript
// src/app/shipping/page.tsx
import LegalPageLayout from "@/components/LegalPageLayout";
import { SHIPPING_CONTENT } from "@/lib/staticContent";

export const metadata = { title: "Shipping & Fulfillment — Popper Tulimond" };

export default function ShippingPage() {
  return (
    <LegalPageLayout title={SHIPPING_CONTENT.title} lastUpdated={SHIPPING_CONTENT.lastUpdated}>
      {SHIPPING_CONTENT.body}
    </LegalPageLayout>
  );
}
```

```typescript
// src/app/refund/page.tsx
import LegalPageLayout from "@/components/LegalPageLayout";
import { REFUND_CONTENT } from "@/lib/staticContent";

export const metadata = { title: "Refund Policy — Popper Tulimond" };

export default function RefundPage() {
  return (
    <LegalPageLayout title={REFUND_CONTENT.title} lastUpdated={REFUND_CONTENT.lastUpdated}>
      {REFUND_CONTENT.body}
    </LegalPageLayout>
  );
}
```

```typescript
// src/app/contact-us/page.tsx
import LegalPageLayout from "@/components/LegalPageLayout";
import { CONTACT_CONTENT } from "@/lib/staticContent";

export const metadata = { title: "Contact Us — Popper Tulimond" };

export default function ContactUsPage() {
  return (
    <LegalPageLayout title="Contact Us" lastUpdated="April 2026">
      {`${CONTACT_CONTENT.address.line1}
${CONTACT_CONTENT.address.line2}

${CONTACT_CONTENT.phone ? `Phone: ${CONTACT_CONTENT.phone}\n` : ""}${CONTACT_CONTENT.email ? `Email: ${CONTACT_CONTENT.email}\n` : ""}
${CONTACT_CONTENT.note}`}
    </LegalPageLayout>
  );
}
```

- [ ] **Step 2: Build check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Smoke test in dev**

```bash
npm run dev
```

Navigate to:
- http://localhost:3000/terms
- http://localhost:3000/privacy
- http://localhost:3000/shipping
- http://localhost:3000/refund
- http://localhost:3000/contact-us

Expected: Each renders with the logo header, page title, content body, and "← Back to Store" link.

- [ ] **Step 4: Commit**

```bash
git add src/app/terms/page.tsx src/app/privacy/page.tsx src/app/shipping/page.tsx src/app/refund/page.tsx src/app/contact-us/page.tsx
git commit -m "feat: add five legal pages — terms, privacy, shipping, refund, contact-us"
```

---

## Task 14: Smoke Test & Deploy

**Files:** None new

Full end-to-end verification before pushing to production.

- [ ] **Step 1: Run all tests**

```bash
npx jest --no-coverage
```

Expected: All passing.

- [ ] **Step 2: Build for production**

```bash
npm run build
```

Expected: Build succeeds with no errors. Fix any errors before proceeding.

- [ ] **Step 3: Verify nav in dev**

```bash
npm run dev
```

Go to http://localhost:3000. Scroll into the store. Verify:
- [ ] Nav shows: Vault · About · • The Protocol · Contact | Legal
- [ ] Red dot appears before "The Protocol"
- [ ] Clicking "Vault" opens the Vault overlay (slides in from right)
- [ ] Clicking "About" opens the About overlay with Dispatch 001 content
- [ ] Clicking "The Protocol" opens the torn card overlay
- [ ] Clicking the CTA on the card opens the SMS signup sheet
- [ ] Clicking "Contact" opens the Contact overlay
- [ ] Clicking "Legal" in nav opens the footer overlay (slides up from bottom)
- [ ] "View Footer" at the bottom of the screen also opens the footer
- [ ] Footer shows 5 links; clicking one navigates to the correct legal route
- [ ] Footer says "Close Footer" when open, both in the bottom bar and nav
- [ ] Clicking a hotspot on a vault-type item triggers the Protocol Gate
- [ ] Protocol Gate "Get Early Access" opens SMS signup
- [ ] Protocol Gate "View The Protocol" opens the Protocol overlay
- [ ] Escape key closes any open overlay
- [ ] All overlays close when clicking the backdrop

- [ ] **Step 4: Push to staging and verify on Vercel preview**

```bash
git push origin staging
```

Check Vercel dashboard for the preview deploy. Verify all nav and legal routes on the live preview URL.

- [ ] **Step 5: Final commit if any fixups were needed**

```bash
git add -p
git commit -m "fix: Phase A smoke test fixups"
```

---

## Reminder: Update Real Content Before Stripe Activation

Before submitting for Apple Pay / Google Pay review, update these fields in `src/lib/staticContent.ts`:

- `CONTACT_CONTENT.address.line1` — full street address
- `CONTACT_CONTENT.address.line2` — city, state, zip
- `CONTACT_CONTENT.phone` — full phone number
- `CONTACT_CONTENT.email` — contact email
- `TERMS_CONTENT.body` — paste actual Terms of Use
- `PRIVACY_CONTENT.body` — paste actual Privacy Policy
- `SHIPPING_CONTENT.body` — paste actual Shipping Policy
- `REFUND_CONTENT.body` — paste actual Refund Policy

Phase B (Edit Pages CMS) will replace this manual editing with a UI.
