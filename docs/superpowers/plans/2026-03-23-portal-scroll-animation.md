# Portal Scroll Animation — Implementation Plan (v2 — Storefront Sequence)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** As the user scrolls, the camera walks toward the Popper Tulimond storefront door, the door opens via a center-out circular clip-path reveal, and the user steps inside the candlelit speakeasy. "Dressed in Power." and the PT monogram fly past the camera during the transition.

**Architecture:** A 300vh scroll container with a sticky inner viewport. Two full-bleed images are stacked — `storefront.png` on top (scales up toward the door, then fades), `inside-store.png` beneath (revealed via a growing `circle()` clip-path). Both are driven by `useScroll` + `useTransform`. `CollectionSection` crossfades in over the inside-store background at the end. Flying text (`Dressed in Power.` + PT monogram) are absolutely positioned in the sticky viewport and driven independently.

**Tech Stack:** Next.js 16 App Router, TypeScript, Framer Motion (`useScroll`, `useTransform`, `useSpring`, `motion`), Tailwind CSS v4

**Assets:**
- `/public/storefront.png` — dark brick alley exterior, Popper Tulimond signage + wax seal, door right-of-center
- `/public/inside-store.png` — candlelit speakeasy interior with vault door

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/hooks/usePortalTransforms.ts` | Replace brand-pattern transforms with storefront zoom, clip-path reveal, and flying text values |
| Modify | `src/components/PortalBackground.tsx` | Two-image stack: storefront (scale) + inside store (clip-path circle reveal) |
| Create | `src/components/PortalFlyingText.tsx` | Individual flying element — receives MotionValues as props (unchanged from v1) |
| Create | `src/components/CollectionSection.tsx` | Stub destination section that crossfades in at end (unchanged from v1) |
| Modify | `src/components/Portal.tsx` | Updated orchestrator: new transforms, only "Dressed in Power" + PT monogram as flying text |
| Modify | `src/app/page.tsx` | Add `<Portal>` below `<Hero>` (CollectionSection is composed inside Portal) |

---

## Animation Sequence

| Scroll | Image | What happens |
|--------|-------|-------------|
| 0% | Storefront | Full-bleed, static — user sees the brick wall and door |
| 10% → 70% | Storefront | Scale 1.0 → 2.2 — camera walks toward the door |
| 25% → 72% | Flying text | "Dressed in Power." drifts upward and fades past camera |
| 25% → 85% | PT monogram | Swells from 1× → 6×, opacity 0.3 → 0 — environmental atmosphere |
| 60% → 90% | Inside store | `circle(0% at 50% 50%)` → `circle(150% at 50% 50%)` — door opens from center |
| 75% → 90% | Storefront | Opacity 1 → 0 — exterior fades as interior takes over |
| 20% → 70% | Vignette | Closes from edges (dark radial gradient) |
| 70% → 100% | Vignette | Recedes |
| 85% → 100% | CollectionSection | Crossfades in over the inside-store background |

---

## Task 1: Update `usePortalTransforms` hook

**Files:**
- Modify: `src/hooks/usePortalTransforms.ts`

The hook already exists from a previous commit. Replace its entire contents with the storefront-sequence transforms.

- [ ] **Step 1.1: Overwrite the hook file**

```ts
// src/hooks/usePortalTransforms.ts
"use client";

import { useRef } from "react";
import { useScroll, useTransform, useSpring } from "framer-motion";

export function usePortalTransforms() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Spring-smooth the progress used for the storefront scale only
  // — gives the zoom a physical, weighted feel
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 25,
    restDelta: 0.001,
  });

  // ── Storefront (exterior) ──────────────────────────────
  // Camera walks toward the door
  const storefrontScale = useTransform(
    smoothProgress,
    [0, 0.1, 0.7],
    [1.0, 1.0, 2.2]
  );
  // Exterior fades out as interior reveals
  const storefrontOpacity = useTransform(
    scrollYProgress,
    [0.75, 0.9],
    [1, 0]
  );

  // ── Inside store (interior) ───────────────────────────
  // Circle clip-path grows from center — the door opening
  const insideClipPath = useTransform(
    scrollYProgress,
    [0.6, 0.9],
    ["circle(0% at 50% 50%)", "circle(150% at 50% 50%)"]
  );

  // ── Vignette ──────────────────────────────────────────
  const vignetteOpacity = useTransform(
    scrollYProgress,
    [0.2, 0.5, 0.7, 1.0],
    [0, 1, 1, 0]
  );

  // ── "Dressed in Power." flying text ───────────────────
  const dressingOpacity = useTransform(
    scrollYProgress,
    [0.25, 0.32, 0.58, 0.72],
    [0, 1, 1, 0]
  );
  const dressingY = useTransform(
    scrollYProgress,
    [0.25, 0.72],
    ["20%", "-30%"]
  );

  // ── PT monogram ───────────────────────────────────────
  // Swells toward camera and fades — environmental atmosphere
  const ptScale = useTransform(scrollYProgress, [0.25, 0.85], [1, 6]);
  const ptOpacity = useTransform(
    scrollYProgress,
    [0.25, 0.32, 0.65, 0.75],
    [0, 0.3, 0.3, 0]
  );

  // ── Collection section entrance ───────────────────────
  const collectionOpacity = useTransform(scrollYProgress, [0.82, 1.0], [0, 1]);
  const collectionY = useTransform(scrollYProgress, [0.82, 1.0], ["4%", "0%"]);

  return {
    containerRef,
    storefrontScale,
    storefrontOpacity,
    insideClipPath,
    vignetteOpacity,
    dressingOpacity,
    dressingY,
    ptScale,
    ptOpacity,
    collectionOpacity,
    collectionY,
  };
}
```

- [ ] **Step 1.2: Build check**

```bash
cd /Users/logansorensen/Documents/FashionBrand && npm run build 2>&1 | tail -5
```
Expected: `ok (no errors)`

- [ ] **Step 1.3: Commit**

```bash
git add src/hooks/usePortalTransforms.ts
git commit -m "feat: update usePortalTransforms with storefront zoom + clip-path sequence"
```

---

## Task 2: Update `PortalBackground`

**Files:**
- Modify: `src/components/PortalBackground.tsx`

Two images stacked. Storefront on top scales up and fades. Inside store beneath is revealed via clip-path circle.

- [ ] **Step 2.1: Overwrite the component**

```tsx
// src/components/PortalBackground.tsx
"use client";

