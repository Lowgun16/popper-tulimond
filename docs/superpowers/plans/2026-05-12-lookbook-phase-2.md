# Lookbook Phase 2 — Media Bank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the empty lookbook arrays with a full cinematic 3-screen experience (version grid → deep dive → compare mode) and a CMS for Faith to manage media per model per outfit item.

**Architecture:** New public API serves published lookbook media as a flat record keyed by outfit item ID. Five new components handle the three screens and model switcher. The existing `LookbookOverlay` is rewritten to orchestrate them. The CMS editor is added as a new section inside `ModelProfileEditor`.

**Tech Stack:** Next.js App Router, React, Framer Motion, Vercel Blob, Tailwind CSS, existing `useEditPages` hook pattern.

---

## File Map

**New files:**
- `src/app/api/lookbook/media/route.ts` — public GET: all published lookbook media
- `src/app/api/upload/lookbook-media/route.ts` — auth POST: upload image or video to Blob
- `src/components/overlays/LookbookModelSwitcher.tsx` — face pill row
- `src/components/overlays/LookbookVersionGrid.tsx` — Screen 1
- `src/components/overlays/LookbookDeepDive.tsx` — Screen 2
- `src/components/overlays/LookbookCompareMode.tsx` — Screen 3
- `src/components/edit-pages/LookbookMediaEditor.tsx` — CMS editor

**Modified files:**
- `src/lib/contentTypes.ts` — add `LookbookMediaItem`, `defaultSize` to `ModelProfile`
- `src/components/studio/studioTypes.ts` — add `id` to `LookbookContext`
- `src/lib/pageContent.ts` — add `defaultSize` to `fetchModelProfiles()`
- `src/components/studio/LookbookOverlay.tsx` — rewrite as 3-screen orchestrator
- `src/components/overlays/ChooseModelModal.tsx` — add `allowDismiss` + `dismissLabel` props
- `src/components/edit-pages/ModelProfileEditor.tsx` — add Lookbook Media section
- `src/components/CollectionOverlay.tsx` — pass `modelProfiles` into `LookbookOverlay`

---

### Task 1: Types Foundation

**Files:**
- Modify: `src/lib/contentTypes.ts`
- Modify: `src/components/studio/studioTypes.ts`

- [ ] **Step 1: Add `LookbookMediaItem` and `defaultSize` to contentTypes.ts**

In `src/lib/contentTypes.ts`, add after the existing type definitions and update `ModelProfile`:

```typescript
export type LookbookMediaItem = {
  url: string;
  type: "video" | "image";
};

// In ModelProfile, add defaultSize field:
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
  defaultSize: string;
};
```

- [ ] **Step 2: Add `id` to `LookbookContext` in studioTypes.ts**

In `src/components/studio/studioTypes.ts`, find the `LookbookContext` interface (line ~29) and add `id`:

```typescript
export interface LookbookContext {
  id: string;           // ← add this — matches OutfitItem.id (e.g. "jerome-showstopper")
  name: string;
  collection: string;
  colorway: string;
  initiationPriceCents: number;
  memberPriceCents: number;
  type: AccessType;
  lookbook: LookbookItem[];
  filterDimensions?: FilterDimension[];
  story?: string;
  materials?: string;
  sizeGuide?: string;
  sizes: string[];
  sizeChart?: Record<string, { chest: string; length: string }>;
  cartImage?: string;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/logansorensen/Documents/FashionBrand && npx tsc --noEmit 2>&1 | head -30
```

Expected: errors only about `id` being missing where `LookbookContext` is constructed from `OutfitItem` — those get fixed in later tasks. If other unrelated errors appear, investigate before continuing.

- [ ] **Step 4: Fix the OutfitItem → LookbookContext cast in CollectionOverlay**

In `src/components/CollectionOverlay.tsx`, find where outfit items are passed as `LookbookContext` (look for `onOpenLookbook?.(dot as LookbookContext)`). The `OutfitItem` already has `id` — the cast will work since `OutfitItem` is a superset of `LookbookContext`. The TypeScript error should resolve automatically since `OutfitItem` has `id`.

Run `npx tsc --noEmit 2>&1 | head -20` and confirm zero new errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/contentTypes.ts src/components/studio/studioTypes.ts
git commit -m "feat: add LookbookMediaItem type, defaultSize to ModelProfile, id to LookbookContext"
```

---

### Task 2: Update `fetchModelProfiles` with `defaultSize`

**Files:**
- Modify: `src/lib/pageContent.ts`

The model default sizes are: `angel: "S"`, `jack: "M"`, `ethan: "L"`, `jerome: "XL"`.

- [ ] **Step 1: Add the size map and update `fetchModelProfiles`**

In `src/lib/pageContent.ts`, find `fetchModelProfiles()` (around line 164) and update it:

```typescript
const MODEL_DEFAULT_SIZES: Record<string, string> = {
  angel: "S",
  jack: "M",
  ethan: "L",
  jerome: "XL",
};

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
    defaultSize: MODEL_DEFAULT_SIZES[slot.id] ?? "M",
  }));
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/pageContent.ts
git commit -m "feat: add defaultSize to fetchModelProfiles (angel=S, jack=M, ethan=L, jerome=XL)"
```

---

### Task 3: Public Lookbook Media API

**Files:**
- Create: `src/app/api/lookbook/media/route.ts`

This endpoint reads published lookbook field keys (`lookbook_{outfitItemId}`) from the DB and returns them as a flat record. No auth required — this is public data.

- [ ] **Step 1: Check how `fetchRows` works for reading published content**

Read `src/lib/pageContent.ts` lines 1–50 to see the `fetchRows` and `rowsToMap` helper signatures. They read from the `page_content` table where `page_slug = X` and `status = 'published'`.

- [ ] **Step 2: Create the route**

Create `src/app/api/lookbook/media/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { LookbookMediaItem } from "@/lib/contentTypes";

export async function GET() {
  const rows = await sql`
    SELECT field_key, field_value
    FROM page_content
    WHERE page_slug = 'lookbook'
      AND status = 'published'
      AND field_key LIKE 'lookbook_%'
  `;

  const media: Record<string, LookbookMediaItem[]> = {};
  for (const row of rows) {
    const outfitItemId = (row.field_key as string).replace(/^lookbook_/, "");
    try {
      media[outfitItemId] = JSON.parse(row.field_value as string) as LookbookMediaItem[];
    } catch {
      media[outfitItemId] = [];
    }
  }

  return NextResponse.json(media);
}
```

- [ ] **Step 3: Test the endpoint**

Start the dev server: `npm run dev`

Navigate to `http://localhost:3000/api/lookbook/media` in the browser.

Expected: `{}` (empty object — no media published yet). Confirm it returns JSON with 200, not an error.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/lookbook/media/route.ts
git commit -m "feat: add public GET /api/lookbook/media endpoint"
```

---

### Task 4: Lookbook Media Upload API

**Files:**
- Create: `src/app/api/upload/lookbook-media/route.ts`

Accepts images and videos. Pattern identical to `src/app/api/upload/model-video/route.ts` but extended for images and a different Blob path.

- [ ] **Step 1: Create the route**

Create `src/app/api/upload/lookbook-media/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireSession } from "@/lib/adminAuth";

