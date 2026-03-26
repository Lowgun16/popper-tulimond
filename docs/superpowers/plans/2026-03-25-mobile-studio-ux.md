# Mobile Studio UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Studio sidebar usable on mobile by making it collapsible with a pill toggle, responsive width, translucent mobile background, and touch-friendly NumInput controls.

**Architecture:** All changes are isolated to a single file: `src/components/studio/StudioInspector.tsx`. The root sidebar `div` becomes a Framer Motion `motion.div` with a `sidebarOpen` boolean state that animates `x` between `0` and `"-100%"`. A `useMobile()` hook (defined inside the same file) drives responsive behavior: compact padding, translucent background, and NumInput ± buttons.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4, Framer Motion (`motion`, `motion.div` — already a project dep, not yet imported in this file).

---

## File Map

| File | Change |
|------|--------|
| `src/components/studio/StudioInspector.tsx` | Only file modified. Add `motion` import, `useMobile` hook, `sidebarOpen` state, convert sidebar div to motion.div, add toggle tab, update NumInput, apply compact padding. |

No other files are touched. The `CollectionOverlay.tsx`, `Portal.tsx`, `PortalBackground.tsx`, `globals.css`, `studioTypes.ts`, and `studioUtils.ts` are **untouched**.

---

## Context for Implementer

The current `StudioInspector.tsx` renders the Studio sidebar as a plain `<div>` at line 78. The sidebar is `fixed left-0 top-0 bottom-0 z-[200]` with `width: 300`. On a 375px iPhone, this eats 80% of the screen. The background (the bar image) is physically there behind the sidebar — it just cannot be seen.

The fix: make the sidebar collapsible (slide fully off-screen on mobile) and narrow it to `min(85vw, 300px)` (still 300px on desktop/most phones, scales down for very small screens).

`NumInput` is defined at line 490. It needs an `isMobile` prop added — when true, render flanking `−` / `+` buttons instead of a bare number input.

Framer Motion is already installed (`framer-motion` package). It is used in `CollectionOverlay.tsx`. It is **not yet imported** in `StudioInspector.tsx`.

---

## Task 1: useMobile Hook + Framer Motion Import

**Files:**
- Modify: `src/components/studio/StudioInspector.tsx:1-5`

Add the Framer Motion import and define the `useMobile` hook inside the file (above the `StudioInspector` function).

- [ ] **Step 1: Add the `motion` import at the top of the file**

Replace the existing import block (lines 1-4) with:

```tsx
// src/components/studio/StudioInspector.tsx
"use client";
import React from "react";
import { motion } from "framer-motion";
import type { StudioSlot, StudioDot, ShadowConfig, AccessType } from "./studioTypes";
```

- [ ] **Step 2: Add the `useMobile` hook immediately before the `StudioInspector` function (before line 23)**

```tsx
function useMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}
```

- [ ] **Step 3: Verify the dev server still compiles**

```bash
cd /Users/logansorensen/Documents/FashionBrand && npm run build 2>&1 | tail -20
```

Expected: No TypeScript errors mentioning `motion` or `useMobile`. If framer-motion isn't found (unlikely), run `npm install framer-motion` first.

- [ ] **Step 4: Commit**

```bash
git add src/components/studio/StudioInspector.tsx
git commit -m "feat(studio): add useMobile hook + framer-motion import to StudioInspector"
```

---

## Task 2: Collapsible Motion Sidebar + Pill Toggle Tab

**Files:**
- Modify: `src/components/studio/StudioInspector.tsx:38-421` (the `StudioInspector` function body)

This task converts the sidebar `div` to a `motion.div`, adds `sidebarOpen` state, responsive styles, and the pill toggle tab.

- [ ] **Step 1: Add `sidebarOpen` state and derive `isMobile` inside `StudioInspector`**

After the existing state declarations (after line 46, before `handleSaveClick`), add:

```tsx
const isMobile = useMobile();
const [sidebarOpen, setSidebarOpen] = React.useState(true);
```

- [ ] **Step 2: Replace the root sidebar `<div>` open tag (lines 78–87) with a `motion.div`**

Old:
```tsx
    <div
      className="fixed left-0 top-0 bottom-0 z-[200] flex flex-col"
      style={{
        width: 300,
        background: "rgba(8,8,8,0.97)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(16px)",
        pointerEvents: "auto",   // explicit override — sidebar must never inherit pointer-events:none
      }}
    >
```

