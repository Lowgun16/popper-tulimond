// src/components/studio/studioUtils.ts
import type { StudioDot, StudioSlot, AccessType, ShadowConfig } from "./studioTypes";
import { DEFAULT_SHADOW } from "./studioTypes";

// ── Parsers ──────────────────────────────────────────────────────────────────

/** "top-[30%] left-[85%]" → { topPct: 30, leftPct: 85 } */
export function parseDotPosition(pos: string): { topPct: number; leftPct: number } {
  const top = pos.match(/top-\[(-?[\d.]+)%\]/)?.[1];
  const left = pos.match(/left-\[(-?[\d.]+)%\]/)?.[1];
  return {
    topPct: top ? parseFloat(top) : 50,
    leftPct: left ? parseFloat(left) : 50,
  };
}

/**
 * Parse model position string to desktop left/bottom percentages.
 * Prefers md: values over base. Converts right→left as (100 - rightPct - 12).
 */
export function parseModelPosition(pos: string): { leftPct: number; bottomPct: number } {
  const mdLeft    = pos.match(/md:left-\[(-?[\d.]+)%\]/)?.[1];
  const baseLeft  = pos.match(/(?<!md:)left-\[(-?[\d.]+)%\]/)?.[1];
  const mdRight   = pos.match(/md:right-\[(-?[\d.]+)%\]/)?.[1];
  const baseRight = pos.match(/(?<!md:)right-\[(-?[\d.]+)%\]/)?.[1];
  const mdBottom  = pos.match(/md:bottom-\[(-?[\d.]+)%\]/)?.[1];
  const baseBottom = pos.match(/(?<!md:)bottom-\[(-?[\d.]+)%\]/)?.[1];

  const leftRaw  = mdLeft  ?? baseLeft;
  const rightRaw = mdRight ?? baseRight;

  let leftPct: number;
  if (leftRaw !== undefined) {
    leftPct = parseFloat(leftRaw);
  } else if (rightRaw !== undefined) {
    // right-positioned: approximate left as 100 - right - ~12 (rough model width offset)
    leftPct = 100 - parseFloat(rightRaw) - 12;
  } else {
    leftPct = 30;
  }

  const bottomPct = parseFloat(mdBottom ?? baseBottom ?? "5");
  return { leftPct, bottomPct };
}

/** "md:scale-[0.9]" → 0.9 */
export function parseScale(scale: string): number {
  const m = scale.match(/scale-\[([\d.]+)\]/);
  return m ? parseFloat(m[1]) : 1.0;
}

// ── Raw shape (mirrors CollectionOverlay types, avoids circular import) ──────

interface RawOutfitItem {
  id: string;
  name: string;
  collection: string;
  colorway: string;
  price: string;
  type: AccessType;
  dotPosition: string;
  lookbook?: string[];
}

interface RawModelSlot {
  id: string;
  displayName?: string;
  position: string;
  scale: string;
  mobileScale: string;
  zIndex: number;
  imageSrc: string;
  outfit: RawOutfitItem[];
  shadow?: ShadowConfig;
}

/** Derive a human-readable display name from a model slot id.
 *  e.g. "center-model" → "Center", "rack-model" → "Rack" */
function defaultDisplayName(id: string): string {
  const first = id.split("-")[0] ?? id;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/** Convert a raw MODEL_INVENTORY slot → StudioSlot for editing */
export function modelSlotToStudio(slot: RawModelSlot): StudioSlot {
  const { leftPct, bottomPct } = parseModelPosition(slot.position);
  const scale = parseScale(slot.scale);

  const dots: StudioDot[] = slot.outfit.map((item) => {
    const { topPct, leftPct: dLeft } = parseDotPosition(item.dotPosition);
    return {
      id: item.id,
      name: item.name,
      collection: item.collection,
      colorway: item.colorway,
      price: item.price,
      type: item.type,
      topPct,
      leftPct: dLeft,
      lookbook: item.lookbook ?? [],
    };
  });

  return {
    id: slot.id,
    displayName: slot.displayName ?? defaultDisplayName(slot.id),
    imageSrc: slot.imageSrc,
    leftPct,
    bottomPct,
    scale,
    zIndex: slot.zIndex,
    dots,
    shadow: slot.shadow ? { ...slot.shadow } : { ...DEFAULT_SHADOW },
  };
}

// ── Exporter ─────────────────────────────────────────────────────────────────

/** Generate the full MODEL_INVENTORY TypeScript source from studio state */
export function exportInventoryCode(slots: StudioSlot[]): string {
  const lines: string[] = ["export const MODEL_INVENTORY: ModelSlot[] = ["];

  for (const slot of slots) {
    const l  = slot.leftPct.toFixed(1);
    const b  = slot.bottomPct.toFixed(1);
    const sc = slot.scale.toFixed(2);

    lines.push(`  {`);
    lines.push(`    id: "${slot.id}",`);
    lines.push(`    displayName: "${slot.displayName}",`);
    lines.push(`    position: "left-[${l}%] md:left-[${l}%] bottom-[${b}%] md:bottom-[${b}%]",`);
    lines.push(`    scale: "md:scale-[${sc}]",`);
    lines.push(`    mobileScale: "scale-[${sc}]",`);
    lines.push(`    zIndex: ${slot.zIndex},`);
    lines.push(`    imageSrc: "${slot.imageSrc}",`);
    lines.push(`    outfit: [`);

    for (const dot of slot.dots) {
      lines.push(`      {`);
      lines.push(`        id: "${dot.id}",`);
      lines.push(`        name: "${dot.name}",`);
      lines.push(`        collection: "${dot.collection}",`);
      lines.push(`        colorway: "${dot.colorway}",`);
      lines.push(`        price: "${dot.price}",`);
      lines.push(`        type: "${dot.type}",`);
      lines.push(`        dotPosition: "top-[${dot.topPct.toFixed(1)}%] left-[${dot.leftPct.toFixed(1)}%]",`);
      if (dot.lookbook.length === 0) {
        lines.push(`        lookbook: [],`);
      } else {
        const paths = dot.lookbook.map((p) => `"${p}"`).join(", ");
        lines.push(`        lookbook: [${paths}],`);
      }
      lines.push(`      },`);
    }

    lines.push(`    ],`);
    lines.push(`    shadow: { offsetX: ${slot.shadow.offsetX}, offsetY: ${slot.shadow.offsetY}, scaleX: ${slot.shadow.scaleX.toFixed(2)}, scaleY: ${slot.shadow.scaleY.toFixed(3)}, opacity: ${slot.shadow.opacity.toFixed(2)}, blur: ${slot.shadow.blur} },`);
    lines.push(`  },`);
  }

  lines.push(`];`);
  return lines.join("\n");
}
