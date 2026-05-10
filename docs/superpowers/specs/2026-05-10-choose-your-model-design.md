# Choose Your Model — Phase 1 Design Spec

## Goal

Give customers a personalized entry point into the lookbook by letting them choose the model who most closely resembles their body type. The selection persists across their visit and can be changed at any time. Model profiles (bio, stats, intro video) are fully editable from the admin CMS.

## Model ID Rename (prerequisite)

Before building the selector, the MODEL_INVENTORY slot IDs are renamed from location-based names to character names. This is the first implementation task.

| Old slot ID | New slot ID | Old outfit ID | New outfit ID |
|---|---|---|---|
| `lounge-model` | `angel` | `lounge-showstopper` | `angel-heartbreaker` |
| `center-model` | `jerome` | `center-showstopper` | `jerome-showstopper` |
| `vault-model` | `jack` | `vault-showstopper` | `jack-showstopper` |
| *(4th model)* | `ethan` | *(4th outfit)* | `ethan-{name}` |

A DB migration updates any `product_overrides` rows referencing old outfit IDs. The localStorage key `pt_model_preference` stores the new short names (`"angel"`, `"jerome"`, etc.).

---

## Architecture

### Persistence
Model preference is stored in `localStorage` under the key `pt_model_preference`. Value is the model's renamed slot ID (`"angel"`, `"jerome"`, `"jack"`, `"ethan"`). No login required. Persists across page reloads and return visits. A `useModelPreference` hook reads and writes this value.

### Model profiles
Stored in the existing `page_content` DB table using `page_slug = "models"`. Field keys are namespaced by model id: `angel_tagline`, `angel_height`, `angel_weight`, `angel_body_type`, `angel_bio`, `angel_video_url` — and the same four fields for `jerome`, `jack`, `ethan`. The existing save/publish flow (page_drafts → page_content → revalidatePath) handles all of this with no schema changes.

### Media storage
Vercel Blob (`@vercel/blob`) is introduced in this phase, scoped to model intro videos only. A single upload API route (`POST /api/upload/model-video`) accepts a video file, uploads it to Blob, and returns the public URL. The CMS saves this URL to `page_content` as `{modelId}_video_url`. Phase 2 (lookbook media bank) will extend the same Blob infrastructure.

### LookbookOverlay integration
When the overlay opens, it reads `pt_model_preference` from localStorage. If a preference exists, it pre-selects that character as the active filter. If no preference exists, the "Choose Your Model" modal opens first, then the lookbook opens after selection. No changes to the existing carousel or filter logic.

If the product's `lookbook` array is empty (Phase 2 media not yet added), the overlay falls back to showing the product's `productImage` as the single carousel slide — the customer sees their chosen model in the product photo. This is the expected Phase 1 state for all products.

---

## Components

### `useModelPreference` hook
`src/hooks/useModelPreference.ts`

```ts
{ modelId, selectModel, clearModel }
```

- `modelId: string | null` — current saved preference
- `selectModel(id: string)` — saves to localStorage and updates state
- `clearModel()` — removes preference (used if needed for testing)

Reads localStorage only on the client (SSR-safe via `useEffect` or lazy initial state).

### `ChooseModelModal`
`src/components/overlays/ChooseModelModal.tsx`

Full-screen dark overlay (z-index above VaultOverlay and LookbookOverlay). Shown when:
- A customer opens the lookbook and has no saved model preference
- Any user clicks "Change Model"

**Layout:**
- Headline: *"Choose the model who most closely resembles your body type."*
- Subtext: *"Your choice personalizes the lookbook. You can always change it."*
- **Desktop:** 4 tall portrait cards in a single row. Each card uses a 2:3 aspect ratio (fashion photo proportioned) — wide enough to read the full body, tall enough to show the whole figure including legs for future full-outfit looks.
- **Mobile:** 2 tall portrait cards side by side, both visible without scrolling. Each card is ~45% screen width and ~65% screen height. Jack and Ethan appear below in the same 2-column layout when the customer scrolls down.
- Each card: looping video (falls back to static model photo), name in gold caps, height · weight stat line, one-line tagline, 3–5 sentence bio, **"Choose [Name]"** button at the bottom
- No close/dismiss without selecting — the selection is the action

**Video behavior:** `<video autoPlay loop muted playsInline>`. The model's existing static `imageSrc` from `MODEL_INVENTORY` renders beneath the video element as a fallback while loading or if no video URL is set.

**On selection:** calls `selectModel(id)`, then either opens the lookbook (if entering from a product) or simply closes (if triggered by "Change Model" from within the lookbook).