New:
```tsx
    <motion.div
      className="fixed left-0 top-0 bottom-0 z-[200] flex flex-col"
      animate={{ x: sidebarOpen ? 0 : "-100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{
        width: "min(85vw, 300px)",
        background: isMobile ? "rgba(0,0,0,0.6)" : "rgba(8,8,8,0.97)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(16px)",
        pointerEvents: "auto",
      }}
    >
```

- [ ] **Step 3: Replace the closing `</div>` of the sidebar root (line 420) with `</motion.div>`**

The closing tag at line 420 (just before the final `)`):

Old:
```tsx
    </div>
  );
}
```

New:
```tsx
      {/* ── Pill Toggle Tab — mobile only ── */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden absolute top-1/2 -translate-y-1/2 flex items-center justify-center"
        style={{
          right: -36,
          width: 36,
          height: 56,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderLeft: "none",
          borderRadius: "0 8px 8px 0",
          color: "rgba(255,255,255,0.7)",
          fontSize: 14,
        }}
      >
        {sidebarOpen ? "‹" : "›"}
      </button>
    </motion.div>
  );
}
```

- [ ] **Step 4: Verify the sidebar animates correctly in the browser**

Run `npm run dev`, open `http://localhost:3000` in browser devtools at 375px width, enter Studio Mode. Confirm:
- Sidebar renders at `min(85vw, 300px)` width
- Background is translucent (bar room visible behind sidebar)
- Pill toggle tab is visible on the right edge of the sidebar
- Tapping the toggle slides the sidebar off-screen (`x: -100%`) and then back

On desktop (≥768px): toggle tab is invisible (`md:hidden`), sidebar stays open, background stays opaque.

- [ ] **Step 5: Commit**

```bash
git add src/components/studio/StudioInspector.tsx
git commit -m "feat(studio): collapsible sidebar with pill toggle for mobile"
```

---

## Task 3: Touch-Friendly NumInput with ± Buttons

**Files:**
- Modify: `src/components/studio/StudioInspector.tsx:490-522` (NumInput), and all call sites

Add an `isMobile` prop to `NumInput`. When true, render flanking `−` and `+` buttons (32×32px) on either side of the number field.

- [ ] **Step 1: Update the `NumInput` component signature and implementation (lines 490–522)**

Replace the entire `NumInput` function:

```tsx
function NumInput({
  value,
  step = 0.5,
  min = -150,
  max = 250,
  onChange,
  isMobile = false,
}: {
  value: number;
  step?: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  isMobile?: boolean;
}) {
  const input = (
    <input
      type="number"
      className="flex-1 text-[11px] text-white/75 text-center py-2 px-1 rounded-sm min-w-0"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.09)",
        outline: "none",
      }}
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

  if (!isMobile) {
    return (
      <input
        type="number"
        className="w-full text-[11px] text-white/75 text-right py-1 px-2 rounded-sm"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.09)",
          outline: "none",
        }}
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

  const btnStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    flexShrink: 0,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 4,
    color: "white",
    fontSize: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div className="flex items-center gap-1 w-full">
      <button style={btnStyle} onClick={() => onChange(Math.max(min, value - step))}>−</button>
      {input}
      <button style={btnStyle} onClick={() => onChange(Math.min(max, value + step))}>+</button>
    </div>
  );
}
```

- [ ] **Step 2: Pass `isMobile` to every `NumInput` call site in the `StudioInspector` render**

`NumInput` is used in five places within the `StudioInspector` function body (Transform section: Left %, Bottom %, Scale, Z-Index) and in the `DotEditor` sub-component (Top %, Left %, and the six Shadow fields are in `StudioInspector` directly; Top%/Left% are in `DotEditor`).

For all `<NumInput` instances inside `StudioInspector`'s JSX (the Transform and Shadow sections), add `isMobile={isMobile}`:

```tsx
<NumInput
  value={selected.leftPct}
  onChange={(v) => onUpdateSlot(selected.id, { leftPct: v })}
  isMobile={isMobile}
/>
```

Apply the same `isMobile={isMobile}` prop to all other NumInput instances in the Transform and Shadow sections (Bottom %, Scale, Z-Index, Offset X, Offset Y, Scale W, Scale H, Opacity, Blur).

- [ ] **Step 3: Pass `isMobile` down to `DotEditor` so its NumInputs are also touch-friendly**

Update the `DotEditor` component signature to accept and forward `isMobile`:

