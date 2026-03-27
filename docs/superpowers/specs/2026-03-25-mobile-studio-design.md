# Mobile Studio UX — Design Spec

**Goal:** Make Studio Mode usable on mobile — fix the sidebar covering the bar background, add a collapsible sidebar with a pill toggle, compact responsive layout, and touch-friendly +/− controls.

**Architecture:** All changes are isolated to `StudioInspector.tsx`. The sidebar becomes a `motion.div` with an `x` animation. A `sidebarOpen` boolean state drives open/closed. Width is responsive (`min(85vw, 300px)`). Internal paddings compress on mobile. `NumInput` gets flanking `−`/`+` tap buttons on small screens. No changes to `Portal.tsx`, `PortalBackground.tsx`, or `CollectionOverlay.tsx` — the background is already correct; the sidebar was just blocking it.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4, Framer Motion (`motion.div`, `animate`).

**Import required in StudioInspector.tsx:** `import { motion } from "framer-motion";` — Framer Motion is already a project dependency (used in CollectionOverlay.tsx) but is not currently imported in StudioInspector. No package install needed.

---

## 1. Background Issue

**Root cause:** On a 375px iPhone, the 300px fixed-width sidebar fills 80% of the screen. The bar background (`inside-store-tall.png`) is present and correct — it was simply hidden behind the sidebar. No changes needed to background files.

**Fix:** Responsive sidebar width (see Section 2) restores full background visibility.

---

## 2. Responsive Sidebar Width

The sidebar root element changes from a plain `div` to a `motion.div` (Framer Motion). Width is calculated as:

```ts
const SIDEBAR_WIDTH = Math.min(window.innerWidth * 0.85, 300);
```

This cap means:
- iPhone 14 (390px) → 331px → capped at **300px** (same as desktop)
- iPhone SE (375px) → 318px → capped at **300px**
- Smaller devices (<354px) → **85vw** (fluid)

For simplicity, use a CSS approach with `clamp`:

```tsx
style={{ width: "min(85vw, 300px)" }}
```

Padding compression on mobile: sections that currently use `px-5` switch to `px-3` on screens `< 768px`. Implement via inline style conditioned on a `isMobile` boolean (see Section 5).

**Sidebar background (mobile):** On mobile, replace the near-opaque `rgba(8,8,8,0.97)` with `rgba(0,0,0,0.6)` + `backdropFilter: "blur(16px)"`. On desktop the existing opaque style is preserved. This lets the bar room show through the controls — the aesthetic the founder wants.

---

## 3. Collapsible Sidebar with Pill Toggle

### State
```ts
const [sidebarOpen, setSidebarOpen] = useState(true);
```

### Animation
Wrap the existing sidebar `div` in a `motion.div`:

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
  {/* existing sidebar content */}

  {/* Toggle tab — always visible */}
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
```

### Toggle tab design
- `md:hidden` — invisible on desktop
- Positioned `absolute right-0 translate-x-full` (right edge of sidebar, peeking out)
- 36px wide × 56px tall — thumb-friendly, vertically centred on the sidebar
- Pill-shaped on the right side (`borderRadius: "0 8px 8px 0"`)
- `border-left: none` — seamlessly connects to sidebar edge
- Semi-translucent: `rgba(0,0,0,0.55)` + `blur(12px)` — matches sidebar aesthetic
- `‹` when open, `›` when closed (Unicode single chevrons, 14px)

When the sidebar is fully off-screen (`x: -100%`), the toggle tab rides with it and peeks from the left edge of the viewport — the only visible Studio UI. One thumb tap restores the sidebar.

---

## 4. Touch-Friendly NumInput

The existing `NumInput` component (`type="number"`, `py-1`) is difficult to use on mobile. On screens `< 768px`, flanking `−` / `+` buttons appear on either side of the number field.

```tsx
function NumInput({ value, step = 0.5, min = -150, max = 250, onChange, isMobile }: ...) {
  return isMobile ? (
    <div className="flex items-center gap-1 w-full">
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        style={{
          width: 32, height: 32, flexShrink: 0,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 4, color: "white", fontSize: 16,
        }}
      >−</button>
      <input
        type="number"
        className="flex-1 text-[11px] text-white/75 text-center py-2 px-1 rounded-sm min-w-0"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}
        value={step < 1 ? value.toFixed(2) : Math.round(value)}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
        }}
      />
      <button
        onClick={() => onChange(Math.min(max, value + step))}
        style={{
          width: 32, height: 32, flexShrink: 0,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 4, color: "white", fontSize: 16,
        }}
      >+</button>
    </div>
  ) : (
    /* existing desktop number input unchanged */
  );
}
```

`isMobile` is passed down from the parent component (see Section 5).

---

## 5. useMobile Hook

A simple hook to detect viewport width, used to toggle compact padding, background style, and NumInput layout:

```ts
function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}
```

Used inside `StudioInspector`:
```ts
const isMobile = useMobile();
const px = isMobile ? 3 : 5; // compact padding multiplier
```

Section paddings: `px-${px}` (3 on mobile, 5 on desktop).

---

## 6. Scope Boundaries

- **Only file modified:** `src/components/studio/StudioInspector.tsx`
- **No changes to:** `CollectionOverlay.tsx`, `Portal.tsx`, `PortalBackground.tsx`, `globals.css`, `studioTypes.ts`, `studioUtils.ts`
- The `sidebarOpen` state lives entirely within `StudioInspector` — no prop changes to `CollectionOverlay`
- Desktop behavior is **unchanged**: toggle tab is `md:hidden`, width caps at 300px, background stays opaque

---

## 7. Edge Cases

- **Sidebar starts open** on Studio entry (`sidebarOpen: true`) — same as current behavior
- **Orientation change:** `useMobile` re-checks on resize; sidebar width recalculates via CSS `min(85vw, 300px)` automatically
- **Desktop:** `md:hidden` on toggle tab means zero desktop impact. Framer Motion `animate={{ x: 0 }}` stays locked on desktop since `sidebarOpen` defaults `true` and there's no toggle button to change it
- **Spring animation overshoot:** stiffness 300 / damping 30 gives a snappy, slightly springy feel appropriate for a luxury brand — not bouncy
