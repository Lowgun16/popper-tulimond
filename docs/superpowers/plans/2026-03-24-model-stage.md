# Model Stage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `CollectionOverlay` that places 4 interactive model silhouette slots inside the portal's interior view, each with per-item pulse dots and hover cards, revealing in a staggered sequence after the walk-in animation completes.

**Architecture:** A single new component (`CollectionOverlay.tsx`) owns all data, layout, and sub-components (`ModelStage`, `PulseDot`, `HoverCard`). It receives one prop — `navOpacity: MotionValue<number>` — and derives both pointer-events gating and the stagger trigger from it. Two `@keyframes` blocks are added to `globals.css`; `Portal.tsx` gets one new line.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, Framer Motion (`useMotionValueEvent`, `MotionValue`)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/components/CollectionOverlay.tsx` | Create | `MODEL_INVENTORY` data, all sub-components, stagger logic |
| `src/app/globals.css` | Modify | Add `@keyframes pulse-white` and `@keyframes pulse-champagne` |
| `src/components/Portal.tsx` | Modify | Mount `<CollectionOverlay>` between `PortalBackground` and `AtelierNav` |

---

### Task 1: Add pulse keyframes to globals.css

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add the two `@keyframes` blocks**

Open `src/app/globals.css`. Add these two blocks immediately before the `/* Divider Utility */` comment at the bottom of the file:

```css
/* ─────────────────────────────────────────
   Pulse Animations — Model Stage dots
   Delivered via inline style= props (not Tailwind animate-* utilities)
   so they are immune to Tailwind v4 content-scan purge.
───────────────────────────────────────── */
@keyframes pulse-white {
  0%   { transform: scale(0.95); box-shadow: 0 0 0 0    rgba(255,255,255,0.7); }
  70%  { transform: scale(1);    box-shadow: 0 0 0 10px rgba(255,255,255,0);   }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0    rgba(255,255,255,0);   }
}

@keyframes pulse-champagne {
  0%   { transform: scale(0.95); box-shadow: 0 0 0 0    rgba(212,184,150,0.7); }
  70%  { transform: scale(1);    box-shadow: 0 0 0 10px rgba(212,184,150,0);   }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0    rgba(212,184,150,0);   }
}
```

- [ ] **Step 2: Verify no TypeScript or build errors**

```bash
npx tsc --noEmit
```
Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add pulse-white and pulse-champagne keyframes for model stage dots"
```

---

### Task 2: Create CollectionOverlay.tsx

**Files:**
- Create: `src/components/CollectionOverlay.tsx`

- [ ] **Step 1: Create the file with full implementation**

Create `src/components/CollectionOverlay.tsx` with the following content exactly:

