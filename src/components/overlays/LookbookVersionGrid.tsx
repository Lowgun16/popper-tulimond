"use client";

import { useState } from "react";
import Image from "next/image";
import type { LookbookMediaItem } from "@/lib/contentTypes";
import { formatPrice } from "@/lib/formatPrice";

// Minimal OutfitItem shape we need — avoids import dependency if not yet exported
export interface VersionItem {
  id: string;
  name: string;
  collection: string;
  colorway: string;
  productImage?: string;
  sizes: string[];
  initiationPriceCents: number;
  memberPriceCents: number;
  story?: string;
  materials?: string;
  sizeGuide?: string;
  sizeChart?: Record<string, { chest: string; length: string }>;
}

interface LookbookVersionGridProps {
  productName: string;
  versions: VersionItem[];
  media: Record<string, LookbookMediaItem[]>;
  onSelectVersion: (item: VersionItem) => void;
  onCompare: (selected: [VersionItem, VersionItem]) => void;
  startInCompareMode?: boolean;
}

function parseColorway(colorway: string): { color: string; sleeve: string } {
  const match = colorway.match(/^(.+?)\s*\((.+?)\)$/);
  if (match) return { color: match[1].trim(), sleeve: match[2].trim() };
  return { color: colorway, sleeve: "" };
}

export function LookbookVersionGrid({
  productName,
  versions,
  media,
  onSelectVersion,
  onCompare,
  startInCompareMode = false,
}: LookbookVersionGridProps) {
  const [compareSelections, setCompareSelections] = useState<VersionItem[]>([]);
  const [compareMode, setCompareMode] = useState(startInCompareMode);

  function toggleCompareSelection(item: VersionItem) {
    setCompareSelections((prev) => {
      if (prev.find((p) => p.id === item.id)) {
        return prev.filter((p) => p.id !== item.id);
      }
      if (prev.length >= 2) return prev;
      return [...prev, item];
    });
  }

  function activateCompare() {
    if (compareSelections.length === 2) {
      onCompare([compareSelections[0], compareSelections[1]]);
    }
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Compare bar — pinned at top, only shown when multiple versions exist */}
      {versions.length > 1 && (
        <div style={{ padding: "10px 16px 6px", flexShrink: 0, display: "flex", gap: 8 }}>
          {!compareMode ? (
            <button
              onClick={() => setCompareMode(true)}
              style={{
                flex: 1, background: "none",
                border: "1px solid rgba(196,164,86,0.35)",
                color: "rgba(196,164,86,0.7)",
                fontFamily: "var(--font-title, serif)",
                fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase",
                padding: "10px", cursor: "pointer", borderRadius: 2,
              }}
            >
              Compare
            </button>
          ) : (
            <>
              <button
                onClick={() => { setCompareMode(false); setCompareSelections([]); }}
                style={{
                  background: "none", border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.4)",
                  fontFamily: "var(--font-title, serif)",
                  fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase",
                  padding: "10px 16px", cursor: "pointer", borderRadius: 2,
                }}
              >
                Cancel
              </button>
              <button
                onClick={activateCompare}
                disabled={compareSelections.length < 2}
                style={{
                  flex: 1,
                  background: compareSelections.length === 2 ? "#C4A456" : "rgba(196,164,86,0.15)",
                  border: "none",
                  color: compareSelections.length === 2 ? "#0a0a0a" : "rgba(196,164,86,0.4)",
                  fontFamily: "var(--font-title, serif)",
                  fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase",
                  padding: "10px", cursor: compareSelections.length === 2 ? "pointer" : "default",
                  borderRadius: 2, transition: "all 0.2s",
                }}
              >
                {compareSelections.length === 0
                  ? "Select 2 to Compare"
                  : compareSelections.length === 1
                  ? "Select 1 More"
                  : "Activate Compare →"}
              </button>
            </>
          )}
        </div>
      )}

      {/* Product label */}
      <p style={{
        fontFamily: "var(--font-title, serif)",
        fontSize: "9px",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.3)",
        textAlign: "center",
        padding: "4px 0 6px",
        flexShrink: 0,
      }}>
        {productName}
      </p>

      {/* Scrollable grid — tiles size to content, no stretching */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          alignContent: "start",
        }}>
          {versions.map((version) => {
            const versionMedia = media[version.id] ?? [];
            const cover = versionMedia[0];
            const isSelectedForCompare = compareSelections.find((s) => s.id === version.id);
            const { color, sleeve } = parseColorway(version.colorway);

            return (
              <button
                key={version.id}
                onClick={() => compareMode ? toggleCompareSelection(version) : onSelectVersion(version)}
                style={{
                  background: "none",
                  border: isSelectedForCompare
                    ? "1.5px solid #C4A456"
                    : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 4,
                  padding: 0,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {/* Media tile */}
                <div style={{ aspectRatio: "2/3", position: "relative", background: "#111", width: "100%" }}>
                  {cover?.type === "video" ? (
                    <video
                      key={cover.url}
                      src={cover.url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
                    />
                  ) : cover?.type === "image" ? (
                    <Image
                      src={cover.url}
                      alt={version.name}
                      fill
                      sizes="160px"
                      style={{ objectFit: "cover", objectPosition: "top center" }}
                    />
                  ) : version.productImage ? (
                    <Image
                      src={version.productImage}
                      alt={version.name}
                      fill
                      sizes="160px"
                      style={{ objectFit: "cover", objectPosition: "top center" }}
                    />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#333", fontSize: 24 }}>▶</span>
                    </div>
                  )}

                  {/* Price overlay — bottom right of image */}
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    padding: "12px 8px 5px",
                    background: "linear-gradient(transparent, rgba(0,0,0,0.65))",
                    display: "flex", justifyContent: "flex-end",
                  }}>
                    <span style={{
                      fontFamily: "var(--font-display, Georgia, serif)",
                      fontSize: "10px",
                      color: "rgba(196,164,86,0.9)",
                    }}>
                      {formatPrice(version.initiationPriceCents)}
                    </span>
                  </div>

                  {/* Compare checkmark overlay */}
                  {compareMode && isSelectedForCompare && (
                    <div style={{
                      position: "absolute", top: 6, right: 6,
                      width: 18, height: 18, borderRadius: "50%",
                      background: "#C4A456", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ color: "#0a0a0a", fontSize: 10 }}>✓</span>
                    </div>
                  )}
                </div>

                {/* Label */}
                <div style={{ padding: "6px 8px" }}>
                  <p style={{
                    fontFamily: "var(--font-title, serif)",
                    fontSize: "7px",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: isSelectedForCompare ? "#C4A456" : "rgba(255,255,255,0.6)",
                    margin: 0,
                    textAlign: "center",
                    lineHeight: 1.4,
                  }}>
                    {version.name}{color ? ` (${color})` : ""}<br />
                    <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "6px" }}>{sleeve}</span>
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
