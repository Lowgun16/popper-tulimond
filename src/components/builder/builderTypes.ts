// src/components/builder/builderTypes.ts

/** The 4 structural edit operations supported in v1 */
export type StructuralEditType =
  | "placket-width"
  | "neckline-depth"
  | "sleeve-length"
  | "sleeve-compression";

export type StructuralEditDirection = "increase" | "decrease";

/** State of the 7 instant sliders */
export interface SliderState {
  hue: number;           // -180 to 180
  saturation: number;    // -100 to 100 (delta from 100%)
  brightness: number;    // -100 to 100 (delta from 100%)
  contrast: number;      // -100 to 100 (delta from 100%)
  fabricRoughness: number; // 0 to 100
  heatherIntensity: number; // 0 to 100
  warmth: number;        // -100 to 100
}

export const DEFAULT_SLIDER_STATE: SliderState = {
  hue: 0,
  saturation: 0,
  brightness: 0,
  contrast: 0,
  fabricRoughness: 0,
  heatherIntensity: 0,
  warmth: 0,
};

/** A single logged correction made during post-transfer editing */
export interface CorrectionLogEntry {
  id: string;
  characterId: string;
  garmentId: string;
  editType: StructuralEditType | keyof SliderState;
  direction: StructuralEditDirection | "set";
  magnitude: number;
  timestamp: number;
}

/** An approved garment reference stored in the garment library */
export interface GarmentTruth {
  id: string;
  name: string;
  sku: string;
  fabricComposition: string;
  availableSizes: string[];
  /** Path relative to /public, e.g. "/garments/constable-henley-charcoal-v3.png" */
  approvedImagePath: string;
  version: number;
  approvedAt: number;
}

/** A character profile with body measurements */
export interface BuilderCharacter {
  id: string;
  displayName: string;
  /** Path relative to /public, e.g. "/assets/models/Jerome/Jerome-pro-lit.png" */
  referenceImagePath: string;
  heightIn: number;   // inches (e.g. 76 for 6'4")
  weightLb: number;
  chestIn: number;
  defaultSize: string;
  bodyTypeLabel: string; // e.g. "NFL Defensive End"
}

/** Mode for GarmentEditor — building a Garment Truth vs correcting a VTON render */
export type EditorMode = "truth" | "correction";

/** Context passed to GarmentEditor when in correction mode */
export interface CorrectionContext {
  characterId: string;
  garmentId: string;
  renderImageDataUrl: string;
}