```tsx
// src/components/CollectionOverlay.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { type MotionValue, useMotionValueEvent } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// MODEL_INVENTORY
// Edit names, prices, and colorways here. Do not touch layout below this block.
// ─────────────────────────────────────────────────────────────────────────────

type AccessType = "public" | "vault";

interface OutfitItem {
  id: string;
  name: string;
  collection: string;
  colorway: string;
  price: string;
  type: AccessType;
  dotPosition: string; // Full Tailwind literal — must be a static string, no runtime assembly
}

interface ModelSlot {
  id: string;
  position: string;  // Absolute position within overlay
  scale: string;     // Tailwind scale class for depth illusion
  outfit: OutfitItem[];
}

const MODEL_INVENTORY: ModelSlot[] = [
  {
    id: "lounge-model",
    position: "left-[10%] bottom-[5%]",
    scale: "scale-[0.9]",
    outfit: [
      {
        id: "lounge-showstopper",
        name: "The Showstopper",
        collection: "The Constable",
        colorway: "Ivory",
        price: "$1,200",
        type: "public",
        dotPosition: "top-[40%] left-[50%]",
      },
      {
        id: "lounge-heartbreaker",
        name: "The Heartbreaker",
        collection: "The Constable",
        colorway: "Dark Grey",
        price: "$1,400",
        type: "vault",
        dotPosition: "top-[22%] left-[45%]",
      },
    ],
  },
  {
    id: "center-model",
    position: "left-[40%] bottom-[2%]",
    scale: "scale-[1.0]",
    outfit: [
      {
        id: "center-showstopper",
        name: "The Showstopper",
        collection: "The Constable",
        colorway: "Ivory",
        price: "$1,500",
        type: "public",
        dotPosition: "top-[38%] left-[50%]",
      },
      {
        id: "center-heartbreaker",
        name: "The Heartbreaker",
        collection: "The Constable",
        colorway: "Dark Grey",
        price: "$1,600",
        type: "vault",
        dotPosition: "top-[58%] left-[40%]",
      },
    ],
  },
  {
    id: "vault-model",
    position: "right-[25%] bottom-[8%]",
    scale: "scale-[0.8]",
    outfit: [
      {
        id: "vault-showstopper",
        name: "The Showstopper",
        collection: "The Constable",
        colorway: "Ivory",
        price: "$980",
        type: "public",
        dotPosition: "top-[40%] left-[50%]",
      },
      {
        id: "vault-heartbreaker",
        name: "The Heartbreaker",
        collection: "The Constable",
        colorway: "Dark Grey",
        price: "$1,100",
        type: "vault",
        dotPosition: "top-[30%] left-[42%]",
      },
    ],
  },
  {
    id: "rack-model",
    position: "right-[5%] bottom-[5%]",
    scale: "scale-[0.9]",
    outfit: [
      {
        id: "rack-showstopper",
        name: "The Showstopper",
        collection: "The Constable",
        colorway: "Ivory",
        price: "$1,100",
        type: "public",
        dotPosition: "top-[55%] left-[50%]",
      },
      {
        id: "rack-heartbreaker",
        name: "The Heartbreaker",
        collection: "The Constable",
        colorway: "Dark Grey",
        price: "$1,300",
        type: "vault",
        dotPosition: "top-[65%] left-[40%]",
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HoverCard
// ─────────────────────────────────────────────────────────────────────────────

function HoverCard({ item, visible }: { item: OutfitItem; visible: boolean }) {
  const isVault = item.type === "vault";

  return (
    <div
      className="absolute left-6 top-1/2 -translate-y-1/2 z-30 w-48 transition-all duration-500 pointer-events-none"
      style={{
        opacity: visible ? 1 : 0,
        transform: `translateY(-50%) translateX(${visible ? "0px" : "16px"})`,
      }}
    >
      <div className="bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-sm">
        {/* Collection eyebrow — inline style required: .type-eyebrow hardcodes color:gold in globals.css */}
        <p className="type-eyebrow mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          {item.collection}
        </p>

        <p className="text-xs text-white mb-1">{item.name}</p>
        <p className="text-[10px] text-white/50 mb-2">{item.colorway}</p>
        <p className="text-xs font-bold text-white/90 mb-3">{item.price}</p>

        {isVault ? (
          <>
            <p
              className="text-[9px] tracking-widest uppercase mb-2"
              style={{ color: "#D4B896" }}
            >
              Vault Access Required
            </p>
            <div className="w-full text-center text-[9px] tracking-widest uppercase py-2 border border-white/10 text-white/20 rounded-sm select-none">
              Members Only
            </div>
          </>
        ) : (
          <div className="w-full text-center text-[9px] tracking-widest uppercase py-2 border border-white/30 text-white/70 rounded-sm select-none cursor-pointer hover:border-white/60 hover:text-white transition-colors duration-300">
            Add to Cart
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PulseDot
// ─────────────────────────────────────────────────────────────────────────────

function PulseDot({ item, hovered }: { item: OutfitItem; hovered: boolean }) {
  const isVault = item.type === "vault";
  // #D4B896 = rgba(212,184,150) — single authoritative champagne gold, consistent with keyframes
  const dotColor = isVault ? "#D4B896" : "#FFFFFF";
  const glowColor = isVault ? "rgba(212,184,150,0.6)" : "rgba(255,255,255,0.8)";
  const animation = isVault
    ? "pulse-champagne 2s ease-in-out infinite"
    : "pulse-white 2s ease-in-out infinite";

  return (
    <div className={`absolute ${item.dotPosition}`}>
      <div className="relative">
        <div
          className="w-3 h-3 rounded-full cursor-pointer"
          style={{
            backgroundColor: dotColor,
            boxShadow: `0 0 15px ${glowColor}`,
            animation,
          }}
        />
        <HoverCard item={item} visible={hovered} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ModelStage
// ─────────────────────────────────────────────────────────────────────────────

interface ModelStageProps {
  slot: ModelSlot;
  index: number;
  revealed: boolean;
}

function ModelStage({ slot, index, revealed }: ModelStageProps) {
  const [hovered, setHovered] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Clean up pending leave timer on unmount to prevent setState on unmounted component.
  useEffect(() => {
    return () => clearTimeout(leaveTimer.current);
  }, []);

  // Small leave-delay lets the cursor travel from silhouette to hover card
  // without the card blinking out mid-transit.
  const handleEnter = () => {
    clearTimeout(leaveTimer.current);
    setHovered(true);
  };
  const handleLeave = () => {
    leaveTimer.current = setTimeout(() => setHovered(false), 120);
  };

  return (
    <div
      className={`absolute pointer-events-auto transition-opacity duration-700 ${slot.position} ${slot.scale}`}
      style={{
        opacity: revealed ? 1 : 0,
        transitionDelay: `${index * 150}ms`,
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div className="relative w-48 h-[80vh] flex items-end justify-center">
        {/* Silhouette placeholder */}
        <div
          className="w-full h-full bg-white/10 border border-white/5 backdrop-blur-sm rounded-t-full transition-all duration-500"
          style={{
            transform: hovered ? "scale(1.05)" : "scale(1)",
            borderColor: hovered ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)",
          }}
        >
          <span className="absolute bottom-10 w-full text-center text-[10px] tracking-[0.3em] text-white/20 uppercase">
            {slot.id}
          </span>
        </div>

        {/* Pulse dots — one per outfit item */}
        {slot.outfit.map((item) => (
          <PulseDot key={item.id} item={item} hovered={hovered} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CollectionOverlay — exported default
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  opacity: MotionValue<number>;
}

export default function CollectionOverlay({ opacity }: Props) {
  const [active, setActive] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useMotionValueEvent(opacity, "change", (v) => {
    // Gate pointer-events — matches AtelierNav pattern exactly
    setActive(v > 0.05);
    // Stagger trigger — fires once when nav opacity reaches full
    if (!revealed && v >= 0.99) setRevealed(true);
  });

  return (
    <div
      className="absolute inset-0 z-20"
      style={{ pointerEvents: active ? "auto" : "none" }}
    >
      {MODEL_INVENTORY.map((slot, index) => (
        <ModelStage key={slot.id} slot={slot} index={index} revealed={revealed} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/CollectionOverlay.tsx
git commit -m "feat: add CollectionOverlay with MODEL_INVENTORY, staggered reveal, and vault/public pulse dots"
```