```tsx
function DotEditor({
  dot,
  onUpdate,
  onRemove,
  isMobile = false,
}: {
  dot: StudioDot;
  onUpdate: (p: Partial<StudioDot>) => void;
  onRemove: () => void;
  isMobile?: boolean;
}) {
```

Update the two `NumInput` calls inside `DotEditor` (Top % and Left %) to include `isMobile={isMobile}`.

Update the `DotEditor` call site in the `selected.dots.map(...)` to pass `isMobile`:

```tsx
<DotEditor
  key={dot.id}
  dot={dot}
  isMobile={isMobile}
  onUpdate={(patch) => onUpdateDot(selected.id, dot.id, patch)}
  onRemove={() => onRemoveDot(selected.id, dot.id)}
/>
```

- [ ] **Step 4: Verify the build is clean**

```bash
cd /Users/logansorensen/Documents/FashionBrand && npm run build 2>&1 | tail -20
```

Expected: No TypeScript errors. If there's a prop mismatch on `DotEditor`, fix the type signature.

- [ ] **Step 5: Verify touch controls in browser at 375px viewport**

In Studio Mode with a character selected, the Transform and Shadow number fields should show `−` / `+` flanking buttons. On desktop (≥768px) they should still look like plain number inputs.

- [ ] **Step 6: Commit**

```bash
git add src/components/studio/StudioInspector.tsx
git commit -m "feat(studio): touch-friendly NumInput with ± buttons on mobile"
```

---

## Task 4: Compact Mobile Padding

**Files:**
- Modify: `src/components/studio/StudioInspector.tsx` — header, roster, body, and footer sections

Switch paddings from hardcoded Tailwind `px-5` / `px-4` classes to inline style values driven by `isMobile`. This compresses the sidebar on narrow screens.

- [ ] **Step 1: Derive the padding value at the top of `StudioInspector`'s render (after the `isMobile` line)**

Add immediately after `const isMobile = useMobile();`:

```tsx
const sidePad = isMobile ? 12 : 20; // px-3 on mobile, px-5 on desktop
```

- [ ] **Step 2: Apply `sidePad` to the Header section (currently `px-5 pt-5 pb-4` at ~line 89)**

Change:
```tsx
        className="px-5 pt-5 pb-4 flex-shrink-0"
```

To (remove `px-5`, add inline paddingLeft/paddingRight):
```tsx
        className="pt-5 pb-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingLeft: sidePad, paddingRight: sidePad }}
```

Note: this section already has an inline `style` with `borderBottom`. Merge `paddingLeft`/`paddingRight` into that style object.

- [ ] **Step 3: Apply `sidePad` to the Character Roster section (currently `px-4 py-3`)**

Change:
```tsx
        className="px-4 py-3 flex-shrink-0"
```

To:
```tsx
        className="py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingLeft: sidePad, paddingRight: sidePad }}
```

- [ ] **Step 4: Apply `sidePad` to the Body section inner div (currently `px-5 py-4` at ~line 149)**

Change:
```tsx
          <div className="px-5 py-4 flex flex-col gap-6">
```

To:
```tsx
          <div className="py-4 flex flex-col gap-6" style={{ paddingLeft: sidePad, paddingRight: sidePad }}>
```

- [ ] **Step 5: Apply `sidePad` to the Copy Code footer (currently `px-5 py-4`)**

Change:
```tsx
        className="px-5 py-4 flex-shrink-0"
```

To:
```tsx
        className="py-4 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingLeft: sidePad, paddingRight: sidePad }}
```

- [ ] **Step 6: Apply `sidePad` to the Save/Publish footer (currently `px-4 pb-5 pt-3`)**

Change:
```tsx
        className="flex-shrink-0 px-4 pb-5 pt-3 flex flex-col gap-2"
```

To:
```tsx
        className="flex-shrink-0 pb-5 pt-3 flex flex-col gap-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingLeft: sidePad, paddingRight: sidePad }}
```

- [ ] **Step 7: Final build check**

```bash
cd /Users/logansorensen/Documents/FashionBrand && npm run build 2>&1 | tail -20
```

Expected: Clean build with no errors.

- [ ] **Step 8: Visual check at 375px and 1440px**

At 375px: sidebar is narrower, controls breathe more, bar room visible behind translucent sidebar.
At 1440px: no visible change from baseline — same paddings, opaque background, no toggle tab.

- [ ] **Step 9: Commit**

```bash
git add src/components/studio/StudioInspector.tsx
git commit -m "feat(studio): compact mobile padding (px-3 on mobile, px-5 on desktop)"
```
