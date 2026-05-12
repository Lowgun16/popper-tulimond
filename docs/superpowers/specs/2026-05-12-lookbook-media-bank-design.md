# Lookbook Phase 2 — Media Bank Design Spec

## Goal

Replace the empty `lookbook: []` arrays on every product with a full cinematic media experience: per-model, per-product-version photo and video galleries, a side-by-side compare mode, and an in-lookbook model switcher that reuses the existing "Choose Your Model" carousel.

---

## Customer Flow Overview

```
"More Info" on product
  → Choose Your Model carousel (already built)
    → Lookbook: Version Grid (Screen 1)
      → Tap version → Deep Dive (Screen 2)
      → Tap Compare → Compare Mode (Screen 3)
```

---

## Screen 1: Version Grid

The entry point after a model is chosen. Shows all versions of the current product for the chosen model.

**Model Switcher Row** — pinned at the top:
- One circular face pill per model (Jerome, Angel, Jack, Ethan), with name below
- Selected model: gold border + gold dot indicator + "Tap for more info" in small gold text below the name (only on the selected pill)
- Tap a different pill → lookbook re-renders instantly for that model, same product, same screen position
- Tap the currently selected pill → opens the ChooseModelModal carousel (reused as-is) with two changes: a "✕ Close" button that returns without changing model, and "Choose [Name]" updates the active model instead of being a first-time selection

**Version Grid:**
- 2×2 grid of version tiles for the current product
- Each tile: looping muted video (fallback to still image if no video uploaded) — same pattern as ChooseModelModal
- Tile label below: colorway name + sleeve length (e.g. "Heartbreaker / Short Sleeve")
- Tap a tile → enters Screen 2 (Deep Dive) for that version
- "Compare" button at the bottom — enters Screen 3 (Compare Mode)

---

## Screen 2: Single Version Deep Dive

Full media gallery for one version, with product info below.

**Sticky media area (top ~2/3 of screen):**
- Swipeable gallery of photos and videos for this model + version
- Left/right arrows + dot indicators showing position (e.g. 2 / 7)
- "← Exit" top-left returns to the Version Grid
- Version name centered at top
- Media area stays pinned while info scrolls beneath it

**Scrollable content below (peeks up on entry so customer knows to scroll):**
- Product name + colorway
- Fabric story / product description
- Size guide
- Size chart
- Size chips (S / M / L / XL) — pre-selected based on chosen model's size (e.g. Jack = Medium), editable
- Add to Cart button (gold, full width) with price
- Care instructions

---

## Screen 3: Compare Mode

Side-by-side comparison of two versions. Three states:

**State ①: Neutral — both browsing**
- Two panels side by side, 4:9 aspect ratio each
- Both play their looping video (fallback to image)
- Each panel independently swipeable (left/right arrows, position indicator)
- Below panels: thin divider + text "Tap a version to explore it" + supporting copy explaining how to use compare
- No product info shown yet

**State ②: One crowned**
- Customer taps one panel → it gets a gold border ("crowned"), the other dims to ~28% opacity
- Below panels: full product info for the crowned version scrolls in — same content as Screen 2 (story, size guide, size chips, Add to Cart)
- Primary CTA: "Add to Cart — $250" (gold, filled)
- Secondary CTA: "Or Add Both — [sum of both prices]" (outlined, quiet gold) — always present once in compare mode
- Footer link: "Tap again to deselect"
- Tapping the dimmed panel switches the crown instantly (info updates to that version)
- Tapping the crowned panel deselects → returns to State ①

**State ③: After exploring both (neutral state only)**
- Once the customer has crowned each side at least once and returned to neutral, the instruction text is replaced with: "Still deciding? Take both home — $500"
- A quiet outlined "Add Both" button appears
- This state is non-intrusive: primary path is still to tap a panel and crown it

---

## Model Switcher — Full Behavior

- **Placement:** Pinned at the very top of all three screens, above the media area. In Screen 2 (deep dive) it sits above the sticky media block. In Screen 3 (compare) it sits above the two panels. Always visible without scrolling.
- Persists across all three screens (version grid, deep dive, compare)
- Switching models mid-lookbook: re-renders the current screen for the new model, same product + version + gallery position where possible
- If the new model has no media for the current version, shows fallback image with "Coming soon" placeholder
- Tapping the selected pill always opens the full ChooseModelModal carousel — customer can swipe through all four characters, read bios, watch intro videos, then either "Choose [Name]" (updates lookbook) or "✕ Close" (returns unchanged)

---

## Add Both to Cart — Behavior

- Adds both versions to cart using whichever size is currently selected for each (defaults to the model's size, but the customer may have changed it)
- Size remains fully editable in cart as well
- "Add Both" available in: State ② below the primary Add to Cart, and State ③ as the gentle nudge

---

## CMS — Edit Pages: Lookbook Media Bank

Located in Edit Pages, organized by **Model → Product → Version**.

**Structure in Edit Pages sidebar:**
- "Models" page gains a second tab or section: "Lookbook Media"
- Top-level: four model tabs (Jerome, Angel, Jack, Ethan)
- Per model: accordion of products (The Constable, future products...)
- Per product: rows for each version (Heartbreaker SS, Heartbreaker LS, Showstopper SS, Showstopper LS)
- Per version row: thumbnail strip of uploaded media, drag-to-reorder, + Upload button

**Upload behavior:**
- Accepts .mp4, .webm (video) and .jpg, .png, .webp (image)
- First item in the strip = the tile cover shown in the Version Grid
- Uploads go to Vercel Blob (public store, same as model intro videos)
- No separate Save/Publish needed per upload — each upload saves immediately to draft
- Full page Publish pushes all changes live (same pattern as rest of CMS)

**Field key convention:**
`lookbook_{modelId}_{productId}_{versionId}` stores a JSON array of `{ url, type: "video"|"image" }` objects

---

## Data Model

**Version** — in the existing data model, "versions" are `OutfitItem` entries in a model's `outfit[]` array that share the same `collection` value. No new data structure needed in `inventory.ts`.

For The Constable, each model has OutfitItems like:
- `jerome-heartbreaker` (collection: "The Constable", colorway: "Guilt Grey (Long Sleeve)")
- `jerome-showstopper` (collection: "The Constable", colorway: "Ivory (Short Sleeve)")

The version grid shows all `outfit` items where `collection === product.collection` for the chosen model.

**LookbookMediaItem:**
```ts
{ url: string; type: "video" | "image" }
```

**Field key convention:**
`lookbook_{outfitItemId}` — e.g. `lookbook_jerome-heartbreaker`
Stores a JSON-serialized `LookbookMediaItem[]`.

**Model size mapping** (for pre-selecting size chips — customer can always change before adding to cart):
```ts
{ angel: "S", jack: "M", ethan: "L", jerome: "XL" }
```
Add a `defaultSize` field to `ModelProfile` in `contentTypes.ts` to store these values. The pre-selected size is a convenience default only — all size chips remain fully tappable at all times. The customer has free will over their size selection throughout the entire experience.

---

## Key Reused Components

- `ChooseModelModal` — reused as-is for the model switcher profile view; receives an `onDismiss` prop (already exists) for the Close path
- `useEditPages` hook — reused for CMS draft/publish flow
- Vercel Blob upload pattern from `api/upload/model-video` — extended to handle images and the new path structure

---

## Out of Scope (Phase 2)

- Filtering within the lookbook (existing tag-based filter engine in LookbookOverlay is not used in this design)
- Desktop-specific lookbook layout (mobile-first; desktop stretch goal)
- Video upload progress bar (show spinner, same as model video upload)