import { motion, type MotionValue } from "framer-motion";
import Image from "next/image";

interface Props {
  storefrontScale: MotionValue<number>;
  storefrontOpacity: MotionValue<number>;
  insideClipPath: MotionValue<string>;
  vignetteOpacity: MotionValue<number>;
}

export default function PortalBackground({
  storefrontScale,
  storefrontOpacity,
  insideClipPath,
  vignetteOpacity,
}: Props) {
  return (
    <>
      {/* ── Layer 1: Inside store — always present, revealed by clip-path ── */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{ clipPath: insideClipPath }}
      >
        <Image
          src="/inside-store.png"
          alt="Inside Popper Tulimond"
          fill
          className="object-cover object-center"
          aria-hidden="true"
        />
      </motion.div>

      {/* ── Layer 2: Storefront — zooms in, then fades ── */}
      <motion.div
        className="absolute inset-0 z-10 will-change-transform"
        style={{ scale: storefrontScale, opacity: storefrontOpacity }}
      >
        <Image
          src="/storefront.png"
          alt="Popper Tulimond storefront"
          fill
          className="object-cover object-center"
          priority
          aria-hidden="true"
        />
      </motion.div>

      {/* ── Layer 3: Radial vignette — closes from edges ── */}
      <motion.div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          opacity: vignetteOpacity,
          background:
            "radial-gradient(ellipse at center, transparent 20%, rgba(15,13,12,0.6) 55%, rgba(15,13,12,0.97) 100%)",
        }}
      />

      {/* ── Base: Obsidian fallback ── */}
      <div className="absolute inset-0 -z-10 bg-obsidian" />
    </>
  );
}
```

- [ ] **Step 2.2: Build check**

```bash
npm run build 2>&1 | tail -5
```
Expected: `ok (no errors)`

- [ ] **Step 2.3: Commit**

```bash
git add src/components/PortalBackground.tsx
git commit -m "feat: update PortalBackground with storefront zoom + inside-store clip-path reveal"
```

---

## Task 3: Build `PortalFlyingText` (unchanged from v1)

**Files:**
- Create: `src/components/PortalFlyingText.tsx`

```tsx
// src/components/PortalFlyingText.tsx
"use client";

import { motion, type MotionValue, type MotionStyle } from "framer-motion";

interface Props {
  text: string;
  x?: MotionValue<string>;
  y?: MotionValue<string>;
  scale?: MotionValue<number>;
  opacity: MotionValue<number>;
  className?: string;
  style?: MotionStyle;
}

export default function PortalFlyingText({
  text,
  x,
  y,
  scale,
  opacity,
  className = "",
  style,
}: Props) {
  return (
    <motion.span
      className={`absolute select-none pointer-events-none will-change-transform ${className}`}
      style={{ x, y, scale, opacity, ...style }}
    >
      {text}
    </motion.span>
  );
}
```

- [ ] **Step 3.1: Create the file, build check, commit**

```bash
# After writing file:
npm run build 2>&1 | tail -5
git add src/components/PortalFlyingText.tsx
git commit -m "feat: add PortalFlyingText scroll-driven word component"
```

---

## Task 4: Build `CollectionSection` stub (unchanged from v1)

**Files:**
- Create: `src/components/CollectionSection.tsx`

```tsx
// src/components/CollectionSection.tsx
"use client";

import { motion, type MotionValue } from "framer-motion";

interface Props {
  opacity: MotionValue<number>;
  y: MotionValue<string>;
}

