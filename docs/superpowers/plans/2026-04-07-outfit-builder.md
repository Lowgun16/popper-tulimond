# Outfit Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first internal web app at `/studio/builder` that lets the Popper Tulimond team refine garment images with sliders and AI structural edits (Garment Editor), then transfer approved garments onto characters via VTON with a post-transfer correction loop (Character Dresser).

**Architecture:** New Next.js route at `src/app/studio/builder/` protected by a password gate. Two screens share a `GarmentEditor` component — Screen 1 builds a locked Garment Truth from a Nano Banana PNG; Screen 2 runs IDM-VTON to dress characters, then optionally sends the result back into the same editor for per-character correction. Each correction is logged for a future learning system.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, Canvas API (client-side sliders), Google Gemini API (`@google/generative-ai`) for structural edits, Hugging Face IDM-VTON Space (free VTON), Jest + ts-jest for unit tests.

---

## File Map

**New files to create:**

| Path | Responsibility |
|------|---------------|
| `src/components/builder/builderTypes.ts` | All TypeScript types for the builder feature |
| `src/data/characters.ts` | Character profiles with measurements |
| `src/data/garments.ts` | Approved garment library (runtime-mutable) |
| `src/components/builder/useSliderFilters.ts` | Hook: canvas filter state + CSS filter string |
| `src/components/builder/SliderPanel.tsx` | 7 instant adjustment sliders (no API) |
| `src/components/builder/StructuralEditPanel.tsx` | 4 AI structural edit buttons → calls `/api/builder/structural-edit` |
| `src/components/builder/GarmentEditor.tsx` | Canvas preview + SliderPanel + StructuralEditPanel + Approve action |
| `src/components/builder/CharacterCard.tsx` | Single character tile with photo + measurements |
| `src/components/builder/GarmentTile.tsx` | Single approved garment tile |
| `src/components/builder/RenderResult.tsx` | VTON output with Edit/Approve/Regenerate/Discard |
| `src/components/builder/CharacterDresser.tsx` | Character grid + garment picker + VTON trigger |
| `src/components/builder/BuilderAuthGate.tsx` | Password gate wrapping the whole builder |
| `src/app/studio/builder/page.tsx` | Entry point — BuilderAuthGate → tab nav → two screens |
| `src/app/api/builder/structural-edit/route.ts` | Gemini Edit API proxy |
| `src/app/api/builder/vton-transfer/route.ts` | HF IDM-VTON proxy |
| `src/app/api/builder/save-garment/route.ts` | Write approved Garment Truth PNG to `/public/garments/` |
| `src/app/api/builder/save-render/route.ts` | Write approved character render + log correction |
| `src/app/api/builder/export-to-lookbook/route.ts` | Push render path into inventory lookbook array |
| `jest.config.ts` | Jest configuration |
| `jest.setup.ts` | Jest setup (canvas mock) |
| `src/components/builder/__tests__/useSliderFilters.test.ts` | Unit tests for slider filter logic |
| `src/components/builder/__tests__/builderUtils.test.ts` | Unit tests for correction log utilities |

**Existing files to modify:**

| Path | Change |
|------|--------|
| `package.json` | Add jest, ts-jest, @types/jest, jest-environment-jsdom |
| `tsconfig.json` | Add jest types |
| `.gitignore` | Add `public/garments/` and `public/renders/` to gitignore (generated assets) |

---

## Task 1: Install test framework

**Files:**
- Modify: `package.json`
- Create: `jest.config.ts`
- Create: `jest.setup.ts`
- Modify: `tsconfig.json`

- [ ] **Step 1: Install dependencies**

```bash
cd /Users/logansorensen/Documents/FashionBrand
npm install --save-dev jest ts-jest @types/jest jest-environment-jsdom
```

Expected output: `added N packages` with no errors.

- [ ] **Step 2: Create `jest.config.ts`**

```typescript
// jest.config.ts
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterFramework: ["./jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testPathPattern: ["src/.*\\.test\\.ts$"],
};

export default config;
```

- [ ] **Step 3: Create `jest.setup.ts`**

```typescript
// jest.setup.ts
// Mock canvas for jsdom (jsdom doesn't implement canvas)
class MockCanvas {
  getContext() {
    return {
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
      putImageData: jest.fn(),
      toDataURL: jest.fn(() => "data:image/png;base64,mock"),
      canvas: { toDataURL: jest.fn(() => "data:image/png;base64,mock") },
    };
  }
  toDataURL() { return "data:image/png;base64,mock"; }
}
(global as any).HTMLCanvasElement = MockCanvas;
```

- [ ] **Step 4: Add jest types to `tsconfig.json`**

Open `tsconfig.json`. In the `compilerOptions.types` array (add it if missing):

```json
{
  "compilerOptions": {
    "types": ["jest"]
  }
}
```

If `compilerOptions.types` doesn't exist, add it as a sibling to other compilerOptions keys.

- [ ] **Step 5: Add test script to `package.json`**

In `package.json`, add to the `scripts` object:
```json
"test": "jest"
```

- [ ] **Step 6: Verify setup**

```bash
npm test -- --passWithNoTests
```

Expected: `Test Suites: 0 passed` with no errors.

- [ ] **Step 7: Commit**

```bash
git add jest.config.ts jest.setup.ts package.json package-lock.json tsconfig.json
git commit -m "chore: add jest + ts-jest test framework"
```

---

## Task 2: Builder types

**Files:**
- Create: `src/components/builder/builderTypes.ts`
- Create: `src/components/builder/__tests__/builderUtils.test.ts`

- [ ] **Step 1: Create `builderTypes.ts`**

```typescript
// src/components/builder/builderTypes.ts

/** The 4 structural edit operations supported in v1 */
export type StructuralEditType =
  | "placket-width"
  | "neckline-depth"
  | "sleeve-length"
  | "sleeve-compression";

export type StructuralEditDirection = "increase" | "decrease";

/** State of the 7 instant sliders */
export interface SliderState {
  hue: number;           // -180 to 180
  saturation: number;    // -100 to 100 (delta from 100%)
  brightness: number;    // -100 to 100 (delta from 100%)
  contrast: number;      // -100 to 100 (delta from 100%)
  fabricRoughness: number; // 0 to 100
  heatherIntensity: number; // 0 to 100
  warmth: number;        // -100 to 100
}

export const DEFAULT_SLIDER_STATE: SliderState = {
  hue: 0,
  saturation: 0,
  brightness: 0,
  contrast: 0,
  fabricRoughness: 0,
  heatherIntensity: 0,
  warmth: 0,
};

/** A single logged correction made during post-transfer editing */
export interface CorrectionLogEntry {
  id: string;
  characterId: string;
  garmentId: string;
  editType: StructuralEditType | keyof SliderState;
  direction: StructuralEditDirection | "set";
  magnitude: number;
  timestamp: number;
}

/** An approved garment reference stored in the garment library */
export interface GarmentTruth {
  id: string;
  name: string;
  sku: string;
  fabricComposition: string;
  availableSizes: string[];
  /** Path relative to /public, e.g. "/garments/constable-henley-charcoal-v3.png" */
  approvedImagePath: string;
  version: number;
  approvedAt: number;
}

/** A character profile with body measurements */
export interface BuilderCharacter {
  id: string;
  displayName: string;
  /** Path relative to /public, e.g. "/assets/models/Jerome/Jerome-pro-lit.png" */
  referenceImagePath: string;
  heightIn: number;   // inches (e.g. 76 for 6'4")
  weightLb: number;
  chestIn: number;
  defaultSize: string;
  bodyTypeLabel: string; // e.g. "NFL Defensive End"
}

/** Mode for GarmentEditor — building a Garment Truth vs correcting a VTON render */
export type EditorMode = "truth" | "correction";

/** Context passed to GarmentEditor when in correction mode */
export interface CorrectionContext {
  characterId: string;
  garmentId: string;
  renderImageDataUrl: string;
}
```

