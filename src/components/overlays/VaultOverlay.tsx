// src/components/overlays/VaultOverlay.tsx
"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import OverlayShell from "./OverlayShell";
import { MODEL_INVENTORY } from "@/data/inventory";
import type { ModelSlot, OutfitItem } from "@/data/inventory";
import type { LookbookContext } from "@/components/studio/studioTypes";
import { mergeInventoryWithOverrides, type ProductOverride } from "@/lib/productOverrides";

interface VaultOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onProtocolGate: () => void;
  onOpenLookbook: (ctx: LookbookContext) => void;
  productOverrides?: ProductOverride[];
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
function getGroupedItems(inventory: ModelSlot[]): Record<string, OutfitItem[]> {
  const all = inventory.flatMap((slot) => slot.outfit);
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
  productOverrides,
}: VaultOverlayProps) {
  const effectiveInventory =
    productOverrides && productOverrides.length > 0
      ? mergeInventoryWithOverrides(MODEL_INVENTORY, productOverrides)
      : MODEL_INVENTORY;
  const grouped = getGroupedItems(effectiveInventory);

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
                const isSoldOut =
                  (item as OutfitItem & { _vaultStatus?: string })._vaultStatus === "sold_out";
                return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "16px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  {/* Product thumbnail */}
                  {item.productImage && (
                    <div style={{
                      flexShrink: 0,
                      width: "64px",
                      height: "84px",
                      overflow: "hidden",
                      borderRadius: "2px",
                      border: "1px solid rgba(196,164,86,0.15)",
                      background: "rgba(255,255,255,0.03)",
                    }}>
                      <Image
                        src={item.productImage}
                        alt={`${displayName} ${sleeveLabel(item.colorway)}`}
                        width={64}
                        height={84}
                        style={{ objectFit: "cover", objectPosition: "top center", width: "100%", height: "100%" }}
                      />
                    </div>
                  )}

                  {/* Name + sleeve + price + buttons */}
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
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

                    {/* Sold Out badge */}
                    {isSoldOut && (
                      <span style={{
                        fontFamily: "var(--font-title, serif)",
                        fontSize: "9px",
                        letterSpacing: "0.25em",
                        textTransform: "uppercase" as const,
                        color: "rgba(196,164,86,0.7)",
                        border: "1px solid rgba(196,164,86,0.3)",
                        padding: "4px 10px",
                      }}>
                        Sold Out
                      </span>
                    )}

                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        style={isSoldOut ? { ...lookbookBtnStyle, opacity: 0.4, pointerEvents: "none" as const } : lookbookBtnStyle}
                        disabled={isSoldOut}
                        onClick={() => onOpenLookbook({ ...item, lookbook: item.lookbook ?? [] })}
                      >
                        Lookbook
                      </button>
                      <button
                        type="button"
                        style={isSoldOut ? { ...sizeBtnStyle, opacity: 0.4, pointerEvents: "none" as const } : sizeBtnStyle}
                        disabled={isSoldOut}
                        onClick={onProtocolGate}
                      >
                        Find Your Size
                      </button>
                    </div>
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
