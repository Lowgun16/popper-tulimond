"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { VersionItem } from "@/components/overlays/LookbookVersionGrid";
import type { LookbookMediaItem } from "@/lib/contentTypes";
import { formatPrice } from "@/lib/formatPrice";
import { playCartAddSound } from "@/lib/sounds";

function parseColorway(colorway: string): { color: string; sleeve: string } {
  const match = colorway.match(/^(.+?)\s*\((.+?)\)$/);
  if (match) return { color: match[1].trim(), sleeve: match[2].trim() };
  return { color: colorway, sleeve: "" };
}

interface ComparePanelProps {
  item: VersionItem;
  media: LookbookMediaItem[];
  dimmed: boolean;
  onTap: () => void;
}

function ComparePanel({ item, media, dimmed, onTap }: ComparePanelProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const count = media.length;
  const { color, sleeve } = parseColorway(item.colorway);

  function handleTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX; }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx < -40 && activeIdx < count - 1) setActiveIdx((i) => i + 1);
    else if (dx > 40 && activeIdx > 0) setActiveIdx((i) => i - 1);
  }

  const current = media[activeIdx];

  return (
    <div
      style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, opacity: dimmed ? 0.28 : 1, transition: "opacity 0.25s" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        onClick={onTap}
        style={{
          background: "none",
          border: dimmed ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(196,164,86,0.4)",
          borderRadius: 3, padding: 0, cursor: "pointer",
          position: "relative", overflow: "hidden",
          aspectRatio: "3/5", width: "100%",
        }}
      >
        {/* Media */}
        {!current ? (
          item.productImage ? (
            <Image src={item.productImage} alt={item.name} fill sizes="50vw" style={{ objectFit: "cover", objectPosition: "top center" }} />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1a" }}>
              <span style={{ color: "#333", fontSize: 20 }}>▶</span>
            </div>
          )
        ) : current.type === "video" ? (
          <video key={current.url} src={current.url} autoPlay loop muted playsInline
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
        ) : (
          <Image key={current.url} src={current.url} alt={item.name} fill sizes="50vw"
            style={{ objectFit: "cover", objectPosition: "top center" }} />
        )}

        {/* Nav arrows + counter */}
        {count > 1 && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 6px", background: "linear-gradient(transparent, rgba(0,0,0,0.6))" }}>
            <span style={{ color: activeIdx > 0 ? "rgba(255,255,255,0.5)" : "transparent", fontSize: 12 }}>‹</span>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "5px", fontFamily: "var(--font-body, sans-serif)" }}>{activeIdx + 1}/{count}</span>
            <span style={{ color: activeIdx < count - 1 ? "rgba(255,255,255,0.5)" : "transparent", fontSize: 12 }}>›</span>
          </div>
        )}
      </button>

      {/* Label below panel */}
      <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "6px", letterSpacing: "0.1em", textTransform: "uppercase", color: dimmed ? "rgba(255,255,255,0.25)" : "rgba(196,164,86,0.8)", textAlign: "center", margin: 0, lineHeight: 1.5 }}>
        {item.name}{color ? ` (${color})` : ""}<br />
        <span style={{ color: dimmed ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.4)", fontSize: "6px" }}>{sleeve}</span>
      </p>
    </div>
  );
}

interface LookbookCompareModeProps {
  versions: [VersionItem, VersionItem];
  media: Record<string, LookbookMediaItem[]>;
  defaultSize: string;
  isMember: boolean;
  onBack: () => void;
  onChangeCompare: () => void;
  onAddToCart: (item: VersionItem, size: string) => void;
}

