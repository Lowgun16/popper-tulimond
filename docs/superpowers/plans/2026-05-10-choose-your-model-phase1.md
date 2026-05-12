# Choose Your Model — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let customers choose a model who matches their body type before seeing the lookbook, with the selection persisting in localStorage, and give admins a CMS editor for model bios, stats, and intro videos.

**Architecture:** MODEL_INVENTORY slot IDs are renamed to character names first (prerequisite). A new `useModelPreference` hook manages localStorage. `ChooseModelModal` is a full-screen carousel (Jerome → Angel → Jack → Ethan) that opens before the lookbook when no preference is saved, or when "Change Model" is tapped. Model profiles (bio, stats, video) are stored in `page_content` under `page_slug = "models"` and edited via a new `ModelProfileEditor` CMS component. Vercel Blob handles video uploads.

**Tech Stack:** Next.js App Router, React, Framer Motion, Tailwind CSS, `@vercel/blob`, TipTap (via existing `FieldEditor`), existing `useEditPages` hook pattern.

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/data/inventory.ts` — rename slot IDs + outfit IDs |
| Create | `migrations/rename-model-ids.sql` — DB migration for product_overrides |
| Create | `src/hooks/useModelPreference.ts` |
| Modify | `src/lib/contentTypes.ts` — add `ModelProfile` type, update `AllPageContent` |
| Modify | `src/lib/pageContent.ts` — add `fetchModelProfiles()`, update `fetchAllPageContent` |
| Modify | `src/app/api/edit-pages/live-content/route.ts` — add "models" defaults |
| Modify | `src/app/api/edit-pages/publish/route.ts` — add models to PAGE_PATHS |
| Create | `src/app/api/upload/model-video/route.ts` |
| Create | `src/components/overlays/ChooseModelModal.tsx` |
| Create | `src/components/edit-pages/ModelProfileEditor.tsx` |
| Modify | `src/components/edit-pages/EditPagesSidebar.tsx` — add Models entry |
| Modify | `src/components/edit-pages/EditPagesPanel.tsx` — render ModelProfileEditor |
| Modify | `src/components/overlays/VaultOverlay.tsx` — add "Change Model" button |
| Modify | `src/components/studio/LookbookOverlay.tsx` — add "Change Model" button |
| Modify | `src/components/CollectionOverlay.tsx` — wire ChooseModelModal |
| Modify | `src/app/ClientPage.tsx` — pass modelProfiles prop |
| Modify | `src/app/page.tsx` — pass modelProfiles from fetchAllPageContent |
| Create | `src/__tests__/useModelPreference.test.ts` |

---

## Task 1: Install @vercel/blob

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install the package**

```bash
npm install @vercel/blob
```

Expected: no errors, `@vercel/blob` appears in `package.json` dependencies.

- [ ] **Step 2: Note the env var needed**

The upload route (Task 7) will require `BLOB_READ_WRITE_TOKEN` in the Vercel project environment variables. This env var is NOT needed for local development if you skip the video upload flow during local testing.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install @vercel/blob for model video uploads"
```

---

## Task 2: Rename MODEL_INVENTORY slot IDs and outfit IDs

**Context:** The current slot IDs are location-based (`lounge-model`, `center-model`, `vault-model`, `rack-model`). This task renames them to character names. Everything else in the codebase that references these IDs (localStorage key `pt_model_preference`, product_overrides rows, studioDraft localStorage) will also need to work with the new names.

**Files:**
- Modify: `src/data/inventory.ts`
- Create: `migrations/rename-model-ids.sql`

**Rename map:**
| Old slot ID | New slot ID | Old outfit ID | New outfit ID |
|---|---|---|---|
| `lounge-model` | `angel` | `lounge-showstopper` | `angel-heartbreaker` |
| `center-model` | `jerome` | `center-showstopper` | `jerome-showstopper` |
| `vault-model` | `jack` | `vault-showstopper` | `jack-showstopper` |
| `rack-model` | `ethan` | `rack-showstopper` | `ethan-heartbreaker` |

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/inventoryIds.test.ts`:

```ts
import { MODEL_INVENTORY } from "@/data/inventory";