export default function CollectionSection({ opacity, y }: Props) {
  return (
    <motion.div
      className="relative z-30 flex flex-col items-center justify-center min-h-screen text-center px-6"
      style={{ opacity, y }}
    >
      <p className="type-eyebrow mb-6" style={{ color: "var(--color-gold)" }}>
        The Collection
      </p>
      <div className="divider-gold mx-auto mb-10" />
      <h2 className="type-display" style={{ color: "var(--color-parchment)" }}>
        Welcome to the World.
      </h2>
      <p className="type-body mt-6 max-w-md" style={{ opacity: 0.6 }}>
        Each piece carries the weight of intention. Explore the full Popper Tulimond collection.
      </p>
      <a
        href="#"
        className="type-eyebrow mt-12 px-10 py-4 border border-gold text-gold hover:bg-gold hover:text-obsidian transition-all duration-500 tracking-[0.25em]"
      >
        Enter Collection
      </a>
    </motion.div>
  );
}
```

- [ ] **Step 4.1: Create the file, build check, commit**

```bash
npm run build 2>&1 | tail -5
git add src/components/CollectionSection.tsx
git commit -m "feat: add CollectionSection stub as portal destination"
```

---

## Task 5: Update `Portal` orchestrator

**Files:**
- Modify: `src/components/Portal.tsx`

Only two flying elements: "Dressed in Power." text (drifts upward) and PT monogram (swells toward camera). No HERITAGE / CRAFT / POWER / TULIMOND words.

- [ ] **Step 5.1: Write the component**

```tsx
// src/components/Portal.tsx
"use client";

import { usePortalTransforms } from "@/hooks/usePortalTransforms";
import PortalBackground from "@/components/PortalBackground";
import PortalFlyingText from "@/components/PortalFlyingText";
import CollectionSection from "@/components/CollectionSection";

export default function Portal() {
  const t = usePortalTransforms();

  return (
    // 300vh container — gives three screens of scroll distance
    <div ref={t.containerRef} className="relative" style={{ height: "300vh" }}>

      {/* Sticky viewport — fixed on screen while container scrolls beneath */}
      <div className="sticky top-0 h-screen overflow-hidden bg-obsidian">

        {/* Background: storefront zoom + inside store clip-path + vignette */}
        <PortalBackground
          storefrontScale={t.storefrontScale}
          storefrontOpacity={t.storefrontOpacity}
          insideClipPath={t.insideClipPath}
          vignetteOpacity={t.vignetteOpacity}
        />

        {/* PT monogram — swells toward camera, environmental atmosphere */}
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <PortalFlyingText
            text="PT"
            scale={t.ptScale}
            opacity={t.ptOpacity}
            className="type-display text-gold/20"
            style={{ fontSize: "10rem", fontStyle: "italic" }}
          />
        </div>

        {/* "Dressed in Power." — drifts upward past the camera */}
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <PortalFlyingText
            text="Dressed in Power."
            y={t.dressingY}
            opacity={t.dressingOpacity}
            className="type-display text-gold-gradient text-center"
            style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}
          />
        </div>

        {/* Collection section — crossfades in as portal resolves */}
        <CollectionSection
          opacity={t.collectionOpacity}
          y={t.collectionY}
        />

      </div>
    </div>
  );
}
```

- [ ] **Step 5.2: Build check**

```bash
npm run build 2>&1 | tail -5
```
Expected: `ok (no errors)`

- [ ] **Step 5.3: Commit**

```bash
git add src/components/Portal.tsx
git commit -m "feat: update Portal orchestrator with storefront-to-interior sequence"
```

---

## Task 6: Wire into `page.tsx`

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 6.1: Update page.tsx**

```tsx
// src/app/page.tsx
import Hero from "@/components/Hero";
import Portal from "@/components/Portal";

export default function Home() {
  return (
    <main>
      <Hero />
      <Portal />
    </main>
  );
}
```

- [ ] **Step 6.2: Final build check**

```bash
npm run build 2>&1 | tail -5
```
Expected: `ok (no errors)`

- [ ] **Step 6.3: Visual QA — scroll through the full sequence**

| Checkpoint | Expected |
|-----------|---------|
| 0% | Storefront full-bleed, static — brick wall, door, signage |
| 10–40% | Storefront scaling up — camera walking toward the door |
| 40–60% | Vignette closing, "Dressed in Power." and PT monogram appearing |
| 60–70% | Circle clip-path beginning to open from center of storefront |
| 70–85% | Inside store revealed, storefront fading, flying text exiting |
| 85–100% | Vignette receding, "Welcome to the World." collection section fading in |

- [ ] **Step 6.4: Final commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire Portal into homepage — storefront-to-interior scroll sequence"
```

---

## Known Edge Cases

- **`will-change-transform`** on the storefront layer — promotes to compositor layer, prevents jitter during scale.
- **`useSpring` on `smoothProgress`** — used only for `storefrontScale`. Flying text and clip-path use raw `scrollYProgress` for snappier response.
- **clip-path + `object-fit: cover`** — the inside-store image needs `fill` and `object-cover` so the circular reveal clips the image correctly regardless of viewport size.
- **Mobile sticky:** The outer `<div>` (the 300vh container) must NOT have `overflow: hidden` — only the inner sticky `h-screen` div does.
- **Image priority:** `storefront.png` gets `priority` since it is the LCP image. `inside-store.png` does not.
