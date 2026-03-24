# Atelier First — Design Spec
**Date:** 2026-03-23
**Project:** Popper Tulimond — FashionBrand

---

## Vision

Replace the Hero section entirely. The site opens on a full-bleed storefront photograph — no navigation, no text, no UI chrome. The user scrolls and physically "walks through" the door into the store. Only once inside does the brand navigation appear.

---

## Scroll Sequence

| Scroll % | What Happens |
|----------|-------------|
| 0%       | Clean storefront fills viewport. Absolute silence — no overlays. |
| 0–60%    | Storefront zooms in at 1.0× → 1.7× (fast, camera advancing). |
| 60–90%   | Clip-path opens from door shape on right side. Interior bleeds in with 5px blur → 0px blur (lens focus effect). Storefront continues to 2.4×. |
| 75–92%   | Storefront opacity fades 1 → 0. Interior now full-bleed. |
| 93–100%  | Option B editorial nav fades in centered. |

**Parallax rule:** Storefront zooms faster than interior fades in. This differential speed creates the illusion of a physical 3D threshold.

---

## Clip-Path Spec — Door Opening

The inside-store layer is masked by an `inset()` clip-path targeting the actual door in `storefront.png` (door is right-side, ~65–82% from left, nearly full height).

- **Start (60% scroll):** `inset(8% 3% 3% 77% round 2px)` — tight rectangle around door
- **End (90% scroll):** `inset(0% 0% 0% 0%)` — full viewport revealed
- **Blur:** `filter: blur(5px)` at open start → `blur(0px)` at open end (lens depth)

---

## Navigation — Option B (Editorial Overlay)

- **Position:** Fixed, full-width, centered vertically at top
- **Style:** No background. Ghost overlay. Logo in Cormorant Garamond italic. Links in Cinzel small-caps spaced.
- **Content:** Logo (Popper Tulimond) + links: Collection, Lookbook, About, Contact
- **Trigger:** Fades in from opacity 0 → 1 between 93–100% scroll progress
- **Pointer events:** Active only after fully visible

---

## Files Modified

| File | Change |
|------|--------|
| `src/app/page.tsx` | Remove Hero import + component |
| `src/app/layout.tsx` | Ensure zero margin on `<main>` |
| `src/hooks/usePortalTransforms.ts` | Full rewrite — new transforms |
| `src/components/PortalBackground.tsx` | Clip-path + blur instead of opacity |
| `src/components/Portal.tsx` | Remove all text overlays, add AtelierNav |
| `src/components/AtelierNav.tsx` | New — Option B fixed editorial nav |

---

## Files Deleted (effectively)

- `src/components/Hero.tsx` — no longer imported or rendered
- `src/components/PortalFlyingText.tsx` — no longer used

---

## Transform Values

```ts
// Fast zoom (storefront rushes toward viewer)
storefrontScale:   smoothProgress [0, 0.82] → [1.0, 2.4]
storefrontOpacity: scrollYProgress [0.75, 0.92] → [1, 0]

// Door opening (slower than zoom — creates depth parallax)
insideClipPath:    scrollYProgress [0.60, 0.90] →
                   'inset(8% 3% 3% 77% round 2px)' → 'inset(0% 0% 0% 0%)'
insideFilter:      scrollYProgress [0.60, 0.90] → 'blur(5px)' → 'blur(0px)'

// Nav reveal
navOpacity:        scrollYProgress [0.93, 1.00] → [0, 1]
```
