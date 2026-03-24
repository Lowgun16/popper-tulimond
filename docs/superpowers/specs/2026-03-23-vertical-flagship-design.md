# Vertical Flagship — Design Spec
**Date:** 2026-03-23
**Builds on:** mobile-first-design.md

---

## Assets

| Breakpoint | Exterior | Interior |
|---|---|---|
| Mobile (< 768px) | `storefront-tall.png` (9:16 portrait) | `inside-store-tall.png` (9:16 portrait) |
| Desktop | `storefront.png` (landscape) | `inside-store.png` (landscape) |

The 9:16 tall images fill an iPhone 14 Pro Max viewport with `object-fit: cover` and only ~9% horizontal crop. No letterbox needed. Door is natively visible at load.

**Door position in storefront-tall.png:** ~73% from left, ~65% from top.
**Ken Burns transform-origin (mobile):** `75% 65%`

---

## The Clamp — Ratchet MotionValue

Problem: when user scrolls back from 95%+, transforms reverse — storefront fades back in, interior disappears.

Fix: a `lockedProgress` MotionValue that only moves forward:

```ts
const lockedProgress = useMotionValue(0);
useMotionValueEvent(scrollYProgress, "change", (v) => {
  if (lockedProgress.get() >= 0.95) {
    lockedProgress.set(1.0); // locked — never go back
  } else {
    lockedProgress.set(v);
  }
});
```

All transforms derived from `lockedProgress`, not raw `scrollYProgress`.

---

## The Heartbeat — Fires Once at 70%

When `lockedProgress` crosses 0.70 for the first time:

1. **Haptic:** `navigator.vibrate([50, 30, 50])` (two pulses, 30ms gap)
2. **Visual:** 100ms screen shake — `x: [0, -0.5, 0.5, -0.5, 0.5, 0]` via Framer Motion `useAnimate`

Gated by `useRef(false)` — fires exactly once per session regardless of scroll behavior.

---

## True Overlay

- Storefront: `z-10`, `bg-obsidian` on the container (belt-and-suspenders for transparent areas)
- Inside-store: `z-0`, only rendered once `lockedProgress > 0.35`
- At 0% scroll: storefront fully opaque, inside-store not in DOM
- Result: zero peeking at any scroll position

---

## Transform Map

```ts
// Both breakpoints use lockedProgress:
storefrontScale:   lockedProgress [0, 0.82]     → [1.0, 2.4]  (desktop, spring-smoothed)
                   lockedProgress [0, 0.80]     → [1.0, 2.5]  (mobile, raw)
storefrontOpacity: lockedProgress [0.75, 0.95]  → [1, 0]      (ends at 0.95 = lock point)
insideClipPath:    lockedProgress [0.60, 0.92]  → door → full (desktop)
insideOpacity:     lockedProgress [0.65, 0.92]  → [0, 1]      (mobile crossfade)
insideFilter:      lockedProgress [0.60, 0.92]  → blur(5px) → blur(0px)
navOpacity:        lockedProgress [0.93, 1.0]   → [0, 1]
```

---

## Files Modified

| File | Change |
|---|---|
| `public/` | Added `storefront-tall.png`, `inside-store-tall.png` |
| `src/hooks/usePortalTransforms.ts` | Ratchet lock, heartbeat trigger, tall asset flag |
| `src/components/PortalBackground.tsx` | Responsive assets, bg-obsidian on storefront div |
| `src/components/Portal.tsx` | `useAnimate` screen shake on heartbeat |
