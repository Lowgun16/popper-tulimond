# Outfit Builder — Design Spec
**Date:** 2026-04-07  
**Phase:** 1 of 2 (Team Tool)  
**Status:** Approved for implementation planning

---

## Problem Statement

Creating one approved garment rendering for the Popper Tulimond signature shirt (buttonless henley, elbow-length fitted sleeves, open-drape plackets) currently takes hours to days using generative AI (Google Imagen / Nano Banana 2). The process is:

1. Prompt from a hanger photo or description
2. Iterate hundreds of times until generative AI produces an acceptable result
3. Still end up with color, fabric texture, or drape inaccuracies
4. Repeat from scratch for every character the shirt needs to appear on

The root cause: generative AI invents rather than transfers. A Virtual Try-On (VTON) pipeline — plus targeted editing tools — replaces this entirely.

---

## Solution Overview

A mobile-first internal web app built as a new Next.js route (`/studio/builder`) on the existing site. Two primary screens:

1. **Garment Editor** — take any "close enough" render from Nano Banana and refine it to a locked Garment Truth using sliders (instant, free) and AI structural edits (targeted, near-free).
2. **Character Dresser** — select an approved Garment Truth, select a character, and transfer the garment to that character via VTON in ~20–90 seconds. No prompting. No iteration.

Output from the Character Dresser feeds directly into the existing lookbook and inventory system.

---

## Architecture

```
/studio/builder                   ← new Next.js route (team-auth gated)
  /garment-editor                 ← Screen 1
  /character-dresser              ← Screen 2

/api/builder/
  /structural-edit                ← proxies Gemini Edit API
  /vton-transfer                  ← proxies Hugging Face VTON (free tier default)
  /save-garment                   ← writes approved garment to /public/garments/
  /export-to-lookbook             ← writes result into inventory data layer

/public/garments/                 ← locked Garment Truth PNGs (versioned)
/public/renders/                  ← VTON output images per character+garment
```

Authentication: same secret key combo as existing Studio Mode. No new login system needed.

---

## Screen 1 — Garment Editor

### Purpose
Transform a "close enough" Nano Banana PNG into a Garment Truth — a locked reference image that is accurate in color, fabric texture, drape, and structural details.

### Input
Any PNG from Nano Banana (or any other source). Uploaded directly from phone or desktop.

### Layer 1: Instant Sliders (free, client-side, real-time)
Runs entirely in the browser using Canvas API and CSS filters. No API calls. No cost.

| Slider | What it controls |
|--------|-----------------|
| Color / Hue | Shift the garment color toward true real-life color |
| Saturation | Punch up or desaturate |
| Brightness | Correct for lighting differences |
| Contrast | Add or reduce visual depth |
| Fabric Roughness | Overlay a texture mask — smooth cotton vs. visible knit weave |
| Heather Intensity | Add or remove the subtle fiber variation of a heathered fabric |
| Warmth | Cool or warm the tone |

These adjustments are non-destructive and stack. The team can tune these to match a real fabric swatch without any AI involvement.

### Layer 2: AI Structural Edits (Gemini Edit API, free tier / ~$0.02–0.04 per edit)

Targeted inpainting — only the selected region of the garment is sent for regeneration. The existing approved Garment Truth renders from Nano Banana are used as style reference images so Gemini works from *our* version of the design, not a hallucinated one.

**V1 Priority (must ship):**
1. **Placket width** — widen or narrow the V-opening of the buttonless henley
2. **Neckline depth** — how far down the chest the opening falls
3. **Sleeve length** — extend toward elbow or shorten toward bicep
4. **Sleeve compression** — how tightly the sleeve wraps the arm along its full length

**V2 (post-launch):**
- Hem shape (round vs. straight)
- Hem length (crop / extend)
- Body width (slimmer / roomier)
- Arm width at shoulder

### Approval Flow
When the team is satisfied with a garment, they press **Approve & Lock**. The image is saved to `/public/garments/` with a version number and timestamp. It becomes available in the Character Dresser. Previously approved versions are preserved (never overwritten) so rollback is always possible.

---

