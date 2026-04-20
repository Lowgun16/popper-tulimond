// src/components/overlays/VaultOverlay.tsx
"use client";

import type { CSSProperties } from "react";
import OverlayShell from "./OverlayShell";
import { MODEL_INVENTORY } from "@/data/inventory";
import type { LookbookContext } from "@/components/studio/studioTypes";
import type { OutfitItem } from "@/data/inventory";

interface VaultOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onProtocolGate: () => void;
  onOpenLookbook: (ctx: LookbookContext) => void;
}

// ─── Sort/Group helpers ───────────────────────────────────────────────────────

const COLORWAY_ORDER: Record<string, number> = { "Showstopper": 0, "Heartbreaker": 1 };

const COLORWAY_COLOR: Record<string, string> = {
  "Showstopper": "Ivory",
  "Heartbreaker": "Guilt Grey",
};

function sleeveOrder(colorway: string): number {
  return colorway.includes("Short") ? 0 : 1;
}

function colorwayOrder(name: string): number {
  return COLORWAY_ORDER[name] ?? 99;
}

/** Extracts sleeve type from the colorway field, e.g. "Ivory (Short Sleeve)" → "Short Sleeve" */
function sleeveLabel(colorway: string): string {
  const match = colorway.match(/\(([^)]+)\)/);
  return match ? match[1] : "";
}

/** Group items by collection, sorted within each group by colorway → sleeve */
function getGroupedItems(): Record<string, OutfitItem[]> {
  const all = MODEL_INVENTORY.flatMap((slot) => slot.outfit);
  // Dedupe by item id
  const unique = all.filter((item, i, arr) => arr.findIndex((x) => x.id === item.id) === i);
  // Sort: colorway priority first, then sleeve (short before long)
  const sorted = [...unique].sort((a, b) => {
    const colorDiff = colorwayOrder(a.name) - colorwayOrder(b.name);
    if (colorDiff !== 0) return colorDiff;
    return sleeveOrder(a.colorway) - sleeveOrder(b.colorway);
  });
  // Group by collection
  return sorted.reduce<Record<string, OutfitItem[]>>((acc, item) => {
    const key = item.collection;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

// ─── Button styles ────────────────────────────────────────────────────────────

const btnBaseStyle: CSSProperties = {
  fontFamily: "var(--font-title, serif)",
  fontSize: "10px",
  letterSpacing: "0.25em",
  textTransform: "uppercase",
  padding: "10px 20px",
  cursor: "pointer",
  border: "none",
  background: "none",
};

const lookbookBtnStyle: CSSProperties = {
  ...btnBaseStyle,
  border: "1px solid rgba(196,164,86,0.4)",
  color: "rgba(196,164,86,0.85)",
};

const sizeBtnStyle: CSSProperties = {
  ...btnBaseStyle,
  border: "1px solid rgba(255,255,255,0.12)",
  color: "rgba(240,232,215,0.55)",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function VaultOverlay({
  isOpen,
  onClose,
  onProtocolGate,
  onOpenLookbook,
}: VaultOverlayProps) {
  const grouped = getGroupedItems();

  return (
    <OverlayShell isOpen={isOpen} onClose={onClose} label="The Vault">
      <p style={{
        fontFamily: "var(--font-title, serif)",
        fontSize: "9px",
        letterSpacing: "0.35em",
        textTransform: "uppercase",
        color: "rgba(196,164,86,0.95)",
        marginBottom: "16px",
      }}>
        Popper Tulimond
      </p>
      <h1 style={{
        fontFamily: "var(--font-display, serif)",
        fontSize: "clamp(24px, 4vw, 36px)",
        color: "rgba(240,232,215,0.95)",
        letterSpacing: "0.04em",
        marginBottom: "48px",
        fontWeight: 300,
      }}>
        The Vault
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
        {Object.entries(grouped).map(([collection, variants]) => {
          const seenColorways = new Set<string>();
          return (
          <div key={collection}>
            {/* Collection heading */}
            <h2 style={{
              fontFamily: "var(--font-display, serif)",
              fontSize: "22px",
              fontWeight: 300,
              color: "rgba(240,232,215,0.95)",
              letterSpacing: "0.06em",
              marginBottom: "24px",
              paddingBottom: "12px",
              borderBottom: "1px solid rgba(196,164,86,0.3)",
            }}>
              {collection}
            </h2>

            {/* Variants */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {variants.map((item) => {
                const isFirstOfColorway = !seenColorways.has(item.name);
                if (isFirstOfColorway) seenColorways.add(item.name);
                const displayName = isFirstOfColorway && COLORWAY_COLOR[item.name]
                  ? `${item.name} (${COLORWAY_COLOR[item.name]})`
                  : item.name;
                return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "12px",
                    padding: "16px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  {/* Left: colorway + sleeve + price */}
                  <div>
                    <p style={{
                      fontFamily: "var(--font-display, serif)",
                      fontSize: "17px",
                      fontWeight: 300,
                      color: "rgba(240,232,215,0.95)",
                      letterSpacing: "0.04em",
                      marginBottom: "4px",
                    }}>
                      {displayName}
                    </p>
                    <p style={{
                      fontFamily: "var(--font-body, sans-serif)",
                      fontSize: "11px",
                      color: "rgba(240,232,215,0.65)",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      marginBottom: "4px",
                    }}>
                      {sleeveLabel(item.colorway)}
                    </p>
                    <p style={{
                      fontFamily: "var(--font-body, sans-serif)",
                      fontSize: "14px",
                      color: "rgba(196,164,86,0.95)",
                    }}>
                      {item.price}
                    </p>
                  </div>

                  {/* Right: buttons */}
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      style={lookbookBtnStyle}
                      onClick={() => onOpenLookbook({ ...item, lookbook: item.lookbook ?? [] })}
                    >
                      Lookbook
                    </button>
                    <button
                      type="button"
                      style={sizeBtnStyle}
                      onClick={onProtocolGate}
                    >
                      Find Your Size
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
          );
        })}
      </div>
    </OverlayShell>
  );
}