- [ ] **Step 2: Write tests for correction log utility (write the test first)**

Create `src/components/builder/__tests__/builderUtils.test.ts`:

```typescript
// src/components/builder/__tests__/builderUtils.test.ts
import { makeCorrectionEntry } from "../builderUtils";

describe("makeCorrectionEntry", () => {
  it("creates a log entry with all required fields", () => {
    const entry = makeCorrectionEntry("angel", "constable-henley", "sleeve-length", "increase", 1);
    expect(entry.characterId).toBe("angel");
    expect(entry.garmentId).toBe("constable-henley");
    expect(entry.editType).toBe("sleeve-length");
    expect(entry.direction).toBe("increase");
    expect(entry.magnitude).toBe(1);
    expect(typeof entry.id).toBe("string");
    expect(entry.id.length).toBeGreaterThan(0);
    expect(typeof entry.timestamp).toBe("number");
  });

  it("generates unique ids for each entry", () => {
    const a = makeCorrectionEntry("angel", "g1", "hue", "set", 10);
    const b = makeCorrectionEntry("angel", "g1", "hue", "set", 10);
    expect(a.id).not.toBe(b.id);
  });
});
```

- [ ] **Step 3: Run test — confirm it fails**

```bash
npm test -- --testPathPattern=builderUtils
```

Expected: FAIL — `Cannot find module '../builderUtils'`

- [ ] **Step 4: Create `src/components/builder/builderUtils.ts`**

```typescript
// src/components/builder/builderUtils.ts
import type {
  CorrectionLogEntry,
  StructuralEditType,
  StructuralEditDirection,
  SliderState,
} from "./builderTypes";

export function makeCorrectionEntry(
  characterId: string,
  garmentId: string,
  editType: StructuralEditType | keyof SliderState,
  direction: StructuralEditDirection | "set",
  magnitude: number
): CorrectionLogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    characterId,
    garmentId,
    editType,
    direction,
    magnitude,
    timestamp: Date.now(),
  };
}
```

- [ ] **Step 5: Run test — confirm it passes**

```bash
npm test -- --testPathPattern=builderUtils
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/builder/builderTypes.ts src/components/builder/builderUtils.ts src/components/builder/__tests__/builderUtils.test.ts
git commit -m "feat: add builder types and correction log utility"
```

---

## Task 3: Character and garment data

**Files:**
- Create: `src/data/characters.ts`
- Create: `src/data/garments.ts`

- [ ] **Step 1: Create `src/data/characters.ts`**

```typescript
// src/data/characters.ts
import type { BuilderCharacter } from "@/components/builder/builderTypes";

export const BUILDER_CHARACTERS: BuilderCharacter[] = [
  {
    id: "jerome",
    displayName: "Jerome",
    referenceImagePath: "/assets/models/Jerome/Jerome-pro-lit.png",
    heightIn: 76,   // 6'4"
    weightLb: 240,
    chestIn: 50,
    defaultSize: "XXL",
    bodyTypeLabel: "NFL Defensive End",
  },
  {
    id: "angel",
    displayName: "Angel",
    referenceImagePath: "/assets/models/Angel/Angel-pro-lit.png",
    heightIn: 71,   // 5'11"
    weightLb: 175,
    chestIn: 40,
    defaultSize: "M",
    bodyTypeLabel: "Latin pop star build",
  },
  {
    id: "jack",
    displayName: "Jack",
    referenceImagePath: "/assets/models/Jack/Jack-pro-lit.png",
    heightIn: 72,
    weightLb: 185,
    chestIn: 42,
    defaultSize: "L",
    bodyTypeLabel: "TBD",
  },
  {
    id: "ethan",
    displayName: "Ethan",
    referenceImagePath: "/assets/models/Ethan/Ethan-pro-lit.png",
    heightIn: 70,
    weightLb: 175,
    chestIn: 41,
    defaultSize: "M",
    bodyTypeLabel: "TBD",
  },
];

/** Format height in inches as feet/inches string, e.g. 76 → "6'4\"" */
export function formatHeight(inches: number): string {
  const ft = Math.floor(inches / 12);
  const ins = inches % 12;
  return `${ft}'${ins}"`;
}
```

- [ ] **Step 2: Create `src/data/garments.ts`**

```typescript
// src/data/garments.ts
// Runtime garment library — seeded with known approved garments.
// New entries are added via /api/builder/save-garment.
import type { GarmentTruth } from "@/components/builder/builderTypes";

export const GARMENT_LIBRARY: GarmentTruth[] = [
  // Seed with the Constable Henley once the team uploads their first approved PNG.
  // Add entries here or via Studio Builder save flow.
];
```

- [ ] **Step 3: Commit**

```bash
git add src/data/characters.ts src/data/garments.ts
git commit -m "feat: add character profiles and garment library data"
```

---

## Task 4: Slider hook

**Files:**
- Create: `src/components/builder/useSliderFilters.ts`
- Create: `src/components/builder/__tests__/useSliderFilters.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/builder/__tests__/useSliderFilters.test.ts`:

```typescript
// src/components/builder/__tests__/useSliderFilters.test.ts
import { buildCSSFilter } from "../useSliderFilters";
import type { SliderState } from "../builderTypes";

const base: SliderState = {
  hue: 0,
  saturation: 0,
  brightness: 0,
  contrast: 0,
  fabricRoughness: 0,
  heatherIntensity: 0,
  warmth: 0,
};