describe("MODEL_INVENTORY slot IDs", () => {
  const ids = MODEL_INVENTORY.map((s) => s.id);

  it("uses character names not location names", () => {
    expect(ids).not.toContain("lounge-model");
    expect(ids).not.toContain("center-model");
    expect(ids).not.toContain("vault-model");
    expect(ids).not.toContain("rack-model");
    expect(ids).toContain("angel");
    expect(ids).toContain("jerome");
    expect(ids).toContain("jack");
    expect(ids).toContain("ethan");
  });

  it("has renamed outfit IDs", () => {
    const outfitIds = MODEL_INVENTORY.flatMap((s) => s.outfit.map((o) => o.id));
    expect(outfitIds).not.toContain("lounge-showstopper");
    expect(outfitIds).not.toContain("center-showstopper");
    expect(outfitIds).not.toContain("vault-showstopper");
    expect(outfitIds).not.toContain("rack-showstopper");
    expect(outfitIds).toContain("angel-heartbreaker");
    expect(outfitIds).toContain("jerome-showstopper");
    expect(outfitIds).toContain("jack-showstopper");
    expect(outfitIds).toContain("ethan-heartbreaker");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/inventoryIds.test.ts --no-coverage
```

Expected: FAIL — "Expected array to not contain 'lounge-model'"

- [ ] **Step 3: Update inventory.ts**

In `src/data/inventory.ts`, apply these exact renames:

```ts
// slot 1: lounge-model → angel, lounge-showstopper → angel-heartbreaker
{
  id: "angel",
  displayName: "Angel",
  // ... (all other fields stay the same)
  outfit: [
    {
      id: "angel-heartbreaker",
      // ... rest stays the same
    },
  ],
}

// slot 2: center-model → jerome, center-showstopper → jerome-showstopper
{
  id: "jerome",
  displayName: "Jerome",
  outfit: [
    {
      id: "jerome-showstopper",
      // ... rest stays the same
    },
  ],
}

// slot 3: vault-model → jack, vault-showstopper → jack-showstopper
{
  id: "jack",
  displayName: "Jack",
  outfit: [
    {
      id: "jack-showstopper",
      // ... rest stays the same
    },
  ],
}

// slot 4: rack-model → ethan, rack-showstopper → ethan-heartbreaker
{
  id: "ethan",
  displayName: "Ethan",
  outfit: [
    {
      id: "ethan-heartbreaker",
      // ... rest stays the same
    },
  ],
}
```

Only the `id` fields on ModelSlot and OutfitItem change — all position, scale, imageSrc, and other fields stay identical.

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/__tests__/inventoryIds.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 5: Create DB migration**

Create `migrations/rename-model-ids.sql`:

```sql
-- Rename outfit IDs in product_overrides
UPDATE product_overrides SET outfit_id = 'angel-heartbreaker'  WHERE outfit_id = 'lounge-showstopper';
UPDATE product_overrides SET outfit_id = 'jerome-showstopper'  WHERE outfit_id = 'center-showstopper';
UPDATE product_overrides SET outfit_id = 'jack-showstopper'    WHERE outfit_id = 'vault-showstopper';
UPDATE product_overrides SET outfit_id = 'ethan-heartbreaker'  WHERE outfit_id = 'rack-showstopper';
```

Run this against the production database (Neon) via the Neon console SQL editor or the `psql` CLI. Only needed if any `product_overrides` rows exist with the old IDs.

- [ ] **Step 6: Commit**

```bash
git add src/data/inventory.ts src/__tests__/inventoryIds.test.ts migrations/rename-model-ids.sql
git commit -m "feat: rename MODEL_INVENTORY slot and outfit IDs to character names"
```

---

## Task 3: useModelPreference hook

**Files:**
- Create: `src/hooks/useModelPreference.ts`
- Create: `src/__tests__/useModelPreference.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/useModelPreference.test.ts`:

```ts
const STORAGE_KEY = "pt_model_preference";

// Mock localStorage
beforeEach(() => {
  localStorage.clear();
});

describe("useModelPreference localStorage key", () => {
  it("uses the correct key", () => {
    expect(STORAGE_KEY).toBe("pt_model_preference");
  });
});

describe("model preference logic", () => {
  function readPref(): string | null {
    return localStorage.getItem(STORAGE_KEY);
  }
  function writePref(id: string) {
    localStorage.setItem(STORAGE_KEY, id);
  }
  function clearPref() {
    localStorage.removeItem(STORAGE_KEY);
  }

  it("starts null when nothing is stored", () => {
    expect(readPref()).toBeNull();
  });

  it("stores a model id", () => {
    writePref("angel");
    expect(readPref()).toBe("angel");
  });

  it("overwrites an existing preference", () => {
    writePref("angel");
    writePref("jerome");
    expect(readPref()).toBe("jerome");
  });

  it("clears the preference", () => {
    writePref("jack");
    clearPref();
    expect(readPref()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it passes immediately**

```bash
npx jest src/__tests__/useModelPreference.test.ts --no-coverage
```

Expected: PASS (these test the localStorage contract, not the hook itself)

- [ ] **Step 3: Create the hook**

Create `src/hooks/useModelPreference.ts`:

```ts
"use client";
import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "pt_model_preference";

export function useModelPreference() {
  const [modelId, setModelId] = useState<string | null>(null);

  useEffect(() => {
    setModelId(localStorage.getItem(STORAGE_KEY));
  }, []);

  const selectModel = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setModelId(id);
  }, []);

  const clearModel = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setModelId(null);
  }, []);

  return { modelId, selectModel, clearModel };
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors for the new file.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useModelPreference.ts src/__tests__/useModelPreference.test.ts
git commit -m "feat: add useModelPreference hook (localStorage pt_model_preference)"
```

---

## Task 4: ModelProfile type + fetchModelProfiles helper

**Context:** `ModelProfile` describes one model's full data set — static fields from `MODEL_INVENTORY` merged with CMS fields from `page_content`. `fetchModelProfiles()` reads the `page_content` table for `page_slug = "models"` and merges in static data. `AllPageContent` gains a `modelProfiles` field so the server component can pass profiles to the client.

**Files:**
- Modify: `src/lib/contentTypes.ts`
- Modify: `src/lib/pageContent.ts`

- [ ] **Step 1: Add ModelProfile type to contentTypes.ts**

In `src/lib/contentTypes.ts`, add after the existing types:

```ts
export type ModelProfile = {
  id: string;
  displayName: string;
  imageSrc: string;
  tagline: string;
  height: string;
  weight: string;
  bodyType: string;
  bio: string;
  videoUrl: string;
};
```

Also update `AllPageContent` to include model profiles:

```ts
export type AllPageContent = {
  about: AboutContent;
  protocol: ProtocolContent;
  contact: ContactContent;
  terms: LegalContent;
  privacy: LegalContent;
  shipping: LegalContent;
  refund: LegalContent;
  contactUs: ContactUsContent;
  productOverrides: ProductOverride[];
  modelProfiles: ModelProfile[];   // ← add this line
};
```

- [ ] **Step 2: Add fetchModelProfiles to pageContent.ts**

In `src/lib/pageContent.ts`, add the following import at the top:

```ts
import type { ModelProfile } from "./contentTypes";
```

Then add this import alongside existing ones:

```ts
import { MODEL_INVENTORY } from "@/data/inventory";
```

Then add the `fetchModelProfiles` function before `fetchAllPageContent`:

```ts
export async function fetchModelProfiles(): Promise<ModelProfile[]> {
  const rows = await fetchRows("models");
  const m: Record<string, string> = rowsToMap(rows);

  return MODEL_INVENTORY.map((slot) => ({
    id: slot.id,
    displayName: slot.displayName ?? slot.id,
    imageSrc: slot.imageSrc,
    tagline: m[`${slot.id}_tagline`] ?? "",
    height: m[`${slot.id}_height`] ?? "",
    weight: m[`${slot.id}_weight`] ?? "",
    bodyType: m[`${slot.id}_body_type`] ?? "",
    bio: m[`${slot.id}_bio`] ?? "",
    videoUrl: m[`${slot.id}_video_url`] ?? "",
  }));
}
```

- [ ] **Step 3: Update fetchAllPageContent to fetch model profiles**

In `src/lib/pageContent.ts`, update `fetchAllPageContent`:

```ts
export async function fetchAllPageContent(): Promise<AllPageContent> {
  const [
    aboutRows,
    protocolRows,
    contactRows,
    termsRows,
    privacyRows,
    shippingRows,
    refundRows,
    contactUsRows,
    productOverrides,
    modelProfiles,
  ] = await Promise.all([
    fetchRows("about"),
    fetchRows("protocol"),
    fetchRows("contact"),
    fetchRows("terms"),
    fetchRows("privacy"),
    fetchRows("shipping"),
    fetchRows("refund"),
    fetchRows("contact-us"),
    fetchPublishedOverrides(),
    fetchModelProfiles(),
  ]);

  return {
    about: parseAbout(aboutRows),
    protocol: parseProtocol(protocolRows),
    contact: parseContact(contactRows),
    terms: parseLegal(termsRows, TERMS_CONTENT),
    privacy: parseLegal(privacyRows, PRIVACY_CONTENT),
    shipping: parseLegal(shippingRows, SHIPPING_CONTENT),
    refund: parseLegal(refundRows, REFUND_CONTENT),
    contactUs: parseContactUs(contactUsRows),
    productOverrides,
    modelProfiles,
  };
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/contentTypes.ts src/lib/pageContent.ts
git commit -m "feat: add ModelProfile type and fetchModelProfiles helper"
```

---

## Task 5: Live-content API + publish route for "models" page

**Context:** The edit-pages admin uses `GET /api/edit-pages/live-content?page=models` to load current published values into the editor. The publish route needs to know to revalidate `/` when model profiles are published.

**Files:**
- Modify: `src/app/api/edit-pages/live-content/route.ts`
- Modify: `src/app/api/edit-pages/publish/route.ts`

- [ ] **Step 1: Add "models" static defaults to live-content route**

In `src/app/api/edit-pages/live-content/route.ts`, add to the `STATIC_DEFAULTS` object (after the `reservation` entry):

```ts
models: {
  angel_tagline: "",
  angel_height: "",
  angel_weight: "",
  angel_body_type: "",
  angel_bio: "",
  angel_video_url: "",
  jerome_tagline: "",
  jerome_height: "",
  jerome_weight: "",
  jerome_body_type: "",
  jerome_bio: "",
  jerome_video_url: "",
  jack_tagline: "",
  jack_height: "",
  jack_weight: "",
  jack_body_type: "",
  jack_bio: "",
  jack_video_url: "",
  ethan_tagline: "",
  ethan_height: "",
  ethan_weight: "",
  ethan_body_type: "",
  ethan_bio: "",
  ethan_video_url: "",
},
```

- [ ] **Step 2: Add "models" to publish route PAGE_PATHS**

In `src/app/api/edit-pages/publish/route.ts`, add to `PAGE_PATHS`:

```ts
models: ["/"],
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/edit-pages/live-content/route.ts src/app/api/edit-pages/publish/route.ts
git commit -m "feat: add models page to live-content defaults and publish route"
```

---

## Task 6: POST /api/upload/model-video route

**Context:** Admin uploads a `.mp4` or `.webm` file for a model. The file is stored in Vercel Blob and the returned public URL is saved to `page_content` via the normal draft/publish flow. This route requires an active admin session.

**Files:**
- Create: `src/app/api/upload/model-video/route.ts`

- [ ] **Step 1: Create the route file**

Create `src/app/api/upload/model-video/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireSession } from "@/lib/adminAuth";

const ALLOWED_TYPES = ["video/mp4", "video/webm"];
const MAX_BYTES = 200 * 1024 * 1024; // 200 MB

export async function POST(req: NextRequest) {
  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const modelId = formData.get("modelId") as string | null;

  if (!file || !modelId) {
    return NextResponse.json({ error: "file and modelId are required" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only .mp4 and .webm files are allowed" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 200 MB limit" }, { status: 400 });
  }

  const ext = file.type === "video/webm" ? "webm" : "mp4";
  const pathname = `models/${modelId}/${Date.now()}.${ext}`;

  const blob = await put(pathname, file, { access: "public" });

  return NextResponse.json({ url: blob.url });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If `@vercel/blob` types are missing, ensure Task 1 was completed.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/upload/model-video/route.ts
git commit -m "feat: add POST /api/upload/model-video route (Vercel Blob)"
```

---

## Task 7: ChooseModelModal component

**Context:** Full-screen dark overlay that shows one model at a time in a swipeable carousel. Store order: Jerome (0) → Angel (1) → Jack (2) → Ethan (3). The `defaultModelId` prop controls which slide opens first. No close/dismiss without selecting. Swipe or arrow buttons to navigate.

**Files:**
- Create: `src/components/overlays/ChooseModelModal.tsx`

- [ ] **Step 1: Write the failing test for carousel order**

Create `src/__tests__/chooseModelCarousel.test.ts`:

```ts
import { MODEL_CAROUSEL_ORDER } from "@/components/overlays/ChooseModelModal";

describe("MODEL_CAROUSEL_ORDER", () => {
  it("is jerome angel jack ethan in that order", () => {
    expect(MODEL_CAROUSEL_ORDER).toEqual(["jerome", "angel", "jack", "ethan"]);
  });

  it("has exactly 4 models", () => {
    expect(MODEL_CAROUSEL_ORDER).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/chooseModelCarousel.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Create ChooseModelModal.tsx**

Create `src/components/overlays/ChooseModelModal.tsx`:

```tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import type { ModelProfile } from "@/lib/contentTypes";

export const MODEL_CAROUSEL_ORDER = ["jerome", "angel", "jack", "ethan"] as const;

interface ChooseModelModalProps {
  isOpen: boolean;
  modelProfiles: ModelProfile[];
  defaultModelId?: string | null;
  onSelect: (modelId: string) => void;
}

export function ChooseModelModal({
  isOpen,
  modelProfiles,
  defaultModelId,
  onSelect,
}: ChooseModelModalProps) {
  const defaultIdx = defaultModelId
    ? Math.max(0, MODEL_CAROUSEL_ORDER.indexOf(defaultModelId as typeof MODEL_CAROUSEL_ORDER[number]))
    : 0;

  const [activeIdx, setActiveIdx] = useState(defaultIdx);

  // Reset to defaultIdx whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveIdx(
        defaultModelId
          ? Math.max(0, MODEL_CAROUSEL_ORDER.indexOf(defaultModelId as typeof MODEL_CAROUSEL_ORDER[number]))
          : 0
      );
    }
  }, [isOpen, defaultModelId]);

  const touchStartX = useRef<number | null>(null);

  const goNext = useCallback(() => {
    setActiveIdx((i) => Math.min(i + 1, MODEL_CAROUSEL_ORDER.length - 1));
  }, []);

  const goPrev = useCallback(() => {
    setActiveIdx((i) => Math.max(i - 1, 0));
  }, []);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx < -50) goNext();
    else if (dx > 50) goPrev();
  }

  const modelId = MODEL_CAROUSEL_ORDER[activeIdx];
  const profile = modelProfiles.find((p) => p.id === modelId);

  if (!isOpen || !profile) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="choose-model-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 7000,
            background: "rgba(6,6,6,0.97)",
            backdropFilter: "blur(24px)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Header */}
          <div style={{ textAlign: "center", padding: "32px 24px 16px" }}>
            <p style={{
              fontFamily: "var(--font-title, serif)",
              fontSize: "9px",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "rgba(196,164,86,0.8)",
              marginBottom: "8px",
            }}>
              Popper Tulimond
            </p>
            <h2 style={{
              fontFamily: "var(--font-display, serif)",
              fontSize: "clamp(15px, 3vw, 20px)",
              fontWeight: 300,
              color: "rgba(240,232,215,0.95)",
              letterSpacing: "0.03em",
              marginBottom: "6px",
            }}>
              Choose the model who most closely resembles your body type.
            </h2>
            <p style={{
              fontFamily: "var(--font-body, sans-serif)",
              fontSize: "11px",
              color: "rgba(255,255,255,0.35)",
              letterSpacing: "0.05em",
            }}>
              Your choice personalizes the lookbook. You can always change it.
            </p>
          </div>

          {/* Carousel area */}
          <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", alignItems: "stretch" }}>
            {/* Left arrow */}
            {activeIdx > 0 && (
              <button
                onClick={goPrev}
                aria-label="Previous model"
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 10,
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.7)",
                  border: "1px solid rgba(196,164,86,0.3)",
                  color: "rgba(196,164,86,0.9)",
                  fontSize: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >‹</button>
            )}

            {/* Right arrow */}
            {activeIdx < MODEL_CAROUSEL_ORDER.length - 1 && (
              <button
                onClick={goNext}
                aria-label="Next model"
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 10,
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.7)",
                  border: "1px solid rgba(196,164,86,0.3)",
                  color: "rgba(196,164,86,0.9)",
                  fontSize: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >›</button>
            )}

            {/* Model slide */}
            <AnimatePresence mode="wait">
              <motion.div
                key={modelId}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.2 }}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "0 56px",
                  overflowY: "auto",
                }}
              >
                {/* Model visual — video or image */}
                <div style={{
                  width: "100%",
                  maxWidth: 320,
                  aspectRatio: "2/3",
                  position: "relative",
                  borderRadius: 4,
                  overflow: "hidden",
                  background: "#111",
                  marginBottom: 20,
                  flexShrink: 0,
                }}>
                  {/* Static image fallback (always rendered beneath video) */}
                  <Image
                    src={profile.imageSrc}
                    alt={profile.displayName}
                    fill
                    style={{ objectFit: "cover", objectPosition: "top center" }}
                    sizes="320px"
                  />
                  {/* Video layer — renders over image once loaded */}
                  {profile.videoUrl && (
                    <video
                      key={profile.videoUrl}
                      src={profile.videoUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "top center",
                      }}
                    />
                  )}
                </div>

                {/* Name */}
                <p style={{
                  fontFamily: "var(--font-title, serif)",
                  fontSize: "11px",
                  letterSpacing: "0.35em",
                  textTransform: "uppercase",
                  color: "#C4A456",
                  marginBottom: 8,
                }}>
                  {profile.displayName}
                </p>

                {/* Stats line */}
                {(profile.height || profile.weight) && (
                  <p style={{
                    fontFamily: "var(--font-body, sans-serif)",
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.4)",
                    letterSpacing: "0.08em",
                    marginBottom: 8,
                  }}>
                    {[profile.height, profile.weight].filter(Boolean).join(" · ")}
                  </p>
                )}

                {/* Tagline */}
                {profile.tagline && (
                  <p style={{
                    fontFamily: "var(--font-display, serif)",
                    fontSize: "13px",
                    fontWeight: 300,
                    fontStyle: "italic",
                    color: "rgba(240,232,215,0.7)",
                    textAlign: "center",
                    marginBottom: 12,
                    letterSpacing: "0.02em",
                  }}>
                    {profile.tagline}
                  </p>
                )}

                {/* Bio */}
                {profile.bio && (
                  <p style={{
                    fontFamily: "var(--font-body, sans-serif)",
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.5)",
                    lineHeight: 1.7,
                    textAlign: "center",
                    maxWidth: 280,
                    marginBottom: 24,
                  }}
                  dangerouslySetInnerHTML={{ __html: profile.bio }}
                  />
                )}

                {/* Choose button */}
                <button
                  onClick={() => onSelect(modelId)}
                  style={{
                    padding: "14px 40px",
                    background: "#C4A456",
                    color: "#0a0a0a",
                    border: "none",
                    fontFamily: "var(--font-title, serif)",
                    fontSize: "10px",
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    marginBottom: 32,
                  }}
                >
                  Choose {profile.displayName}
                </button>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots indicator */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            paddingBottom: 24,
          }}>
            {MODEL_CAROUSEL_ORDER.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                aria-label={`Go to model ${i + 1}`}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  background: i === activeIdx ? "#C4A456" : "rgba(255,255,255,0.2)",
                  transition: "background 0.2s",
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Run carousel order test**

```bash
npx jest src/__tests__/chooseModelCarousel.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/overlays/ChooseModelModal.tsx src/__tests__/chooseModelCarousel.test.ts
git commit -m "feat: add ChooseModelModal full-screen carousel component"
```

---

## Task 8: ModelProfileEditor component

**Context:** Rendered in the Edit Pages panel when the admin selects "Models". Shows one accordion section per model with text fields for stats + a TipTap editor for bio + video upload. Uses the existing `useEditPages` hook for draft/publish.

**Files:**
- Create: `src/components/edit-pages/ModelProfileEditor.tsx`

- [ ] **Step 1: Create ModelProfileEditor.tsx**

Create `src/components/edit-pages/ModelProfileEditor.tsx`:

```tsx
"use client";

import { useEffect, useState, useImperativeHandle, forwardRef, useRef } from "react";
import { useEditPages } from "@/hooks/useEditPages";
import { FieldEditor } from "./FieldEditor";
import { PublishModal } from "./PublishModal";
import { MODEL_CAROUSEL_ORDER } from "@/components/overlays/ChooseModelModal";
import type { PageEditorHandle } from "./PageEditor";

const MODEL_NAMES: Record<string, string> = {
  jerome: "Jerome",
  angel: "Angel",
  jack: "Jack",
  ethan: "Ethan",
};

type PaletteColor = { id: string; hex: string; label?: string | null };

type Props = {
  liveContent: Record<string, string>;
  customColors: PaletteColor[];
  onAddCustomColor: (hex: string) => void;
};

export const ModelProfileEditor = forwardRef<PageEditorHandle, Props>(
  function ModelProfileEditor({ liveContent, customColors, onAddCustomColor }, ref) {
    const { drafts, saving, publishing, loadDrafts, updateField, saveDraft, publish } =
      useEditPages("models");
    const [localDrafts, setLocalDrafts] = useState<Record<string, string>>({});
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);
    const [expandedModel, setExpandedModel] = useState<string>("jerome");
    const [uploadingFor, setUploadingFor] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadingModelRef = useRef<string | null>(null);

    useEffect(() => { loadDrafts(); }, [loadDrafts]);
    useEffect(() => { setLocalDrafts(drafts); }, [drafts]);

    useImperativeHandle(ref, () => ({
      save: async () => {
        await saveDraft(localDrafts);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1800);
      },
      triggerPublish: () => setShowPublishModal(true),
      saving,
      publishing,
      savedFlash,
      getDrafts: () => localDrafts,
    }));

    function handleChange(fieldKey: string, value: string) {
      setLocalDrafts((prev) => ({ ...prev, [fieldKey]: value }));
      updateField(fieldKey, value);
    }

    function getVal(fieldKey: string): string {
      return localDrafts[fieldKey] ?? liveContent[fieldKey] ?? "";
    }

    async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
      const modelId = uploadingModelRef.current;
      if (!modelId || !e.target.files?.[0]) return;
      const file = e.target.files[0];
      setUploadingFor(modelId);
      setUploadError(null);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("modelId", modelId);
        const res = await fetch("/api/upload/model-video", {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setUploadError(err.error ?? "Upload failed.");
          return;
        }
        const { url } = await res.json();
        handleChange(`${modelId}_video_url`, url);
      } catch {
        setUploadError("Upload failed. Check your connection.");
      } finally {
        setUploadingFor(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }

    return (
      <div className="flex flex-col gap-0 overflow-y-auto h-full">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm"
          className="hidden"
          onChange={handleVideoUpload}
        />

        {MODEL_CAROUSEL_ORDER.map((modelId) => {
          const isExpanded = expandedModel === modelId;
          const name = MODEL_NAMES[modelId] ?? modelId;
          const videoUrl = getVal(`${modelId}_video_url`);

          return (
            <div key={modelId} className="border-b border-white/10">
              {/* Accordion header */}
              <button
                onClick={() => setExpandedModel(isExpanded ? "" : modelId)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <span className="text-[10px] uppercase tracking-widest text-white/70">{name}</span>
                <span className="text-white/30 text-sm">{isExpanded ? "−" : "+"}</span>
              </button>

              {isExpanded && (
                <div className="px-6 pb-6 flex flex-col gap-4">
                  {/* Plain text fields */}
                  {[
                    { key: `${modelId}_tagline`, label: "Tagline (one line)" },
                    { key: `${modelId}_height`, label: "Height (e.g. 5'10\")" },
                    { key: `${modelId}_weight`, label: "Weight (e.g. 175 lbs)" },
                    { key: `${modelId}_body_type`, label: "Body Type (e.g. Lean, athletic)" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex flex-col gap-1">
                      <p className="text-[9px] uppercase tracking-widest text-white/40">{label}</p>
                      <input
                        type="text"
                        value={getVal(key)}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="bg-transparent border border-white/20 text-white/80 text-[11px] px-3 py-2 outline-none focus:border-white/40 placeholder:text-white/20"
                        placeholder={label}
                      />
                    </div>
                  ))}

                  {/* Bio — TipTap */}
                  <FieldEditor
                    label="Bio (3–5 sentences)"
                    liveValue={liveContent[`${modelId}_bio`] ?? ""}
                    draftValue={localDrafts[`${modelId}_bio`] ?? ""}
                    customColors={customColors}
                    onAddCustomColor={onAddCustomColor}
                    onChange={(v) => handleChange(`${modelId}_bio`, v)}
                  />

                  {/* Video upload */}
                  <div className="flex flex-col gap-2">
                    <p className="text-[9px] uppercase tracking-widest text-white/40">Intro Video</p>
                    {videoUrl && (
                      <div className="flex items-center gap-3">
                        <video
                          src={videoUrl}
                          muted
                          playsInline
                          className="w-20 h-28 object-cover rounded border border-white/10"
                        />
                        <button
                          onClick={() => handleChange(`${modelId}_video_url`, "")}
                          className="text-[9px] uppercase tracking-widest text-red-400/60 hover:text-red-400"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        uploadingModelRef.current = modelId;
                        fileInputRef.current?.click();
                      }}
                      disabled={uploadingFor === modelId}
                      className="self-start px-4 py-2 border border-white/20 text-white/60 text-[9px] uppercase tracking-widest hover:border-white/40 disabled:opacity-40"
                    >
                      {uploadingFor === modelId ? "Uploading…" : videoUrl ? "Replace Video" : "Upload Video (.mp4 / .webm)"}
                    </button>
                    {uploadError && uploadingModelRef.current === modelId && (
                      <p className="text-red-400 text-[10px]">{uploadError}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {showPublishModal && (
          <PublishModal
            pageLabel="Models"
            onConfirm={async () => {
              await saveDraft(localDrafts);
              const ok = await publish();
              setShowPublishModal(false);
              return ok;
            }}
            onCancel={() => setShowPublishModal(false)}
          />
        )}
      </div>
    );
  }
);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If `PublishModal` import fails, check the actual export name in `src/components/edit-pages/PublishModal.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/edit-pages/ModelProfileEditor.tsx
git commit -m "feat: add ModelProfileEditor CMS component for model bios, stats, and videos"
```

---

## Task 9: Wire ModelProfileEditor into EditPagesSidebar + EditPagesPanel

**Context:** "Models" appears in the Edit Pages sidebar under Brand Pages. When selected, `ModelProfileEditor` renders instead of the generic `PageEditor`. The existing Save/Publish buttons in the header work via `pageEditorRef` (same handle interface as `PageEditor`).

**Files:**
- Modify: `src/components/edit-pages/EditPagesSidebar.tsx`
- Modify: `src/components/edit-pages/EditPagesPanel.tsx`

- [ ] **Step 1: Add "Models" to EditPagesSidebar**

In `src/components/edit-pages/EditPagesSidebar.tsx`, add to `BRAND_PAGES`:

```ts
export const BRAND_PAGES: PageItem[] = [
  { slug: "about", label: "About" },
  { slug: "protocol", label: "The Protocol" },
  { slug: "contact", label: "Contact" },
  { slug: "vault", label: "Vault" },
  { slug: "models", label: "Models" },                              // ← add
  { slug: "membership-celebration", label: "Welcome — New Member" },
  { slug: "reservation", label: "Reserve My Place Popup" },
];
```

- [ ] **Step 2: Update EditPagesPanel to render ModelProfileEditor**

In `src/components/edit-pages/EditPagesPanel.tsx`:

1. Add the import at the top:

```ts
import { ModelProfileEditor } from "./ModelProfileEditor";
```

2. In the main area render block, update the `else` branch that currently shows `<PageEditor>`. Replace the three-way conditional (`showAdmin` / `products` / `PageEditor`) with a four-way one:

```tsx
{showAdmin ? (
  <AdminPanel
    currentUserId={session.userId}
    onBack={() => setShowAdmin(false)}
  />
) : activePage === "products" ? (
  <ProductEditor />
) : activePage === "models" ? (
  <ModelProfileEditor
    ref={pageEditorRef}
    liveContent={liveContent}
    customColors={palette}
    onAddCustomColor={handleAddCustomColor}
  />
) : (
  <PageEditor
    ref={pageEditorRef}
    key={activePage}
    pageSlug={activePage}
    liveContent={liveContent}
    customColors={palette}
    onAddCustomColor={handleAddCustomColor}
  />
)}
```

3. In the mobile dropdown, the "models" option will appear automatically through `BRAND_PAGES` (it already maps over `BRAND_PAGES`). No additional change needed there.

4. Update the header Preview button guard — it already hides for `products`; extend to also hide for `models`:

```tsx
{session.status === "authenticated" && !showAdmin && activePage !== "products" && activePage !== "models" && (
  <button onClick={() => setShowPreview(true)} ...>Preview</button>
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual smoke test**

Start `npm run dev`, open the site, trigger Edit Pages (click "Edit Pages" button in the bottom-right). After authenticating:
- Desktop: sidebar shows "Models" under Brand Pages
- Click "Models" — accordion editor renders with 4 model sections (Jerome, Angel, Jack, Ethan)
- Expand Jerome — text fields and Bio editor appear
- Save Draft / Publish buttons work (no console errors)
- Mobile dropdown includes "Models" option

- [ ] **Step 5: Commit**

```bash
git add src/components/edit-pages/EditPagesSidebar.tsx src/components/edit-pages/EditPagesPanel.tsx
git commit -m "feat: add Models to Edit Pages sidebar and wire ModelProfileEditor"
```

---

## Task 10: Pass modelProfiles through page.tsx + ClientPage + Portal + CollectionOverlay

**Context:** `AllPageContent` now includes `modelProfiles`. It flows server → client through the existing prop chain so `CollectionOverlay` has profiles ready to pass to `ChooseModelModal`.

**Files:**
- Modify: `src/app/ClientPage.tsx`
- Modify: `src/components/Portal.tsx`
- Modify: `src/components/CollectionOverlay.tsx` (import only, wiring in Task 11)

- [ ] **Step 1: Update ClientPage.tsx**

In `src/app/ClientPage.tsx`, the component already receives `allContent: AllPageContent`. The `Portal` component needs to receive `modelProfiles`. Update the Portal call:

```tsx
<Portal
  onAddToCart={handleAddToCart}
  allContent={allContent}
  productOverrides={productOverrides}
  modelProfiles={allContent.modelProfiles}
/>
```

Update the `PortalProps` interface (at the top of `Portal.tsx`):

```ts
interface PortalProps {
  onAddToCart: (item: LookbookContext, size: string) => void;
  allContent: AllPageContent;
  productOverrides: ProductOverride[];
  modelProfiles: ModelProfile[];
}
```

And pass `modelProfiles` to `CollectionOverlay`:

```tsx
<CollectionOverlay
  opacity={t.navOpacity}
  onAddToCart={onAddToCart}
  allContent={allContent}
  productOverrides={productOverrides}
  modelProfiles={modelProfiles}
/>
```

- [ ] **Step 2: Update Portal.tsx imports**

Add to Portal.tsx imports:

```ts
import type { ModelProfile } from "@/lib/contentTypes";
```

- [ ] **Step 3: Update CollectionOverlayProps**

In `src/components/CollectionOverlay.tsx`, add to the `CollectionOverlayProps` interface:

```ts
interface CollectionOverlayProps {
  opacity: MotionValue<number>;
  onAddToCart: (item: LookbookContext, size: string) => void;
  allContent: AllPageContent;
  productOverrides: ProductOverride[];
  modelProfiles: ModelProfile[];  // ← add
}
```

And update the function signature to accept it:

```ts
export default function CollectionOverlay({
  opacity, onAddToCart, allContent, productOverrides, modelProfiles
}: CollectionOverlayProps) {
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/ClientPage.tsx src/components/Portal.tsx src/components/CollectionOverlay.tsx
git commit -m "feat: thread modelProfiles through page → ClientPage → Portal → CollectionOverlay"
```

---

## Task 11: Wire ChooseModelModal into CollectionOverlay + add "Change Model" buttons

**Context:** This is the final wiring task. Three things happen here:
1. When a customer taps a product dot and has no saved model preference, `ChooseModelModal` opens first (defaulting to the model wearing that product), then the lookbook opens after selection.
2. "Change Model" buttons appear in `VaultOverlay` and `LookbookOverlay`.
3. Clicking "Change Model" opens `ChooseModelModal`; on selection, the modal closes (lookbook re-filters automatically via `useModelPreference`).

**Files:**
- Modify: `src/components/CollectionOverlay.tsx`
- Modify: `src/components/overlays/VaultOverlay.tsx`
- Modify: `src/components/studio/LookbookOverlay.tsx`

### Part A — CollectionOverlay wiring

- [ ] **Step 1: Add imports to CollectionOverlay**

Add near the top of `src/components/CollectionOverlay.tsx`:

```ts
import { ChooseModelModal } from "@/components/overlays/ChooseModelModal";
import { useModelPreference } from "@/hooks/useModelPreference";
import type { ModelProfile } from "@/lib/contentTypes";
```

- [ ] **Step 2: Add state for the choose-model flow**

Inside the `CollectionOverlay` function body, after the existing `useState` declarations:

```ts
const { modelId, selectModel } = useModelPreference();
const [chooseModalOpen, setChooseModalOpen] = useState(false);
const [pendingLookbookItem, setPendingLookbookItem] = useState<LookbookContext | null>(null);
const [defaultChooseModelId, setDefaultChooseModelId] = useState<string | null>(null);
```

- [ ] **Step 3: Replace the existing onOpenLookbook handler with a preference-aware one**

Currently `CollectionOverlay` uses `setLookbookDot` directly as `onOpenLookbook`. Replace it with a wrapper function:

```ts
const handleOpenLookbook = useCallback((ctx: LookbookContext) => {
  if (!modelId) {
    // No preference — find which model slot wears this product
    const modelSlot = MODEL_INVENTORY.find((s) =>
      s.outfit.some((o) => o.id === ctx.id)
    );
    setDefaultChooseModelId(modelSlot?.id ?? "jerome");
    setPendingLookbookItem(ctx);
    setChooseModalOpen(true);
  } else {
    setLookbookDot(ctx);
  }
}, [modelId]);
```

Everywhere that previously passed `setLookbookDot` as `onOpenLookbook`, pass `handleOpenLookbook` instead. There are two locations:
- Line in the normal-mode `MODEL_INVENTORY.map` (the `onOpenLookbook={setLookbookDot}` prop)
- Line in `LookbookOverlay`'s `onOpenLookbook` (actually LookbookOverlay doesn't receive this prop — the `onOpenLookbook` is on `ModelStage` → `PulseDot`)

Look for `onOpenLookbook={setLookbookDot}` in CollectionOverlay and change to `onOpenLookbook={handleOpenLookbook}`.

- [ ] **Step 4: Add handler for "Change Model" from VaultOverlay**

```ts
function handleChangeModelFromVault() {
  setDefaultChooseModelId(modelId ?? "jerome");
  setPendingLookbookItem(null);
  setChooseModalOpen(true);
}
```

- [ ] **Step 5: Add handler for "Change Model" from LookbookOverlay**

```ts
function handleChangeModelFromLookbook() {
  setDefaultChooseModelId(modelId ?? "jerome");
  setPendingLookbookItem(lookbookDot);
  setLookbookDot(null);
  setChooseModalOpen(true);
}
```

- [ ] **Step 6: Add onModelSelected handler**

```ts
function handleModelSelected(id: string) {
  selectModel(id);
  setChooseModalOpen(false);
  if (pendingLookbookItem) {
    setLookbookDot(pendingLookbookItem);
    setPendingLookbookItem(null);
  }
}
```

- [ ] **Step 7: Add onChangeModel prop to VaultOverlay call**

Find the `<VaultOverlay>` JSX in `CollectionOverlay` and add:

```tsx
<VaultOverlay
  isOpen={activeOverlay === "vault"}
  onClose={() => setActiveOverlay(null)}
  onAddToCart={(item, size) => { onAddToCart(item as LookbookContext, size); }}
  onOpenLookbook={(ctx) => { setActiveOverlay(null); setLookbookDot(ctx); }}
  onChangeModel={handleChangeModelFromVault}   // ← add
  productOverrides={productOverrides}
/>
```

- [ ] **Step 8: Add onChangeModel prop to LookbookOverlay call**

Find the `<LookbookOverlay>` JSX in `CollectionOverlay` and add:

```tsx
{lookbookDot && (
  <LookbookOverlay
    item={lookbookDot}
    onClose={() => setLookbookDot(null)}
    onAddToCart={(item, size) => { onAddToCart(item, size); }}
    onChangeModel={handleChangeModelFromLookbook}   // ← add
  />
)}
```

- [ ] **Step 9: Render ChooseModelModal in CollectionOverlay**

Near the bottom of the JSX (before the closing `</div>`), after the `<LookbookOverlay>` block:

```tsx
<ChooseModelModal
  isOpen={chooseModalOpen}
  modelProfiles={modelProfiles}
  defaultModelId={defaultChooseModelId}
  onSelect={handleModelSelected}
/>
```

### Part B — VaultOverlay "Change Model" button

- [ ] **Step 10: Add onChangeModel prop to VaultOverlay**

In `src/components/overlays/VaultOverlay.tsx`, update the `VaultOverlayProps` interface:

```ts
interface VaultOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: OutfitItem, size: string) => void;
  onOpenLookbook: (ctx: LookbookContext) => void;
  onChangeModel?: () => void;   // ← add
  productOverrides?: ProductOverride[];
}
```

Add `onChangeModel` to the destructured props and insert a "Change Model" link at the top of the vault content (after the Popper Tulimond brand line and before the vault heading). Find the `<p style={{ ... }}>Popper Tulimond</p>` element and add the button right after it:

```tsx
{onChangeModel && (
  <button
    onClick={onChangeModel}
    style={{
      background: "none",
      border: "none",
      color: "rgba(196,164,86,0.6)",
      fontFamily: "var(--font-title, serif)",
      fontSize: "9px",
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      cursor: "pointer",
      padding: "0 0 16px 0",
      display: "block",
    }}
  >
    ← Change Model
  </button>
)}
```

### Part C — LookbookOverlay "Change Model" button

- [ ] **Step 11: Add onChangeModel prop to LookbookOverlay**

In `src/components/studio/LookbookOverlay.tsx`, update `LookbookOverlayProps`:

```ts
interface LookbookOverlayProps {
  item: LookbookContext | null;
  onClose: () => void;
  onAddToCart: (item: LookbookContext, size: string) => void;
  onChangeModel?: () => void;   // ← add
}
```

In the close button area (the `<button onClick={onClose}>✕</button>`), add a "Change Model" button next to it:

```tsx
<button
  onClick={onClose}
  aria-label="Close"
  style={{
    position: "absolute", top: 0, right: 0, width: 44, height: 44,
    background: "none", border: "none", color: "white", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, zIndex: 10,
  }}
>✕</button>
{onChangeModel && (
  <button
    onClick={onChangeModel}
    style={{
      position: "absolute",
      top: 0,
      right: 44,
      height: 44,
      background: "none",
      border: "none",
      color: "rgba(196,164,86,0.7)",
      fontFamily: "var(--font-title, serif)",
      fontSize: "8px",
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      paddingRight: 12,
      zIndex: 10,
      whiteSpace: "nowrap",
    }}
  >
    Change Model
  </button>
)}
```

- [ ] **Step 12: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 13: Manual end-to-end smoke test**

Start `npm run dev`. Test these flows:

**Flow 1 — First-time customer (no preference):**
1. Clear localStorage: `localStorage.removeItem("pt_model_preference")` in browser console
2. Reload the page
3. Click the gold dot on any model
4. Click "More Details"
5. Expected: `ChooseModelModal` opens, defaulting to the model who wears that shirt
6. Swipe/arrow through all 4 models — arrows hide at boundaries
7. Click "Choose [Name]"
8. Expected: modal closes, lookbook opens for original product

**Flow 2 — Returning customer (has preference):**
1. Ensure `pt_model_preference` is set (e.g. `"angel"`) in localStorage
2. Click any product dot → "More Details"
3. Expected: lookbook opens directly, no model selector shown

**Flow 3 — Change Model from Vault:**
1. Open the Vault (nav → Vault)
2. Expected: "← Change Model" link appears near top
3. Click it — model selector opens
4. Select a model — modal closes, back in Vault

**Flow 4 — Change Model from Lookbook:**
1. Open any product's lookbook
2. Expected: "Change Model" button appears next to ✕
3. Click it — lookbook closes, model selector opens
4. Select a model — modal closes, original lookbook reopens

- [ ] **Step 14: Commit**

```bash
git add src/components/CollectionOverlay.tsx src/components/overlays/VaultOverlay.tsx src/components/studio/LookbookOverlay.tsx
git commit -m "feat: wire ChooseModelModal into CollectionOverlay with Change Model buttons"
```

---

## Task 12: Final verification + deploy

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass (inventoryIds, useModelPreference, chooseModelCarousel).

- [ ] **Step 2: Production build check**

```bash
npm run build
```

Expected: build completes with no type errors and no unresolved imports. Review any warnings.

- [ ] **Step 3: Set BLOB_READ_WRITE_TOKEN in Vercel**

In the Vercel dashboard → Project Settings → Environment Variables, add:
- `BLOB_READ_WRITE_TOKEN` — from your Vercel Blob store (Settings → Blob → your store → Token)

This is required for the video upload route to work in production. The rest of the feature works without it.

- [ ] **Step 4: Deploy**

```bash
git push origin main
```

Monitor the Vercel deployment dashboard. Confirm the build succeeds.

- [ ] **Step 5: Production smoke test**

On the live site:
1. Clear `pt_model_preference` from browser localStorage
2. Tap a product → confirm ChooseModelModal opens
3. Select a model → confirm lookbook opens
4. Open Edit Pages → Models → expand a model → fill in tagline + height + publish
5. Reload site → tap product → confirm updated tagline appears in ChooseModelModal

---

## Self-Review Results

**Spec coverage check:**
- ✅ Model ID rename (Task 2)
- ✅ `useModelPreference` hook with localStorage key `pt_model_preference` (Task 3)
- ✅ `ModelProfile` type (Task 4)
- ✅ `fetchModelProfiles()` server helper (Task 4)
- ✅ `GET /api/edit-pages/live-content?page=models` (Task 5)
- ✅ `POST /api/upload/model-video` (Task 6)
- ✅ `ChooseModelModal` full-screen carousel (Task 7)
- ✅ Store order Jerome → Angel → Jack → Ethan (Task 7, `MODEL_CAROUSEL_ORDER`)
- ✅ Default model from product's model slot (Task 11)
- ✅ No close without selecting (Task 7 — no close/dismiss button)
- ✅ Touch swipe + directional arrows, arrows hide at boundaries (Task 7)
- ✅ Video loop with image fallback (Task 7)
- ✅ `ModelProfileEditor` with accordion, all fields, video upload (Task 8)
- ✅ "Models" in Edit Pages sidebar (Task 9)
- ✅ Same Save Draft / Publish flow as other pages (Task 8, `PageEditorHandle` interface)
- ✅ "Change Model" button in VaultOverlay and LookbookOverlay (Task 11)
- ✅ `ChooseModelModal` wired into CollectionOverlay (Task 11)
- ✅ Lookbook opens after model selection (Task 11)
- ✅ `@vercel/blob` setup (Task 1, Task 6)
- ✅ LookbookOverlay Phase 1 fallback (existing behavior — empty `lookbook` array → "LOOKBOOK COMING SOON")
- ✅ DB migration for product_overrides (Task 2)
