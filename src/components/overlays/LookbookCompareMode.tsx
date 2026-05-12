"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { VersionItem } from "@/components/overlays/LookbookVersionGrid";
import type { LookbookMediaItem } from "@/lib/contentTypes";
import { formatPrice } from "@/lib/formatPrice";
import { playCartAddSound } from "@/lib/sounds";

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
      style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, opacity: dimmed ? 0.28 : 1, transition: "opacity 0.25s" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "6px", letterSpacing: "0.1em", textTransform: "uppercase", color: dimmed ? "rgba(255,255,255,0.4)" : "rgba(196,164,86,0.8)", textAlign: "center", margin: 0 }}>
        {item.name}
      </p>
      <button
        onClick={onTap}
        style={{ background: "none", border: dimmed ? "none" : "1px solid rgba(196,164,86,0.4)", borderRadius: 3, padding: 0, cursor: "pointer", position: "relative", overflow: "hidden", aspectRatio: "4/9", width: "100%" }}
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
          <video key={current.url} src={current.url} autoPlay loop muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
        ) : (
          <Image key={current.url} src={current.url} alt={item.name} fill sizes="50vw" style={{ objectFit: "cover", objectPosition: "top center" }} />
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
    </div>
  );
}

interface LookbookCompareModeProps {
  versions: [VersionItem, VersionItem];
  media: Record<string, LookbookMediaItem[]>;
  defaultSize: string;
  isMember: boolean;
  onBack: () => void;
  onAddToCart: (item: VersionItem, size: string) => void;
}

export function LookbookCompareMode({
  versions,
  media,
  defaultSize,
  isMember,
  onBack,
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
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 11, cursor: "pointer", padding: 0, fontFamily: "var(--font-body, sans-serif)", letterSpacing: "0.08em" }}>← Back</button>
        <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(196,164,86,0.6)", margin: 0 }}>Compare</p>
        <div style={{ width: 40 }} />
      </div>

      {/* Panels */}
      <div style={{ display: "flex", gap: 8, padding: "0 14px", flexShrink: 0 }}>
        <ComparePanel item={left} media={media[left.id] ?? []} dimmed={crowned !== null && crowned !== left.id} onTap={() => handleTap(left.id)} />
        <div style={{ width: 1, background: "rgba(196,164,86,0.15)", alignSelf: "stretch" }} />
        <ComparePanel item={right} media={media[right.id] ?? []} dimmed={crowned !== null && crowned !== right.id} onTap={() => handleTap(right.id)} />
      </div>

      {/* Info area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 24px" }}>

        {/* State ①: Neutral */}
        {!crowned && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, paddingTop: 8 }}>
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", width: "100%", marginBottom: 4 }} />
            <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(196,164,86,0.45)", margin: 0 }}>
              Tap a version to explore it
            </p>
            <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "10px", color: "rgba(255,255,255,0.2)", textAlign: "center", lineHeight: 1.6, margin: 0 }}>
              {exploredBoth
                ? "Still deciding? Why not both."
                : "Swipe each side independently. Tap the one you want to learn more about."}
            </p>

            {/* Size selector always visible in neutral */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>
              {left.sizes.map((size) => (
                <button key={size} onClick={() => setSelectedSize(size)} style={{ padding: "5px 10px", border: selectedSize === size ? "1px solid #C4A456" : "1px solid rgba(255,255,255,0.12)", background: selectedSize === size ? "rgba(196,164,86,0.1)" : "none", color: selectedSize === size ? "#C4A456" : "rgba(255,255,255,0.35)", fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.1em", cursor: "pointer", borderRadius: 1 }}>
                  {size}
                </button>
              ))}
            </div>

            {/* Add Both — appears after both explored */}
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

        {/* State ②: One crowned */}
        {crownedItem && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ height: 1, background: "rgba(196,164,86,0.2)", marginBottom: 4 }} />
            <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(196,164,86,0.7)", margin: 0 }}>
              {crownedItem.collection} · {crownedItem.name}
            </p>
            <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "10px", color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.5 }}>
              {crownedItem.colorway}
            </p>
            {crownedItem.story && (
              <p style={{ fontFamily: "var(--font-display, serif)", fontSize: "11px", fontWeight: 300, fontStyle: "italic", color: "rgba(240,232,215,0.55)", lineHeight: 1.6, margin: "4px 0" }}>
                {crownedItem.story}
              </p>
            )}
            <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "9px", color: "rgba(255,255,255,0.2)", margin: "4px 0 2px", letterSpacing: "0.08em" }}>↓ Tap dimmed side to switch</p>

            {/* Size selector */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {crownedItem.sizes.map((size) => (
                <button key={size} onClick={() => setSelectedSize(size)} style={{ padding: "5px 10px", border: selectedSize === size ? "1px solid #C4A456" : "1px solid rgba(255,255,255,0.12)", background: selectedSize === size ? "rgba(196,164,86,0.1)" : "none", color: selectedSize === size ? "#C4A456" : "rgba(255,255,255,0.35)", fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.1em", cursor: "pointer", borderRadius: 1 }}>
                  {size}
                </button>
              ))}
            </div>

            {/* Primary: Add to Cart */}
            <button onClick={() => handleAddToCart(crownedItem)} style={{ background: added === crownedItem.id ? "rgba(56,161,105,0.15)" : "#C4A456", border: added === crownedItem.id ? "1px solid rgba(56,161,105,0.4)" : "none", color: added === crownedItem.id ? "#68D391" : "#0a0a0a", fontFamily: "var(--font-title, serif)", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", padding: "12px", cursor: "pointer", width: "100%", borderRadius: 1 }}>
              {added === crownedItem.id ? "Added ✓" : `Add to Cart — ${formatPrice(crownedPrice)}`}
            </button>

            {/* Secondary: Or Add Both */}
            <button onClick={handleAddBoth} style={{ background: "none", border: "1px solid rgba(196,164,86,0.2)", color: "rgba(196,164,86,0.5)", fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.15em", textTransform: "uppercase", padding: "9px", cursor: "pointer", width: "100%", borderRadius: 1 }}>
              {added === "both" ? "Added Both ✓" : `Or Add Both — ${formatPrice(bothPrice)}`}
            </button>

            <button onClick={() => setCrowned(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.2)", fontSize: "9px", fontFamily: "var(--font-body, sans-serif)", letterSpacing: "0.08em", cursor: "pointer", padding: "4px 0", textAlign: "center" }}>
              Tap again to deselect
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