## Screen 2 — Character Dresser

### Purpose
Transfer an approved Garment Truth onto any character using VTON. One button press, ~20–90 seconds, no prompting.

### Character Library
Each character has a profile with:
- **Reference photos** — multiple poses/angles (uploaded by team)
- **Measurements** — height, weight, chest measurement
- **Default size** — the size that fits them perfectly
- **Body type descriptor** — used for customer-facing size matching

Initial characters:

| Character | Height | Weight | Chest | Default Size | Body Type |
|-----------|--------|--------|-------|--------------|-----------|
| Jerome | 6'4" | 240 lb | 50" | XXL | NFL Defensive End |
| Angel | 5'11" | 175 lb | 40" | M | Latin pop star build |
| Jack | TBD | TBD | TBD | TBD | TBD |
| Ethan | TBD | TBD | TBD | TBD | TBD |

New characters can be added at any time by uploading a reference photo and entering measurements. This includes real people (the founder, external models, etc.).

### VTON Engine
**Default (free):** IDM-VTON via Hugging Face Spaces API  
- Cost: $0  
- Speed: 45–90 seconds  
- Quality: high fidelity — preserves garment color, texture, drape, collar shape, sleeve length  

**Upgrade path (if HF queue becomes a bottleneck):** Replicate or Fashn.ai  
- Cost: ~$0.03–0.05 per render  
- Speed: 15–20 seconds  
- Toggle switchable via environment variable — no code change needed

The VTON engine takes two inputs:
1. The approved Garment Truth PNG
2. A reference photo of the character

It does not prompt. It does not invent. It transfers.

### Size Variation Rendering
Once a Garment Truth exists for a character's default size, the team can request size variant renders: "Show Jerome in a Large." The system uses the same VTON transfer but references photos of real people wearing that size (uploaded to the garment's size reference library). This teaches the system what an intentionally tight or loose fit looks like on that body type.

### Output Actions
After a render is generated the team can:
- **Approve & Save to Lookbook** — writes the image into the existing lookbook data layer
- **Regenerate** — runs another VTON pass (slightly different result)
- **Discard** — no action, no cost logged

---

## Garment Library

Each garment in the system has:
- Name and SKU
- Fabric composition (e.g. "28% Merino Wool, 72% Pima Cotton")
- Available sizes
- Approved Garment Truth PNG (one per version, versioned)
- Size reference photos (real people in each size — used for fit accuracy)
- Character renders (outputs from the Character Dresser, per character per size)

The existing `src/data/inventory.ts` data layer is extended to include garment references. The Production Config deploy flow (paste `MODEL_INVENTORY` block) continues to work unchanged.

---

## Customer-Facing Size Matching (non-blocking design decision)

The character measurement profiles serve a secondary purpose: customers find the character closest to their own build and use that character's renders to understand fit. This requires no additional engineering in Phase 1 — it falls out naturally from having character measurements displayed alongside renders.

Future Phase 2 (customer try-on) will let customers upload their own photo. The team tool must be proven reliable before that feature ships.

---

## Cost Profile

| Feature | Cost |
|---------|------|
| Slider adjustments | $0 — client-side only |
| AI structural edits (Gemini) | $0 free tier, then ~$0.02–0.04/edit |
| VTON transfer (Hugging Face) | $0 |
| VTON transfer (Replicate, if upgraded) | ~$0.03–0.05/render |
| Perfecting one new garment end-to-end | ~$0 on free tier |

---

## What This Does Not Include (Phase 1)

- Customer-facing try-on (Phase 2)
- Fit simulation for wrong-size rendering (post-launch, requires size reference library to be built up)
- Automated publishing to Vercel (existing stub — unchanged)
- Native mobile app (web app on mobile is sufficient for team use)

---

## Success Criteria

1. Team can take a Nano Banana PNG to an approved Garment Truth in under 20 minutes
2. An approved garment can be transferred to any character in under 90 seconds with one button press
3. Color, fabric texture, placket shape, and sleeve details are preserved in the transfer
4. Output images drop into the existing lookbook without format changes
5. The tool works on a phone