export function LookbookCompareMode({
  versions,
  media,
  defaultSize,
  isMember,
  onBack,
  onChangeCompare,
  onAddToCart,
}: LookbookCompareModeProps) {
  const [crowned, setCrowned] = useState<string | null>(null);
  const [exploredBoth, setExploredBoth] = useState(false);
  const exploredRef = useRef<Set<string>>(new Set());
  const [selectedSize, setSelectedSize] = useState(defaultSize);
  const [added, setAdded] = useState<string | null>(null);

  const [left, right] = versions;

  function handleTap(itemId: string) {
    if (crowned === itemId) {
      setCrowned(null);
    } else {
      setCrowned(itemId);
      exploredRef.current.add(itemId);
      if (exploredRef.current.has(left.id) && exploredRef.current.has(right.id)) {
        setExploredBoth(true);
      }
    }
  }

  function handleAddToCart(item: VersionItem) {
    onAddToCart(item, selectedSize);
    playCartAddSound();
    setAdded(item.id);
    setTimeout(() => setAdded(null), 2000);
  }

  function handleAddBoth() {
    onAddToCart(left, selectedSize);
    onAddToCart(right, selectedSize);
    playCartAddSound();
    setAdded("both");
    setTimeout(() => setAdded(null), 2000);
  }

  const crownedItem = crowned === left.id ? left : crowned === right.id ? right : null;
  const crownedPrice = crownedItem ? (isMember ? crownedItem.memberPriceCents : crownedItem.initiationPriceCents) : 0;
  const bothPrice = (isMember ? left.memberPriceCents : left.initiationPriceCents) + (isMember ? right.memberPriceCents : right.initiationPriceCents);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header — Exit + Change buttons */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer", padding: 0, fontFamily: "var(--font-body, sans-serif)", letterSpacing: "0.08em" }}
        >
          ← Exit
        </button>
        <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(196,164,86,0.6)", margin: 0 }}>
          Compare
        </p>
        <button
          onClick={onChangeCompare}
          style={{ background: "none", border: "1px solid rgba(196,164,86,0.25)", color: "rgba(196,164,86,0.6)", fontSize: "7px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-title, serif)", cursor: "pointer", padding: "4px 10px", borderRadius: 1 }}
        >
          Change
        </button>
      </div>

      {/* Single scrollable container — panels + info scroll together */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 14px 40px" }}>

        {/* Panels row */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <ComparePanel item={left} media={media[left.id] ?? []} dimmed={crowned !== null && crowned !== left.id} onTap={() => handleTap(left.id)} />
          <div style={{ width: 1, background: "rgba(196,164,86,0.15)", alignSelf: "stretch" }} />
          <ComparePanel item={right} media={media[right.id] ?? []} dimmed={crowned !== null && crowned !== right.id} onTap={() => handleTap(right.id)} />
        </div>

        {/* State ①: Neutral — tap to explore */}
        {!crowned && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", width: "100%", marginBottom: 4 }} />
            <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(196,164,86,0.45)", margin: 0 }}>
              Tap a version to explore it
            </p>
            <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "10px", color: "rgba(255,255,255,0.2)", textAlign: "center", lineHeight: 1.6, margin: 0 }}>
              {exploredBoth
                ? "Still deciding? Why not both."
                : "Tap the one you want to learn more about."}
            </p>

            {exploredBoth && (
              <button
                onClick={handleAddBoth}
                style={{ marginTop: 8, background: "none", border: "1px solid rgba(196,164,86,0.3)", color: "rgba(196,164,86,0.6)", fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.15em", textTransform: "uppercase", padding: "10px 24px", cursor: "pointer", borderRadius: 1, width: "100%" }}
              >
                {added === "both" ? "Added Both ✓" : `Take both home — ${formatPrice(bothPrice)}`}
              </button>
            )}
          </div>
        )}

        {/* State ②: One crowned — full deep dive info */}
        {crownedItem && (() => {
          const { color: cColor, sleeve: cSleeve } = parseColorway(crownedItem.colorway);
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ height: 1, background: "rgba(196,164,86,0.2)" }} />

              {/* Identity */}
              <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(196,164,86,0.7)", margin: 0 }}>
                {crownedItem.collection} · {crownedItem.name}{cColor ? ` (${cColor})` : ""}
              </p>
              <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: 0 }}>
                {cSleeve || crownedItem.colorway}
              </p>

              {/* Price — prominent */}
              <p style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "1.8rem", color: "#C4A456", margin: "2px 0 0", lineHeight: 1.1 }}>
                {formatPrice(crownedPrice)}
              </p>

              <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "9px", color: "rgba(255,255,255,0.2)", margin: "0 0 8px", letterSpacing: "0.06em" }}>
                Tap the other version to compare · Tap again to deselect
              </p>

              {/* Story */}
              {crownedItem.story && (
                <>
                  <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "4px 0 4px" }}>The Story</p>
                  <p style={{ fontFamily: "var(--font-display, serif)", fontSize: "12px", fontWeight: 300, fontStyle: "italic", color: "rgba(240,232,215,0.55)", lineHeight: 1.6, margin: 0 }}>
                    {crownedItem.story}
                  </p>
                </>
              )}

              {/* Materials */}
              {crownedItem.materials && (
                <>
                  <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "8px 0 4px" }}>Materials</p>
                  <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6, margin: 0 }}>{crownedItem.materials}</p>
                </>
              )}

              {/* Size Guide */}
              {crownedItem.sizeGuide && (
                <>
                  <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "8px 0 4px" }}>Size Guide</p>
                  <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6, margin: 0 }}>{crownedItem.sizeGuide}</p>
                </>
              )}

              {/* Size Chart */}
              {crownedItem.sizeChart && Object.keys(crownedItem.sizeChart).length > 0 && (
                <>
                  <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "8px 0 6px" }}>Size Chart</p>
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 4 }}>
                    <thead>
                      <tr>
                        <th style={{ fontFamily: "var(--font-title, serif)", fontSize: "7px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)", textAlign: "left", paddingBottom: 4, fontWeight: 400 }}>Size</th>
                        <th style={{ fontFamily: "var(--font-title, serif)", fontSize: "7px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)", textAlign: "left", paddingBottom: 4, fontWeight: 400 }}>Chest</th>
                        <th style={{ fontFamily: "var(--font-title, serif)", fontSize: "7px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)", textAlign: "left", paddingBottom: 4, fontWeight: 400 }}>Length</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(crownedItem.sizeChart).map(([size, dims]) => (
                        <tr key={size}>
                          <td style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "rgba(255,255,255,0.45)", padding: "3px 0" }}>{size}</td>
                          <td style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "rgba(255,255,255,0.45)", padding: "3px 0" }}>{dims.chest}</td>
                          <td style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "rgba(255,255,255,0.45)", padding: "3px 0" }}>{dims.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {/* Size selector */}
              <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "8px 0 6px" }}>Select Size</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                {crownedItem.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    style={{ padding: "8px 14px", border: selectedSize === size ? "1px solid #C4A456" : "1px solid rgba(255,255,255,0.12)", background: selectedSize === size ? "rgba(196,164,86,0.1)" : "none", color: selectedSize === size ? "#C4A456" : "rgba(255,255,255,0.35)", fontFamily: "var(--font-title, serif)", fontSize: "9px", letterSpacing: "0.15em", cursor: "pointer", borderRadius: 1, transition: "all 0.15s" }}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "9px", color: "rgba(255,255,255,0.2)", margin: "0 0 12px" }}>
                Pre-selected based on your model. Change anytime.
              </p>

              {/* Add to Cart */}
              <button
                onClick={() => handleAddToCart(crownedItem)}
                style={{ background: added === crownedItem.id ? "rgba(56,161,105,0.15)" : "#C4A456", border: added === crownedItem.id ? "1px solid rgba(56,161,105,0.4)" : "none", color: added === crownedItem.id ? "#68D391" : "#0a0a0a", fontFamily: "var(--font-title, serif)", fontSize: "10px", letterSpacing: "0.25em", textTransform: "uppercase", padding: "16px", cursor: "pointer", width: "100%", borderRadius: 1 }}
              >
                {added === crownedItem.id ? "Added ✓" : `Add to Cart — ${formatPrice(crownedPrice)}`}
              </button>

              {/* Or Add Both */}
              <button
                onClick={handleAddBoth}
                style={{ background: "none", border: "1px solid rgba(196,164,86,0.2)", color: "rgba(196,164,86,0.5)", fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.15em", textTransform: "uppercase", padding: "12px", cursor: "pointer", width: "100%", borderRadius: 1 }}
              >
                {added === "both" ? "Added Both ✓" : `Or Add Both — ${formatPrice(bothPrice)}`}
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
