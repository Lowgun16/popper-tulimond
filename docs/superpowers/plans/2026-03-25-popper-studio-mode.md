# Popper Studio Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full WYSIWYG Studio Mode into CollectionOverlay.tsx — inspector sidebar, click-to-select with bounding box, drag-to-move models, scale handle, dot editing, and copy-to-clipboard code export.

**Architecture:** Three new focused files under `src/components/studio/` handle types, parsing/export utilities, and the Inspector panel. `CollectionOverlay.tsx` is modified to orchestrate studio state and pass overrides to each `ModelStage`. Positions are stored as numeric percentages during editing and converted back to Tailwind strings on export. Framer Motion handles all drag operations (model move + dot repositioning).

**Tech Stack:** React state, Framer Motion drag, TypeScript — all already in the project. No new dependencies.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/studio/studioTypes.ts` | **Create** | All studio-specific TypeScript interfaces |
| `src/components/studio/studioUtils.ts` | **Create** | Parse Tailwind strings → numbers; export state → TS code |
| `src/components/studio/StudioInspector.tsx` | **Create** | Left sidebar — selected model fields, dot editors, copy code |
| `src/components/CollectionOverlay.tsx` | **Modify** | Studio state, selection, drag orchestration, Inspector render |

---

## Task 1: Studio Types

**Files:**
- Create: `src/components/studio/studioTypes.ts`

- [ ] Create the file:

```typescript
// src/components/studio/studioTypes.ts

export type AccessType = "public" | "vault";

export interface StudioDot {
  id: string;
  name: string;
  collection: string;
  colorway: string;
  price: string;
  type: AccessType;
  topPct: number;   // 0–100, relative to model container height
  leftPct: number;  // 0–100, relative to model container width
}

export interface StudioSlot {
  id: string;
  imageSrc: string;
  leftPct: number;    // position as % of viewport width
  bottomPct: number;  // position as % of viewport height
  scale: number;      // e.g. 1.0, 0.9, 0.8
  zIndex: number;
  dots: StudioDot[];
}

// All swappable images in /public
export const AVAILABLE_IMAGES = [
  "/model-center.png",
  "/model-lounge.png",
  "/model-rack.png",
  "/model-vault.png",
] as const;
```

- [ ] Commit: `git commit -m "feat(studio): add studio types"`

---

## Task 2: Parse + Export Utilities

**Files:**
- Create: `src/components/studio/studioUtils.ts`

The most important file — bridges Tailwind strings ↔ numeric studio state.

- [ ] Create the file:

```typescript
// src/components/studio/studioUtils.ts
import type { StudioDot, StudioSlot, AccessType } from "./studioTypes";

// ── Parsers ──────────────────────────────────────────────────────────────────

/** "top-[30%] left-[85%]" → { topPct: 30, leftPct: 85 } */
export function parseDotPosition(pos: string): { topPct: number; leftPct: number } {
  const top = pos.match(/top-\[(-?[\d.]+)%\]/)?.[1];
  const left = pos.match(/left-\[(-?[\d.]+)%\]/)?.[1];
  return {
    topPct: top ? parseFloat(top) : 50,
    leftPct: left ? parseFloat(left) : 50,
  };
}

/**
 * Parse model position string to desktop left/bottom percentages.
 * Prefers md: values over base. Converts right→left as (100 - rightPct - 12).
 */
export function parseModelPosition(pos: string): { leftPct: number; bottomPct: number } {
  const mdLeft   = pos.match(/md:left-\[(-?[\d.]+)%\]/)?.[1];
  const baseLeft = pos.match(/(?<!md:)left-\[(-?[\d.]+)%\]/)?.[1];
  const mdRight  = pos.match(/md:right-\[(-?[\d.]+)%\]/)?.[1];
  const baseRight = pos.match(/(?<!md:)right-\[(-?[\d.]+)%\]/)?.[1];
  const mdBottom  = pos.match(/md:bottom-\[(-?[\d.]+)%\]/)?.[1];
  const baseBottom = pos.match(/(?<!md:)bottom-\[(-?[\d.]+)%\]/)?.[1];

  const leftRaw  = mdLeft  ?? baseLeft;
  const rightRaw = mdRight ?? baseRight;

  let leftPct: number;
  if (leftRaw !== undefined) {
    leftPct = parseFloat(leftRaw);
  } else if (rightRaw !== undefined) {
    // right-positioned: approximate left as 100 - right - ~12 (rough model width)
    leftPct = 100 - parseFloat(rightRaw) - 12;
  } else {
    leftPct = 30;
  }

  const bottomPct = parseFloat(mdBottom ?? baseBottom ?? "5");
  return { leftPct, bottomPct };
}

