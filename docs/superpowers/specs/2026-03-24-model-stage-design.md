# Model Stage — Design Spec
**Date:** 2026-03-24
**Builds on:** vertical-flagship-design.md

---

## Overview

A floating overlay rendered inside the Portal's sticky viewport that places 4 model silhouette slots in the interior store scene. Each model can wear an unlimited number of outfit items; each item has its own pulse dot and hover card. The entire overlay fades in only after the portal walk-in animation completes — the user experiences the empty room first.

---

## Fade-In Trigger

Reuses the existing `navOpacity` MotionValue from `usePortalTransforms`:

```
smoothProgress [0.93, 1.0] → opacity [0, 1]
```

**Pointer-events:** `active` state lives in `CollectionOverlay` via `useMotionValueEvent(opacity, "change", v => setActive(v > 0.05))` — identical to the `AtelierNav` pattern. The `active` boolean gates only the wrapper div's `pointer-events` CSS property (`none` / `auto`). Children inherit via CSS — no prop threading required. `ModelStage` and `PulseDot` do not receive an `active` prop.

---

## Data Structure: `MODEL_INVENTORY`

Defined as a `const` array at the top of `CollectionOverlay.tsx`. Each entry represents one model slot.

```ts
type AccessType = 'public' | 'vault';

interface OutfitItem {
  id: string;
  name: string;
  price: string;
  type: AccessType;
  dotPosition: string; // Complete Tailwind literal: e.g. "top-[40%] left-[50%]"
                       // Must be written as a full static string — no runtime assembly.
                       // Coordinates are % of the model container (w-48, h-[80vh]).
}

interface ModelSlot {
  id: string;
  position: string;    // Tailwind absolute position in overlay
  scale: string;       // Tailwind scale class
  outfit: OutfitItem[];
}
```

**Placeholder config — 4 models, 2 items each:**

```ts
const MODEL_INVENTORY: ModelSlot[] = [
  {
    id: 'lounge-model',
    position: 'left-[10%] bottom-[5%]',
    scale: 'scale-[0.9]',
    outfit: [
      { id: 'lounge-coat',  name: 'The Constable — Showstopper', price: '$1,200',
        type: 'public', dotPosition: 'top-[40%] left-[50%]' },
      { id: 'lounge-scarf', name: 'The Sovereign Scarf',          price: '$450',
        type: 'vault',  dotPosition: 'top-[22%] left-[45%]' },
    ],
  },
  {
    id: 'center-model',
    position: 'left-[40%] bottom-[2%]',
    scale: 'scale-[1.0]',
    outfit: [
      { id: 'center-coat',  name: 'The Constable — Silhouette',   price: '$1,400',
        type: 'public', dotPosition: 'top-[38%] left-[50%]' },
      { id: 'center-glove', name: 'The Archive Glove',            price: '$320',
        type: 'vault',  dotPosition: 'top-[58%] left-[40%]' },
    ],
  },
  {
    id: 'vault-model',
    position: 'right-[25%] bottom-[8%]',
    scale: 'scale-[0.8]',
    outfit: [
      { id: 'vault-coat',  name: 'The Constable — Overcoat',      price: '$980',
        type: 'public', dotPosition: 'top-[40%] left-[50%]' },
      { id: 'vault-chain', name: 'The Vault Chain',               price: '$280',
        type: 'vault',  dotPosition: 'top-[30%] left-[42%]' },
    ],
  },
  {
    id: 'rack-model',
    position: 'right-[5%] bottom-[5%]',
    scale: 'scale-[0.9]',
    outfit: [
      { id: 'rack-trouser', name: 'The Constable — Trouser',      price: '$1,100',
        type: 'public', dotPosition: 'top-[55%] left-[50%]' },
      { id: 'rack-cuff',    name: 'The Members Cuff',             price: '$390',
        type: 'vault',  dotPosition: 'top-[65%] left-[40%]' },
    ],
  },
];
```

---

## Component Architecture

```
CollectionOverlay          (motion.div — opacity from navOpacity; active state gates pointer-events)
  └── ModelStage × 4       (absolute positioned, depth-scaled, group for hover)
        └── PulseDot × N   (one per outfit item, absolute within model container)
              └── HoverCard (CSS opacity transition on group-hover)
```

