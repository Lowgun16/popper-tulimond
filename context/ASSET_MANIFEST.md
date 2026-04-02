# ASSET MANIFEST: POPPER TULIMOND
*Master Look Registry — All visual asset queries must reference this file first.*
*Path root:* `/public/assets/`

---

## How to Read a Look ID

```
[Character]_L[Number]
```

- **Character:** The model name (Jack, Jerome, Angel, Ethan).
- **L[Number]:** Sequential Look number. New garments, layers, or accessories add a new Look ID — the filename never changes.

**Filename Convention (for reference):**
```
[Archetype].[Sleeve].[Crop].[Environment].[ext]
```
| Segment | Values |
|---------|--------|
| Archetype | `Show` (Showstopper/Ivory) · `Heart` (Heartbreaker/Grey) |
| Sleeve | `Long` · `Short` |
| Crop | `Mid` · `Full` · `Close` |
| Environment | `Brick` · `Studio` · `Bar` · `Outdoor` |

---

## MODEL REGISTRY

### Angel
| Asset | Path | Notes |
|-------|------|-------|
| Base (Pro Lit) | `models/Angel/Angel-pro-lit.png` | Neutral base. No Look assigned yet. |

---

### Ethan
| Asset | Path | Notes |
|-------|------|-------|
| Base (Pro Lit) | `models/Ethan/Ethan-pro-lit.png` | Neutral base. No Look assigned yet. |

---

### Jack

| Look ID | File | Garment | Archetype | Sleeve | Crop | Environment |
|---------|------|---------|-----------|--------|------|-------------|
| **Jack_L01** | `models/Jack/Show.Long.Mid.Brick.jpeg` | The Constable | Showstopper (Ivory) | Long | Mid | Brick |
| — | `models/Jack/Jack-pro-lit.png` | Base (Pro Lit) | — | — | — | Neutral base |

**Jack_L01 Notes:** Foundational hero look. The Constable in Ivory. Long sleeve, mid-crop framing, brick environment. Warm amber light on weave. Reference for the Showstopper archetype in all cinematic content.

---

### Jerome

| Look ID | File | Garment | Archetype | Sleeve | Crop | Environment |
|---------|------|---------|-----------|--------|------|-------------|
| **Jerome_L01** | `models/Jerome/Heart.Short.Mid.Studio.jpeg` | The Constable | Heartbreaker (Dark Grey) | Short | Mid | Studio |
| — | `models/Jerome/Jerome-pro-lit.png` | Base (Pro Lit) | — | — | — | Neutral base |

**Jerome_L01 Notes:** Anti-hero look. The Constable in Dark Grey. Short sleeve, mid-crop framing, clean studio environment. Cool tones. Reference for the Heartbreaker archetype in all cinematic content.

---

## BRANDING ASSETS

| Asset | Path | Notes |
|-------|------|-------|
| Logo — Emblem | `branding/logo-emblem.png` | Red Gun mark. Primary brand icon. |
| Logo — Horizontal | `branding/logo-horizontal.png` | Full wordmark, horizontal layout. |
| Brand Pattern | `branding/brand-pattern.jpg` | Textile/surface pattern asset. |
| Store — Front | `branding/storefront.png` | Exterior, standard. |
| Store — Front Tall | `branding/storefront-tall.png` | Exterior, vertical crop. |
| Store — Indoor Tall | `branding/inside-store-tall.png` | Interior, vertical. |
| Store — Indoor Wide | `branding/inside-store-wide.png` | Interior, wide. |
| Store — Indoor Tall (Alt) | `branding/PopperIndoorTall.png` | Interior alternate. |
| Title Card | `branding/NewPopperTitle.jpg` | Brand title treatment. |

---

## ADDING A NEW LOOK

When a new garment, layer, or accessory is photographed:

1. Add the file to `/public/assets/models/[Character]/` using the filename convention above.
2. Add a new row to the character's Look table with the next sequential `_L##` ID.
3. Fill in all columns. Never leave Garment or Archetype blank.
4. Add a Notes line describing the visual intent and any content use cases.

**Do not rename existing files.** The Look ID is the stable reference. The filename is the physical file. They are decoupled by design.

---

## EVOLUTION LOG
- 2026-04-01: Registry initialized. Jack_L01 and Jerome_L01 entered as first Look entries.