### Model profile data shape
```ts
type ModelProfile = {
  id: string;           // matches MODEL_INVENTORY slot id
  displayName: string;  // from MODEL_INVENTORY (e.g. "Angel")
  imageSrc: string;     // from MODEL_INVENTORY (existing static photo)
  tagline: string;      // CMS — short gold one-liner
  height: string;       // CMS — e.g. "5'10""
  weight: string;       // CMS — e.g. "175 lbs"
  bodyType: string;     // CMS — e.g. "Lean, athletic"
  bio: string;          // CMS — 3–5 sentences, plain text
  videoUrl: string;     // CMS — Vercel Blob URL or ""
};
```

Static fields (`id`, `displayName`, `imageSrc`) come from `MODEL_INVENTORY`. Dynamic fields come from `page_content` via a new server helper `fetchModelProfiles()`.

### "Change Model" button
Added to the top bar of `VaultOverlay` and `LookbookOverlay`. A small text link — *"Change Model"* — positioned next to the existing close button. Tapping it opens `ChooseModelModal`. Not present on legal pages, ProtocolOverlay, ContactOverlay, or any non-product overlay.

### `ModelProfileEditor`
`src/components/edit-pages/ModelProfileEditor.tsx`

Rendered when the user selects "Models" in the Edit Pages sidebar. Shows one accordion section per model (Angel, Jerome, Jack, Ethan) with:
- **Tagline** — plain text input
- **Height** — plain text input
- **Weight** — plain text input
- **Body Type** — plain text input
- **Bio** — FieldEditor (rich text via TipTap)
- **Intro Video** — thumbnail preview of current video (if set), upload button, and a clear button

The upload button opens a file picker accepting `.mp4` and `.webm` only. On selection, the file is POSTed to `/api/upload/model-video`, the returned URL is written into the draft for that model's `video_url` field. The same Save Draft / Publish buttons from PageEditor control when changes go live.

---

## API Routes

### `fetchModelProfiles()` server helper
`src/lib/pageContent.ts` — new exported function. Fetches `page_content` rows for `page_slug = "models"`, maps field keys back to the four `ModelProfile` objects, and merges in the static `id`, `displayName`, `imageSrc` from `MODEL_INVENTORY`. Called by the home page server component and passed down as a prop. Returns `ModelProfile[]`.

### `GET /api/edit-pages/live-content?page=models`
Returns all model profile field values, following the existing live-content pattern. Static defaults are empty strings for all CMS fields (tagline, height, weight, body_type, bio, video_url) for each of the four models. No `toHtml` needed — all model fields except `bio` are plain text. The `bio` field passes through `toHtml` for paragraph support.

### `POST /api/upload/model-video`
Requires admin session. Accepts `multipart/form-data` with a single `file` field (`.mp4` or `.webm`, max 200MB). Uploads to Vercel Blob under the path `models/{modelId}/{timestamp}.mp4`. Returns `{ url: string }`. The CMS writes this URL into the model's `video_url` draft field.

---

## Edit Pages Sidebar Update

`BRAND_PAGES` in `EditPagesSidebar.tsx` gains a new entry:
```ts
{ slug: "models", label: "Models" }
```

`PageEditor` renders `ModelProfileEditor` when `pageSlug === "models"` instead of the generic field list.

---

## Data Flow — Customer Path

```
Customer opens lookbook
  → read localStorage("pt_model_preference")
  → if null: open ChooseModelModal
      → customer selects model
      → save to localStorage
      → close modal, open LookbookOverlay with model pre-filtered
  → if set: open LookbookOverlay, pre-filter to saved model
      → "Change Model" button always visible
          → opens ChooseModelModal
          → new selection replaces old preference
          → lookbook re-filters to new model
```

---

## Data Flow — Admin Path

```
Admin opens Edit Pages → Models
  → ModelProfileEditor loads live-content for "models" page
  → Admin edits tagline, bio, stats for each character
  → Admin uploads intro video → POST /api/upload/model-video → URL saved to draft
  → Admin clicks Save Draft → fields written to page_drafts
  → Admin clicks Publish → fields written to page_content, revalidatePath("/")
  → Next customer load of ChooseModelModal fetches updated profiles
```

---

## Vercel Blob Setup

1. Install `@vercel/blob`
2. Add `BLOB_READ_WRITE_TOKEN` to Vercel environment variables
3. Upload route uses `put()` from `@vercel/blob` with `access: "public"`
4. Returned URL is a permanent CDN-backed public URL — no expiry

---

## Out of Scope (Phase 2)

- Lookbook media bank (bulk image/video upload per product)
- Per-user lookbook draft selection
- Comparison folders
- Customer-facing filter UI beyond the existing carousel filters

---

## Success Criteria

- Customer with no preference sees model selector before any lookbook content
- Customer with a saved preference goes straight to lookbook filtered to their model
- "Change Model" is accessible from Vault and Lookbook overlays
- All four model bios and stats are editable and publishable from the CMS
- Each model card shows their looping intro video; falls back to static photo if no video is uploaded
- Model video uploads work on desktop and mobile admin views
- No changes to existing cart, checkout, or product purchase flow
