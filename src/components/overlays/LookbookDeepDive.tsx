"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { VersionItem } from "@/components/overlays/LookbookVersionGrid";
import type { LookbookMediaItem } from "@/lib/contentTypes";
import { formatPrice } from "@/lib/formatPrice";
import { playCartAddSound } from "@/lib/sounds";

function isVideo(item: LookbookMediaItem) { return item.type === "video"; }

interface LookbookDeepDiveProps {
  item: VersionItem;
  media: LookbookMediaItem[];
  defaultSize: string;
  isMember: boolean;
  onExit: () => void;
  onAddToCart: (item: VersionItem, size: string) => void;
}

export function LookbookDeepDive({
  item,
  media,
  defaultSize,
  isMember,
  onExit,
  onAddToCart,
}: LookbookDeepDiveProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState(defaultSize);
  const [added, setAdded] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const count = media.length;

  const prev = useCallback(() => setActiveIdx((i) => (i - 1 + Math.max(count, 1)) % Math.max(count, 1)), [count]);
  const next = useCallback(() => setActiveIdx((i) => (i + 1) % Math.max(count, 1)), [count]);

  function handleTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX; }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx < -50) next();
    else if (dx > 50) prev();
  }

  function handleAddToCart() {
    if (!selectedSize) return;
    onAddToCart(item, selectedSize);
    playCartAddSound();
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  const price = isMember ? item.memberPriceCents : item.initiationPriceCents;
  const current = media[activeIdx];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Sticky media area — 62% height */}
      <div
        style={{ height: "62%", flexShrink: 0, position: "relative", background: "#111" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top bar */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 2,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 14px",
          background: "linear-gradient(rgba(0,0,0,0.5), transparent)",
        }}>
          <button onClick={onExit} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 11, cursor: "pointer", padding: 0, fontFamily: "var(--font-body, sans-serif)", letterSpacing: "0.08em" }}>
            ← Exit
          </button>
          <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(196,164,86,0.85)", margin: 0 }}>
            {item.name}
          </p>
          {count > 0 && (
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "var(--font-body, sans-serif)" }}>
              {activeIdx + 1} / {count}
            </span>
          )}
        </div>

        {/* Media */}
        {count === 0 ? (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {item.productImage ? (
              <Image src={item.productImage} alt={item.name} fill sizes="100vw" style={{ objectFit: "cover", objectPosition: "top center" }} />
            ) : (
              <span style={{ color: "#333", fontSize: 28 }}>▶</span>
            )}
          </div>
        ) : current && isVideo(current) ? (
          <video key={current.url} src={current.url} autoPlay loop muted playsInline
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
        ) : current ? (
          <Image key={current.url} src={current.url} alt={item.name} fill sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "top center" }} />
        ) : null}

        {/* Arrows */}
        {count > 1 && activeIdx > 0 && (
          <button onClick={prev} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 20, width: 32, height: 32, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
        )}
        {count > 1 && activeIdx < count - 1 && (
          <button onClick={next} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 20, width: 32, height: 32, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
        )}

        {/* Dot indicators */}
        {count > 1 && (
          <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", gap: 5, justifyContent: "center" }}>
            {media.map((_, i) => (
              <button key={i} onClick={() => setActiveIdx(i)} style={{ width: 5, height: 5, borderRadius: "50%", background: i === activeIdx ? "#C4A456" : "rgba(255,255,255,0.25)", border: "none", padding: 0, cursor: "pointer" }} />
            ))}
          </div>
        )}
      </div>

      {/* Scrollable info */}
      <div style={{ flex: 1, overflowY: "auto", background: "#0d0d0d", padding: "14px 20px 32px" }}>
        {/* Drag handle hint */}
        <div style={{ width: 32, height: 2, background: "rgba(255,255,255,0.12)", borderRadius: 1, margin: "0 auto 14px" }} />

        <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "9px", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(196,164,86,0.7)", margin: "0 0 4px" }}>
          {item.collection} · {item.name}
        </p>
        <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "rgba(255,255,255,0.45)", margin: "0 0 4px" }}>
          {item.colorway}
        </p>

        {item.story && (
          <p style={{ fontFamily: "var(--font-display, serif)", fontSize: "12px", fontWeight: 300, fontStyle: "italic", color: "rgba(240,232,215,0.6)", lineHeight: 1.6, margin: "12px 0" }}>
            {item.story}
          </p>
        )}

        {item.materials && (
          <>
            <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "16px 0 6px" }}>Materials</p>
            <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, margin: 0 }}>{item.materials}</p>
          </>
        )}

        {item.sizeGuide && (
          <>
            <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "16px 0 6px" }}>Size Guide</p>
            <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, margin: 0 }}>{item.sizeGuide}</p>
          </>
        )}

        {item.sizeChart && Object.keys(item.sizeChart).length > 0 && (
          <>
            <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "16px 0 8px" }}>Size Chart</p>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
              <thead>
                <tr>
                  <th style={{ fontFamily: "var(--font-title, serif)", fontSize: "7px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)", textAlign: "left", paddingBottom: 4, fontWeight: 400 }}>Size</th>
                  <th style={{ fontFamily: "var(--font-title, serif)", fontSize: "7px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)", textAlign: "left", paddingBottom: 4, fontWeight: 400 }}>Chest</th>
                  <th style={{ fontFamily: "var(--font-title, serif)", fontSize: "7px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)", textAlign: "left", paddingBottom: 4, fontWeight: 400 }}>Length</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(item.sizeChart).map(([size, dims]) => (
                  <tr key={size}>
                    <td style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "rgba(255,255,255,0.5)", padding: "3px 0" }}>{size}</td>
                    <td style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "rgba(255,255,255,0.5)", padding: "3px 0" }}>{dims.chest}</td>
                    <td style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "rgba(255,255,255,0.5)", padding: "3px 0" }}>{dims.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Size selector */}
        <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "16px 0 8px" }}>Select Size</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {item.sizes.map((size) => (
            <button
              key={size}
              onClick={() => setSelectedSize(size)}
              style={{
                padding: "8px 14px",
                border: selectedSize === size ? "1px solid #C4A456" : "1px solid rgba(255,255,255,0.15)",
                background: selectedSize === size ? "rgba(196,164,86,0.1)" : "none",
                color: selectedSize === size ? "#C4A456" : "rgba(255,255,255,0.5)",
                fontFamily: "var(--font-title, serif)",
                fontSize: "9px",
                letterSpacing: "0.15em",
                cursor: "pointer",
                borderRadius: 1,
                transition: "all 0.15s",
              }}
            >
              {size}
            </button>
          ))}
        </div>
        <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "9px", color: "rgba(255,255,255,0.2)", margin: "0 0 16px" }}>
          Pre-selected based on your model. Change anytime.
        </p>

        {/* Add to Cart */}
        <button
          onClick={handleAddToCart}
          style={{
            width: "100%",
            padding: "16px",
            background: added ? "rgba(56,161,105,0.15)" : "#C4A456",
            border: added ? "1px solid rgba(56,161,105,0.4)" : "none",
            color: added ? "#68D391" : "#0a0a0a",
            fontFamily: "var(--font-title, serif)",
            fontSize: "10px",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {added ? "Added ✓" : `Add to Cart — ${formatPrice(price)}`}
        </button>
      </div>
    </div>
  );
}
