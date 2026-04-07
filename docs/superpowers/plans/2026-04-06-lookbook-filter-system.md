# Lookbook Filter System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the empty `lookbook: string[]` with a tagged-media system so each hotspot has filter dimensions (e.g. Color, Sleeve), media items carry tags matching those dimensions, and customers can narrow the carousel in real time — all manageable from Studio Mode on mobile or desktop.

**Architecture:** New shared types (`LookbookItem`, `FilterDimension`, `FilterOption`) land in `studioTypes.ts`. `StudioDot` and `LookbookContext` gain `lookbook: LookbookItem[]` and `filterDimensions: FilterDimension[]`. The internal `RawOutfitItem` mirror in `studioUtils.ts` and the `OutfitItem` interface in `inventory.ts` are updated to match. `studioUtils.ts` exporter serializes the new fields. `LookbookOverlay.tsx` grows auto-generated filter rows that filter the carousel. `StudioInspector.tsx` DotEditor grows a dimension builder and a media manager with URL paste, tag toggles, and up/down reorder.

**Tech Stack:** TypeScript, React, Next.js, Framer Motion, Tailwind CSS

---

## File Map

| File | Change |
|------|--------|
| `src/components/studio/studioTypes.ts` | Add `LookbookItem`, `FilterOption`, `FilterDimension`; update `StudioDot` and `LookbookContext` |
| `src/components/studio/studioUtils.ts` | Update `RawOutfitItem`, `modelSlotToStudio`, and `exportInventoryCode` |
| `src/data/inventory.ts` | Import new types; update `OutfitItem` interface |
| `src/components/studio/LookbookOverlay.tsx` | Add filter state, filter rows UI, filtered carousel |
| `src/components/studio/StudioInspector.tsx` | Add `LookbookUrlInput`, `LookbookItemEditor`, dimension builder inside `DotEditor` |

---

## Task 1: Add new types to studioTypes.ts

**Files:**
- Modify: `src/components/studio/studioTypes.ts`

- [ ] **Step 1: Replace the contents of studioTypes.ts**

Open `src/components/studio/studioTypes.ts` and replace the entire file with:

```typescript
// src/components/studio/studioTypes.ts

export type AccessType = "public" | "vault";

// ── Lookbook media types ──────────────────────────────────────────────────────

/** A single media item in a hotspot's lookbook carousel */
export interface LookbookItem {
  url: string;
  tags: Record<string, string>; // e.g. { "Color": "Showstopper", "Sleeve": "Long" }
}

/** One selectable value within a filter dimension */
export interface FilterOption {
  value: string;       // e.g. "Showstopper"
  subtitle?: string;   // e.g. "(ivory)" — shown beneath the button label
}

/** One filter row shown in the Lookbook popup */
export interface FilterDimension {
  name: string;              // e.g. "Color" or "Sleeve"
  options: FilterOption[];
}

// ── Shared context passed to LookbookOverlay ─────────────────────────────────

/** Minimal shape shared by StudioDot + OutfitItem for the overlay */
export interface LookbookContext {
  name: string;
  collection: string;
  colorway: string;
  price: string;
  type: AccessType;
  lookbook: LookbookItem[];
  filterDimensions?: FilterDimension[];
  story?: string;
  materials?: string;
  sizeGuide?: string;
  sizes?: string[];
  sizeChart?: Record<string, { chest: string; length: string }>;
}

// ── StudioDot ─────────────────────────────────────────────────────────────────

export interface StudioDot {
  id: string;
  name: string;
  collection: string;
  colorway: string;
  price: string;
  type: AccessType;
  topPct: number;   // 0–100, relative to model container height
  leftPct: number;  // 0–100, relative to model container width
  lookbook: LookbookItem[];
  filterDimensions: FilterDimension[];
  sizes?: string[];
  sizeChart?: Record<string, { chest: string; length: string }>;
  story?: string;
  materials?: string;
  sizeGuide?: string;
}

// ── Shadow plane config ───────────────────────────────────────────────────────

export interface ShadowConfig {
  offsetX: number;  // px — horizontal shift (right = positive)
  offsetY: number;  // px — vertical shift (down = positive)
  scaleX: number;   // horizontal stretch (1.0 = same width as character)
  scaleY: number;   // vertical stretch  (0.08 = very flat floor shadow)
  opacity: number;  // 0–1
  blur: number;     // px blur radius (0 = hard edge, 20 = soft)
}

export const DEFAULT_SHADOW: ShadowConfig = {
  offsetX: 0,
  offsetY: 8,
  scaleX: 0.9,
  scaleY: 0.08,
  opacity: 0.45,
  blur: 14,
};

// ── StudioSlot ────────────────────────────────────────────────────────────────

export interface StudioSlot {
  id: string;
  displayName: string;
  imageSrc: string;
  leftPct: number;
  bottomPct: number;
  scale: number;
  zIndex: number;
  dots: StudioDot[];
  shadow: ShadowConfig;
}

// All swappable images in /public
export const AVAILABLE_IMAGES = [
  "/model-center.png",
  "/model-lounge.png",
  "/model-rack.png",
  "/model-vault.png",
] as const;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/logansorensen/Documents/FashionBrand && npx tsc --noEmit 2>&1 | head -40
```

Expected: errors only in files that haven't been updated yet (`studioUtils.ts`, `inventory.ts`, `LookbookOverlay.tsx`). No errors in `studioTypes.ts` itself.

- [ ] **Step 3: Commit**

```bash
git add src/components/studio/studioTypes.ts
git commit -m "feat: add LookbookItem, FilterDimension, FilterOption types to studioTypes"
```

---

