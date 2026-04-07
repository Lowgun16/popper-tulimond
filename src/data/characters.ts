// src/data/characters.ts
import type { BuilderCharacter } from "@/components/builder/builderTypes";

export const BUILDER_CHARACTERS: BuilderCharacter[] = [
  {
    id: "jerome",
    displayName: "Jerome",
    referenceImagePath: "/assets/models/Jerome/Jerome-pro-lit.png",
    heightIn: 76,   // 6'4"
    weightLb: 240,
    chestIn: 50,
    defaultSize: "XXL",
    bodyTypeLabel: "NFL Defensive End",
  },
  {
    id: "angel",
    displayName: "Angel",
    referenceImagePath: "/assets/models/Angel/Angel-pro-lit.png",
    heightIn: 71,   // 5'11"
    weightLb: 175,
    chestIn: 40,
    defaultSize: "M",
    bodyTypeLabel: "Latin pop star build",
  },
  {
    id: "jack",
    displayName: "Jack",
    referenceImagePath: "/assets/models/Jack/Jack-pro-lit.png",
    heightIn: 72,
    weightLb: 185,
    chestIn: 42,
    defaultSize: "L",
    bodyTypeLabel: "TBD",
  },
  {
    id: "ethan",
    displayName: "Ethan",
    referenceImagePath: "/assets/models/Ethan/Ethan-pro-lit.png",
    heightIn: 70,
    weightLb: 175,
    chestIn: 41,
    defaultSize: "M",
    bodyTypeLabel: "TBD",
  },
];

/** Format height in inches as feet/inches string, e.g. 76 → "6'4\"" */
export function formatHeight(inches: number): string {
  const ft = Math.floor(inches / 12);
  const ins = inches % 12;
  return `${ft}'${ins}"`;
}
