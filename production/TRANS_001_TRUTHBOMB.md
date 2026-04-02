# TRANSMISSION 001: THE TRUTH BOMB
**Filed by:** The @WRITER
**Classification:** Production Spec — Greenlit
**Format:** 3-Second Looping Short (TikTok / Reels / Shorts)
**Date:** 2026-04-01
**Status:** Ready for Generation

---

## Asset Reference

| Field | Value |
|-------|-------|
| **Look ID** | `Jack_L01` |
| **Source File** | `/public/assets/models/Jack/Show.Long.Mid.Brick.jpeg` |
| **Garment** | The Constable |
| **Archetype** | Showstopper (Ivory) |
| **Environment** | Brick |
| **Sleeve / Crop** | Long / Mid |

---

## The Core Line

> *"The irony of being great at your job is... People start thinking what you do is easy."*

---

## PRODUCTION SPEC

### Visual

**Framing**
- Low-angle, medium-close. Camera sits just below Jack's chest line, angled up.
- Jack is dead center. Center-weighted symmetry — equal negative space on both sides.
- Arms crossed. Perfectly still. He is not performing stillness. He is the definition of it.
- The structured collar of The Constable should bisect the upper third of the frame cleanly.

**Lighting — Chiaroscuro / Saturated Noir**
- Primary: Sharp white rim-light tracing the collar edge and the structured shoulder seam. The ivory fabric catches it cleanly — not soft, not diffused. Precise.
- Shadow side: Deep, clean black. No detail rescued. The shadow is not dark grey. It is absent.
- Aquarium accent: A cool blue-teal edge on the shadow side. Barely there. The shadow breathes.
- Highlight: Warm amber catching the brick texture behind him and the weave of the ivory sleeve on the lit side.

**Background — High-Saturation Brick**
- The brick wall behind Jack is fully saturated. Deep reds and burnt oranges — the only color in the frame that lives at full voltage.
- Jack's shirt is selectively desaturated — the ivory pulled toward monochrome — so he reads as the Foundation against the world's color.
- Motion effect: Subtle time-lapse or motion blur on background elements only. Shadows shifting, a light source flickering at the edge of frame, the faint movement of something outside. Jack does not move. The world moves around him. He is the still point.

**Color Grade**
- Global: Slight desaturation on everything except:
  - The Constable ivory (preserve full luminance — this is what the eye finds first)
  - Brick reds and oranges (keep fully saturated — the environmental pop)
  - The cool blue-teal in the shadow (preserve — this is the Aquarium light signature)
- Blacks: Crushed. No lift. The shadows do not exist — they are absent.
- Contrast: High. Surgical. This is not film grain or moody fog. This is a scalpel.

---

### Text Overlay

| Field | Value |
|-------|-------|
| **Copy** | "The irony of being great at your job is... People start thinking what you do is easy." |
| **Font** | Small, elegant Serif — White. Tracking: generous. No bold. |
| **Alignment** | Center. Bottom third of frame. |
| **Behavior** | Fade in at 0.5s. Hold until loop reset. No fade out — it is still there when the loop begins again. |
| **Size** | Small enough that the viewer leans in. Not a headline. A confession. |

---

### Audio Signature

- **Instrument:** Solo cello.
- **Note:** Single sustained note. No melody. No progression. It does not go anywhere — it holds.
- **Character:** The note should vibrate. Not warm, not mournful. Tense. The physical sound of weight being carried without complaint.
- **Entry:** Immediate. No silence first. The note is present before the viewer has processed the visual.
- **Duration:** Sustains for the full 3 seconds. No swell. No resolution. It is still vibrating when the loop resets.
- **Mix note:** Slightly low-mid heavy. No high-frequency brightness. The note lives in the chest, not the ears.

---

## AI VIDEO GENERATION PROMPT

*Use with Veo, Sora, Kling, or equivalent. Feed `Jack_L01` as the reference image.*

---

**REFERENCE IMAGE PROMPT (for image-to-video models):**