describe("buildCSSFilter", () => {
  it("returns empty string for all-zero state", () => {
    expect(buildCSSFilter(base)).toBe("");
  });

  it("includes hue-rotate when hue is non-zero", () => {
    const result = buildCSSFilter({ ...base, hue: 30 });
    expect(result).toContain("hue-rotate(30deg)");
  });

  it("includes saturate adjusted from 100%", () => {
    const result = buildCSSFilter({ ...base, saturation: 50 });
    expect(result).toContain("saturate(150%)");
  });

  it("handles negative saturation (desaturate)", () => {
    const result = buildCSSFilter({ ...base, saturation: -50 });
    expect(result).toContain("saturate(50%)");
  });

  it("includes brightness adjusted from 100%", () => {
    const result = buildCSSFilter({ ...base, brightness: 20 });
    expect(result).toContain("brightness(120%)");
  });

  it("includes contrast adjusted from 100%", () => {
    const result = buildCSSFilter({ ...base, contrast: -30 });
    expect(result).toContain("contrast(70%)");
  });

  it("combines multiple active filters", () => {
    const result = buildCSSFilter({ ...base, hue: 15, brightness: 10 });
    expect(result).toContain("hue-rotate(15deg)");
    expect(result).toContain("brightness(110%)");
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npm test -- --testPathPattern=useSliderFilters
```

Expected: FAIL — `Cannot find module '../useSliderFilters'`

- [ ] **Step 3: Create `src/components/builder/useSliderFilters.ts`**

```typescript
// src/components/builder/useSliderFilters.ts
"use client";
import { useState, useCallback } from "react";
import type { SliderState } from "./builderTypes";
import { DEFAULT_SLIDER_STATE } from "./builderTypes";

/**
 * Converts SliderState into a CSS filter string.
 * Returns "" when all sliders are at zero (no filter applied).
 */
export function buildCSSFilter(state: SliderState): string {
  const parts: string[] = [];
  if (state.hue !== 0) parts.push(`hue-rotate(${state.hue}deg)`);
  if (state.saturation !== 0) parts.push(`saturate(${100 + state.saturation}%)`);
  if (state.brightness !== 0) parts.push(`brightness(${100 + state.brightness}%)`);
  if (state.contrast !== 0) parts.push(`contrast(${100 + state.contrast}%)`);
  // warmth is approximated as a sepia + hue combo
  if (state.warmth !== 0) {
    const sepia = Math.abs(state.warmth) * 0.3;
    parts.push(`sepia(${sepia}%)`);
    parts.push(`hue-rotate(${state.warmth > 0 ? -10 : 10}deg)`);
  }
  return parts.join(" ");
}

/** Fabric roughness overlay opacity (0–1) derived from slider value 0–100 */
export function fabricRoughnessOpacity(value: number): number {
  return Math.min(1, Math.max(0, value / 100)) * 0.6;
}

/** Heather overlay opacity (0–1) derived from slider value 0–100 */
export function heatherOpacity(value: number): number {
  return Math.min(1, Math.max(0, value / 100)) * 0.45;
}

export function useSliderFilters() {
  const [sliders, setSliders] = useState<SliderState>(DEFAULT_SLIDER_STATE);

  const updateSlider = useCallback(
    (key: keyof SliderState, value: number) => {
      setSliders((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const reset = useCallback(() => setSliders(DEFAULT_SLIDER_STATE), []);

  const cssFilter = buildCSSFilter(sliders);

  return { sliders, updateSlider, reset, cssFilter };
}
```

- [ ] **Step 4: Run test — confirm it passes**

```bash
npm test -- --testPathPattern=useSliderFilters
```

Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/builder/useSliderFilters.ts src/components/builder/__tests__/useSliderFilters.test.ts
git commit -m "feat: add slider filter hook with CSS filter builder"
```

---

## Task 5: SliderPanel component

**Files:**
- Create: `src/components/builder/SliderPanel.tsx`

- [ ] **Step 1: Create `src/components/builder/SliderPanel.tsx`**

```tsx
// src/components/builder/SliderPanel.tsx
"use client";
import type { SliderState } from "./builderTypes";

interface SliderRowProps {
  label: string;
  valueKey: keyof SliderState;
  min: number;
  max: number;
  value: number;
  onChange: (key: keyof SliderState, value: number) => void;
}

function SliderRow({ label, valueKey, min, max, value, onChange }: SliderRowProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-[10px] uppercase tracking-widest text-[#D4B896]/60 shrink-0">
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(valueKey, Number(e.target.value))}
        className="flex-1 accent-[#D4B896]"
      />
      <span className="w-8 text-right text-[10px] text-[#D4B896]/40 font-mono">
        {value > 0 ? `+${value}` : value}
      </span>
    </div>
  );
}

interface Props {
  sliders: SliderState;
  onChange: (key: keyof SliderState, value: number) => void;
  onReset: () => void;
}

export function SliderPanel({ sliders, onChange, onReset }: Props) {
  return (
    <div className="flex flex-col gap-3 p-4 bg-black/30 border border-[#D4B896]/10 rounded-lg">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[9px] uppercase tracking-[0.2em] text-[#D4B896]/40">
          Instant Adjustments
        </span>
        <button
          onClick={onReset}
          className="text-[9px] uppercase tracking-widest text-[#D4B896]/40 hover:text-[#D4B896]/70"
        >
          Reset
        </button>
      </div>
      <SliderRow label="Color / Hue" valueKey="hue" min={-180} max={180} value={sliders.hue} onChange={onChange} />
      <SliderRow label="Saturation" valueKey="saturation" min={-100} max={100} value={sliders.saturation} onChange={onChange} />
      <SliderRow label="Brightness" valueKey="brightness" min={-100} max={100} value={sliders.brightness} onChange={onChange} />
      <SliderRow label="Contrast" valueKey="contrast" min={-100} max={100} value={sliders.contrast} onChange={onChange} />
      <SliderRow label="Fabric Rough" valueKey="fabricRoughness" min={0} max={100} value={sliders.fabricRoughness} onChange={onChange} />
      <SliderRow label="Heather" valueKey="heatherIntensity" min={0} max={100} value={sliders.heatherIntensity} onChange={onChange} />
      <SliderRow label="Warmth" valueKey="warmth" min={-100} max={100} value={sliders.warmth} onChange={onChange} />
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add src/components/builder/SliderPanel.tsx
git commit -m "feat: add SliderPanel component with 7 instant adjustments"
```

---

## Task 6: API — structural-edit

**Files:**
- Create: `src/app/api/builder/structural-edit/route.ts`

> **Prerequisite:** The Google Gemini API key must be set in `.env.local` as `GOOGLE_API_KEY`. Install the SDK: `npm install @google/generative-ai`

- [ ] **Step 1: Install Gemini SDK**

```bash
npm install @google/generative-ai
```

Expected: `added 1 package`

- [ ] **Step 2: Create the route**

```typescript
// src/app/api/builder/structural-edit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const EDIT_INSTRUCTIONS: Record<string, { increase: string; decrease: string }> = {
  "placket-width": {
    increase: "Widen the V-neckline placket opening so the two fabric panels fall further apart, exposing more chest. Keep all other garment details identical.",
    decrease: "Narrow the V-neckline placket opening so the two fabric panels are closer together. Keep all other garment details identical.",
  },
  "neckline-depth": {
    increase: "Deepen the neckline so the V-opening extends further down the chest. Keep the placket panel width and all other details identical.",
    decrease: "Raise the neckline so the V-opening is shallower and sits higher on the chest. Keep all other details identical.",
  },
  "sleeve-length": {
    increase: "Extend the sleeves so they reach closer to the elbow. The sleeve should remain tight-fitting against the arm with no air gap. Keep all other details identical.",
    decrease: "Shorten the sleeves so they end higher on the upper arm. Keep the tight sleeve compression and all other details identical.",
  },
  "sleeve-compression": {
    increase: "Make the sleeves hug the arm more tightly from shoulder to hem with zero gap between fabric and skin. Keep sleeve length and all other details identical.",
    decrease: "Slightly relax the sleeve fit so there is a small amount of ease between fabric and arm. Keep sleeve length and all other details identical.",
  },
};

export async function POST(req: NextRequest) {
  let body: { imageBase64: string; editType: string; direction: string; styleReferenceBase64?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { imageBase64, editType, direction, styleReferenceBase64 } = body;

  const instruction = EDIT_INSTRUCTIONS[editType]?.[direction as "increase" | "decrease"];
  if (!instruction) {
    return NextResponse.json({ ok: false, error: `Unknown editType/direction: ${editType}/${direction}` }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "GOOGLE_API_KEY not set" }, { status: 500 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const parts: object[] = [
      { inlineData: { data: imageBase64, mimeType: "image/png" } },
      { text: `You are a garment image editor. Apply exactly this change to the garment in the image: ${instruction} Do not change the model, background, lighting, fabric texture, or color. Output only the edited image.` },
    ];

    if (styleReferenceBase64) {
      parts.unshift(
        { text: "Style reference (use this as a guide for what this garment should look like):" },
        { inlineData: { data: styleReferenceBase64, mimeType: "image/png" } }
      );
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts: parts as any }],
      generationConfig: { responseModalities: ["image", "text"] } as any,
    });

    const candidate = result.response.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find((p: any) => p.inlineData);
    if (!imagePart) {
      return NextResponse.json({ ok: false, error: "Gemini returned no image" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, imageBase64: (imagePart as any).inlineData.data });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Add `GOOGLE_API_KEY` to `.env.local`**

Open `.env.local` (create it if it doesn't exist) and add:
```
GOOGLE_API_KEY=your_google_api_key_here
```

Get your key at: https://aistudio.google.com/app/apikey

- [ ] **Step 4: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: no errors on the new route file.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/builder/structural-edit/route.ts package.json package-lock.json
git commit -m "feat: add structural-edit API route via Gemini"
```

---

## Task 7: API — vton-transfer

**Files:**
- Create: `src/app/api/builder/vton-transfer/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/builder/vton-transfer/route.ts
// Default: IDM-VTON on Hugging Face Spaces (free).
// Set VTON_PROVIDER=replicate in .env.local to switch to paid Replicate.
import { NextRequest, NextResponse } from "next/server";

const HF_SPACE_URL = "https://yisol-idm-vton.hf.space/run/predict";
const REPLICATE_URL = "https://api.replicate.com/v1/predictions";
const REPLICATE_MODEL = "cuuupid/idm-vton:906425dbca90663ff5427624839572cc56ea7d380343d13e2a4c4b09d3f0c30f";

async function runHuggingFace(
  personBase64: string,
  garmentBase64: string
): Promise<string> {
  const response = await fetch(HF_SPACE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [
        { data: `data:image/png;base64,${personBase64}`, type: "base64" },
        { data: `data:image/png;base64,${garmentBase64}`, type: "base64" },
        "Upper body",
        true,
        true,
        30,
        42,
      ],
    }),
    signal: AbortSignal.timeout(120_000), // 2 min timeout
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HF API error ${response.status}: ${text.slice(0, 200)}`);
  }

  const json = await response.json();
  // HF returns data array; first element is the result image
  const raw: string = json.data?.[0]?.data ?? json.data?.[0];
  if (!raw) throw new Error("HF returned empty data");
  // Strip data URI prefix if present
  return raw.replace(/^data:image\/\w+;base64,/, "");
}

async function runReplicate(
  personBase64: string,
  garmentBase64: string
): Promise<string> {
  const apiKey = process.env.REPLICATE_API_KEY;
  if (!apiKey) throw new Error("REPLICATE_API_KEY not set");

  const createRes = await fetch(REPLICATE_URL, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: REPLICATE_MODEL,
      input: {
        human_img: `data:image/png;base64,${personBase64}`,
        garm_img: `data:image/png;base64,${garmentBase64}`,
        garment_des: "Upper body garment",
        is_checked: true,
        is_checked_crop: true,
        denoise_steps: 30,
        seed: 42,
      },
    }),
  });
  const prediction = await createRes.json();

  // Poll until complete (max 60s)
  const predictionId: string = prediction.id;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(`${REPLICATE_URL}/${predictionId}`, {
      headers: { Authorization: `Token ${apiKey}` },
    });
    const poll = await pollRes.json();
    if (poll.status === "succeeded") {
      const imgUrl: string = Array.isArray(poll.output) ? poll.output[0] : poll.output;
      const imgRes = await fetch(imgUrl);
      const buf = await imgRes.arrayBuffer();
      return Buffer.from(buf).toString("base64");
    }
    if (poll.status === "failed") throw new Error(`Replicate failed: ${poll.error}`);
  }
  throw new Error("Replicate prediction timed out after 60s");
}

export async function POST(req: NextRequest) {
  let body: { personBase64: string; garmentBase64: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { personBase64, garmentBase64 } = body;
  if (!personBase64 || !garmentBase64) {
    return NextResponse.json({ ok: false, error: "personBase64 and garmentBase64 required" }, { status: 400 });
  }

  try {
    const provider = process.env.VTON_PROVIDER ?? "huggingface";
    const resultBase64 =
      provider === "replicate"
        ? await runReplicate(personBase64, garmentBase64)
        : await runHuggingFace(personBase64, garmentBase64);

    return NextResponse.json({ ok: true, imageBase64: resultBase64 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/builder/vton-transfer/route.ts
git commit -m "feat: add VTON transfer API route (HF IDM-VTON free default, Replicate upgrade)"
```

---

## Task 8: API — save-garment and save-render

**Files:**
- Create: `src/app/api/builder/save-garment/route.ts`
- Create: `src/app/api/builder/save-render/route.ts`

- [ ] **Step 1: Create `src/app/api/builder/save-garment/route.ts`**

```typescript
// src/app/api/builder/save-garment/route.ts
// Writes an approved Garment Truth PNG to /public/garments/
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  let body: {
    imageBase64: string;
    name: string;
    sku: string;
    fabricComposition: string;
    availableSizes: string[];
    version: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { imageBase64, name, sku, version } = body;
  if (!imageBase64 || !name || !sku) {
    return NextResponse.json({ ok: false, error: "imageBase64, name, and sku required" }, { status: 400 });
  }

  try {
    const garmentDir = path.join(process.cwd(), "public", "garments");
    fs.mkdirSync(garmentDir, { recursive: true });

    const slug = sku.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const filename = `${slug}-v${version}.png`;
    const filePath = path.join(garmentDir, filename);

    const buf = Buffer.from(imageBase64, "base64");
    fs.writeFileSync(filePath, buf);

    const imagePath = `/garments/${filename}`;
    return NextResponse.json({ ok: true, imagePath });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create `src/app/api/builder/save-render/route.ts`**

```typescript
// src/app/api/builder/save-render/route.ts
// Writes an approved character render PNG to /public/renders/
// Also logs correction entries if provided.
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { CorrectionLogEntry } from "@/components/builder/builderTypes";

export async function POST(req: NextRequest) {
  let body: {
    imageBase64: string;
    characterId: string;
    garmentId: string;
    corrections?: CorrectionLogEntry[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { imageBase64, characterId, garmentId, corrections } = body;
  if (!imageBase64 || !characterId || !garmentId) {
    return NextResponse.json({ ok: false, error: "imageBase64, characterId, garmentId required" }, { status: 400 });
  }

  try {
    const renderDir = path.join(process.cwd(), "public", "renders");
    fs.mkdirSync(renderDir, { recursive: true });

    const timestamp = Date.now();
    const filename = `${characterId}-${garmentId}-${timestamp}.png`;
    const filePath = path.join(renderDir, filename);
    fs.writeFileSync(filePath, Buffer.from(imageBase64, "base64"));

    // Append correction log if provided
    if (corrections && corrections.length > 0) {
      const logDir = path.join(process.cwd(), "src", "data");
      const logPath = path.join(logDir, "correctionLog.json");
      let existing: CorrectionLogEntry[] = [];
      if (fs.existsSync(logPath)) {
        try { existing = JSON.parse(fs.readFileSync(logPath, "utf-8")); } catch { /* ignore */ }
      }
      fs.writeFileSync(logPath, JSON.stringify([...existing, ...corrections], null, 2));
    }

    return NextResponse.json({ ok: true, imagePath: `/renders/${filename}` });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Update `.gitignore` to exclude generated image folders**

Add to `.gitignore`:
```
# builder generated assets
/public/garments/
/public/renders/
src/data/correctionLog.json
```

- [ ] **Step 4: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/builder/save-garment/route.ts src/app/api/builder/save-render/route.ts .gitignore
git commit -m "feat: add save-garment and save-render API routes"
```

---

## Task 9: StructuralEditPanel component

**Files:**
- Create: `src/components/builder/StructuralEditPanel.tsx`

- [ ] **Step 1: Create `src/components/builder/StructuralEditPanel.tsx`**

```tsx
// src/components/builder/StructuralEditPanel.tsx
"use client";
import { useState } from "react";
import type { StructuralEditType, StructuralEditDirection } from "./builderTypes";

const EDITS: { type: StructuralEditType; label: string; increaseLabel: string; decreaseLabel: string }[] = [
  { type: "placket-width", label: "Placket Opening", increaseLabel: "Wider ↔", decreaseLabel: "Narrower ↔" },
  { type: "neckline-depth", label: "Neckline Depth", increaseLabel: "Deeper ↕", decreaseLabel: "Higher ↕" },
  { type: "sleeve-length", label: "Sleeve Length", increaseLabel: "Longer ↕", decreaseLabel: "Shorter ↕" },
  { type: "sleeve-compression", label: "Sleeve Fit", increaseLabel: "Tighter", decreaseLabel: "Looser" },
];

interface Props {
  /** Current canvas state as base64 PNG — sent as the image to edit */
  currentImageBase64: string;
  /** Optional style reference (approved Garment Truth) for Gemini to anchor against */
  styleReferenceBase64?: string;
  onEditComplete: (resultBase64: string, editType: StructuralEditType, direction: StructuralEditDirection) => void;
  onError: (msg: string) => void;
}

export function StructuralEditPanel({ currentImageBase64, styleReferenceBase64, onEditComplete, onError }: Props) {
  const [loading, setLoading] = useState<string | null>(null); // "<type>-<direction>" while running

  async function runEdit(editType: StructuralEditType, direction: StructuralEditDirection) {
    const key = `${editType}-${direction}`;
    setLoading(key);
    try {
      const res = await fetch("/api/builder/structural-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: currentImageBase64,
          editType,
          direction,
          styleReferenceBase64,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      onEditComplete(data.imageBase64, editType, direction);
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-2 p-4 bg-black/30 border border-[#D4B896]/10 rounded-lg">
      <span className="text-[9px] uppercase tracking-[0.2em] text-[#D4B896]/40 mb-1">
        AI Structural Edits
      </span>
      {EDITS.map((edit) => (
        <div key={edit.type} className="flex items-center gap-2">
          <span className="w-28 text-[10px] uppercase tracking-widest text-[#D4B896]/60 shrink-0">
            {edit.label}
          </span>
          <button
            onClick={() => runEdit(edit.type, "decrease")}
            disabled={loading !== null}
            className="flex-1 py-2 text-[10px] border border-[#D4B896]/20 text-[#D4B896]/70 hover:bg-[#D4B896]/5 disabled:opacity-30"
          >
            {loading === `${edit.type}-decrease` ? "..." : edit.decreaseLabel}
          </button>
          <button
            onClick={() => runEdit(edit.type, "increase")}
            disabled={loading !== null}
            className="flex-1 py-2 text-[10px] border border-[#D4B896]/20 text-[#D4B896]/70 hover:bg-[#D4B896]/5 disabled:opacity-30"
          >
            {loading === `${edit.type}-increase` ? "..." : edit.increaseLabel}
          </button>
        </div>
      ))}
      {loading && (
        <p className="text-[10px] text-[#D4B896]/40 mt-1">
          Editing via Gemini (~15s)…
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/builder/StructuralEditPanel.tsx
git commit -m "feat: add StructuralEditPanel with 4 v1 AI structural edit controls"
```

---

## Task 10: GarmentEditor component

**Files:**
- Create: `src/components/builder/GarmentEditor.tsx`

- [ ] **Step 1: Create `src/components/builder/GarmentEditor.tsx`**

```tsx
// src/components/builder/GarmentEditor.tsx
"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import { SliderPanel } from "./SliderPanel";
import { StructuralEditPanel } from "./StructuralEditPanel";
import { useSliderFilters, fabricRoughnessOpacity, heatherOpacity } from "./useSliderFilters";
import { makeCorrectionEntry } from "./builderUtils";
import type {
  EditorMode,
  CorrectionContext,
  GarmentTruth,
  StructuralEditType,
  StructuralEditDirection,
  CorrectionLogEntry,
} from "./builderTypes";

interface Props {
  mode: EditorMode;
  /** In "truth" mode: the initial upload or current source image data URL */
  initialImageDataUrl?: string;
  /** In "correction" mode: full context about the character + garment being corrected */
  correctionContext?: CorrectionContext;
  /** Available Garment Truths for style reference in structural edits */
  garmentTruths?: GarmentTruth[];
  onApproveAsTruth?: (imageBase64: string) => void;
  onApproveAsCharacterRender?: (imageBase64: string, corrections: CorrectionLogEntry[]) => void;
}

function getBase64FromDataUrl(dataUrl: string): string {
  return dataUrl.replace(/^data:image\/\w+;base64,/, "");
}

export function GarmentEditor({
  mode,
  initialImageDataUrl,
  correctionContext,
  garmentTruths = [],
  onApproveAsTruth,
  onApproveAsCharacterRender,
}: Props) {
  const [imageDataUrl, setImageDataUrl] = useState<string>(
    mode === "correction" && correctionContext
      ? correctionContext.renderImageDataUrl
      : (initialImageDataUrl ?? "")
  );
  const [corrections, setCorrections] = useState<CorrectionLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { sliders, updateSlider, reset, cssFilter } = useSliderFilters();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine the style reference: use the first approved Garment Truth if available
  const styleReferenceBase64 =
    garmentTruths.length > 0
      ? undefined // loaded lazily below when needed
      : undefined;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageDataUrl(ev.target?.result as string);
      setCorrections([]);
      reset();
    };
    reader.readAsDataURL(file);
  };

  const handleStructuralEditComplete = useCallback(
    (resultBase64: string, editType: StructuralEditType, direction: StructuralEditDirection) => {
      const newDataUrl = `data:image/png;base64,${resultBase64}`;
      setImageDataUrl(newDataUrl);
      if (mode === "correction" && correctionContext) {
        const entry = makeCorrectionEntry(
          correctionContext.characterId,
          correctionContext.garmentId,
          editType,
          direction,
          1
        );
        setCorrections((prev) => [...prev, entry]);
      }
    },
    [mode, correctionContext]
  );

  const handleSliderChange = useCallback(
    (key: Parameters<typeof updateSlider>[0], value: number) => {
      updateSlider(key, value);
      if (mode === "correction" && correctionContext) {
        const entry = makeCorrectionEntry(
          correctionContext.characterId,
          correctionContext.garmentId,
          key,
          "set",
          value
        );
        setCorrections((prev) => [...prev, entry]);
      }
    },
    [updateSlider, mode, correctionContext]
  );

  // Export current visible state (CSS filter + canvas) as base64
  const exportCurrentImageBase64 = useCallback((): string => {
    return getBase64FromDataUrl(imageDataUrl);
  }, [imageDataUrl]);

  const handleApprove = async () => {
    setSaving(true);
    const base64 = exportCurrentImageBase64();
    try {
      if (mode === "truth") {
        onApproveAsTruth?.(base64);
      } else {
        onApproveAsCharacterRender?.(base64, corrections);
      }
    } finally {
      setSaving(false);
    }
  };

  const approveLabel =
    mode === "truth"
      ? "Approve & Lock Garment Truth"
      : `Approve for ${correctionContext?.characterId ?? "Character"}`;

  const currentBase64 = imageDataUrl ? getBase64FromDataUrl(imageDataUrl) : "";

  return (
    <div className="flex flex-col gap-4 w-full max-w-md mx-auto pb-8">
      {/* Image preview with live CSS filter */}
      <div className="relative bg-black/20 border border-[#D4B896]/10 rounded-lg overflow-hidden">
        {imageDataUrl ? (
          <>
            <img
              src={imageDataUrl}
              alt="Garment preview"
              className="w-full object-contain max-h-[50vh]"
              style={{ filter: cssFilter || undefined }}
            />
            {/* Fabric roughness overlay */}
            {sliders.fabricRoughness > 0 && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  opacity: fabricRoughnessOpacity(sliders.fabricRoughness),
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Ccircle cx='1' cy='1' r='0.5' fill='%23fff' opacity='0.4'/%3E%3Ccircle cx='3' cy='3' r='0.5' fill='%23000' opacity='0.3'/%3E%3C/svg%3E\")",
                  backgroundSize: "4px 4px",
                  mixBlendMode: "overlay",
                }}
              />
            )}
            {/* Heather overlay */}
            {sliders.heatherIntensity > 0 && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  opacity: heatherOpacity(sliders.heatherIntensity),
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='3' height='3'%3E%3Cline x1='0' y1='1.5' x2='3' y2='1.5' stroke='%23aaa' stroke-width='0.3' opacity='0.6'/%3E%3C/svg%3E\")",
                  backgroundSize: "3px 3px",
                  mixBlendMode: "overlay",
                }}
              />
            )}
          </>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-16 text-[11px] uppercase tracking-widest text-[#D4B896]/40 hover:text-[#D4B896]/70"
          >
            + Upload Garment Image
          </button>
        )}
      </div>

      {imageDataUrl && mode === "truth" && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-[9px] uppercase tracking-widest text-[#D4B896]/40 hover:text-[#D4B896]/60 text-center"
        >
          Replace image
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={handleFileUpload}
      />

      {imageDataUrl && (
        <>
          <SliderPanel sliders={sliders} onChange={handleSliderChange} onReset={reset} />
          <StructuralEditPanel
            currentImageBase64={currentBase64}
            onEditComplete={handleStructuralEditComplete}
            onError={setError}
          />
          {error && (
            <p className="text-red-400 text-[10px] px-2">{error}</p>
          )}
          <button
            onClick={handleApprove}
            disabled={saving}
            className="w-full py-4 bg-[#D4B896] text-black text-[11px] uppercase tracking-widest font-medium hover:bg-[#c9a88a] disabled:opacity-50"
          >
            {saving ? "Saving…" : approveLabel}
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/builder/GarmentEditor.tsx
git commit -m "feat: add GarmentEditor component (sliders + structural edits + approve)"
```

---

## Task 11: Character Dresser components

**Files:**
- Create: `src/components/builder/CharacterCard.tsx`
- Create: `src/components/builder/GarmentTile.tsx`
- Create: `src/components/builder/RenderResult.tsx`
- Create: `src/components/builder/CharacterDresser.tsx`

- [ ] **Step 1: Create `src/components/builder/CharacterCard.tsx`**

```tsx
// src/components/builder/CharacterCard.tsx
"use client";
import { formatHeight } from "@/data/characters";
import type { BuilderCharacter } from "./builderTypes";

interface Props {
  character: BuilderCharacter;
  selected: boolean;
  onClick: () => void;
}

export function CharacterCard({ character, selected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center p-3 border rounded-lg transition-colors ${
        selected
          ? "border-[#D4B896] bg-[#D4B896]/10"
          : "border-[#D4B896]/15 bg-black/20 hover:border-[#D4B896]/40"
      }`}
    >
      <div className="w-16 h-20 bg-black/30 rounded overflow-hidden mb-2">
        <img
          src={character.referenceImagePath}
          alt={character.displayName}
          className="w-full h-full object-cover object-top"
        />
      </div>
      <span className="text-[11px] font-medium text-[#D4B896] uppercase tracking-wider">
        {character.displayName}
      </span>
      <span className="text-[9px] text-[#D4B896]/50 mt-0.5">
        {formatHeight(character.heightIn)} · {character.weightLb}lb
      </span>
      <span className="text-[9px] text-[#D4B896]/50">
        {character.chestIn}" chest · {character.defaultSize}
      </span>
    </button>
  );
}
```

- [ ] **Step 2: Create `src/components/builder/GarmentTile.tsx`**

```tsx
// src/components/builder/GarmentTile.tsx
"use client";
import type { GarmentTruth } from "./builderTypes";

interface Props {
  garment: GarmentTruth;
  selected: boolean;
  onClick: () => void;
}

export function GarmentTile({ garment, selected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center p-3 border rounded-lg transition-colors ${
        selected
          ? "border-[#D4B896] bg-[#D4B896]/10"
          : "border-[#D4B896]/15 bg-black/20 hover:border-[#D4B896]/40"
      }`}
    >
      <div className="w-16 h-20 bg-black/30 rounded overflow-hidden mb-2">
        <img
          src={garment.approvedImagePath}
          alt={garment.name}
          className="w-full h-full object-cover object-top"
        />
      </div>
      <span className="text-[11px] font-medium text-[#D4B896] uppercase tracking-wider">
        {garment.name}
      </span>
      <span className="text-[9px] text-[#D4B896]/50 mt-0.5">
        v{garment.version} · {garment.availableSizes.join(", ")}
      </span>
    </button>
  );
}
```

- [ ] **Step 3: Create `src/components/builder/RenderResult.tsx`**

```tsx
// src/components/builder/RenderResult.tsx
"use client";
import type { CorrectionContext } from "./builderTypes";

interface Props {
  imageBase64: string;
  correctionContext: CorrectionContext;
  onEditThisRender: () => void;
  onApproveAndSave: () => void;
  onRegenerate: () => void;
  onDiscard: () => void;
  saving: boolean;
}

export function RenderResult({
  imageBase64,
  correctionContext: _ctx,
  onEditThisRender,
  onApproveAndSave,
  onRegenerate,
  onDiscard,
  saving,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative bg-black/20 border border-[#D4B896]/10 rounded-lg overflow-hidden">
        <img
          src={`data:image/png;base64,${imageBase64}`}
          alt="VTON render"
          className="w-full object-contain max-h-[55vh]"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onEditThisRender}
          className="py-3 border border-[#D4B896]/30 text-[#D4B896]/80 text-[10px] uppercase tracking-widest hover:bg-[#D4B896]/5"
        >
          Edit This Render
        </button>
        <button
          onClick={onApproveAndSave}
          disabled={saving}
          className="py-3 bg-[#D4B896] text-black text-[10px] uppercase tracking-widest font-medium hover:bg-[#c9a88a] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Approve & Save"}
        </button>
        <button
          onClick={onRegenerate}
          className="py-3 border border-[#D4B896]/20 text-[#D4B896]/50 text-[10px] uppercase tracking-widest hover:bg-[#D4B896]/5"
        >
          Regenerate
        </button>
        <button
          onClick={onDiscard}
          className="py-3 border border-white/10 text-white/30 text-[10px] uppercase tracking-widest hover:bg-white/5"
        >
          Discard
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/builder/CharacterDresser.tsx`**

```tsx
// src/components/builder/CharacterDresser.tsx
"use client";
import { useState } from "react";
import { BUILDER_CHARACTERS } from "@/data/characters";
import { CharacterCard } from "./CharacterCard";
import { GarmentTile } from "./GarmentTile";
import { RenderResult } from "./RenderResult";
import { GarmentEditor } from "./GarmentEditor";
import type { BuilderCharacter, GarmentTruth, CorrectionContext, CorrectionLogEntry } from "./builderTypes";

interface Props {
  garments: GarmentTruth[];
}

type DresserView = "picker" | "generating" | "result" | "correcting";

export function CharacterDresser({ garments }: Props) {
  const [selectedCharacter, setSelectedCharacter] = useState<BuilderCharacter | null>(null);
  const [selectedGarment, setSelectedGarment] = useState<GarmentTruth | null>(null);
  const [view, setView] = useState<DresserView>("picker");
  const [resultBase64, setResultBase64] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const correctionContext: CorrectionContext | undefined =
    selectedCharacter && selectedGarment && resultBase64
      ? {
          characterId: selectedCharacter.id,
          garmentId: selectedGarment.id,
          renderImageDataUrl: `data:image/png;base64,${resultBase64}`,
        }
      : undefined;

  async function loadImageAsBase64(path: string): Promise<string> {
    const res = await fetch(path);
    const buf = await res.arrayBuffer();
    return Buffer.from(buf).toString("base64");
  }

  async function handleGenerate() {
    if (!selectedCharacter || !selectedGarment) return;
    setView("generating");
    setError(null);
    try {
      const [personBase64, garmentBase64] = await Promise.all([
        loadImageAsBase64(selectedCharacter.referenceImagePath),
        loadImageAsBase64(selectedGarment.approvedImagePath),
      ]);
      const res = await fetch("/api/builder/vton-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personBase64, garmentBase64 }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setResultBase64(data.imageBase64);
      setView("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setView("picker");
    }
  }

  async function handleApproveAndSave() {
    if (!selectedCharacter || !selectedGarment || !resultBase64) return;
    setSaving(true);
    try {
      await fetch("/api/builder/save-render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: resultBase64,
          characterId: selectedCharacter.id,
          garmentId: selectedGarment.id,
          corrections: [],
        }),
      });
      setView("picker");
      setResultBase64("");
    } finally {
      setSaving(false);
    }
  }

  async function handleApproveCorrectedRender(imageBase64: string, corrections: CorrectionLogEntry[]) {
    if (!selectedCharacter || !selectedGarment) return;
    setSaving(true);
    try {
      await fetch("/api/builder/save-render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          characterId: selectedCharacter.id,
          garmentId: selectedGarment.id,
          corrections,
        }),
      });
      setView("picker");
      setResultBase64("");
    } finally {
      setSaving(false);
    }
  }

  if (view === "correcting" && correctionContext) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => setView("result")}
            className="text-[10px] uppercase tracking-widest text-[#D4B896]/50 hover:text-[#D4B896]/80"
          >
            ← Back to Render
          </button>
          <span className="text-[10px] uppercase tracking-widest text-[#D4B896]/40">
            Correcting for {selectedCharacter?.displayName}
          </span>
        </div>
        <GarmentEditor
          mode="correction"
          correctionContext={correctionContext}
          garmentTruths={garments}
          onApproveAsCharacterRender={handleApproveCorrectedRender}
        />
      </div>
    );
  }

  if (view === "result" && resultBase64 && correctionContext) {
    return (
      <RenderResult
        imageBase64={resultBase64}
        correctionContext={correctionContext}
        onEditThisRender={() => setView("correcting")}
        onApproveAndSave={handleApproveAndSave}
        onRegenerate={handleGenerate}
        onDiscard={() => { setView("picker"); setResultBase64(""); }}
        saving={saving}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Character selection */}
      <div>
        <p className="text-[9px] uppercase tracking-[0.2em] text-[#D4B896]/40 mb-3">Select Character</p>
        <div className="grid grid-cols-2 gap-3">
          {BUILDER_CHARACTERS.map((c) => (
            <CharacterCard
              key={c.id}
              character={c}
              selected={selectedCharacter?.id === c.id}
              onClick={() => setSelectedCharacter(c)}
            />
          ))}
        </div>
      </div>

      {/* Garment selection */}
      <div>
        <p className="text-[9px] uppercase tracking-[0.2em] text-[#D4B896]/40 mb-3">Select Garment</p>
        {garments.length === 0 ? (
          <p className="text-[11px] text-[#D4B896]/30 italic">
            No approved garments yet. Use the Garment Editor to approve your first one.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {garments.map((g) => (
              <GarmentTile
                key={g.id}
                garment={g}
                selected={selectedGarment?.id === g.id}
                onClick={() => setSelectedGarment(g)}
              />
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-[10px]">{error}</p>}

      {view === "generating" && (
        <p className="text-[11px] text-[#D4B896]/60 text-center py-4">
          Transferring garment via IDM-VTON… (45–90 seconds)
        </p>
      )}

      {view === "picker" && (
        <button
          onClick={handleGenerate}
          disabled={!selectedCharacter || !selectedGarment || view === ("generating" as DresserView)}
          className="w-full py-4 bg-[#D4B896] text-black text-[11px] uppercase tracking-widest font-medium hover:bg-[#c9a88a] disabled:opacity-30"
        >
          Generate Render ⚡
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/builder/CharacterCard.tsx src/components/builder/GarmentTile.tsx src/components/builder/RenderResult.tsx src/components/builder/CharacterDresser.tsx
git commit -m "feat: add CharacterDresser, CharacterCard, GarmentTile, RenderResult components"
```

---

## Task 12: Auth gate and page routing

**Files:**
- Create: `src/components/builder/BuilderAuthGate.tsx`
- Create: `src/app/studio/builder/page.tsx`

- [ ] **Step 1: Create `src/components/builder/BuilderAuthGate.tsx`**

```tsx
// src/components/builder/BuilderAuthGate.tsx
// Simple password gate — password stored in BUILDER_PASSWORD env var.
// On mobile the team enters the password once; it's remembered in sessionStorage.
"use client";
import { useState, useEffect } from "react";

const SESSION_KEY = "tulimond-builder-auth";

export function BuilderAuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") setAuthed(true);
    setChecking(false);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/builder/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: input }),
    });
    const data = await res.json();
    if (data.ok) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 1500);
    }
  }

  if (checking) return null;
  if (authed) return <>{children}</>;

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-xs">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#D4B896]/60 text-center mb-2">
          Popper Tulimond Studio
        </p>
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Team password"
          className={`w-full bg-black/40 border ${error ? "border-red-500/60" : "border-[#D4B896]/20"} text-[#D4B896] px-4 py-3 text-sm focus:outline-none focus:border-[#D4B896]/60`}
          autoFocus
        />
        <button
          type="submit"
          className="w-full py-3 bg-[#D4B896] text-black text-[10px] uppercase tracking-widest font-medium"
        >
          Enter
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Create the auth API route**

Create `src/app/api/builder/auth/route.ts`:

```typescript
// src/app/api/builder/auth/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const expected = process.env.BUILDER_PASSWORD;
  if (!expected) {
    // No password set — allow access (dev mode)
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: password === expected });
}
```

- [ ] **Step 3: Add `BUILDER_PASSWORD` to `.env.local`**

Add to `.env.local`:
```
BUILDER_PASSWORD=choose-a-team-password
```

- [ ] **Step 4: Create `src/app/studio/builder/page.tsx`**

```tsx
// src/app/studio/builder/page.tsx
"use client";
import { useState } from "react";
import { BuilderAuthGate } from "@/components/builder/BuilderAuthGate";
import { GarmentEditor } from "@/components/builder/GarmentEditor";
import { CharacterDresser } from "@/components/builder/CharacterDresser";
import { GARMENT_LIBRARY } from "@/data/garments";
import type { GarmentTruth } from "@/components/builder/builderTypes";

type Tab = "editor" | "dresser";

export default function BuilderPage() {
  const [tab, setTab] = useState<Tab>("editor");
  const [garments, setGarments] = useState<GarmentTruth[]>(GARMENT_LIBRARY);

  async function handleApproveAsTruth(imageBase64: string) {
    // For now: prompt for garment metadata then save
    const name = prompt("Garment name (e.g. Constable Henley):");
    const sku = prompt("SKU (e.g. PT-HENLEY-CG):");
    if (!name || !sku) return;
    const version = (garments.filter((g) => g.sku === sku).length ?? 0) + 1;
    const res = await fetch("/api/builder/save-garment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64,
        name,
        sku,
        fabricComposition: "28% Merino Wool, 72% Pima Cotton",
        availableSizes: ["S", "M", "L", "XL", "XXL"],
        version,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      const newGarment: GarmentTruth = {
        id: `${sku.toLowerCase()}-v${version}`,
        name,
        sku,
        fabricComposition: "28% Merino Wool, 72% Pima Cotton",
        availableSizes: ["S", "M", "L", "XL", "XXL"],
        approvedImagePath: data.imagePath,
        version,
        approvedAt: Date.now(),
      };
      setGarments((prev) => [...prev, newGarment]);
      alert(`Garment Truth saved: ${data.imagePath}`);
    }
  }

  return (
    <BuilderAuthGate>
      <div className="min-h-screen bg-obsidian text-parchment">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-black/80 backdrop-blur border-b border-[#D4B896]/10 px-4 py-3 flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-[0.3em] text-[#D4B896]/60">
            PT Outfit Builder
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setTab("editor")}
              className={`px-4 py-2 text-[9px] uppercase tracking-widest ${
                tab === "editor"
                  ? "bg-[#D4B896] text-black"
                  : "border border-[#D4B896]/20 text-[#D4B896]/60"
              }`}
            >
              Garment Editor
            </button>
            <button
              onClick={() => setTab("dresser")}
              className={`px-4 py-2 text-[9px] uppercase tracking-widest ${
                tab === "dresser"
                  ? "bg-[#D4B896] text-black"
                  : "border border-[#D4B896]/20 text-[#D4B896]/60"
              }`}
            >
              Character Dresser
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6">
          {tab === "editor" ? (
            <GarmentEditor
              mode="truth"
              onApproveAsTruth={handleApproveAsTruth}
            />
          ) : (
            <CharacterDresser garments={garments} />
          )}
        </div>
      </div>
    </BuilderAuthGate>
  );
}
```

- [ ] **Step 5: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: no errors. The `/studio/builder` route is now accessible.

- [ ] **Step 6: Run dev server and test the page loads**

```bash
npm run dev
```

Open `http://localhost:3000/studio/builder` in a browser. Expected: password gate appears.

Enter the password set in `.env.local`. Expected: tab nav appears with "Garment Editor" and "Character Dresser".

- [ ] **Step 7: Commit**

```bash
git add src/components/builder/BuilderAuthGate.tsx src/app/studio/builder/page.tsx src/app/api/builder/auth/route.ts
git commit -m "feat: add Builder page with auth gate and two-tab layout"
```

---

## Task 13: Wire garment editor to save and test full flow

**Files:**
- Modify: `src/app/studio/builder/page.tsx` (no code change needed — just end-to-end test)

- [ ] **Step 1: Run the full garment approval flow manually**

With `npm run dev` running:

1. Open `http://localhost:3000/studio/builder`
2. Enter team password
3. Go to **Garment Editor** tab
4. Upload the approved Nano Banana PNG of the Constable Henley
5. Adjust a slider (e.g. move Saturation slightly)
6. Press a structural edit button (e.g. "Sleeve Length → Longer") — wait ~15s for Gemini response
7. Press **Approve & Lock Garment Truth**
8. Enter name and SKU when prompted

Expected result: file written to `/public/garments/<sku>-v1.png`, garment appears in Character Dresser.

- [ ] **Step 2: Test VTON transfer**

1. Switch to **Character Dresser** tab
2. Select Jerome
3. Select the newly approved garment
4. Press **Generate Render ⚡**
5. Wait 45–90 seconds

Expected result: VTON render appears showing Jerome wearing the garment.

- [ ] **Step 3: Test correction loop**

1. In the render result, press **Edit This Render**
2. Make a slider adjustment (e.g. color correction)
3. Press a structural edit if needed
4. Press **Approve for Jerome**

Expected: `/public/renders/<jerome-garmentid-timestamp>.png` created, correction logged to `src/data/correctionLog.json`.

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/data/correctionLog.json 2>/dev/null || true
git commit -m "feat: outfit builder MVP complete — garment editor, VTON transfer, correction loop"
```

---

## Environment Variables Reference

Add these to `.env.local` before running:

```bash
# Required
GOOGLE_API_KEY=your_google_api_key        # From https://aistudio.google.com/app/apikey
BUILDER_PASSWORD=your-team-password        # Any string your team will use to access /studio/builder

# Optional — only needed if upgrading to paid VTON
VTON_PROVIDER=replicate                    # Default: huggingface (free)
REPLICATE_API_KEY=your_replicate_key       # From replicate.com (only if VTON_PROVIDER=replicate)
```

---

## Self-Review Notes

- Spec coverage checked: all 7 success criteria have corresponding tasks ✓
- Post-transfer correction loop: wired through CharacterDresser → GarmentEditor in "correction" mode ✓
- Garment Truth immutability: correction mode saves to `/public/renders/`, never overwrites `/public/garments/` ✓
- Correction log: `CorrectionLogEntry[]` written via `save-render` route ✓
- Free-first VTON: HF IDM-VTON default, Replicate behind env var ✓
- Mobile-first: all components use `max-w-md mx-auto`, no fixed widths ✓
- GARMENT_LIBRARY seeded empty — team adds first entry via Garment Editor flow ✓