## Task 2: Update studioUtils.ts and inventory.ts

**Files:**
- Modify: `src/components/studio/studioUtils.ts`
- Modify: `src/data/inventory.ts`

- [ ] **Step 1: Update studioUtils.ts**

Replace the entire file with:

```typescript
// src/components/studio/studioUtils.ts
import type { StudioDot, StudioSlot, AccessType, ShadowConfig, LookbookItem, FilterDimension, FilterOption } from "./studioTypes";
import { DEFAULT_SHADOW } from "./studioTypes";

// ── Parsers ──────────────────────────────────────────────────────────────────

export function parseDotPosition(pos: string): { topPct: number; leftPct: number } {
  const top = pos.match(/top-\[(-?[\d.]+)%\]/)?.[1];
  const left = pos.match(/left-\[(-?[\d.]+)%\]/)?.[1];
  return {
    topPct: top ? parseFloat(top) : 50,
    leftPct: left ? parseFloat(left) : 50,
  };
}

export function parseModelPosition(pos: string): { leftPct: number; bottomPct: number } {
  const mdLeft    = pos.match(/md:left-\[(-?[\d.]+)%\]/)?.[1];
  const baseLeft  = pos.match(/(?<!md:)left-\[(-?[\d.]+)%\]/)?.[1];
  const mdRight   = pos.match(/md:right-\[(-?[\d.]+)%\]/)?.[1];
  const baseRight = pos.match(/(?<!md:)right-\[(-?[\d.]+)%\]/)?.[1];
  const mdBottom  = pos.match(/md:bottom-\[(-?[\d.]+)%\]/)?.[1];
  const baseBottom = pos.match(/(?<!md:)bottom-\[(-?[\d.]+)%\]/)?.[1];

  const leftRaw  = mdLeft  ?? baseLeft;
  const rightRaw = mdRight ?? baseRight;

  let leftPct: number;
  if (leftRaw !== undefined) {
    leftPct = parseFloat(leftRaw);
  } else if (rightRaw !== undefined) {
    leftPct = 100 - parseFloat(rightRaw) - 12;
  } else {
    leftPct = 30;
  }

  const bottomPct = parseFloat(mdBottom ?? baseBottom ?? "5");
  return { leftPct, bottomPct };
}

export function parseScale(scale: string): number {
  const m = scale.match(/scale-\[([\d.]+)\]/);
  return m ? parseFloat(m[1]) : 1.0;
}

// ── Raw shape (mirrors data/inventory.ts types) ──────────────────────────────

interface RawOutfitItem {
  id: string;
  name: string;
  collection: string;
  colorway: string;
  price: string;
  type: AccessType;
  dotPosition: string;
  lookbook?: LookbookItem[];
  filterDimensions?: FilterDimension[];
  sizes?: string[];
  sizeChart?: Record<string, { chest: string; length: string }>;
  story?: string;
  materials?: string;
  sizeGuide?: string;
}

interface RawModelSlot {
  id: string;
  displayName?: string;
  position: string;
  scale: string;
  mobileScale: string;
  zIndex: number;
  imageSrc: string;
  outfit: RawOutfitItem[];
  shadow?: ShadowConfig;
}

function defaultDisplayName(id: string): string {
  const first = id.split("-")[0] ?? id;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export function modelSlotToStudio(slot: RawModelSlot): StudioSlot {
  const { leftPct, bottomPct } = parseModelPosition(slot.position);
  const scale = parseScale(slot.scale);

  const dots: StudioDot[] = slot.outfit.map((item) => {
    const { topPct, leftPct: dLeft } = parseDotPosition(item.dotPosition);
    return {
      id: item.id,
      name: item.name,
      collection: item.collection,
      colorway: item.colorway,
      price: item.price,
      type: item.type,
      topPct,
      leftPct: dLeft,
      lookbook: item.lookbook ?? [],
      filterDimensions: item.filterDimensions ?? [],
      sizes: item.sizes ?? [],
      sizeChart: item.sizeChart ?? {},
      story: item.story ?? "",
      materials: item.materials ?? "",
      sizeGuide: item.sizeGuide ?? "",
    };
  });

  return {
    id: slot.id,
    displayName: slot.displayName ?? defaultDisplayName(slot.id),
    imageSrc: slot.imageSrc,
    leftPct,
    bottomPct,
    scale,
    zIndex: slot.zIndex,
    dots,
    shadow: slot.shadow ? { ...slot.shadow } : { ...DEFAULT_SHADOW },
  };
}

// ── Exporter ─────────────────────────────────────────────────────────────────

/** Generate the MODEL_INVENTORY array content for pasting into src/data/inventory.ts */
export function exportInventoryCode(slots: StudioSlot[]): string {
  const lines: string[] = [
    `import { ModelSlot } from "@/components/studio/studioTypes";`,
    ``,
    `export const MODEL_INVENTORY: ModelSlot[] = [`
  ];

  for (const slot of slots) {
    const l  = slot.leftPct.toFixed(1);
    const b  = slot.bottomPct.toFixed(1);
    const sc = slot.scale.toFixed(2);

    lines.push(`  {`);
    lines.push(`    id: "${slot.id}",`);
    lines.push(`    displayName: "${slot.displayName}",`);
    lines.push(`    position: "left-[${l}%] md:left-[${l}%] bottom-[${b}%] md:bottom-[${b}%]",`);
    lines.push(`    scale: "md:scale-[${sc}]",`);
    lines.push(`    mobileScale: "scale-[${sc}]",`);
    lines.push(`    zIndex: ${slot.zIndex},`);
    lines.push(`    imageSrc: "${slot.imageSrc}",`);
    lines.push(`    outfit: [`);

    for (const dot of slot.dots) {
      lines.push(`      {`);
      lines.push(`        id: "${dot.id}",`);
      lines.push(`        name: "${dot.name}",`);
      lines.push(`        collection: "${dot.collection}",`);
      lines.push(`        colorway: "${dot.colorway}",`);
      lines.push(`        price: "${dot.price}",`);
      lines.push(`        type: "${dot.type}",`);
      lines.push(`        dotPosition: "top-[${dot.topPct.toFixed(1)}%] left-[${dot.leftPct.toFixed(1)}%]",`);

      // filterDimensions
      if (!dot.filterDimensions || dot.filterDimensions.length === 0) {
        lines.push(`        filterDimensions: [],`);
      } else {
        lines.push(`        filterDimensions: [`);
        for (const dim of dot.filterDimensions) {
          lines.push(`          {`);
          lines.push(`            name: ${JSON.stringify(dim.name)},`);
          lines.push(`            options: [`);
          for (const opt of dim.options) {
            if (opt.subtitle) {
              lines.push(`              { value: ${JSON.stringify(opt.value)}, subtitle: ${JSON.stringify(opt.subtitle)} },`);
            } else {
              lines.push(`              { value: ${JSON.stringify(opt.value)} },`);
            }
          }
          lines.push(`            ],`);
          lines.push(`          },`);
        }
        lines.push(`        ],`);
      }

      // lookbook
      if (!dot.lookbook || dot.lookbook.length === 0) {
        lines.push(`        lookbook: [],`);
      } else {
        lines.push(`        lookbook: [`);
        for (const media of dot.lookbook) {
          const tagEntries = Object.entries(media.tags)
            .map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`)
            .join(", ");
          lines.push(`          { url: ${JSON.stringify(media.url)}, tags: { ${tagEntries} } },`);
        }
        lines.push(`        ],`);
      }

      const sizes = dot.sizes && dot.sizes.length > 0
        ? dot.sizes.map((s) => `"${s}"`).join(", ")
        : `"S", "M", "L", "XL", "XXL"`;
      lines.push(`        sizes: [${sizes}],`);
      if (dot.sizeChart && Object.keys(dot.sizeChart).length > 0) {
        const entries = Object.entries(dot.sizeChart)
          .map(([k, v]) => `${JSON.stringify(k)}: { chest: ${JSON.stringify(v.chest)}, length: ${JSON.stringify(v.length)} }`)
          .join(", ");
        lines.push(`        sizeChart: { ${entries} },`);
      }
      if (dot.story) lines.push(`        story: ${JSON.stringify(dot.story)},`);
      if (dot.materials) lines.push(`        materials: ${JSON.stringify(dot.materials)},`);
      if (dot.sizeGuide) lines.push(`        sizeGuide: ${JSON.stringify(dot.sizeGuide)},`);
      lines.push(`      },`);
    }

    lines.push(`    ],`);
    lines.push(`    shadow: { offsetX: ${slot.shadow.offsetX}, offsetY: ${slot.shadow.offsetY}, scaleX: ${slot.shadow.scaleX.toFixed(2)}, scaleY: ${slot.shadow.scaleY.toFixed(3)}, opacity: ${slot.shadow.opacity.toFixed(2)}, blur: ${slot.shadow.blur} },`);
    lines.push(`  },`);
  }

  lines.push(`];`);
  return lines.join("\n");
}
```

- [ ] **Step 2: Update inventory.ts header and OutfitItem interface**

Open `src/data/inventory.ts` and replace lines 1–33 (the comment, imports, and two interface definitions) with:

```typescript
// src/data/inventory.ts
// ⚠️  This file is auto-generated by Studio Mode. Do not edit manually.
//     Make changes in the Studio, then click "Copy Production Config" and paste to Claude.