/** "md:scale-[0.9]" → 0.9 */
export function parseScale(scale: string): number {
  const m = scale.match(/scale-\[([\d.]+)\]/);
  return m ? parseFloat(m[1]) : 1.0;
}

// ── MODEL_INVENTORY slot shape (inline to avoid circular import) ──────────────

interface RawOutfitItem {
  id: string;
  name: string;
  collection: string;
  colorway: string;
  price: string;
  type: AccessType;
  dotPosition: string;
}

interface RawModelSlot {
  id: string;
  position: string;
  scale: string;
  zIndex: number;
  imageSrc: string;
  outfit: RawOutfitItem[];
}

/** Convert a raw MODEL_INVENTORY slot → StudioSlot for editing */
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
    };
  });

  return { id: slot.id, imageSrc: slot.imageSrc, leftPct, bottomPct, scale, zIndex: slot.zIndex, dots };
}

// ── Exporter ─────────────────────────────────────────────────────────────────

/** Generate the full MODEL_INVENTORY TypeScript source from studio state */
export function exportInventoryCode(slots: StudioSlot[]): string {
  const lines: string[] = ["const MODEL_INVENTORY: ModelSlot[] = ["];

  for (const slot of slots) {
    const l = slot.leftPct.toFixed(1);
    const b = slot.bottomPct.toFixed(1);
    const sc = slot.scale.toFixed(2);

    lines.push(`  {`);
    lines.push(`    id: "${slot.id}",`);
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
      lines.push(`      },`);
    }

    lines.push(`    ],`);
    lines.push(`  },`);
  }

  lines.push(`];`);
  return lines.join("\n");
}
```

- [ ] Commit: `git commit -m "feat(studio): add parse + export utilities"`

---

## Task 3: StudioInspector Panel

**Files:**
- Create: `src/components/studio/StudioInspector.tsx`

Fixed 300px left sidebar with: header, Transform section (left/bottom/scale/z inputs), Character section (swap image dropdown, remove button), Hotspots section (per-dot editors with text fields + type toggle + position inputs + add/remove), and Copy Layout Code at the bottom.

- [ ] Create the file:

```tsx
// src/components/studio/StudioInspector.tsx
"use client";
import React from "react";
import { AVAILABLE_IMAGES } from "./studioTypes";
import type { StudioSlot, StudioDot, AccessType } from "./studioTypes";

interface Props {
  slots: StudioSlot[];
  selectedId: string | null;
  onUpdateSlot: (id: string, patch: Partial<StudioSlot>) => void;
  onUpdateDot: (slotId: string, dotId: string, patch: Partial<StudioDot>) => void;
  onAddDot: (slotId: string) => void;
  onRemoveDot: (slotId: string, dotId: string) => void;
  onSwapImage: (slotId: string, imageSrc: string) => void;
  onRemoveSlot: (slotId: string) => void;
  onCopyCode: () => void;
  copyConfirm: boolean;
}

