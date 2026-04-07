// src/components/builder/builderUtils.ts
import type {
  CorrectionLogEntry,
  StructuralEditType,
  StructuralEditDirection,
  SliderState,
} from "./builderTypes";

export function makeCorrectionEntry(
  characterId: string,
  garmentId: string,
  editType: StructuralEditType | keyof SliderState,
  direction: StructuralEditDirection | "set",
  magnitude: number
): CorrectionLogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    characterId,
    garmentId,
    editType,
    direction,
    magnitude,
    timestamp: Date.now(),
  };
}
