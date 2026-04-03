"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LookbookContext } from "./studioTypes";
import OverlayPortal from "@/components/OverlayPortal";

// ─── Props ────────────────────────────────────────────────────────────────────

interface LookbookOverlayProps {
  item: LookbookContext | null;
  onClose: () => void;
  onAddToCart: (item: LookbookContext, size: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isVideo(src: string): boolean {
  return /\.(mp4|webm)$/i.test(src.split("?")[0]);
}

const SIZES = ["S", "M", "L", "XL"] as const;
type Size = (typeof SIZES)[number];

const SIZE_CHART: Record<Size, { chest: string; length: string }> = {
  S:  { chest: '38"', length: '28"' },
  M:  { chest: '40"', length: '29"' },
  L:  { chest: '42"', length: '30"' },
  XL: { chest: '44"', length: '31"' },
};

// Default copy
const DEFAULT_STORY =
  "Every thread carries a decision. The Constable is built for the man who has already made his.";
const DEFAULT_MATERIALS =
  "98% Supima Cotton, 2% Elastane. Structured collar. Reinforced placket.";
const DEFAULT_SIZE_GUIDE =
  "If between sizes, size up. The Constable is cut close through the chest and tapered through the torso.";

// ─── Carousel ────────────────────────────────────────────────────────────────

interface CarouselProps {
  lookbook: string[];
}

// Rec 4: Wrapped in React.memo to prevent re-renders when selectedSize changes
const Carousel = React.memo(function Carousel({ lookbook }: CarouselProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef<number>(0);

  const count = lookbook.length;

  const prev = useCallback(() => setActiveIdx((i) => (i - 1 + count) % count), [count]);
  const next = useCallback(() => setActiveIdx((i) => (i + 1) % count), [count]);

  // Critical Fix 2: Reset zoom state when the active slide changes
  useEffect(() => {
    setZoomed(false);
  }, [activeIdx]);

  // Double-tap (mobile) / click-hold (desktop) to zoom
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 350) {
      setZoomed((z) => !z);
    }
    lastTap.current = now;
  }, []);

  const handleMouseDown = useCallback(() => {
    tapTimer.current = setTimeout(() => setZoomed(true), 500);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (tapTimer.current) clearTimeout(tapTimer.current);
  }, []);

  useEffect(() => {
    return () => {
      if (tapTimer.current) clearTimeout(tapTimer.current);
    };
  }, []);

  if (count === 0) {
    return (
      <div
        className="flex items-center justify-center w-full h-full"
        style={{ background: "#121212" }}
      >
        <span className="type-eyebrow text-center px-6">LOOKBOOK COMING SOON</span>
      </div>
    );
  }

  const src = lookbook[activeIdx];
  const isVid = isVideo(src);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: "#121212" }}>
      {/* Media — Rec 1: dragDirectionLock prevents diagonal swipes from blocking vertical scroll */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        dragDirectionLock
        onDragEnd={(_, info) => {
          if (info.offset.x < -50) next();
          else if (info.offset.x > 50) prev();
        }}
        className="absolute inset-0 flex items-center justify-center"
        style={{ cursor: zoomed ? "zoom-out" : "default" }}
        onClick={handleTap}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {isVid ? (
          <video
            key={src}
            src={src}
            autoPlay
            muted
            loop
            playsInline
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: zoomed ? "scale(1.5)" : "scale(1)",
              transformOrigin: "center",
              transition: "transform 0.3s ease",
              display: "block",
            }}
          />
        ) : (
          <img
            key={src}
            src={src}
            alt=""
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: zoomed ? "scale(1.5)" : "scale(1)",
              transformOrigin: "center",
              transition: "transform 0.3s ease",
              display: "block",
              userSelect: "none",
            }}
          />
        )}
      </motion.div>

      {/* Left nav */}
      {count > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          aria-label="Previous"
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.85)",
            border: "none",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            fontSize: 16,
          }}
        >
          ‹
        </button>
      )}

      {/* Right nav */}
      {count > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          aria-label="Next"
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.85)",
            border: "none",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            fontSize: 16,
          }}
        >
          ›
        </button>
      )}

      {/* Dot indicators */}
      {count > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: 6,
            zIndex: 10,
          }}
        >
          {lookbook.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setActiveIdx(i); }}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: i === activeIdx ? "#C4A456" : "rgba(255,255,255,0.3)",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "background 0.2s",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────

