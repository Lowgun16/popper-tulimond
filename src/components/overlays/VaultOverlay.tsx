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

// Flatten all outfit items across all models, then deduplicate by name
function getUniqueItems(): OutfitItem[] {
  const all = MODEL_INVENTORY.flatMap((slot) => slot.outfit);
  return all.filter(
    (item, i, arr) => arr.findIndex((x) => x.name === item.name) === i
  );
}

const eyebrowStyle: CSSProperties = {
  fontFamily: "var(--font-title, serif)",
  fontSize: "9px",
  letterSpacing: "0.35em",
  textTransform: "uppercase",
  color: "rgba(196,164,86,0.6)",
  marginBottom: "6px",
};

const nameStyle: CSSProperties = {
  fontFamily: "var(--font-display, serif)",
  fontSize: "22px",
  fontWeight: 300,
  color: "rgba(240,232,215,0.95)",
  letterSpacing: "0.04em",
  marginBottom: "4px",
};

const priceStyle: CSSProperties = {
  fontFamily: "var(--font-body, sans-serif)",
  fontSize: "14px",
  color: "rgba(196,164,86,0.85)",
  marginBottom: "20px",
};

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

export default function VaultOverlay({
  isOpen,
  onClose,
  onProtocolGate,
  onOpenLookbook,
}: VaultOverlayProps) {
  const items = getUniqueItems();

  return (
    <OverlayShell isOpen={isOpen} onClose={onClose} label="The Vault — Popper Tulimond">
      <p style={{ ...eyebrowStyle, marginBottom: "16px" }}>Popper Tulimond</p>
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

      <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              paddingTop: "32px",
            }}
          >
            <p style={eyebrowStyle}>{item.collection}</p>
            <p style={nameStyle}>{item.name}</p>
            <p style={priceStyle}>{item.price}</p>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                style={lookbookBtnStyle}
                onClick={() => onOpenLookbook(item as LookbookContext)}
              >
                Lookbook
              </button>
              <button
                style={sizeBtnStyle}
                onClick={onProtocolGate}
              >
                Find Your Size
              </button>
            </div>
          </div>
        ))}
      </div>
    </OverlayShell>
  );
}