const ALLOWED_TYPES = [
  "video/mp4",
  "video/webm",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_BYTES = 200 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const outfitItemId = formData.get("outfitItemId") as string | null;

  if (!file || !outfitItemId) {
    return NextResponse.json({ error: "file and outfitItemId are required" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only .mp4, .webm, .jpg, .png, .webp files are allowed" },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 200 MB limit" }, { status: 400 });
  }

  const extMap: Record<string, string> = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const ext = extMap[file.type];
  const mediaType = file.type.startsWith("video/") ? "video" : "image";

  try {
    const blob = await put(
      `lookbook/${outfitItemId}/${Date.now()}.${ext}`,
      file,
      { access: "public", token: process.env.BLOB_PUBLIC_READ_WRITE_TOKEN }
    );
    return NextResponse.json({ url: blob.url, type: mediaType });
  } catch (err) {
    console.error("[upload/lookbook-media] put() failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/upload/lookbook-media/route.ts
git commit -m "feat: add POST /api/upload/lookbook-media for images and videos"
```

---

### Task 5: CMS — LookbookMediaEditor Component

**Files:**
- Create: `src/components/edit-pages/LookbookMediaEditor.tsx`

This component renders inside `ModelProfileEditor`. Organized: Model tabs → Product accordion → Version rows with thumbnail strip + upload button. Uses `useEditPages("lookbook")` for draft/publish.

- [ ] **Step 1: Understand the data shape needed**

Each version row manages a `LookbookMediaItem[]` stored as a JSON string under field key `lookbook_{outfitItemId}`. For example: field key `lookbook_jerome-showstopper` = `[{"url":"https://...","type":"video"},{"url":"https://...","type":"image"}]`.

The component must:
- Load drafts via `useEditPages("lookbook")`
- Parse field values from JSON strings → `LookbookMediaItem[]`
- Upload new files via POST `/api/upload/lookbook-media`
- Append the new item to the array and save the updated JSON string as a draft
- Remove items by filtering the array and saving

- [ ] **Step 2: Create the component**

Create `src/components/edit-pages/LookbookMediaEditor.tsx`:

```typescript
"use client";

import { useEffect, useState, useRef } from "react";
import { useEditPages } from "@/hooks/useEditPages";
import { MODEL_CAROUSEL_ORDER } from "@/components/overlays/ChooseModelModal";
import { MODEL_INVENTORY } from "@/data/inventory";
import type { LookbookMediaItem } from "@/lib/contentTypes";

function parseMedia(raw: string | undefined): LookbookMediaItem[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as LookbookMediaItem[]; } catch { return []; }
}

type UploadState = { outfitItemId: string; uploading: boolean; error: string | null };

export function LookbookMediaEditor() {
  const { drafts, loadDrafts, saveDraft } = useEditPages("lookbook");
  const [localDrafts, setLocalDrafts] = useState<Record<string, string>>({});
  const [activeModel, setActiveModel] = useState<string>(MODEL_CAROUSEL_ORDER[0]);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingOutfitRef = useRef<string | null>(null);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);
  useEffect(() => { setLocalDrafts(drafts); }, [drafts]);

  const modelSlot = MODEL_INVENTORY.find((s) => s.id === activeModel);
  const outfitItems = modelSlot?.outfit ?? [];

  // Group outfit items by collection
  const byCollection = outfitItems.reduce<Record<string, typeof outfitItems>>((acc, item) => {
    (acc[item.collection] ??= []).push(item);
    return acc;
  }, {});

  function getMedia(outfitItemId: string): LookbookMediaItem[] {
    return parseMedia(localDrafts[`lookbook_${outfitItemId}`]);
  }

  async function saveMedia(outfitItemId: string, items: LookbookMediaItem[]) {
    const key = `lookbook_${outfitItemId}`;
    const value = JSON.stringify(items);
    const updated = { ...localDrafts, [key]: value };
    setLocalDrafts(updated);
    await saveDraft({ [key]: value });
  }

  async function removeItem(outfitItemId: string, index: number) {
    const current = getMedia(outfitItemId);
    await saveMedia(outfitItemId, current.filter((_, i) => i !== index));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const outfitItemId = uploadingOutfitRef.current;
    if (!outfitItemId || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    setUploadState({ outfitItemId, uploading: true, error: null });

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("outfitItemId", outfitItemId);
      const res = await fetch("/api/upload/lookbook-media", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setUploadState({ outfitItemId, uploading: false, error: (err as { error?: string }).error ?? "Upload failed." });
        return;
      }
      const { url, type } = await res.json() as { url: string; type: "video" | "image" };
      await saveMedia(outfitItemId, [...getMedia(outfitItemId), { url, type }]);
      setUploadState(null);
    } catch {
      setUploadState({ outfitItemId, uploading: false, error: "Upload failed. Check connection." });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col overflow-y-auto h-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Model tabs */}
      <div className="flex border-b border-white/10 shrink-0">
        {MODEL_CAROUSEL_ORDER.map((modelId) => {
          const slot = MODEL_INVENTORY.find((s) => s.id === modelId);
          return (
            <button
              key={modelId}
              onClick={() => { setActiveModel(modelId); setExpandedProduct(null); }}
              className={`px-4 py-3 text-[9px] uppercase tracking-widest border-b-2 transition-colors ${
                activeModel === modelId
                  ? "border-[#C4A456] text-[#C4A456]"
                  : "border-transparent text-white/30 hover:text-white/60"
              }`}
            >
              {slot?.displayName ?? modelId}
            </button>
          );
        })}
      </div>

      {/* Product accordions */}
      <div className="flex flex-col divide-y divide-white/10">
        {Object.entries(byCollection).map(([collection, items]) => (
          <div key={collection}>
            <button
              onClick={() => setExpandedProduct(expandedProduct === collection ? null : collection)}
              className="w-full flex items-center justify-between px-6 py-4 text-left"
            >
              <span className="text-[10px] uppercase tracking-widest text-white/70">{collection}</span>
              <span className="text-white/30 text-sm">{expandedProduct === collection ? "−" : "+"}</span>
            </button>

            {expandedProduct === collection && (
              <div className="px-6 pb-6 flex flex-col gap-6">
                {items.map((outfitItem) => {
                  const media = getMedia(outfitItem.id);
                  const isUploading = uploadState?.outfitItemId === outfitItem.id && uploadState.uploading;
                  const error = uploadState?.outfitItemId === outfitItem.id ? uploadState.error : null;

                  return (
                    <div key={outfitItem.id} className="flex flex-col gap-2">
                      <p className="text-[9px] uppercase tracking-widest text-white/40">
                        {outfitItem.name} — {outfitItem.colorway}
                      </p>

                      {/* Thumbnail strip */}
                      {media.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {media.map((item, i) => (
                            <div key={i} className="relative group">
                              {item.type === "video" ? (
                                <video
                                  src={item.url}
                                  muted
                                  playsInline
                                  className="w-16 h-24 object-cover rounded border border-white/10"
                                />
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.url}
                                  alt=""
                                  className="w-16 h-24 object-cover rounded border border-white/10"
                                />
                              )}
                              <div className="absolute top-0 left-0 w-4 h-4 bg-black/60 flex items-center justify-center rounded-br text-[7px] text-white/40">
                                {i + 1}
                              </div>
                              <button
                                onClick={() => removeItem(outfitItem.id, i)}
                                className="absolute top-0 right-0 w-5 h-5 bg-red-900/80 text-red-300 text-[8px] rounded-bl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {media.length === 0 && (
                        <p className="text-[9px] text-white/20 italic">No media yet — upload below</p>
                      )}

                      <button
                        onClick={() => {
                          uploadingOutfitRef.current = outfitItem.id;
                          fileInputRef.current?.click();
                        }}
                        disabled={isUploading}
                        className="self-start px-4 py-2 border border-white/20 text-white/60 text-[9px] uppercase tracking-widest hover:border-white/40 disabled:opacity-40"
                      >
                        {isUploading ? "Uploading…" : media.length > 0 ? "Add More" : "Upload Photo / Video"}
                      </button>

                      {error && (
                        <p className="text-red-400 text-[10px]">{error}</p>
                      )}

                      {media.length > 0 && (
                        <p className="text-[8px] text-white/20">First item = tile cover in the Lookbook. Drag to reorder coming soon.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {outfitItems.length === 0 && (
          <p className="px-6 py-8 text-white/25 text-[10px]">
            No outfit items found for {activeModel}. Add items to their outfit array in inventory.ts first.
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/edit-pages/LookbookMediaEditor.tsx
git commit -m "feat: add LookbookMediaEditor CMS component"
```

---

### Task 6: Wire LookbookMediaEditor into ModelProfileEditor

**Files:**
- Modify: `src/components/edit-pages/ModelProfileEditor.tsx`

Add a "Lookbook Media" section below the existing model profile fields. Uses a tab toggle at the top: "Profile" | "Lookbook Media".

- [ ] **Step 1: Add tab state and import**

In `src/components/edit-pages/ModelProfileEditor.tsx`, add the import and tab state:

```typescript
import { LookbookMediaEditor } from "./LookbookMediaEditor";
```

Inside the component, add after the existing state declarations:

```typescript
const [activeTab, setActiveTab] = useState<"profile" | "lookbook">("profile");
```

- [ ] **Step 2: Add tab bar and conditional render**

Wrap the existing return content with a tab switcher. Replace the outermost `<div className="flex flex-col gap-0 overflow-y-auto h-full">` with:

```tsx
<div className="flex flex-col h-full overflow-hidden">
  {/* Tab bar */}
  <div className="flex border-b border-white/10 shrink-0">
    <button
      onClick={() => setActiveTab("profile")}
      className={`px-5 py-3 text-[9px] uppercase tracking-widest border-b-2 transition-colors ${
        activeTab === "profile"
          ? "border-[#C4A456] text-[#C4A456]"
          : "border-transparent text-white/30 hover:text-white/60"
      }`}
    >
      Profile
    </button>
    <button
      onClick={() => setActiveTab("lookbook")}
      className={`px-5 py-3 text-[9px] uppercase tracking-widest border-b-2 transition-colors ${
        activeTab === "lookbook"
          ? "border-[#C4A456] text-[#C4A456]"
          : "border-transparent text-white/30 hover:text-white/60"
      }`}
    >
      Lookbook Media
    </button>
  </div>

  {activeTab === "profile" ? (
    /* existing model profile accordion content — wrap the existing map in a div */
    <div className="flex flex-col gap-0 overflow-y-auto flex-1">
      {/* ... existing MODEL_CAROUSEL_ORDER.map(...) content unchanged ... */}
    </div>
  ) : (
    <div className="flex-1 overflow-hidden">
      <LookbookMediaEditor />
    </div>
  )}

  {showPublishModal && (
    <PublishModal
      pageName="Models"
      onConfirm={handlePublishConfirm}
      onCancel={() => setShowPublishModal(false)}
    />
  )}
</div>
```

- [ ] **Step 3: Test in browser**

Run `npm run dev`. Navigate to Edit Pages → Models. Confirm:
- "Profile" tab shows existing profile fields for each model
- "Lookbook Media" tab shows the media editor with model tabs and product accordions
- Switching between tabs works without errors

- [ ] **Step 4: Test upload flow**

In the Lookbook Media tab, select Jerome, expand "The Constable", upload a small test image. Confirm:
- Image appears in the thumbnail strip
- No error shown
- Refreshing Edit Pages and returning to the tab still shows the draft (it was saved)

- [ ] **Step 5: Commit**

```bash
git add src/components/edit-pages/ModelProfileEditor.tsx
git commit -m "feat: add Lookbook Media tab to ModelProfileEditor"
```

---

### Task 7: LookbookModelSwitcher Component

**Files:**
- Create: `src/components/overlays/LookbookModelSwitcher.tsx`

Face pill row shown at the top of all three lookbook screens.

- [ ] **Step 1: Create the component**

Create `src/components/overlays/LookbookModelSwitcher.tsx`:

```typescript
"use client";

import Image from "next/image";
import type { ModelProfile } from "@/lib/contentTypes";

interface LookbookModelSwitcherProps {
  models: ModelProfile[];
  activeModelId: string;
  onSwitch: (modelId: string) => void;
  onViewProfile: () => void;
}

export function LookbookModelSwitcher({
  models,
  activeModelId,
  onSwitch,
  onViewProfile,
}: LookbookModelSwitcherProps) {
  return (
    <div style={{
      display: "flex",
      gap: 16,
      justifyContent: "center",
      padding: "10px 16px 6px",
      flexShrink: 0,
    }}>
      {models.map((model) => {
        const isActive = model.id === activeModelId;
        return (
          <button
            key={model.id}
            onClick={() => isActive ? onViewProfile() : onSwitch(model.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {/* Face circle */}
            <div style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: isActive ? "1.5px solid #C4A456" : "1px solid rgba(255,255,255,0.15)",
              overflow: "hidden",
              position: "relative",
              background: "#1a1a1a",
            }}>
              <Image
                src={model.imageSrc}
                alt={model.displayName}
                fill
                sizes="40px"
                style={{ objectFit: "cover", objectPosition: "top center" }}
              />
              {/* Active gold dot */}
              {isActive && (
                <div style={{
                  position: "absolute",
                  bottom: 1,
                  right: 1,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#C4A456",
                  border: "1.5px solid #0a0a0a",
                }} />
              )}
            </div>

            {/* Name */}
            <p style={{
              fontFamily: "var(--font-title, serif)",
              fontSize: "6px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: isActive ? "#C4A456" : "rgba(255,255,255,0.3)",
              margin: 0,
            }}>
              {model.displayName}
            </p>

            {/* "Tap for more info" — only on active */}
            {isActive && (
              <p style={{
                fontFamily: "var(--font-body, sans-serif)",
                fontSize: "5px",
                color: "rgba(196,164,86,0.45)",
                margin: 0,
                letterSpacing: "0.06em",
                lineHeight: 1.3,
                textAlign: "center",
              }}>
                Tap for<br />more info
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/components/overlays/LookbookModelSwitcher.tsx
git commit -m "feat: add LookbookModelSwitcher face pill row component"
```

---

### Task 8: LookbookVersionGrid — Screen 1

**Files:**
- Create: `src/components/overlays/LookbookVersionGrid.tsx`

Shows all outfit items for the active model in the same collection. Each tile: looping video (fallback to image). Compare button at bottom.

- [ ] **Step 1: Create the component**

Create `src/components/overlays/LookbookVersionGrid.tsx`:

```typescript
"use client";

import { useState } from "react";
import Image from "next/image";
import type { OutfitItem } from "@/data/inventory";
import type { LookbookMediaItem } from "@/lib/contentTypes";

interface LookbookVersionGridProps {
  productName: string;
  versions: OutfitItem[];
  media: Record<string, LookbookMediaItem[]>;
  onSelectVersion: (item: OutfitItem) => void;
  onCompare: (selected: [OutfitItem, OutfitItem]) => void;
}

export function LookbookVersionGrid({
  productName,
  versions,
  media,
  onSelectVersion,
  onCompare,
}: LookbookVersionGridProps) {
  const [compareSelections, setCompareSelections] = useState<OutfitItem[]>([]);
  const [compareMode, setCompareMode] = useState(false);

  function toggleCompareSelection(item: OutfitItem) {
    setCompareSelections((prev) => {
      if (prev.find((p) => p.id === item.id)) {
        return prev.filter((p) => p.id !== item.id);
      }
      if (prev.length >= 2) return prev;
      return [...prev, item];
    });
  }

  function activateCompare() {
    if (compareSelections.length === 2) {
      onCompare([compareSelections[0], compareSelections[1]]);
    }
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0, overflow: "hidden" }}>
      {/* Product label */}
      <p style={{
        fontFamily: "var(--font-title, serif)",
        fontSize: "9px",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.3)",
        textAlign: "center",
        padding: "8px 0 4px",
        flexShrink: 0,
      }}>
        {productName}
      </p>

      {/* Version grid */}
      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
        padding: "0 16px",
        overflowY: "auto",
      }}>
        {versions.map((version) => {
          const versionMedia = media[version.id] ?? [];
          const cover = versionMedia[0];
          const isSelectedForCompare = compareSelections.find((s) => s.id === version.id);

          return (
            <button
              key={version.id}
              onClick={() => compareMode ? toggleCompareSelection(version) : onSelectVersion(version)}
              style={{
                background: "none",
                border: isSelectedForCompare
                  ? "1.5px solid #C4A456"
                  : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 4,
                padding: 0,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Media tile */}
              <div style={{ aspectRatio: "2/3", position: "relative", background: "#111", width: "100%" }}>
                {cover?.type === "video" ? (
                  <video
                    key={cover.url}
                    src={cover.url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
                  />
                ) : cover?.type === "image" ? (
                  <Image
                    src={cover.url}
                    alt={version.name}
                    fill
                    sizes="160px"
                    style={{ objectFit: "cover", objectPosition: "top center" }}
                  />
                ) : version.productImage ? (
                  <Image
                    src={version.productImage}
                    alt={version.name}
                    fill
                    sizes="160px"
                    style={{ objectFit: "cover", objectPosition: "top center" }}
                  />
                ) : (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#333", fontSize: 24 }}>▶</span>
                  </div>
                )}

                {/* Compare checkmark overlay */}
                {compareMode && isSelectedForCompare && (
                  <div style={{
                    position: "absolute", top: 6, right: 6,
                    width: 18, height: 18, borderRadius: "50%",
                    background: "#C4A456", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ color: "#0a0a0a", fontSize: 10 }}>✓</span>
                  </div>
                )}
              </div>

              {/* Label */}
              <div style={{ padding: "6px 8px" }}>
                <p style={{
                  fontFamily: "var(--font-title, serif)",
                  fontSize: "7px",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: isSelectedForCompare ? "#C4A456" : "rgba(255,255,255,0.6)",
                  margin: 0,
                  textAlign: "center",
                  lineHeight: 1.4,
                }}>
                  {version.name}<br />
                  <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "6px" }}>{version.colorway}</span>
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Compare bar */}
      <div style={{ padding: "10px 16px 16px", flexShrink: 0, display: "flex", gap: 8 }}>
        {!compareMode ? (
          <button
            onClick={() => setCompareMode(true)}
            style={{
              flex: 1, background: "none",
              border: "1px solid rgba(196,164,86,0.35)",
              color: "rgba(196,164,86,0.7)",
              fontFamily: "var(--font-title, serif)",
              fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase",
              padding: "10px", cursor: "pointer", borderRadius: 2,
            }}
          >
            Compare
          </button>
        ) : (
          <>
            <button
              onClick={() => { setCompareMode(false); setCompareSelections([]); }}
              style={{
                background: "none", border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.4)",
                fontFamily: "var(--font-title, serif)",
                fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase",
                padding: "10px 16px", cursor: "pointer", borderRadius: 2,
              }}
            >
              Cancel
            </button>
            <button
              onClick={activateCompare}
              disabled={compareSelections.length < 2}
              style={{
                flex: 1,
                background: compareSelections.length === 2 ? "#C4A456" : "rgba(196,164,86,0.15)",
                border: "none",
                color: compareSelections.length === 2 ? "#0a0a0a" : "rgba(196,164,86,0.4)",
                fontFamily: "var(--font-title, serif)",
                fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase",
                padding: "10px", cursor: compareSelections.length === 2 ? "pointer" : "default",
                borderRadius: 2, transition: "all 0.2s",
              }}
            >
              {compareSelections.length === 0
                ? "Select 2 to Compare"
                : compareSelections.length === 1
                ? "Select 1 More"
                : "Activate Compare →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/components/overlays/LookbookVersionGrid.tsx
git commit -m "feat: add LookbookVersionGrid (Screen 1) with compare selection"
```

---

### Task 9: LookbookDeepDive — Screen 2

**Files:**
- Create: `src/components/overlays/LookbookDeepDive.tsx`

Sticky 2/3 media carousel at top, scrollable product info below (peeks on entry). Size pre-selected from model, fully editable. Add to Cart at bottom of scroll.

- [ ] **Step 1: Create the component**

Create `src/components/overlays/LookbookDeepDive.tsx`:

```typescript
"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import type { OutfitItem } from "@/data/inventory";
import type { LookbookMediaItem } from "@/lib/contentTypes";
import { formatPrice } from "@/lib/formatPrice";
import { playCartAddSound } from "@/lib/sounds";

function isVideo(item: LookbookMediaItem) { return item.type === "video"; }

interface LookbookDeepDiveProps {
  item: OutfitItem;
  media: LookbookMediaItem[];
  defaultSize: string;
  isMember: boolean;
  onExit: () => void;
  onAddToCart: (item: OutfitItem, size: string) => void;
}

export function LookbookDeepDive({
  item,
  media,
  defaultSize,
  isMember,
  onExit,
  onAddToCart,
}: LookbookDeepDiveProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState(defaultSize);
  const [added, setAdded] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const count = media.length;

  const prev = useCallback(() => setActiveIdx((i) => (i - 1 + Math.max(count, 1)) % Math.max(count, 1)), [count]);
  const next = useCallback(() => setActiveIdx((i) => (i + 1) % Math.max(count, 1)), [count]);

  function handleTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX; }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx < -50) next();
    else if (dx > 50) prev();
  }

  function handleAddToCart() {
    if (!selectedSize) return;
    onAddToCart(item, selectedSize);
    playCartAddSound();
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  const price = isMember ? item.memberPriceCents : item.initiationPriceCents;
  const current = media[activeIdx];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Sticky media area — 2/3 height */}
      <div
        style={{ height: "62%", flexShrink: 0, position: "relative", background: "#111" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top bar */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 2,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 14px",
          background: "linear-gradient(rgba(0,0,0,0.5), transparent)",
        }}>
          <button onClick={onExit} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 11, cursor: "pointer", padding: 0, fontFamily: "var(--font-body, sans-serif)", letterSpacing: "0.08em" }}>
            ← Exit
          </button>
          <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(196,164,86,0.85)", margin: 0 }}>
            {item.name}
          </p>
          {count > 0 && (
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "var(--font-body, sans-serif)" }}>
              {activeIdx + 1} / {count}
            </span>
          )}
        </div>

        {/* Media */}
        {count === 0 ? (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {item.productImage ? (
              <Image src={item.productImage} alt={item.name} fill sizes="100vw" style={{ objectFit: "cover", objectPosition: "top center" }} />
            ) : (
              <span style={{ color: "#333", fontSize: 28 }}>▶</span>
            )}
          </div>
        ) : isVideo(current) ? (
          <video key={current.url} src={current.url} autoPlay loop muted playsInline
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
        ) : (
          <Image key={current.url} src={current.url} alt={item.name} fill sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "top center" }} />
        )}

        {/* Arrows */}
        {count > 1 && activeIdx > 0 && (
          <button onClick={prev} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 20, width: 32, height: 32, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
        )}
        {count > 1 && activeIdx < count - 1 && (
          <button onClick={next} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 20, width: 32, height: 32, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
        )}

        {/* Dot indicators */}
        {count > 1 && (
          <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", gap: 5, justifyContent: "center" }}>
            {media.map((_, i) => (
              <button key={i} onClick={() => setActiveIdx(i)} style={{ width: 5, height: 5, borderRadius: "50%", background: i === activeIdx ? "#C4A456" : "rgba(255,255,255,0.25)", border: "none", padding: 0, cursor: "pointer" }} />
            ))}
          </div>
        )}
      </div>

      {/* Scrollable info — peeks up so customer knows to scroll */}
      <div style={{ flex: 1, overflowY: "auto", background: "#0d0d0d", padding: "14px 20px 32px" }}>
        {/* Drag handle hint */}
        <div style={{ width: 32, height: 2, background: "rgba(255,255,255,0.12)", borderRadius: 1, margin: "0 auto 14px" }} />

        <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "9px", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(196,164,86,0.7)", margin: "0 0 4px" }}>
          {item.collection} · {item.name}
        </p>
        <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "rgba(255,255,255,0.45)", margin: "0 0 4px" }}>
          {item.colorway}
        </p>

        {item.story && (
          <p style={{ fontFamily: "var(--font-display, serif)", fontSize: "12px", fontWeight: 300, fontStyle: "italic", color: "rgba(240,232,215,0.6)", lineHeight: 1.6, margin: "12px 0" }}>
            {item.story}
          </p>
        )}

        {item.materials && (
          <>
            <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "16px 0 6px" }}>Materials</p>
            <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, margin: 0 }}>{item.materials}</p>
          </>
        )}

        {item.sizeGuide && (
          <>
            <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "16px 0 6px" }}>Size Guide</p>
            <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, margin: 0 }}>{item.sizeGuide}</p>
          </>
        )}

        {item.sizeChart && Object.keys(item.sizeChart).length > 0 && (
          <>
            <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "16px 0 8px" }}>Size Chart</p>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
              <thead>
                <tr>
                  <th style={{ fontFamily: "var(--font-title, serif)", fontSize: "7px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)", textAlign: "left", paddingBottom: 4, fontWeight: 400 }}>Size</th>
                  <th style={{ fontFamily: "var(--font-title, serif)", fontSize: "7px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)", textAlign: "left", paddingBottom: 4, fontWeight: 400 }}>Chest</th>
                  <th style={{ fontFamily: "var(--font-title, serif)", fontSize: "7px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)", textAlign: "left", paddingBottom: 4, fontWeight: 400 }}>Length</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(item.sizeChart).map(([size, dims]) => (
                  <tr key={size}>
                    <td style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "rgba(255,255,255,0.5)", padding: "3px 0" }}>{size}</td>
                    <td style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "rgba(255,255,255,0.5)", padding: "3px 0" }}>{dims.chest}</td>
                    <td style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "rgba(255,255,255,0.5)", padding: "3px 0" }}>{dims.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Size selector */}
        <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "16px 0 8px" }}>Select Size</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {item.sizes.map((size) => (
            <button
              key={size}
              onClick={() => setSelectedSize(size)}
              style={{
                padding: "8px 14px",
                border: selectedSize === size ? "1px solid #C4A456" : "1px solid rgba(255,255,255,0.15)",
                background: selectedSize === size ? "rgba(196,164,86,0.1)" : "none",
                color: selectedSize === size ? "#C4A456" : "rgba(255,255,255,0.5)",
                fontFamily: "var(--font-title, serif)",
                fontSize: "9px",
                letterSpacing: "0.15em",
                cursor: "pointer",
                borderRadius: 1,
                transition: "all 0.15s",
              }}
            >
              {size}
            </button>
          ))}
        </div>
        <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "9px", color: "rgba(255,255,255,0.2)", margin: "0 0 16px" }}>
          Pre-selected based on your model. Change anytime.
        </p>

        {/* Add to Cart */}
        <button
          onClick={handleAddToCart}
          style={{
            width: "100%",
            padding: "16px",
            background: added ? "rgba(56,161,105,0.15)" : "#C4A456",
            border: added ? "1px solid rgba(56,161,105,0.4)" : "none",
            color: added ? "#68D391" : "#0a0a0a",
            fontFamily: "var(--font-title, serif)",
            fontSize: "10px",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {added ? "Added ✓" : `Add to Cart — ${formatPrice(price)}`}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors. If `formatPrice` import path is wrong, check `src/lib/formatPrice.ts` exists and adjust the import.

- [ ] **Step 3: Commit**

```bash
git add src/components/overlays/LookbookDeepDive.tsx
git commit -m "feat: add LookbookDeepDive (Screen 2) with sticky media and scrollable product info"
```

---

### Task 10: LookbookCompareMode — Screen 3

**Files:**
- Create: `src/components/overlays/LookbookCompareMode.tsx`

Side-by-side panels (4:9 ratio). Three states: neutral, one crowned, both-explored nudge.

- [ ] **Step 1: Create the component**

Create `src/components/overlays/LookbookCompareMode.tsx`:

```typescript
"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import type { OutfitItem } from "@/data/inventory";
import type { LookbookMediaItem } from "@/lib/contentTypes";
import { formatPrice } from "@/lib/formatPrice";
import { playCartAddSound } from "@/lib/sounds";

interface ComparePanelProps {
  item: OutfitItem;
  media: LookbookMediaItem[];
  dimmed: boolean;
  onTap: () => void;
}

function ComparePanel({ item, media, dimmed, onTap }: ComparePanelProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const count = media.length;

  function handleTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX; }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx < -40 && activeIdx < count - 1) setActiveIdx((i) => i + 1);
    else if (dx > 40 && activeIdx > 0) setActiveIdx((i) => i - 1);
  }

  const current = media[activeIdx];

  return (
    <div
      style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, opacity: dimmed ? 0.28 : 1, transition: "opacity 0.25s" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "6px", letterSpacing: "0.1em", textTransform: "uppercase", color: dimmed ? "rgba(255,255,255,0.4)" : "rgba(196,164,86,0.8)", textAlign: "center", margin: 0 }}>
        {item.name}
      </p>
      <button
        onClick={onTap}
        style={{ background: "none", border: dimmed ? "none" : "1px solid rgba(196,164,86,0.4)", borderRadius: 3, padding: 0, cursor: "pointer", position: "relative", overflow: "hidden", aspectRatio: "4/9", width: "100%" }}
      >
        {/* Media */}
        {!current ? (
          item.productImage ? (
            <Image src={item.productImage} alt={item.name} fill sizes="50vw" style={{ objectFit: "cover", objectPosition: "top center" }} />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1a" }}>
              <span style={{ color: "#333", fontSize: 20 }}>▶</span>
            </div>
          )
        ) : current.type === "video" ? (
          <video key={current.url} src={current.url} autoPlay loop muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
        ) : (
          <Image key={current.url} src={current.url} alt={item.name} fill sizes="50vw" style={{ objectFit: "cover", objectPosition: "top center" }} />
        )}

        {/* Nav arrows + counter */}
        {count > 1 && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 6px", background: "linear-gradient(transparent, rgba(0,0,0,0.6))" }}>
            <span style={{ color: activeIdx > 0 ? "rgba(255,255,255,0.5)" : "transparent", fontSize: 12 }}>‹</span>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "5px", fontFamily: "var(--font-body, sans-serif)" }}>{activeIdx + 1}/{count}</span>
            <span style={{ color: activeIdx < count - 1 ? "rgba(255,255,255,0.5)" : "transparent", fontSize: 12 }}>›</span>
          </div>
        )}
      </button>
    </div>
  );
}

interface LookbookCompareModeProps {
  versions: [OutfitItem, OutfitItem];
  media: Record<string, LookbookMediaItem[]>;
  defaultSize: string;
  isMember: boolean;
  onBack: () => void;
  onAddToCart: (item: OutfitItem, size: string) => void;
}

export function LookbookCompareMode({
  versions,
  media,
  defaultSize,
  isMember,
  onBack,
  onAddToCart,
}: LookbookCompareModeProps) {
  const [crowned, setCrowned] = useState<string | null>(null);
  const [exploredBoth, setExploredBoth] = useState(false);
  const exploredRef = useRef<Set<string>>(new Set());
  const [selectedSize, setSelectedSize] = useState(defaultSize);
  const [added, setAdded] = useState<string | null>(null);

  const [left, right] = versions;

  function handleTap(itemId: string) {
    if (crowned === itemId) {
      setCrowned(null);
    } else {
      setCrowned(itemId);
      exploredRef.current.add(itemId);
      if (exploredRef.current.has(left.id) && exploredRef.current.has(right.id)) {
        setExploredBoth(true);
      }
    }
  }

  function handleAddToCart(item: OutfitItem) {
    onAddToCart(item, selectedSize);
    playCartAddSound();
    setAdded(item.id);
    setTimeout(() => setAdded(null), 2000);
  }

  function handleAddBoth() {
    onAddToCart(left, selectedSize);
    onAddToCart(right, selectedSize);
    playCartAddSound();
    setAdded("both");
    setTimeout(() => setAdded(null), 2000);
  }

  const crownedItem = crowned === left.id ? left : crowned === right.id ? right : null;
  const crownedItemMedia = crownedItem ? media[crownedItem.id] ?? [] : [];
  const crownedPrice = crownedItem ? (isMember ? crownedItem.memberPriceCents : crownedItem.initiationPriceCents) : 0;
  const bothPrice = (isMember ? left.memberPriceCents : left.initiationPriceCents) + (isMember ? right.memberPriceCents : right.initiationPriceCents);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 11, cursor: "pointer", padding: 0, fontFamily: "var(--font-body, sans-serif)", letterSpacing: "0.08em" }}>← Back</button>
        <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(196,164,86,0.6)", margin: 0 }}>Compare</p>
        <div style={{ width: 40 }} />
      </div>

      {/* Panels */}
      <div style={{ display: "flex", gap: 8, padding: "0 14px", flexShrink: 0 }}>
        <ComparePanel item={left} media={media[left.id] ?? []} dimmed={crowned !== null && crowned !== left.id} onTap={() => handleTap(left.id)} />
        <div style={{ width: 1, background: "rgba(196,164,86,0.15)", alignSelf: "stretch" }} />
        <ComparePanel item={right} media={media[right.id] ?? []} dimmed={crowned !== null && crowned !== right.id} onTap={() => handleTap(right.id)} />
      </div>

      {/* Info area — changes based on state */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 24px" }}>

        {/* State ①: Neutral */}
        {!crowned && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, paddingTop: 8 }}>
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", width: "100%", marginBottom: 4 }} />
            <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(196,164,86,0.45)", margin: 0 }}>
              Tap a version to explore it
            </p>
            <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "10px", color: "rgba(255,255,255,0.2)", textAlign: "center", lineHeight: 1.6, margin: 0 }}>
              {exploredBoth
                ? "Still deciding? Why not both."
                : "Swipe each side independently.\nTap the one you want to learn more about."}
            </p>

            {/* Size selector (shown in neutral so customer can pre-set before crowning) */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>
              {left.sizes.map((size) => (
                <button key={size} onClick={() => setSelectedSize(size)} style={{ padding: "5px 10px", border: selectedSize === size ? "1px solid #C4A456" : "1px solid rgba(255,255,255,0.12)", background: selectedSize === size ? "rgba(196,164,86,0.1)" : "none", color: selectedSize === size ? "#C4A456" : "rgba(255,255,255,0.35)", fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.1em", cursor: "pointer", borderRadius: 1 }}>
                  {size}
                </button>
              ))}
            </div>

            {/* Add Both — appears after both explored */}
            {exploredBoth && (
              <button
                onClick={handleAddBoth}
                style={{ marginTop: 8, background: "none", border: "1px solid rgba(196,164,86,0.3)", color: "rgba(196,164,86,0.6)", fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.15em", textTransform: "uppercase", padding: "10px 24px", cursor: "pointer", borderRadius: 1, width: "100%" }}
              >
                {added === "both" ? "Added Both ✓" : `Take both home — ${formatPrice(bothPrice)}`}
              </button>
            )}
          </div>
        )}

        {/* State ②: One crowned */}
        {crownedItem && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ height: 1, background: "rgba(196,164,86,0.2)", marginBottom: 4 }} />
            <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(196,164,86,0.7)", margin: 0 }}>
              {crownedItem.collection} · {crownedItem.name}
            </p>
            <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "10px", color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.5 }}>
              {crownedItem.colorway}
            </p>
            {crownedItem.story && (
              <p style={{ fontFamily: "var(--font-display, serif)", fontSize: "11px", fontWeight: 300, fontStyle: "italic", color: "rgba(240,232,215,0.55)", lineHeight: 1.6, margin: "4px 0" }}>
                {crownedItem.story}
              </p>
            )}
            <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "9px", color: "rgba(255,255,255,0.2)", margin: "4px 0 2px", letterSpacing: "0.08em" }}>↓ Tap dimmed side to switch</p>

            {/* Size selector */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {crownedItem.sizes.map((size) => (
                <button key={size} onClick={() => setSelectedSize(size)} style={{ padding: "5px 10px", border: selectedSize === size ? "1px solid #C4A456" : "1px solid rgba(255,255,255,0.12)", background: selectedSize === size ? "rgba(196,164,86,0.1)" : "none", color: selectedSize === size ? "#C4A456" : "rgba(255,255,255,0.35)", fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.1em", cursor: "pointer", borderRadius: 1 }}>
                  {size}
                </button>
              ))}
            </div>

            {/* Add to Cart */}
            <button onClick={() => handleAddToCart(crownedItem)} style={{ background: added === crownedItem.id ? "rgba(56,161,105,0.15)" : "#C4A456", border: added === crownedItem.id ? "1px solid rgba(56,161,105,0.4)" : "none", color: added === crownedItem.id ? "#68D391" : "#0a0a0a", fontFamily: "var(--font-title, serif)", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", padding: "12px", cursor: "pointer", width: "100%", borderRadius: 1 }}>
              {added === crownedItem.id ? "Added ✓" : `Add to Cart — ${formatPrice(crownedPrice)}`}
            </button>

            {/* Or Add Both */}
            <button onClick={handleAddBoth} style={{ background: "none", border: "1px solid rgba(196,164,86,0.2)", color: "rgba(196,164,86,0.5)", fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.15em", textTransform: "uppercase", padding: "9px", cursor: "pointer", width: "100%", borderRadius: 1 }}>
              {added === "both" ? "Added Both ✓" : `Or Add Both — ${formatPrice(bothPrice)}`}
            </button>

            <button onClick={() => setCrowned(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.2)", fontSize: "9px", fontFamily: "var(--font-body, sans-serif)", letterSpacing: "0.08em", cursor: "pointer", padding: "4px 0", textAlign: "center" }}>
              Tap again to deselect
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/components/overlays/LookbookCompareMode.tsx
git commit -m "feat: add LookbookCompareMode (Screen 3) with crown/dim/add-both logic"
```

---

### Task 11: Rewrite LookbookOverlay as 3-Screen Orchestrator

**Files:**
- Modify: `src/components/studio/LookbookOverlay.tsx`

Replace the filter-based LookbookOverlay with the new orchestrator. Manages: current screen, active model, fetching media, passing to sub-components.

- [ ] **Step 1: Read the existing file top-to-bottom before editing**

Read `src/components/studio/LookbookOverlay.tsx` fully so nothing useful is accidentally dropped.

- [ ] **Step 2: Rewrite the file**

Replace the entire contents of `src/components/studio/LookbookOverlay.tsx` with:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import OverlayPortal from "@/components/OverlayPortal";
import { LookbookModelSwitcher } from "@/components/overlays/LookbookModelSwitcher";
import { LookbookVersionGrid } from "@/components/overlays/LookbookVersionGrid";
import { LookbookDeepDive } from "@/components/overlays/LookbookDeepDive";
import { LookbookCompareMode } from "@/components/overlays/LookbookCompareMode";
import { ChooseModelModal } from "@/components/overlays/ChooseModelModal";
import { MODEL_INVENTORY } from "@/data/inventory";
import type { OutfitItem } from "@/data/inventory";
import type { LookbookContext } from "./studioTypes";
import type { ModelProfile, LookbookMediaItem } from "@/lib/contentTypes";

type Screen = "grid" | "deepdive" | "compare";

interface LookbookOverlayProps {
  item: LookbookContext | null;
  onClose: () => void;
  onAddToCart: (item: LookbookContext, size: string) => void;
  onChangeModel?: () => void;
  modelProfiles: ModelProfile[];
  activeModelId: string;
  onSwitchModel: (modelId: string) => void;
  isMember?: boolean;
}

export function LookbookOverlay({
  item,
  onClose,
  onAddToCart,
  modelProfiles,
  activeModelId,
  onSwitchModel,
  isMember = false,
}: LookbookOverlayProps) {
  const [screen, setScreen] = useState<Screen>("grid");
  const [selectedVersion, setSelectedVersion] = useState<OutfitItem | null>(null);
  const [compareVersions, setCompareVersions] = useState<[OutfitItem, OutfitItem] | null>(null);
  const [allMedia, setAllMedia] = useState<Record<string, LookbookMediaItem[]>>({});
  const [showProfileCarousel, setShowProfileCarousel] = useState(false);

  // Fetch all published lookbook media when overlay opens
  useEffect(() => {
    if (!item) return;
    fetch("/api/lookbook/media")
      .then((r) => r.json())
      .then((data: Record<string, LookbookMediaItem[]>) => setAllMedia(data))
      .catch(() => setAllMedia({}));
  }, [item]);

  // Reset to grid when model switches
  useEffect(() => {
    setScreen("grid");
    setSelectedVersion(null);
    setCompareVersions(null);
  }, [activeModelId]);

  // Get all outfit items for active model in the same collection as the tapped item
  const activeSlot = MODEL_INVENTORY.find((s) => s.id === activeModelId);
  const versions: OutfitItem[] = item
    ? (activeSlot?.outfit ?? []).filter((o) => o.collection === item.collection)
    : [];

  const activeProfile = modelProfiles.find((p) => p.id === activeModelId);
  const defaultSize = activeProfile?.defaultSize ?? "M";

  function handleSelectVersion(version: OutfitItem) {
    setSelectedVersion(version);
    setScreen("deepdive");
  }

  function handleCompare(selected: [OutfitItem, OutfitItem]) {
    setCompareVersions(selected);
    setScreen("compare");
  }

  function handleAddToCartFromOverlay(outfitItem: OutfitItem, size: string) {
    // Cast OutfitItem back to LookbookContext shape for the parent handler
    onAddToCart(outfitItem as unknown as LookbookContext, size);
  }

  const handleSwitchModel = useCallback((modelId: string) => {
    onSwitchModel(modelId);
  }, [onSwitchModel]);

  if (!item) return null;

  return (
    <OverlayPortal>
      <AnimatePresence>
        <motion.div
          key="lookbook-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: "fixed", inset: 0, zIndex: 6000,
            background: "rgba(6,6,6,0.97)",
            backdropFilter: "blur(24px)",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}
        >
          {/* Close button */}
          <div style={{ position: "absolute", top: 14, right: 16, zIndex: 10 }}>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 14, cursor: "pointer", padding: 4, fontFamily: "var(--font-body, sans-serif)" }}>✕</button>
          </div>

          {/* Model switcher — always visible at top */}
          <LookbookModelSwitcher
            models={modelProfiles}
            activeModelId={activeModelId}
            onSwitch={handleSwitchModel}
            onViewProfile={() => setShowProfileCarousel(true)}
          />

          {/* Screens */}
          <AnimatePresence mode="wait">
            {screen === "grid" && (
              <motion.div key="grid" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }} style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <LookbookVersionGrid
                  productName={item.collection}
                  versions={versions}
                  media={allMedia}
                  onSelectVersion={handleSelectVersion}
                  onCompare={handleCompare}
                />
              </motion.div>
            )}

            {screen === "deepdive" && selectedVersion && (
              <motion.div key="deepdive" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }} style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <LookbookDeepDive
                  item={selectedVersion}
                  media={allMedia[selectedVersion.id] ?? []}
                  defaultSize={defaultSize}
                  isMember={isMember}
                  onExit={() => setScreen("grid")}
                  onAddToCart={handleAddToCartFromOverlay}
                />
              </motion.div>
            )}

            {screen === "compare" && compareVersions && (
              <motion.div key="compare" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }} style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <LookbookCompareMode
                  versions={compareVersions}
                  media={allMedia}
                  defaultSize={defaultSize}
                  isMember={isMember}
                  onBack={() => setScreen("grid")}
                  onAddToCart={handleAddToCartFromOverlay}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* Profile carousel — reuses ChooseModelModal with dismissLabel */}
      {showProfileCarousel && (
        <ChooseModelModal
          isOpen={showProfileCarousel}
          modelProfiles={modelProfiles}
          defaultModelId={activeModelId}
          onSelect={(modelId) => {
            onSwitchModel(modelId);
            setShowProfileCarousel(false);
          }}
          onDismiss={() => setShowProfileCarousel(false)}
          dismissLabel="← Back to Lookbook"
        />
      )}
    </OverlayPortal>
  );
}
```

- [ ] **Step 3: Check for OverlayPortal import**

Read `src/components/OverlayPortal.tsx` to verify the import path is correct. If the file doesn't exist, check `src/components/Portal.tsx` and use that import instead.

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Resolve any errors. Common ones:
- `OutfitItem` not exported from `@/data/inventory` — add `export` keyword to the interface in `inventory.ts`
- `OverlayPortal` path mismatch — fix the import

- [ ] **Step 5: Commit**

```bash
git add src/components/studio/LookbookOverlay.tsx
git commit -m "feat: rewrite LookbookOverlay as 3-screen orchestrator (grid/deepdive/compare)"
```

---

### Task 12: Add `dismissLabel` to ChooseModelModal

**Files:**
- Modify: `src/components/overlays/ChooseModelModal.tsx`

The modal needs a custom dismiss label when opened from within the lookbook ("← Back to Lookbook" instead of "✕").

- [ ] **Step 1: Add `dismissLabel` prop**

In `src/components/overlays/ChooseModelModal.tsx`, update the interface and the close button:

```typescript
interface ChooseModelModalProps {
  isOpen: boolean;
  modelProfiles: ModelProfile[];
  defaultModelId?: string | null;
  onSelect: (modelId: string) => void;
  onDismiss?: () => void;
  dismissLabel?: string;   // ← add this
}
```

Update the close button (currently renders "✕") to use the label:

```tsx
{onDismiss && (
  <button
    onClick={onDismiss}
    aria-label="Close"
    style={{
      position: "absolute",
      top: 16,
      right: 16,
      background: "none",
      border: "none",
      color: "rgba(255,255,255,0.35)",
      fontSize: dismissLabel ? 11 : 18,
      cursor: "pointer",
      lineHeight: 1,
      padding: 4,
      fontFamily: dismissLabel ? "var(--font-body, sans-serif)" : undefined,
      letterSpacing: dismissLabel ? "0.08em" : undefined,
    }}
  >
    {dismissLabel ?? "✕"}
  </button>
)}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/components/overlays/ChooseModelModal.tsx
git commit -m "feat: add dismissLabel prop to ChooseModelModal for lookbook back-button"
```

---

### Task 13: Wire into CollectionOverlay

**Files:**
- Modify: `src/components/CollectionOverlay.tsx`

Pass `modelProfiles`, `activeModelId`, and `onSwitchModel` into `LookbookOverlay`. The `modelId` and `selectModel` are already available via `useModelPreference`.

- [ ] **Step 1: Read the LookbookOverlay render block**

In `src/components/CollectionOverlay.tsx`, find the block starting at `{lookbookDot && (` (around line 779). It currently renders the old `LookbookOverlay`. Update it to pass the new props:

```tsx
{lookbookDot && (
  <LookbookOverlay
    item={lookbookDot}
    onClose={() => setLookbookDot(null)}
    onAddToCart={(item, size) => {
      onAddToCart(item, size);
    }}
    modelProfiles={modelProfiles}
    activeModelId={modelId ?? "jerome"}
    onSwitchModel={(newModelId) => {
      selectModel(newModelId);
    }}
    isMember={false}
  />
)}
```

- [ ] **Step 2: Check `isMember` availability**

Search for how member status is determined in `CollectionOverlay`. Look for `session`, `role`, or `isMember` references. Pass the correct value. If not available at this level, pass `false` for now — the price displayed will use `initiationPriceCents`.

- [ ] **Step 3: Verify the VaultOverlay LookbookOverlay call**

There is a second place in CollectionOverlay where `LookbookOverlay` / the lookbook is opened (from the Vault, around line 860). Find it and update it with the same new props.

- [ ] **Step 4: Remove the `onChangeModel` prop**

The new `LookbookOverlay` no longer needs `onChangeModel` — model switching is handled internally via `onSwitchModel`. Remove any remaining `onChangeModel` prop usages.

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Resolve all errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/CollectionOverlay.tsx
git commit -m "feat: wire new LookbookOverlay into CollectionOverlay with model switching"
```

---

### Task 14: Export `OutfitItem` from inventory.ts

**Files:**
- Modify: `src/data/inventory.ts`

`LookbookVersionGrid`, `LookbookDeepDive`, and `LookbookCompareMode` all import `OutfitItem` from `@/data/inventory`. Confirm it's exported.

- [ ] **Step 1: Check current exports**

```bash
grep "^export interface OutfitItem\|^export type OutfitItem" /Users/logansorensen/Documents/FashionBrand/src/data/inventory.ts
```

Expected: should print the interface line. If nothing prints, the interface exists but isn't exported.

- [ ] **Step 2: Add export if missing**

If `OutfitItem` is not exported, find `interface OutfitItem` and change it to `export interface OutfitItem`. Same for `ModelSlot` if it's referenced externally.

- [ ] **Step 3: Final TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: 0 errors.

- [ ] **Step 4: Start dev server and smoke test**

```bash
npm run dev
```

Navigate to the site. Tap a model's dot to trigger "More Info" flow:
1. ChooseModelModal opens → select a model
2. LookbookOverlay opens → model switcher pills visible at top
3. Version grid shows outfit items for that model
4. Tap a tile → Deep Dive screen opens with sticky media and scrollable info
5. Exit → back to grid
6. Tap Compare → select 2 → compare mode opens
7. Tap one panel → it crowns, other dims, info appears below
8. "Or Add Both" button visible
9. Tap active panel again → deselects, returns to neutral state
10. Tap selected model pill → ChooseModelModal opens with "← Back to Lookbook"
11. Close → returns to lookbook unchanged

- [ ] **Step 5: Commit**

```bash
git add src/data/inventory.ts
git commit -m "feat: export OutfitItem and ModelSlot from inventory.ts"
```

---

### Task 15: Publish Lookbook Media and End-to-End Test

**Files:**
- No code changes — this is the CMS publish + verification task

- [ ] **Step 1: Upload test media in Edit Pages**

In the running dev server, open Edit Pages → Models → Lookbook Media tab. Select Jerome, expand The Constable, upload 2–3 test images or videos for `jerome-showstopper`.

- [ ] **Step 2: Publish**

Click the Publish button. Confirm the publish succeeds (flash message or no error).

- [ ] **Step 3: Verify the public API**

Visit `http://localhost:3000/api/lookbook/media`. Confirm `jerome-showstopper` now has media items in the response.

- [ ] **Step 4: Verify in the lookbook**

Open the site as a customer. Tap Jerome's dot → More Info → choose Jerome → lookbook opens. In the version grid, the `jerome-showstopper` tile should now show the uploaded video/image. Tap it → Deep Dive shows the gallery. Swipe through the media.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: Lookbook Phase 2 complete — version grid, deep dive, compare, CMS media bank"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Screen 1 (Version Grid): Task 8
- ✅ Screen 2 (Deep Dive — sticky media, scrollable info, pre-selected size): Task 9
- ✅ Screen 3 (Compare — 3 states, crown/dim, Add Both): Task 10
- ✅ Model Switcher (face pills, "Tap for more info", re-opens carousel): Tasks 7, 11, 12
- ✅ ChooseModelModal reused with Close button: Task 12
- ✅ CMS organized by Model → Product → Version: Tasks 5, 6
- ✅ Video + image upload to Blob: Task 4
- ✅ Public media API: Task 3
- ✅ defaultSize per model (Angel=S, Jack=M, Ethan=L, Jerome=XL): Task 2
- ✅ Size pre-selected but fully editable: Tasks 9, 10
- ✅ Add Both to Cart (State ② + State ③): Task 10
- ✅ Types foundation: Task 1
- ✅ OutfitItem export: Task 14
- ✅ End-to-end test: Task 15

**Type consistency:**
- `LookbookMediaItem` defined in Task 1, used in Tasks 3, 4, 5, 7, 8, 9, 10, 11 — consistent
- `OutfitItem` imported from `@/data/inventory` throughout — consistent
- `defaultSize: string` on `ModelProfile` defined in Task 1, set in Task 2, consumed in Task 11 — consistent
- Field key `lookbook_{outfitItemId}` used in Tasks 3 and 5 — consistent