export function StudioInspector({
  slots,
  selectedId,
  onUpdateSlot,
  onUpdateDot,
  onAddDot,
  onRemoveDot,
  onSwapImage,
  onRemoveSlot,
  onCopyCode,
  copyConfirm,
}: Props) {
  const selected = selectedId ? slots.find((s) => s.id === selectedId) ?? null : null;

  return (
    <div
      className="fixed left-0 top-0 bottom-0 z-[200] flex flex-col"
      style={{
        width: 300,
        background: "rgba(8,8,8,0.97)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 pt-5 pb-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-[8px] tracking-[0.4em] uppercase mb-1" style={{ color: "#D4B896" }}>
          Popper Studio
        </p>
        <p className="text-white/40 text-[11px] tracking-wide">
          {selected ? selected.id : "Click a character to select"}
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <div className="px-5 py-4 flex flex-col gap-6">
            {/* Transform */}
            <Section label="Transform">
              <Row label="Left %">
                <NumInput value={selected.leftPct} onChange={(v) => onUpdateSlot(selected.id, { leftPct: v })} />
              </Row>
              <Row label="Bottom %">
                <NumInput value={selected.bottomPct} onChange={(v) => onUpdateSlot(selected.id, { bottomPct: v })} />
              </Row>
              <Row label="Scale">
                <NumInput value={selected.scale} step={0.05} min={0.2} max={2.5} onChange={(v) => onUpdateSlot(selected.id, { scale: v })} />
              </Row>
              <Row label="Z-Index">
                <NumInput value={selected.zIndex} step={1} min={1} max={100} onChange={(v) => onUpdateSlot(selected.id, { zIndex: v })} />
              </Row>
            </Section>

            {/* Character */}
            <Section label="Character">
              <label className="text-[9px] tracking-widest uppercase block mb-1" style={{ color: "rgba(255,255,255,0.25)" }}>
                Swap Image
              </label>
              <select
                className="w-full text-[11px] text-white/70 py-1.5 px-2 rounded-sm"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", outline: "none" }}
                value={selected.imageSrc}
                onChange={(e) => onSwapImage(selected.id, e.target.value)}
              >
                {AVAILABLE_IMAGES.map((src) => (
                  <option key={src} value={src} style={{ background: "#111" }}>
                    {src.replace("/", "").replace(".png", "")}
                  </option>
                ))}
              </select>
              <button
                className="mt-2 w-full text-[9px] tracking-widest uppercase py-2 transition-colors duration-200"
                style={{ border: "1px solid rgba(220,60,60,0.3)", color: "rgba(220,90,90,0.75)" }}
                onClick={() => onRemoveSlot(selected.id)}
              >
                Remove Character
              </button>
            </Section>

            {/* Hotspots */}
            <Section label={`Hotspots (${selected.dots.length})`}>
              <div className="flex flex-col gap-3">
                {selected.dots.map((dot) => (
                  <DotEditor
                    key={dot.id}
                    dot={dot}
                    onUpdate={(patch) => onUpdateDot(selected.id, dot.id, patch)}
                    onRemove={() => onRemoveDot(selected.id, dot.id)}
                  />
                ))}
              </div>
              <button
                className="w-full text-[9px] tracking-widest uppercase py-2 mt-2 transition-colors duration-200"
                style={{ border: "1px solid rgba(212,184,150,0.25)", color: "rgba(212,184,150,0.6)" }}
                onClick={() => onAddDot(selected.id)}
              >
                + Add Hotspot
              </button>
            </Section>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full px-8">
            <p className="text-center text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.18)" }}>
              Select a character on the canvas to inspect and edit their position, scale, and hotspots.
            </p>
          </div>
        )}
      </div>

      {/* Footer — Copy Code */}
      <div className="px-5 py-4 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          className="w-full text-[9px] tracking-widest uppercase py-3 transition-all duration-300"
          style={{
            border: `1px solid ${copyConfirm ? "#D4B896" : "rgba(255,255,255,0.18)"}`,
            color: copyConfirm ? "#D4B896" : "rgba(255,255,255,0.55)",
            background: copyConfirm ? "rgba(212,184,150,0.06)" : "transparent",
          }}
          onClick={onCopyCode}
        >
          {copyConfirm ? "✓  Copied to Clipboard" : "Copy Layout Code"}
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[8px] tracking-[0.4em] uppercase mb-3" style={{ color: "rgba(255,255,255,0.22)" }}>
        {label}
      </p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.35)", minWidth: 60 }}>
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function NumInput({
  value, step = 0.5, min = -150, max = 250, onChange,
}: {
  value: number; step?: number; min?: number; max?: number; onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      className="w-full text-[11px] text-white/75 text-right py-1 px-2 rounded-sm"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", outline: "none" }}
      value={step < 1 ? value.toFixed(2) : Math.round(value)}
      step={step}
      min={min}
      max={max}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
      }}
    />
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.28)", minWidth: 60 }}>
        {label}
      </span>
      <input
        className="flex-1 text-[11px] text-white/75 py-0.5 px-2 rounded-sm"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", outline: "none" }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function DotEditor({
  dot, onUpdate, onRemove,
}: {
  dot: StudioDot; onUpdate: (p: Partial<StudioDot>) => void; onRemove: () => void;
}) {
  return (
    <div
      className="rounded-sm p-3 flex flex-col gap-2"
      style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
    >
      {/* Dot header */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[8px] tracking-widest uppercase" style={{ color: dot.type === "vault" ? "#D4B896" : "rgba(255,255,255,0.35)" }}>
          {dot.type}
        </span>
        <button className="text-[10px] leading-none" style={{ color: "rgba(200,70,70,0.6)" }} onClick={onRemove}>
          ✕
        </button>
      </div>

      <TextInput label="Name"       value={dot.name}       onChange={(v) => onUpdate({ name: v })} />
      <TextInput label="Collection" value={dot.collection} onChange={(v) => onUpdate({ collection: v })} />
      <TextInput label="Colorway"   value={dot.colorway}   onChange={(v) => onUpdate({ colorway: v })} />
      <TextInput label="Price"      value={dot.price}      onChange={(v) => onUpdate({ price: v })} />

      {/* Type toggle */}
      <div className="flex gap-1.5 mt-1">
        {(["public", "vault"] as AccessType[]).map((t) => (
          <button
            key={t}
            className="flex-1 text-[8px] tracking-widest uppercase py-1.5 transition-colors duration-150"
            style={{
              border: `1px solid ${dot.type === t ? (t === "vault" ? "#D4B896" : "rgba(255,255,255,0.4)") : "rgba(255,255,255,0.07)"}`,
              color: dot.type === t ? (t === "vault" ? "#D4B896" : "rgba(255,255,255,0.65)") : "rgba(255,255,255,0.2)",
            }}
            onClick={() => onUpdate({ type: t })}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Position */}
      <div className="flex gap-2 mt-1">
        <div className="flex-1">
          <Row label="Top %">
            <NumInput value={dot.topPct} onChange={(v) => onUpdate({ topPct: v })} />
          </Row>
        </div>
        <div className="flex-1">
          <Row label="Left %">
            <NumInput value={dot.leftPct} onChange={(v) => onUpdate({ leftPct: v })} />
          </Row>
        </div>
      </div>
    </div>
  );
}
```

- [ ] Commit: `git commit -m "feat(studio): add StudioInspector panel"`

---

## Task 4: Wire Studio Mode into CollectionOverlay

**Files:**
- Modify: `src/components/CollectionOverlay.tsx`

This is the core integration task. The changes:

### 4a — Export types, add studio imports

At the top of the file, export `ModelSlot` and `OutfitItem` interfaces, and add imports for the new studio files.

```tsx
// Add to imports:
import { StudioInspector } from "./studio/StudioInspector";
import { modelSlotToStudio, exportInventoryCode } from "./studio/studioUtils";
import type { StudioSlot, StudioDot } from "./studio/studioTypes";

// Change interface declarations to exported:
export interface OutfitItem { ... }
export interface ModelSlot { ... }
```

### 4b — Add studio state to CollectionOverlay

```tsx
const [isStudioMode, setIsStudioMode] = useState(false);
const [studioSlots, setStudioSlots] = useState<StudioSlot[]>([]);
const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
const [copyConfirm, setCopyConfirm] = useState(false);
const containerRef = useRef<HTMLDivElement>(null);

// Initialize studio state when entering studio mode
const enterStudio = () => {
  setStudioSlots(MODEL_INVENTORY.map(modelSlotToStudio));
  setSelectedModelId(null);
  setIsStudioMode(true);
};

const exitStudio = () => {
  setIsStudioMode(false);
  setSelectedModelId(null);
};
```

### 4c — Studio state updaters (callbacks for Inspector)

```tsx
const updateSlot = (id: string, patch: Partial<StudioSlot>) => {
  setStudioSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
};

const updateDot = (slotId: string, dotId: string, patch: Partial<StudioDot>) => {
  setStudioSlots((prev) =>
    prev.map((s) =>
      s.id === slotId
        ? { ...s, dots: s.dots.map((d) => (d.id === dotId ? { ...d, ...patch } : d)) }
        : s
    )
  );
};

const addDot = (slotId: string) => {
  const newDot: StudioDot = {
    id: `${slotId}-dot-${Date.now()}`,
    name: "New Item",
    collection: "The Constable",
    colorway: "Ivory",
    price: "$0",
    type: "public",
    topPct: 40,
    leftPct: 50,
  };
  setStudioSlots((prev) =>
    prev.map((s) => (s.id === slotId ? { ...s, dots: [...s.dots, newDot] } : s))
  );
};

const removeDot = (slotId: string, dotId: string) => {
  setStudioSlots((prev) =>
    prev.map((s) => (s.id === slotId ? { ...s, dots: s.dots.filter((d) => d.id !== dotId) } : s))
  );
};

const swapImage = (slotId: string, imageSrc: string) => {
  updateSlot(slotId, { imageSrc });
};

const removeSlot = (slotId: string) => {
  setStudioSlots((prev) => prev.filter((s) => s.id !== slotId));
  if (selectedModelId === slotId) setSelectedModelId(null);
};

const copyCode = () => {
  const code = exportInventoryCode(studioSlots);
  navigator.clipboard.writeText(code);
  setCopyConfirm(true);
  setTimeout(() => setCopyConfirm(false), 2500);
};
```

### 4d — Drag-to-move: model position update from drag

**Important:** Framer Motion's `drag` tracks internal offset state. After `onDragEnd`, the element visually snaps back to its laid-out position — but the next drag would double-count the offset. To avoid this, use `useMotionValue(0)` for the drag `x`/`y` and reset them to 0 after each drag. Because we're applying position via inline `left`/`bottom` style, the element is already at the correct visual position after state update — resetting the MotionValues to 0 is safe.

In `ModelStage`, create refs:
```tsx
const dragX = useMotionValue(0);
const dragY = useMotionValue(0);
```

Pass them as `style={{ x: dragX, y: dragY }}` on the motion.div.

On drag end:
```tsx
onDragEnd: (_: unknown, info: { offset: { x: number; y: number } }) => {
  onModelDragEnd(slot.id, info.offset.x, info.offset.y);
  // Reset internal drag offset so next drag starts from zero
  dragX.set(0);
  dragY.set(0);
}
```

The parent `handleModelDragEnd` converts pixel offset → percentage delta:

```tsx
const handleModelDragEnd = (slotId: string, offsetX: number, offsetY: number) => {
  const container = containerRef.current;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const slot = studioSlots.find((s) => s.id === slotId);
  if (!slot) return;

  const deltaLeftPct   =  (offsetX / rect.width)  * 100;
  const deltaBottomPct = -(offsetY / rect.height) * 100; // invert Y

  updateSlot(slotId, {
    leftPct:   slot.leftPct   + deltaLeftPct,
    bottomPct: slot.bottomPct + deltaBottomPct,
  });
};
```

### 4e — Scale handle: pointer drag on bottom-right corner

The scale handle is a 10×10 div in the bounding box corner. On pointerdown, track pointer movement: dragging right/up increases scale, left/down decreases.

```tsx
// Inside ModelStage, when in studio mode and selected:
const handleScalePointerDown = (e: React.PointerEvent) => {
  e.stopPropagation();
  const startX = e.clientX;
  const startY = e.clientY;
  const startScale = studioSlot.scale;

  const onMove = (me: PointerEvent) => {
    const delta = ((me.clientX - startX) - (me.clientY - startY)) / 200;
    const newScale = Math.max(0.2, Math.min(2.5, startScale + delta));
    updateSlot(studioSlot.id, { scale: newScale });
  };

  const onUp = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
};
```

### 4f — Modified ModelStage signature

```tsx
interface ModelStageProps {
  slot: ModelSlot;
  index: number;
  revealed: boolean;
  isEditMode: boolean;          // existing dot drag mode (keep for compat)
  isStudioMode: boolean;         // new
  studioSlot?: StudioSlot;       // present only when isStudioMode=true
  isSelected: boolean;           // selected in studio
  onSelect: () => void;
  onDotDrop: (text: string) => void;
  onModelDragEnd: (slotId: string, offsetX: number, offsetY: number) => void;
  onUpdateStudioSlot: (id: string, patch: Partial<StudioSlot>) => void;
}
```

In studio mode, the model's position and scale come from `studioSlot` applied as **inline styles** instead of Tailwind classes:

```tsx
// In ModelStage render:
const positionStyle = isStudioMode && studioSlot
  ? {
      left: `${studioSlot.leftPct}%`,
      bottom: `${studioSlot.bottomPct}%`,
      position: "absolute" as const,
    }
  : {};

const scaleStyle = isStudioMode && studioSlot
  ? { transform: `scale(${studioSlot.scale})` }
  : {};
```

Wrap the model div in a `motion.div` with `drag` when in studio mode:

```tsx
const Wrapper = isStudioMode ? motion.div : "div";
const wrapperProps = isStudioMode
  ? {
      drag: true,
      dragMomentum: false,
      dragElastic: 0,
      onDragEnd: (_: unknown, info: { offset: { x: number; y: number } }) => {
        onModelDragEnd(slot.id, info.offset.x, info.offset.y);
      },
      style: { ...positionStyle, cursor: "grab" },
      whileDrag: { cursor: "grabbing" },
    }
  : { style: positionStyle };
```

Bounding box overlay (shown when `isSelected && isStudioMode`):

```tsx
{isSelected && isStudioMode && (
  <div
    className="absolute inset-0 pointer-events-none z-30"
    style={{ border: "1.5px solid rgba(212,184,150,0.7)", boxShadow: "0 0 0 1px rgba(0,0,0,0.5) inset" }}
  >
    {/* Scale handle — bottom-right corner */}
    <div
      className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize pointer-events-auto"
      style={{ background: "#D4B896", transform: "translate(50%, 50%)" }}
      onPointerDown={handleScalePointerDown}
    />
  </div>
)}
```

### 4g — Dot positioning + drag in studio mode

In studio mode, dots use `studioSlot.dots` instead of `slot.outfit`. Each `StudioDot` has numeric `topPct`/`leftPct` — apply as inline style:

```tsx
// PulseDot position in studio mode:
style={{ position: "absolute", top: `${studioDot.topPct}%`, left: `${studioDot.leftPct}%` }}
// vs. existing className={`absolute ${item.dotPosition}`} in normal mode
```

The existing `PulseDot` drag already emits pixel coordinates from `onDragEnd` (using `info.point` and container rect). In studio mode, wire that result directly to `onStudioDotDrop(dotId, topPct, leftPct)` instead of the toast. Add `onStudioDotDrop` to `ModelStageProps` and `PulseDotProps`:

```tsx
// ModelStageProps addition:
onStudioDotDrop: (dotId: string, topPct: number, leftPct: number) => void;

// In ModelStage, pass down to PulseDot:
onStudioDotDrop={(dotId, top, left) => onStudioDotDrop(dotId, top, left)}

// In PulseDot handleDragEnd, when isEditMode (studio dot drag):
// existing path: onDotDrop(text)  — keep for non-studio edit mode toast
// new studio path: if studioMode, call onStudioDotDrop(item.id, y, x) with % values
```

This means the dot drag already works mechanically — we just route the output to state instead of (or in addition to) the toast.

### 4h — Render in CollectionOverlay JSX

```tsx
return (
  <div ref={containerRef} className="absolute inset-0 z-20" style={{ pointerEvents: active ? "auto" : "none" }}>

    {/* Studio Inspector — fixed left sidebar */}
    {isStudioMode && (
      <StudioInspector
        slots={studioSlots}
        selectedId={selectedModelId}
        onUpdateSlot={updateSlot}
        onUpdateDot={updateDot}
        onAddDot={addDot}
        onRemoveDot={removeDot}
        onSwapImage={swapImage}
        onRemoveSlot={removeSlot}
        onCopyCode={copyCode}
        copyConfirm={copyConfirm}
      />
    )}

    {/* Models — always iterate MODEL_INVENTORY for the raw ModelSlot shape;
        look up the matching StudioSlot by id for studio overrides */}
    {MODEL_INVENTORY.map((slot, index) => (
      <ModelStage
        key={slot.id}
        slot={slot}
        index={index}
        revealed={revealed}
        isEditMode={isEditMode && !isStudioMode}
        isStudioMode={isStudioMode}
        studioSlot={isStudioMode ? studioSlots.find((s) => s.id === slot.id) : undefined}
        isSelected={selectedModelId === slot.id}
        onSelect={() => setSelectedModelId(slot.id)}
        onDotDrop={handleDotDrop}
        onModelDragEnd={handleModelDragEnd}
        onStudioDotDrop={(dotId, topPct, leftPct) => updateDot(slot.id, dotId, { topPct, leftPct })}
        onUpdateStudioSlot={updateSlot}
      />
    ))}

    {/* Toggle button */}
    {active && (
      <button
        className="fixed bottom-6 right-6 z-[201] text-[9px] tracking-widest uppercase px-4 py-2.5 transition-colors duration-300 pointer-events-auto"
        style={{
          border: `1px solid ${isStudioMode ? "#D4B896" : "rgba(255,255,255,0.2)"}`,
          color: isStudioMode ? "#D4B896" : "rgba(255,255,255,0.4)",
          background: "rgba(0,0,0,0.8)",
          backdropFilter: "blur(8px)",
        }}
        onClick={() => (isStudioMode ? exitStudio() : enterStudio())}
      >
        {isStudioMode ? "✕  Exit Studio" : "⊙  Studio Mode"}
      </button>
    )}

    {/* Toast coordinates (existing) */}
    ...
  </div>
);
```

- [ ] Make all the above changes to `CollectionOverlay.tsx`
- [ ] Verify the app compiles (`npm run dev` — check terminal for TS errors)
- [ ] Commit: `git commit -m "feat(studio): wire full studio mode into CollectionOverlay"`

---

## Task 5: Final Polish + Bug Fixes

- [ ] Ensure clicking a model in Studio Mode selects it (not drags it on first click)
  - Use `dragThreshold` or `onClick` guard: only call `onSelect` if drag distance < 5px
- [ ] Ensure dots in Studio Mode use inline `top`/`left` styles from `studioSlot.dots`, not Tailwind class strings
- [ ] Test dot drag in Studio Mode — positions should update in Inspector in real-time
- [ ] Test Copy Layout Code — paste output should be valid TypeScript you can drop into the file
- [ ] Verify normal (non-studio) mode still works identically after changes
- [ ] Commit: `git commit -m "feat(studio): polish — click-select guard, dot sync, export validation"`

---

## Notes / Edge Cases

- **Right-positioned models**: `vault-model` and `rack-model` use `right-[X%]` in Tailwind. The parser converts these to approximate `left` values. After first drag-and-export, all models will use `left` positioning. This is intentional — the export standardizes on `left`/`bottom`.
- **Studio state resets on exit**: Exiting Studio Mode discards unsaved changes. The "Copy Layout Code" button is the save mechanism — by design.
- **Dot drag vs. numeric input**: Both update the same `studioSlot.dots[].topPct/leftPct` state — they're in sync automatically.
- **Scale handle direction**: Dragging right or up increases scale; dragging left or down decreases. This matches video game control conventions.
- **z-index layering**: Inspector is `z-[200]`, studio toggle is `z-[201]` (above inspector), models stay at their existing zIndex values.
