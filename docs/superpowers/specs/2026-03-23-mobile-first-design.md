# Mobile-First Portal — Design Spec
**Date:** 2026-03-23
**Builds on:** 2026-03-23-atelier-first-design.md

---

## Problem

On portrait mobile (430×932, iPhone 14 Pro Max), `object-fit: cover` scales the storefront image to 1266×932 and crops 438px from each side. The door (at 65–82% of image width) and brand text (5–50%) can never coexist on screen simultaneously.

---

## Solution: Ken Burns with object-contain

**Mobile only:**
- `object-fit: contain` + `object-position: center 15%` — full wall visible, letterboxed
- Scale 1.0 → 2.5 using raw `scrollYProgress` (no spring — touch has own momentum)
- `translateX: 0% → -23%` with `transformOrigin: 73% 26%` — door stays fixed during zoom, then shifts to center as you pan
- Net effect: door ends at 50% viewport at scroll complete

**Desktop unchanged:**
- `object-fit: cover`, no translateX, spring-smoothed scale 1.0 → 2.4

---

## Five Changes

### 1. Ken Burns (mobile)
- transform-origin: 73% 26% (door X, image-center Y)
- scale: 1.0 → 2.5 over 0–80% scroll
- translateX: 0% → −23% over 0–80% scroll
- Door arrives at viewport center by 80% scroll

### 2. Inside-store reveal (mobile vs desktop)
- **Desktop:** inset() clip-path from door position (unchanged)
- **Mobile:** opacity crossfade 0 → 1 over 65–90% scroll (Ken Burns carries the cinematic weight; clip-path math is unreliable against the moving image)
- **Both:** blur(5px) → blur(0px) lens-depth effect

### 3. Viewport height
- `h-screen` (100vh) → `h-[100dvh]` everywhere
- Prevents mobile browser address bar from jumping the layout

### 4. Deferred inside-store load
- Inside-store Image not rendered until `scrollYProgress > 0.35`
- Storefront loads instantly; interior image loads as user scrolls toward threshold

### 5. Thumb-friendly nav (mobile)
- Logo: 180px on mobile, 220px on desktop
- Link tap targets: `py-3` (44px minimum touch height)
- Maintained editorial ghost style (Option B)

---

## Transform Map (mobile)

```ts
storefrontScale:   scrollYProgress [0, 0.80]   → [1.0, 2.5]   (no spring)
storefrontX:       scrollYProgress [0, 0.80]   → ["0%", "-23%"]
transformOrigin:   "73% 26%"                    (door position)
storefrontOpacity: scrollYProgress [0.75, 0.92] → [1, 0]
insideOpacity:     scrollYProgress [0.65, 0.90] → [0, 1]
insideFilter:      scrollYProgress [0.60, 0.90] → blur(5px) → blur(0px)
navOpacity:        scrollYProgress [0.93, 1.00] → [0, 1]
```

---

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/usePortalTransforms.ts` | isMobile detection, Ken Burns values, showInside deferred load |
| `src/components/PortalBackground.tsx` | object-contain on mobile, storefrontX, mobile opacity reveal |
| `src/components/AtelierNav.tsx` | Responsive touch targets |
| `src/components/Portal.tsx` | h-[100dvh] |