---

### Task 3: Mount CollectionOverlay in Portal.tsx

**Files:**
- Modify: `src/components/Portal.tsx`

- [ ] **Step 1: Add the import**

Add this import at the top of `src/components/Portal.tsx`, after the existing imports:

```tsx
import CollectionOverlay from "@/components/CollectionOverlay";
```

- [ ] **Step 2: Mount between PortalBackground and AtelierNav**

Locate the sticky viewport div. It currently reads:

```tsx
<PortalBackground ... />

{/* Editorial nav — ghost overlay, reveals only once inside */}
<AtelierNav opacity={t.navOpacity} />
```

Change it to:

```tsx
<PortalBackground ... />

{/* Model Stage — staggered model silhouettes with pulse dots, reveals after walk-in */}
<CollectionOverlay opacity={t.navOpacity} />

{/* Editorial nav — ghost overlay, reveals only once inside */}
<AtelierNav opacity={t.navOpacity} />
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```
Expected: no output.

- [ ] **Step 4: Verify dev server has no errors**

```bash
# Server should already be running at localhost:3000
# Check for runtime errors in the browser console
# Scroll through the portal sequence:
# 1. At 0% scroll — models not visible ✓
# 2. During walk-in — models still not visible ✓
# 3. After door fully opens (nav fades in) — 4 silhouettes appear one by one ✓
# 4. Hover over a silhouette — pulse dots visible, card fades in ✓
# 5. Public item card shows "Add to Cart" ✓
# 6. Vault item card shows "VAULT ACCESS REQUIRED" + "Members Only" in champagne gold ✓
```

- [ ] **Step 5: Commit**

```bash
git add src/components/Portal.tsx
git commit -m "feat: mount CollectionOverlay in portal sticky viewport"
```

---

### Task 4: Final commit and push

- [ ] **Step 1: Confirm clean build**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Push to origin**

```bash
git push origin main
```