import type { ShadowConfig, LookbookItem, FilterDimension } from "@/components/studio/studioTypes";

export interface OutfitItem {
  id: string;
  name: string;
  collection: string;
  colorway: string;
  price: string;
  type: "public" | "vault";
  dotPosition: string;
  lookbook?: LookbookItem[];
  filterDimensions?: FilterDimension[];
  sizes: string[];
  sizeChart?: Record<string, { chest: string; length: string }>;
  materials?: string;
  story?: string;
  sizeGuide?: string;
}

export interface ModelSlot {
  id: string;
  displayName?: string;
  position: string;
  scale: string;
  mobileScale: string;
  zIndex: number;
  imageSrc: string;
  outfit: OutfitItem[];
  shadow?: ShadowConfig;
}
```

Leave the `MODEL_INVENTORY` array below untouched — add `filterDimensions: [],` to each outfit item (they're all already `lookbook: []` so no change needed there).

Each outfit item currently looks like:
```typescript
{
  id: "lounge-showstopper",
  name: "Heartbreaker",
  // ...
  lookbook: [],
  sizes: [...],
```

Add `filterDimensions: [],` after `lookbook: [],` for each of the 4 outfit items. Example:
```typescript
lookbook: [],
filterDimensions: [],
sizes: ["S", "M", "L", "XL", "XXL"],
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
cd /Users/logansorensen/Documents/FashionBrand && npx tsc --noEmit 2>&1 | head -40
```

Expected: errors only in `LookbookOverlay.tsx` and `StudioInspector.tsx` (not yet updated). Zero errors in `studioTypes.ts`, `studioUtils.ts`, or `inventory.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/components/studio/studioUtils.ts src/data/inventory.ts
git commit -m "feat: update studioUtils and inventory types for LookbookItem and FilterDimension"
```

---

## Task 3: Update LookbookOverlay.tsx with filter-aware carousel

**Files:**
- Modify: `src/components/studio/LookbookOverlay.tsx`

- [ ] **Step 1: Replace the entire file**

```typescript
"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LookbookContext, LookbookItem, FilterDimension } from "./studioTypes";
import OverlayPortal from "@/components/OverlayPortal";

// ─── Props ────────────────────────────────────────────────────────────────────

interface LookbookOverlayProps {
  item: LookbookContext | null;
  onClose: () => void;
  onAddToCart: (item: LookbookContext, size: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isVideo(src: string): boolean {
  return /\.(mp4|webm)$/i.test(src.split("?")[0]);
}

const DEFAULT_SIZES = ["S", "M", "L", "XL", "XXL"];
const DEFAULT_SIZE_CHART: Record<string, { chest: string; length: string }> = {
  S:   { chest: '38"', length: '28"' },
  M:   { chest: '40"', length: '29"' },
  L:   { chest: '42"', length: '30"' },
  XL:  { chest: '44"', length: '31"' },
  XXL: { chest: '46"', length: '32"' },
};

const DEFAULT_STORY =
  "Every thread carries a decision. The Constable is built for the man who has already made his.";
const DEFAULT_MATERIALS =
  "98% Supima Cotton, 2% Elastane. Structured collar. Reinforced placket.";
const DEFAULT_SIZE_GUIDE =
  "If between sizes, size up. The Constable is cut close through the chest and tapered through the torso.";

// ─── Carousel ────────────────────────────────────────────────────────────────

interface CarouselProps {
  lookbook: LookbookItem[];
}

const Carousel = React.memo(function Carousel({ lookbook }: CarouselProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef<number>(0);

  const count = lookbook.length;

  // Reset index when filtered list shrinks below current index
  useEffect(() => {
    if (activeIdx >= count && count > 0) setActiveIdx(count - 1);
    if (count === 0) setActiveIdx(0);
  }, [count, activeIdx]);

  const prev = useCallback(() => setActiveIdx((i) => (i - 1 + count) % count), [count]);
  const next = useCallback(() => setActiveIdx((i) => (i + 1) % count), [count]);

  useEffect(() => { setZoomed(false); }, [activeIdx]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 350) setZoomed((z) => !z);
    lastTap.current = now;
  }, []);

  const handleMouseDown = useCallback(() => {
    tapTimer.current = setTimeout(() => setZoomed(true), 500);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (tapTimer.current) clearTimeout(tapTimer.current);
  }, []);

  useEffect(() => {
    return () => { if (tapTimer.current) clearTimeout(tapTimer.current); };
  }, []);

  if (count === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full" style={{ background: "#121212" }}>
        <span className="type-eyebrow text-center px-6">LOOKBOOK COMING SOON</span>
      </div>
    );
  }

  const src = lookbook[activeIdx].url;
  const isVid = isVideo(src);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: "#121212" }}>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        dragDirectionLock
        onDragEnd={(_, info) => {
          if (info.offset.x < -50) next();
          else if (info.offset.x > 50) prev();
        }}
        className="absolute inset-0 flex items-center justify-center"
        style={{ cursor: zoomed ? "zoom-out" : "default" }}
        onClick={handleTap}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {isVid ? (
          <video
            key={src}
            src={src}
            autoPlay
            muted
            loop
            playsInline
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              transform: zoomed ? "scale(1.5)" : "scale(1)",
              transformOrigin: "center", transition: "transform 0.3s ease", display: "block",
            }}
          />
        ) : (
          <img
            key={src}
            src={src}
            alt=""
            draggable={false}
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              transform: zoomed ? "scale(1.5)" : "scale(1)",
              transformOrigin: "center", transition: "transform 0.3s ease",
              display: "block", userSelect: "none",
            }}
          />
        )}
      </motion.div>

      {count > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          aria-label="Previous"
          style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.85)",
            border: "none", color: "white", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, fontSize: 16,
          }}
        >‹</button>
      )}

      {count > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          aria-label="Next"
          style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.85)",
            border: "none", color: "white", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, fontSize: 16,
          }}
        >›</button>
      )}

      {count > 1 && (
        <div style={{
          position: "absolute", bottom: 12, left: 0, right: 0,
          display: "flex", justifyContent: "center", gap: 6, zIndex: 10,
        }}>
          {lookbook.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setActiveIdx(i); }}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: 6, height: 6, borderRadius: "50%",
                background: i === activeIdx ? "#C4A456" : "rgba(255,255,255,0.3)",
                border: "none", padding: 0, cursor: "pointer", transition: "background 0.2s",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// ─── Filter Rows ──────────────────────────────────────────────────────────────

interface FilterRowsProps {
  dimensions: FilterDimension[];
  activeFilters: Record<string, string>;
  onToggle: (dimName: string, value: string) => void;
}

function FilterRows({ dimensions, activeFilters, onToggle }: FilterRowsProps) {
  if (dimensions.length === 0) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      {dimensions.map((dim) => (
        <div key={dim.name} style={{ marginBottom: 12 }}>
          <p className="type-eyebrow" style={{ marginBottom: 8 }}>{dim.name}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {dim.options.map((opt) => {
              const isActive = activeFilters[dim.name] === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => onToggle(dim.name, opt.value)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    padding: "8px 14px",
                    border: `1px solid ${isActive ? "#C4A456" : "rgba(255,255,255,0.15)"}`,
                    background: isActive ? "rgba(196,164,86,0.1)" : "transparent",
                    color: isActive ? "#C4A456" : "rgba(255,255,255,0.5)",
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                >
                  <span style={{
                    fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase",
                    fontFamily: "var(--font-title, Georgia, serif)",
                  }}>
                    {opt.value}
                  </span>
                  {opt.subtitle && (
                    <span style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                      {opt.subtitle}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function LookbookOverlay({ item, onClose, onAddToCart }: LookbookOverlayProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  useEffect(() => { setSelectedSize(null); }, [item]);
  useEffect(() => { setActiveFilters({}); }, [item]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Filter lookbook items: items with no tag for a dimension always pass through
  const filteredLookbook = useMemo(() => {
    if (!item?.lookbook) return [];
    if (Object.keys(activeFilters).length === 0) return item.lookbook;
    return item.lookbook.filter((media) =>
      Object.entries(activeFilters).every(([dimName, selectedValue]) => {
        const tag = media.tags[dimName];
        return tag === undefined || tag === selectedValue;
      })
    );
  }, [item, activeFilters]);

  function toggleFilter(dimName: string, value: string) {
    setActiveFilters((prev) => {
      if (prev[dimName] === value) {
        const next = { ...prev };
        delete next[dimName];
        return next;
      }
      return { ...prev, [dimName]: value };
    });
  }

  const handleAddToCart = useCallback(() => {
    if (!item || !selectedSize) return;
    onAddToCart(item, selectedSize);
  }, [item, selectedSize, onAddToCart]);

  if (!item) return null;

  const story = item.story ?? DEFAULT_STORY;
  const materials = item.materials ?? DEFAULT_MATERIALS;
  const sizeGuide = item.sizeGuide ?? DEFAULT_SIZE_GUIDE;
  const sizes = item.sizes && item.sizes.length > 0 ? item.sizes : DEFAULT_SIZES;
  const sizeChart = item.sizeChart && Object.keys(item.sizeChart).length > 0 ? item.sizeChart : DEFAULT_SIZE_CHART;
  const dimensions = item.filterDimensions ?? [];

  return (
    <OverlayPortal>
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            key="lookbook-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.93)",
              backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 600,
            }}
          />

          <motion.div
            key="lookbook-panel"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 300 }}
            style={{
              position: "fixed", inset: 0, display: "flex",
              alignItems: "center", justifyContent: "center", zIndex: 601, pointerEvents: "none",
            }}
          >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal={true}
            aria-label="Product Lookbook"
            className="lookbook-panel"
            style={{ pointerEvents: "auto", background: "#121212", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}
          >
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                position: "absolute", top: 0, right: 0, width: 44, height: 44,
                background: "none", border: "none", color: "white", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, zIndex: 10,
              }}
            >✕</button>

            <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
              {/* TOP HALF — pinned carousel, never scrolls */}
              <div style={{ flex: "0 0 50%", overflow: "hidden" }}>
                <Carousel lookbook={filteredLookbook} />
              </div>

              {/* BOTTOM HALF — scrolls independently */}
              <div style={{ flex: "0 0 50%", overflowY: "auto", overflowX: "hidden" }}>
                <div style={{ paddingLeft: 24, paddingRight: 24, paddingTop: 28, paddingBottom: 40 }}>

                  {/* Filter rows — appear above item header */}
                  <FilterRows
                    dimensions={dimensions}
                    activeFilters={activeFilters}
                    onToggle={toggleFilter}
                  />

                  {/* Item header */}
                  <div style={{ marginBottom: 8 }}>
                    <h2 className="type-heading" style={{ color: "var(--color-parchment)", marginBottom: 4 }}>
                      {item.name}
                    </h2>
                    <p className="type-eyebrow">{item.collection} — {item.colorway}</p>
                  </div>

                  {/* Price */}
                  <p style={{
                    fontFamily: "var(--font-display, Georgia, serif)", fontSize: "2rem",
                    color: "#C4A456", marginTop: 12, marginBottom: 24, lineHeight: 1.2,
                  }}>
                    {item.price}
                  </p>

                  <div className="divider-gold" style={{ marginBottom: 24 }} />

                  <div style={{ marginBottom: 24 }}>
                    <p className="type-eyebrow" style={{ marginBottom: 8 }}>The Story</p>
                    <p className="type-body" style={{ fontSize: "0.875rem" }}>{story}</p>
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <p className="type-eyebrow" style={{ marginBottom: 8 }}>Materials</p>
                    <p className="type-body" style={{ fontSize: "0.875rem" }}>{materials}</p>
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <p className="type-eyebrow" style={{ marginBottom: 8 }}>Size Guide</p>
                    <p className="type-body" style={{ fontSize: "0.875rem" }}>{sizeGuide}</p>
                  </div>

                  <div style={{ marginBottom: 28 }}>
                    <p className="type-eyebrow" style={{ marginBottom: 10 }}>Size Chart</p>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                      <thead>
                        <tr>
                          {(["Size", "Chest", "Length"] as const).map((col) => (
                            <th key={col} style={{
                              textAlign: "left", padding: "6px 0",
                              borderBottom: "1px solid rgba(196,164,86,0.2)", color: "#C4A456",
                              fontFamily: "var(--font-title, Georgia, serif)", fontSize: "0.6rem",
                              letterSpacing: "0.2em", textTransform: "uppercase",
                            }}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sizes.map((size) => (
                          <tr key={size}>
                            <td style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "var(--color-cream, #EDE6D6)", fontSize: "0.75rem" }}>{size}</td>
                            <td style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "var(--color-cream, #EDE6D6)", fontSize: "0.75rem" }}>{sizeChart[size]?.chest ?? "—"}</td>
                            <td style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "var(--color-cream, #EDE6D6)", fontSize: "0.75rem" }}>{sizeChart[size]?.length ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginBottom: 28 }}>
                    <p className="type-eyebrow" style={{ marginBottom: 12 }}>Select Size</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {sizes.map((size) => {
                        const isSelected = selectedSize === size;
                        return (
                          <button
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            style={{
                              width: 52, height: 52,
                              border: `1px solid ${isSelected ? "#C4A456" : "rgba(255,255,255,0.15)"}`,
                              background: "transparent",
                              color: isSelected ? "#C4A456" : "rgba(255,255,255,0.4)",
                              cursor: "pointer",
                              fontFamily: "var(--font-title, Georgia, serif)",
                              fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase",
                              transition: "border-color 0.2s, color 0.2s",
                            }}
                          >{size}</button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={handleAddToCart}
                    disabled={!selectedSize}
                    style={{
                      width: "100%", height: 52,
                      background: selectedSize ? "#C4A456" : "rgba(196,164,86,0.2)",
                      color: selectedSize ? "#121212" : "rgba(196,164,86,0.4)",
                      border: "none", cursor: selectedSize ? "pointer" : "default",
                      fontFamily: "var(--font-title, Georgia, serif)",
                      fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase",
                      fontWeight: 400, transition: "background 0.2s, color 0.2s",
                    }}
                  >
                    {selectedSize ? "Add to Cart" : "Select a Size"}
                  </button>

                </div>
              </div>
            </div>
          </div>
          </motion.div>

          <style>{`
            .lookbook-panel {
              height: 90dvh;
              width: calc(90dvh * 9 / 16);
              border-radius: 4px;
            }
            @media (max-width: 767px) {
              .lookbook-panel {
                width: 100vw !important;
                height: 100dvh !important;
                border-radius: 0 !important;
              }
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
    </OverlayPortal>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles — only StudioInspector.tsx should still have errors**

```bash
cd /Users/logansorensen/Documents/FashionBrand && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero errors in `LookbookOverlay.tsx`. Only `StudioInspector.tsx` may still have errors (next task).

- [ ] **Step 3: Commit**

```bash
git add src/components/studio/LookbookOverlay.tsx
git commit -m "feat: add filter-aware carousel and FilterRows to LookbookOverlay"
```

---

## Task 4: Update StudioInspector.tsx with dimension builder and media manager

**Files:**
- Modify: `src/components/studio/StudioInspector.tsx`

This task adds two new helper components (`LookbookUrlInput`, `LookbookItemEditor`) and extends the existing `DotEditor` component with two new sections at the bottom: "Filter Dimensions" and "Lookbook Media".

- [ ] **Step 1: Add the import for new types at the top of StudioInspector.tsx**

Find line 4 (current import line):
```typescript
import type { StudioSlot, StudioDot, ShadowConfig, AccessType } from "./studioTypes";
```

Replace with:
```typescript
import type { StudioSlot, StudioDot, ShadowConfig, AccessType, LookbookItem, FilterDimension } from "./studioTypes";
```

- [ ] **Step 2: Add LookbookUrlInput component**

Add this new component after the existing `TextArea` function (at the very bottom of the file, before the last `}`):

```typescript
function LookbookUrlInput({ onAdd }: { onAdd: (url: string) => void }) {
  const [draft, setDraft] = React.useState("");
  return (
    <div className="flex gap-1 mb-2">
      <input
        className="flex-1 text-[10px] text-white/70 py-1.5 px-2 bg-white/5 border border-white/10 outline-none"
        value={draft}
        placeholder="Paste Cloudinary URL..."
        onChange={(e) => setDraft(e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
      />
      <button
        className="text-[9px] uppercase tracking-wider px-3 py-1.5 border border-[#D4B896]/30 text-[#D4B896]/60 hover:text-[#D4B896] shrink-0"
        onPointerDown={(e) => {
          e.stopPropagation();
          const url = draft.trim();
          if (!url) return;
          onAdd(url);
          setDraft("");
        }}
      >+ Add</button>
    </div>
  );
}
```

- [ ] **Step 3: Add LookbookItemEditor component**

Add this after `LookbookUrlInput`:

```typescript
function LookbookItemEditor({
  item, index, total, dimensions, onUpdate, onMoveUp, onMoveDown, onRemove,
}: {
  item: LookbookItem;
  index: number;
  total: number;
  dimensions: FilterDimension[];
  onUpdate: (patch: Partial<LookbookItem>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const isVid = /\.(mp4|webm)$/i.test(item.url.split("?")[0]);
  const filename = item.url.split("/").pop()?.split("?")[0] ?? item.url;

  return (
    <div className="flex flex-col gap-1 bg-white/5 border border-white/10 p-2 mb-1">
      {/* Top row: reorder arrows + type icon + filename + remove */}
      <div className="flex items-center gap-1">
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            className="text-[8px] leading-none px-1"
            style={{ color: index === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.4)" }}
            disabled={index === 0}
            onPointerDown={(e) => { e.stopPropagation(); onMoveUp(); }}
          >▲</button>
          <button
            className="text-[8px] leading-none px-1"
            style={{ color: index === total - 1 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.4)" }}
            disabled={index === total - 1}
            onPointerDown={(e) => { e.stopPropagation(); onMoveDown(); }}
          >▼</button>
        </div>
        <span className="text-[9px] shrink-0" style={{ color: isVid ? "#C4A456" : "rgba(255,255,255,0.4)" }}>
          {isVid ? "▶" : "□"}
        </span>
        <span className="flex-1 text-[9px] text-white/50 truncate min-w-0">{filename}</span>
        <button
          className="text-red-500/60 text-[10px] shrink-0"
          onPointerDown={(e) => { e.stopPropagation(); onRemove(); }}
        >✕</button>
      </div>

      {/* Tag selector per dimension */}
      {dimensions.map((dim) => (
        <div key={dim.name} className="flex items-center gap-1 flex-wrap">
          <span className="text-[7px] uppercase text-white/30 shrink-0" style={{ minWidth: 40 }}>{dim.name}</span>
          <div className="flex gap-1 flex-wrap">
            {dim.options.map((opt) => {
              const isActive = item.tags[dim.name] === opt.value;
              return (
                <button
                  key={opt.value}
                  className="text-[7px] uppercase tracking-wider px-2 py-0.5 border transition-all"
                  style={{
                    borderColor: isActive ? "#D4B896" : "rgba(255,255,255,0.1)",
                    color: isActive ? "#D4B896" : "rgba(255,255,255,0.4)",
                    background: isActive ? "rgba(212,184,150,0.05)" : "transparent",
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    const newTags = { ...item.tags };
                    if (isActive) { delete newTags[dim.name]; }
                    else { newTags[dim.name] = opt.value; }
                    onUpdate({ tags: newTags });
                  }}
                >{opt.value}</button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Extend DotEditor with dimension builder and media manager sections**

Inside the `DotEditor` function, find the closing section of the expanded panel — the last `<TextArea>` line currently looks like:
```typescript
          <TextArea label="Size Guide" value={dot.sizeGuide ?? ""} onChange={(v: string) => onUpdate({ sizeGuide: v })} />
```

Add these two new sections immediately after it, before the closing `</div>` of the expanded panel:

```typescript
          {/* ── Filter Dimensions ── */}
          <p className="text-[7px] uppercase tracking-[0.3em] text-[#D4B896]/50 mt-3 mb-1">Filter Dimensions</p>
          {(dot.filterDimensions ?? []).map((dim, dimIdx) => (
            <div key={dimIdx} className="bg-white/5 border border-white/10 p-2 mb-2">
              {/* Dimension name + remove */}
              <div className="flex items-center gap-2 mb-2">
                <input
                  className="flex-1 text-[10px] text-white/70 py-1 px-2 bg-white/5 border border-white/10 outline-none"
                  value={dim.name}
                  placeholder='Name (e.g. "Color")'
                  onChange={(e) => {
                    const dims = [...(dot.filterDimensions ?? [])];
                    dims[dimIdx] = { ...dims[dimIdx], name: e.target.value };
                    onUpdate({ filterDimensions: dims });
                  }}
                  onPointerDown={(e: any) => e.stopPropagation()}
                />
                <button
                  className="text-red-500/60 text-[10px] shrink-0"
                  onPointerDown={(e: any) => {
                    e.stopPropagation();
                    onUpdate({ filterDimensions: (dot.filterDimensions ?? []).filter((_, i) => i !== dimIdx) });
                  }}
                >✕</button>
              </div>
              {/* Options */}
              {dim.options.map((opt, optIdx) => (
                <div key={optIdx} className="flex items-center gap-1 mb-1">
                  <input
                    className="flex-1 text-[10px] text-white/70 py-1 px-2 bg-white/5 border border-white/10 outline-none"
                    value={opt.value}
                    placeholder="Value"
                    onChange={(e) => {
                      const dims = [...(dot.filterDimensions ?? [])];
                      const opts = [...dims[dimIdx].options];
                      opts[optIdx] = { ...opts[optIdx], value: e.target.value };
                      dims[dimIdx] = { ...dims[dimIdx], options: opts };
                      onUpdate({ filterDimensions: dims });
                    }}
                    onPointerDown={(e: any) => e.stopPropagation()}
                  />
                  <input
                    className="flex-1 text-[10px] text-white/40 py-1 px-2 bg-white/5 border border-white/10 outline-none"
                    value={opt.subtitle ?? ""}
                    placeholder="(subtitle)"
                    onChange={(e) => {
                      const dims = [...(dot.filterDimensions ?? [])];
                      const opts = [...dims[dimIdx].options];
                      opts[optIdx] = { ...opts[optIdx], subtitle: e.target.value || undefined };
                      dims[dimIdx] = { ...dims[dimIdx], options: opts };
                      onUpdate({ filterDimensions: dims });
                    }}
                    onPointerDown={(e: any) => e.stopPropagation()}
                  />
                  <button
                    className="text-red-500/60 text-[10px] shrink-0"
                    onPointerDown={(e: any) => {
                      e.stopPropagation();
                      const dims = [...(dot.filterDimensions ?? [])];
                      dims[dimIdx] = { ...dims[dimIdx], options: dims[dimIdx].options.filter((_, i) => i !== optIdx) };
                      onUpdate({ filterDimensions: dims });
                    }}
                  >✕</button>
                </div>
              ))}
              <button
                className="text-[8px] uppercase tracking-widest text-[#D4B896]/50 mt-1 hover:text-[#D4B896]"
                onPointerDown={(e: any) => {
                  e.stopPropagation();
                  const dims = [...(dot.filterDimensions ?? [])];
                  dims[dimIdx] = { ...dims[dimIdx], options: [...dims[dimIdx].options, { value: "" }] };
                  onUpdate({ filterDimensions: dims });
                }}
              >+ Option</button>
            </div>
          ))}
          <button
            className="w-full text-[9px] tracking-widest uppercase py-2 border border-[#D4B896]/20 text-[#D4B896]/50 hover:text-[#D4B896] mb-2"
            onPointerDown={(e: any) => {
              e.stopPropagation();
              onUpdate({ filterDimensions: [...(dot.filterDimensions ?? []), { name: "", options: [] }] });
            }}
          >+ Add Dimension</button>

          {/* ── Lookbook Media ── */}
          <p className="text-[7px] uppercase tracking-[0.3em] text-[#D4B896]/50 mt-3 mb-1">
            Lookbook Media ({dot.lookbook.length})
          </p>
          <LookbookUrlInput
            onAdd={(url) => onUpdate({ lookbook: [...dot.lookbook, { url, tags: {} }] })}
          />
          {dot.lookbook.map((media, idx) => (
            <LookbookItemEditor
              key={idx}
              item={media}
              index={idx}
              total={dot.lookbook.length}
              dimensions={dot.filterDimensions ?? []}
              onUpdate={(patch) => {
                const lb = [...dot.lookbook];
                lb[idx] = { ...lb[idx], ...patch };
                onUpdate({ lookbook: lb });
              }}
              onMoveUp={() => {
                if (idx === 0) return;
                const lb = [...dot.lookbook];
                [lb[idx - 1], lb[idx]] = [lb[idx], lb[idx - 1]];
                onUpdate({ lookbook: lb });
              }}
              onMoveDown={() => {
                if (idx === dot.lookbook.length - 1) return;
                const lb = [...dot.lookbook];
                [lb[idx], lb[idx + 1]] = [lb[idx + 1], lb[idx]];
                onUpdate({ lookbook: lb });
              }}
              onRemove={() => onUpdate({ lookbook: dot.lookbook.filter((_, i) => i !== idx) })}
            />
          ))}
```

- [ ] **Step 5: Verify zero TypeScript errors**

```bash
cd /Users/logansorensen/Documents/FashionBrand && npx tsc --noEmit 2>&1 | head -40
```

Expected: **no errors at all** across the entire codebase.

- [ ] **Step 6: Commit**

```bash
git add src/components/studio/StudioInspector.tsx
git commit -m "feat: add dimension builder and media manager to StudioInspector DotEditor"
```

---

## Task 5: End-to-end verification

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/logansorensen/Documents/FashionBrand && npm run dev
```

- [ ] **Step 2: Verify Studio Mode — dimension builder**

1. Open the site, enter Studio Mode
2. Select Angel
3. Expand the "Heartbreaker" hotspot in the Inspector
4. Scroll to the bottom of the expanded section
5. Click **+ Add Dimension**
6. Type `Color` as the name
7. Click **+ Option**, type `Showstopper`, tab to subtitle field, type `(ivory)`
8. Click **+ Option** again, type `Heartbreaker`, subtitle `(guilt grey)`
9. Click **+ Add Dimension** again, type `Sleeve`
10. Add options `Short` and `Long` (no subtitles)

Expected: dimensions appear immediately, options are editable inline

- [ ] **Step 3: Verify Studio Mode — media manager**

1. Paste any image URL into the "Lookbook Media" URL field (e.g. `https://res.cloudinary.com/demo/image/upload/sample.jpg`)
2. Click **+ Add**
3. Expected: item appears with ▲▼ reorder arrows, type icon (□ for image), filename truncated, and tag buttons for Color (Showstopper / Heartbreaker) and Sleeve (Short / Long)
4. Click **Showstopper** to tag it — button highlights gold
5. Click **Long** to tag it
6. Add a second item, tag it differently
7. Use ▲▼ to reorder — confirm order changes

- [ ] **Step 4: Verify Copy Production Config output**

1. Click **Copy Production Config**
2. Paste into a text editor
3. Confirm the pasted content includes `filterDimensions: [...]` and `lookbook: [{ url: "...", tags: { "Color": "Showstopper", "Sleeve": "Long" } }]`

- [ ] **Step 5: Verify customer-facing Lookbook popup**

1. Exit Studio Mode
2. Click a model's hotspot
3. Click **Find My Size**
4. Expected: filter rows appear above the item name — Row 1: Color (Showstopper / Heartbreaker), Row 2: Sleeve (Short / Long)
5. Click **Showstopper** — carousel narrows to only Showstopper-tagged items (or untagged)
6. Click **Long** — carousel narrows further
7. Click **Showstopper** again — deselects, carousel widens back

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete lookbook filter system — dimensions, media manager, filter carousel"
```

---

## Self-Review

**Spec coverage check:**
- ✅ `LookbookItem` with `url` + `tags` — Task 1
- ✅ `FilterDimension` with `name` + `options` (value + subtitle) — Task 1
- ✅ Exporter serializes both new fields correctly — Task 2
- ✅ Importer (`modelSlotToStudio`) handles new fields with safe defaults — Task 2
- ✅ Filter rows auto-generated from `filterDimensions` — Task 3
- ✅ Selecting a filter narrows carousel; untagged items always pass through — Task 3
- ✅ Clicking active filter deselects it (toggle) — Task 3
- ✅ Carousel index resets safely when filtered list shrinks — Task 3
- ✅ Subtitle text "(ivory)" / "(guilt grey)" shown beneath button value — Task 3 + 4
- ✅ Studio dimension builder: add/remove dimensions and options — Task 4
- ✅ Studio media manager: paste URL, tag per dimension, reorder with ▲▼, remove — Task 4
- ✅ Deploy workflow unchanged: Copy Production Config → paste to Claude → one file replaced — Tasks 2+4

**Placeholder scan:** No TBDs, no "similar to above", all code blocks are complete.

**Type consistency:** `LookbookItem`, `FilterDimension`, `FilterOption` defined in Task 1 and used consistently in Tasks 2, 3, 4. `filterDimensions: dot.filterDimensions ?? []` used in both `LookbookItemEditor` and `FilterRows` to safely handle items that existed before this feature.
