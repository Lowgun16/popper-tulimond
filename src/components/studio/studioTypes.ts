// src/components/studio/studioTypes.ts

export type AccessType = "public" | "vault";

export interface StudioDot {
  id: string;
  name: string;
  collection: string;
  colorway: string;
  price: string;
  type: AccessType;
  topPct: number;   // 0–100, relative to model container height
  leftPct: number;  // 0–100, relative to model container width
}

export interface StudioSlot {
  id: string;
  displayName: string; // shown in bounding box label; editable alias
  imageSrc: string;
  leftPct: number;    // position as % of viewport width
  bottomPct: number;  // position as % of viewport height
  scale: number;      // e.g. 1.0, 0.9, 0.8
  zIndex: number;
  dots: StudioDot[];
}

// All swappable images in /public
export const AVAILABLE_IMAGES = [
  "/model-center.png",
  "/model-lounge.png",
  "/model-rack.png",
  "/model-vault.png",
] as const;
