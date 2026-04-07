// src/components/studio/studioTypes.ts

export type AccessType = "public" | "vault";

// ── Lookbook media types ──────────────────────────────────────────────────────

/** A single media item in a hotspot's lookbook carousel */
export interface LookbookItem {
  url: string;
  /** Keys must match FilterDimension.name values for filters to work */
  tags: Record<string, string>;
}

/** One selectable value within a filter dimension */
export interface FilterOption {
  value: string;       // e.g. "Showstopper"
  subtitle?: string;   // e.g. "(ivory)" — shown beneath the button label
}

/** One filter row shown in the Lookbook popup */
export interface FilterDimension {
  name: string;              // e.g. "Color" or "Sleeve"
  options: FilterOption[];
}

// ── Shared context passed to LookbookOverlay ─────────────────────────────────

/** Minimal shape shared by StudioDot + OutfitItem for the overlay */
export interface LookbookContext {
  name: string;
  collection: string;
  colorway: string;
  /** Price as a display string, e.g. "$179" */
  price: string;
  type: AccessType;
  lookbook: LookbookItem[];
  filterDimensions?: FilterDimension[];
  story?: string;
  materials?: string;
  sizeGuide?: string;
  sizes?: string[];
  sizeChart?: Record<string, { chest: string; length: string }>;
}

// ── StudioDot ─────────────────────────────────────────────────────────────────

export interface StudioDot extends LookbookContext {
  id: string;
  topPct: number;   // 0–100, relative to model container height
  leftPct: number;  // 0–100, relative to model container width
  filterDimensions: FilterDimension[]; // narrows optional → required
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
  displayName: string;
  imageSrc: string;
  leftPct: number;
  bottomPct: number;
  scale: number;
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