### `CollectionOverlay`
- `absolute inset-0 z-20 pointer-events-none` when `active = false`
- `absolute inset-0 z-20 pointer-events-auto` when `active = true`
- Wraps all `ModelStage` instances; no MotionValue props flow to children

### `ModelStage`
- Translucent silhouette: `w-48 h-[80vh] bg-white/10 border border-white/5 backdrop-blur-sm rounded-t-full`
- Hover state: `group-hover:scale-105 group-hover:border-white/20 transition-transform duration-500`
- Renders all `outfit` items as `<PulseDot>` — absolute positioned within the model container

### `PulseDot`

Two visual tiers:

| Property | `public` | `vault` |
|---|---|---|
| Dot color | `#FFFFFF` | `#D4B896` (champagne gold) |
| Glow | `shadow-[0_0_15px_rgba(255,255,255,0.8)]` | `shadow-[0_0_15px_rgba(212,185,120,0.6)]` |
| Animation | `animate-pulse-white` | `animate-pulse-champagne` |
| Size | `w-3 h-3 rounded-full` | same |

Delivered via inline `style` prop (not `className`) to guarantee runtime behavior regardless of Tailwind purge:
```tsx
style={{ animation: item.type === 'vault'
  ? 'pulse-champagne 2s ease-in-out infinite'
  : 'pulse-white 2s ease-in-out infinite' }}
```

### `HoverCard`

- **Trigger:** `opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500` — pure CSS, no JS
- **Position:** `absolute left-6 top-1/2 -translate-y-1/2` — offset right of the dot; `pointer-events-none` always (read-only display)
- **z-index:** `z-30` — above ModelStage siblings, below AtelierNav (`z-50`)
- **Card shell:** `w-48 bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-sm`
- **Typography:**
  - Collection eyebrow: `type-eyebrow mb-1` with `style={{ color: 'rgba(255,255,255,0.4)' }}` — **must use inline style** because `.type-eyebrow` in `globals.css` hardcodes `color: var(--color-gold)`; a Tailwind `text-white/40` utility will lose that specificity battle silently. Inline style always wins.
  - Item name: `text-xs text-white mb-2`
  - Price: `text-xs font-bold text-white/90`
  - Vault badge: `text-[9px] tracking-widest uppercase` with `style={{ color: '#D4B896' }}` — only rendered when `type === 'vault'`

### `ModelStage` — `group` placement

The `group` class lives on the **`ModelStage` wrapper div**, not on `PulseDot`. This means hovering anywhere on the model body (the silhouette container) triggers `group-hover:*` on all descendant `HoverCard` instances simultaneously. If `group` were on `PulseDot`, the trigger area would shrink to the 12px dot — unusable.

---

## CSS Additions (`globals.css`)

Only `@keyframes` blocks are needed. Animation is delivered via inline `style` props (not Tailwind `animate-*` utilities) to avoid Tailwind v4 `@theme` registration requirements.

```css
@keyframes pulse-white {
  0%   { transform: scale(0.95); box-shadow: 0 0 0 0   rgba(255,255,255,0.7); }
  70%  { transform: scale(1);    box-shadow: 0 0 0 10px rgba(255,255,255,0);   }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0   rgba(255,255,255,0);   }
}

@keyframes pulse-champagne {
  0%   { transform: scale(0.95); box-shadow: 0 0 0 0   rgba(212,185,120,0.7); }
  70%  { transform: scale(1);    box-shadow: 0 0 0 10px rgba(212,185,120,0);   }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0   rgba(212,185,120,0);   }
}
```

---

## Files

| File | Change |
|---|---|
| `src/components/CollectionOverlay.tsx` | New — `MODEL_INVENTORY`, `ModelStage`, `PulseDot`, `HoverCard` |
| `src/components/Portal.tsx` | Add `<CollectionOverlay opacity={t.navOpacity} />` inside sticky viewport, **between `<PortalBackground>` and `<AtelierNav>`** — JSX order must be: PortalBackground → CollectionOverlay → AtelierNav |
| `src/app/globals.css` | Add `pulse-white` and `pulse-champagne` @keyframes blocks |

---

## Stacking Order

| Layer | z-index |
|---|---|
| AtelierNav | z-50 |
| HoverCard | z-30 |
| CollectionOverlay | z-20 |
| PortalBackground | z-10 (storefront) / z-0 (interior) |
| Obsidian base | -z-10 |
