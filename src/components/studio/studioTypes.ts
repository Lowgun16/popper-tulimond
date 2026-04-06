// src/components/studio/studioTypes.ts

export type AccessType = "public" | "vault";

/** Minimal shape shared by StudioDot + OutfitItem for the overlay */
export interface LookbookContext {
  name: string;
  collection: string;
  colorway: string;
  price: string;
  type: AccessType;
  lookbook: string[];
  story?: string;
  materials?: string;
  sizeGuide?: string;
  sizes?: string[];
  sizeChart?: Record<string, { chest: string; length: string }>;
}

export interface StudioDot {
  id: string;
  name: string;
  collection: string;
  colorway: string;
  price: string;
  type: AccessType;
  topPct: number;   // 0–100, relative to model container height
  leftPct: number;  // 0–100, relative to model container width
  lookbook: string[];
  sizes?: string[];
  sizeChart?: Record<string, { chest: string; length: string }>;
  story?: string;
  materials?: string;
  sizeGuide?: string;
}

// ── Shadow plane config ───────────────────────────────────────────────────────

export interface ShadowConfig {
  offsetX: number;  // px — horizontal shift (right = positive)
  offsetY: number;  // px — vertical shift (down = positive)
  scaleX: number;   // horizontal stretch (1.0 = same width as character)
  scaleY: number;   // vertical stretch  (0.08 = very flat floor shadow)
  opacity: number;  // 0–1
  blur: number;     // px blur radius (0 = hard edge, 20 = soft)
}

export const DEFAULT_SHADOW: ShadowConfig = {
  offsetX: 0,
  offsetY: 8,
  scaleX: 0.9,
  scaleY: 0.08,
  opacity: 0.45,
  blur: 14,
};

// ── StudioSlot ────────────────────────────────────────────────────────────────

export interface StudioSlot {
  id: string;
  displayName: string; // shown in bounding box label; editable alias
  imageSrc: string;
  leftPct: number;     // position as % of viewport width
  bottomPct: number;   // position as % of viewport height
  scale: number;       // e.g. 1.0, 0.9, 0.8
  zIndex: number;
  dots: StudioDot[];
  shadow: ShadowConfig;
}

// All swappable images in /public
export const AVAILABLE_IMAGES = [
  "/model-center.png",
  "/model-lounge.png",
  "/model-rack.png",
  "/model-vault.png",
] as const;