> Cinematic 3-second looping video. Use the provided reference image as the exact character and wardrobe source.
>
> The subject is a Caucasian man in his 50s, strong and weathered build, wearing an ivory long-sleeve structured shirt with a clean, architectural collar. He stands with his arms crossed, perfectly still. Low-angle medium-close framing — camera below chest height, angled upward. He is centered with equal negative space on both sides of frame.
>
> Lighting is chiaroscuro — a sharp white rim-light traces the collar and shoulder seam of the ivory shirt with surgical precision. The shadow side falls into deep, crushed black with no detail. A subtle cool blue-teal edge light touches the shadow side. Warm amber catches the brick texture behind him and the weave of the shirt on the lit side.
>
> Background is a high-saturation brick wall — deep reds, burnt oranges. Apply a subtle time-lapse motion blur to the background only: shadows shift slowly, a light source at frame edge flickers. The subject does not move at all. The world moves. He does not.
>
> Color grade: Globally desaturated except for three elements that stay at full luminance and saturation — (1) the ivory shirt, (2) the brick reds and oranges, (3) the cool blue-teal shadow accent. Blacks are crushed completely — no lift. Contrast is high and surgical. No film grain. No atmospheric haze. Clean.
>
> Mood: The stoic certainty of a man who carries weight so others can walk light. He is not posing. He is simply present. He is the still point while the world moves in his periphery.
>
> Aspect ratio: 9:16 vertical. Duration: 3 seconds, seamless loop.

---

**TEXT-ONLY PROMPT (for models without image reference input):**

> Cinematic fashion short. 9:16 vertical. 3 seconds, seamless loop.
>
> Subject: A Caucasian man, 50s, strong and weathered build, standing perfectly still with arms crossed. He wears an ivory long-sleeve structured shirt — The Constable — with a clean architectural collar. The shirt is the most luminous element in the frame.
>
> Framing: Low-angle medium-close. Camera sits below chest height, angled upward. Subject is dead center. Center-weighted symmetry. The collar bisects the upper third of the frame.
>
> Lighting — Chiaroscuro / Saturated Noir: Sharp white rim-light on the collar edge and shoulder seam. Deep, crushed black on the shadow side — no detail, no grey, just absence. Cool blue-teal edge accent on the shadow. Warm amber in the highlights and on the brick behind him.
>
> Background: High-saturation brick wall — deep reds and burnt oranges at full color voltage. Apply subtle background-only motion: shadows slowly shifting, edge light faintly flickering. The man does not move. His stillness is the subject.
>
> Color grade: Desaturate globally except — the ivory shirt (full luminance preserved), brick reds/oranges (fully saturated), cool teal shadow (preserved). Crushed blacks. High contrast. Surgical. No grain.
>
> Cinematic reference: Tim Burton's Wednesday series. Monochrome protagonist in a fully saturated world. He is not part of the color. He is the reason the color exists.
>
> Mood: Weight carried without performance. Authority without announcement. The Foundation.

---

## Post-Production Notes

**Text overlay** is applied in post — not baked into the video generation prompt. Use the following spec:

```
Font:       Cormorant Garamond, Regular (or equivalent high-end serif)
Size:       16–18px equivalent at 1080p
Weight:     Regular — no bold
Color:      #FFFFFF
Opacity:    100%
Position:   Center-aligned, bottom third (approx. 75% down the frame)
Animation:  opacity 0 → 1, ease-in, 0.5s duration, no delay
            Hold until loop reset
Letter-spacing: +0.08em
Line-height: 1.6
```

**Caption (platform text, not overlay):**
> *(leave blank on first post — no caption. Let the line speak alone.)*

**Hashtags (seeded in first comment, not caption):**
`#thisisforthemanwho` `#silentsignal` `#thecontract` `#quietluxury` `#popperstulimond`

---

## Loop Architecture

The 3-second loop is engineered for rewatch. The mechanics:

1. **Second 0.0:** Cello note arrives. Jack is already there. The viewer hasn't processed anything yet.
2. **Second 0.5:** Text fades in. The line lands before the viewer has decided how to feel about it.
3. **Second 1.0–2.5:** The world moves behind him. He does not.
4. **Second 3.0:** Loop resets. The cello note does not resolve — it continues into itself. The line is still there. The viewer watches again to confirm what they read.

The rewatch is not for entertainment. It is for verification. *Did that say what I think it said?*

That question is the metric. Every rewatch is a loop registered. Every loop registered is algorithmic signal. The algorithm does not know why they are rewatching. It only knows that they are.

---

## Transmission Clearance

**Silent Contract Audit:**
- Does this reach, or does it hold? — **Holds.**
- Does this explain, or does it show? — **Shows.**
- Would the Leader Who Eats Last say this? — **He already knows it. We said it for him.**
- Does this speak to one, or to everyone? — **To one. He will send it to the others.**

**Status:** Cleared for transmission.

---

*Production Spec 001 closed.*
*— Popper Tulimond*
*The first signal goes out without announcement.*