export function LookbookOverlay({ item, onClose, onAddToCart }: LookbookOverlayProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  // Reset size when item changes
  useEffect(() => {
    setSelectedSize(null);
  }, [item]);

  // Rec 3: Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleAddToCart = useCallback(() => {
    if (!item || !selectedSize) return;
    onAddToCart(item, selectedSize);
  }, [item, selectedSize, onAddToCart]);

  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!item) return null;

  const story = item.story ?? DEFAULT_STORY;
  const materials = item.materials ?? DEFAULT_MATERIALS;
  const sizeGuide = item.sizeGuide ?? DEFAULT_SIZE_GUIDE;

  return (
    <OverlayPortal>
    <AnimatePresence>
      {item && (
        <>
          {/* Backdrop */}
          <motion.div
            key="lookbook-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={handleBackdropClick}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.93)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              zIndex: 600,
            }}
          />

          {/*
            Panel — Critical Fix 3:
            Centering is handled entirely via Framer Motion's x/y style props so
            Framer never clobbers a CSS transform. The CSS class no longer sets
            transform; it only carries layout dimensions and border-radius.

            Animation:
              initial  → starts below the viewport (y: "100vh")
              animate  → slides up to the centered position (y: "-50%")
              exit     → slides back down below the viewport (y: "100vh")
          */}
          <motion.div
            key="lookbook-panel"
            initial={{ y: "100vh" }}
            animate={{ y: "-50%" }}
            exit={{ y: "100vh" }}
            transition={{ type: "spring", damping: 32, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            // Rec 3: dialog accessibility attributes
            role="dialog"
            aria-modal={true}
            aria-label="Product Lookbook"
            style={{
              position: "fixed",
              left: "50%",
              top: "50%",
              x: "-50%",   // Framer Motion translateX — centering owned by Framer
              zIndex: 601,
              background: "#121212",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            className="lookbook-panel"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: 44,
                height: 44,
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                zIndex: 10,
              }}
            >
              ✕
            </button>

            {/*
              Critical Fix 1: Two-sibling flex layout.
              The carousel occupies the pinned top half (flex: 0 0 50%),
              and the product detail occupies the independently scrollable
              bottom half (flex: 0 0 50%, overflowY: auto).
              This replaces the broken position:sticky approach where the
              sticky element and its scroll container were the same element.
            */}
            <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
              {/* TOP HALF — pinned, never scrolls */}
              <div style={{ flex: "0 0 50%", overflow: "hidden" }}>
                <Carousel lookbook={item.lookbook} />
              </div>

              {/* BOTTOM HALF — scrolls independently */}
              {/* Rec 2: WebkitOverflowScrolling removed (deprecated since iOS 13) */}
              <div
                style={{
                  flex: "0 0 50%",
                  overflowY: "auto",
                  overflowX: "hidden",
                }}
              >
                <div
                  style={{
                    paddingLeft: 24,
                    paddingRight: 24,
                    paddingTop: 28,
                    paddingBottom: 40,
                  }}
                >
                  {/* Item header */}
                  <div style={{ marginBottom: 8 }}>
                    <h2
                      className="type-heading"
                      style={{ color: "var(--color-parchment)", marginBottom: 4 }}
                    >
                      {item.name}
                    </h2>
                    <p className="type-eyebrow">
                      {item.collection} — {item.colorway}
                    </p>
                  </div>

                  {/* Price */}
                  <p
                    style={{
                      fontFamily: "var(--font-display, Georgia, serif)",
                      fontSize: "2rem",
                      color: "#C4A456",
                      marginTop: 12,
                      marginBottom: 24,
                      lineHeight: 1.2,
                    }}
                  >
                    {item.price}
                  </p>

                  {/* 1px gold divider */}
                  <div className="divider-gold" style={{ marginBottom: 24 }} />

                  {/* The Story */}
                  <div style={{ marginBottom: 24 }}>
                    <p className="type-eyebrow" style={{ marginBottom: 8 }}>The Story</p>
                    <p className="type-body" style={{ fontSize: "0.875rem" }}>{story}</p>
                  </div>

                  {/* Materials */}
                  <div style={{ marginBottom: 24 }}>
                    <p className="type-eyebrow" style={{ marginBottom: 8 }}>Materials</p>
                    <p className="type-body" style={{ fontSize: "0.875rem" }}>{materials}</p>
                  </div>

                  {/* Size Guide */}
                  <div style={{ marginBottom: 24 }}>
                    <p className="type-eyebrow" style={{ marginBottom: 8 }}>Size Guide</p>
                    <p className="type-body" style={{ fontSize: "0.875rem" }}>{sizeGuide}</p>
                  </div>

                  {/* Size Chart */}
                  <div style={{ marginBottom: 28 }}>
                    <p className="type-eyebrow" style={{ marginBottom: 10 }}>Size Chart</p>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "0.75rem",
                      }}
                    >
                      <thead>
                        <tr>
                          {(["Size", "Chest", "Length"] as const).map((col) => (
                            <th
                              key={col}
                              style={{
                                textAlign: "left",
                                padding: "6px 0",
                                borderBottom: "1px solid rgba(196,164,86,0.2)",
                                color: "#C4A456",
                                fontFamily: "var(--font-title, Georgia, serif)",
                                fontSize: "0.6rem",
                                letterSpacing: "0.2em",
                                textTransform: "uppercase",
                              }}
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {SIZES.map((size) => (
                          <tr key={size}>
                            <td style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "var(--color-cream, #EDE6D6)", fontSize: "0.75rem" }}>
                              {size}
                            </td>
                            <td style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "var(--color-cream, #EDE6D6)", fontSize: "0.75rem" }}>
                              {SIZE_CHART[size].chest}
                            </td>
                            <td style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "var(--color-cream, #EDE6D6)", fontSize: "0.75rem" }}>
                              {SIZE_CHART[size].length}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Size Selector */}
                  <div style={{ marginBottom: 28 }}>
                    <p className="type-eyebrow" style={{ marginBottom: 12 }}>Select Size</p>
                    <div style={{ display: "flex", gap: 10 }}>
                      {SIZES.map((size) => {
                        const isSelected = selectedSize === size;
                        return (
                          <button
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            style={{
                              width: 52,
                              height: 52,
                              border: `1px solid ${isSelected ? "#C4A456" : "rgba(255,255,255,0.15)"}`,
                              background: "transparent",
                              color: isSelected ? "#C4A456" : "rgba(255,255,255,0.4)",
                              cursor: "pointer",
                              fontFamily: "var(--font-title, Georgia, serif)",
                              fontSize: "0.75rem",
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              transition: "border-color 0.2s, color 0.2s",
                            }}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add to Cart */}
                  <button
                    onClick={handleAddToCart}
                    disabled={!selectedSize}
                    style={{
                      width: "100%",
                      height: 52,
                      background: selectedSize ? "#C4A456" : "rgba(196,164,86,0.2)",
                      color: selectedSize ? "#121212" : "rgba(196,164,86,0.4)",
                      border: "none",
                      cursor: selectedSize ? "pointer" : "default",
                      fontFamily: "var(--font-title, Georgia, serif)",
                      fontSize: "0.75rem",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      fontWeight: 400,
                      transition: "background 0.2s, color 0.2s",
                    }}
                  >
                    {selectedSize ? "Add to Cart" : "Select a Size"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Panel dimensions + responsive styles (no transform here — owned by Framer) */}
          <style>{`
            .lookbook-panel {
              /* Desktop: 9:16 centered, max 90dvh */
              max-height: 90dvh;
              height: 90dvh;
              width: calc(90dvh * 9 / 16);
              border-radius: 4px;
            }

            /* Mobile override */
            @media (max-width: 767px) {
              .lookbook-panel {
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: 100dvh !important;
                max-height: 100dvh !important;
                border-radius: 0 !important;
              }
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
    </OverlayPortal>
  );
}
