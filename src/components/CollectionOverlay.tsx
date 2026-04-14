"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  type MotionValue,
  useMotionValueEvent,
} from "framer-motion";
import { StudioInspector } from "./studio/StudioInspector";
import { modelSlotToStudio, exportInventoryCode } from "./studio/studioUtils";
import type { StudioSlot, StudioDot, ShadowConfig, LookbookContext } from "./studio/studioTypes";
import { MODEL_INVENTORY } from "@/data/inventory";
import type { ModelSlot, OutfitItem } from "@/data/inventory";
import { DEFAULT_SHADOW } from "./studio/studioTypes";
import { LookbookOverlay } from "./studio/LookbookOverlay";
import OverlayPortal from "@/components/OverlayPortal";

const STUDIO_DRAFT_KEY = "tulimond-studio-draft";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CARD_W = 184;
const CARD_APPROX_H = 190; // approximate rendered height for placement math
const EDGE = 12;           // minimum margin from any viewport edge
const ELBOW_H = 36;        // horizontal arm length from dot to elbow corner
const ELBOW_V = 44;        // vertical arm length from elbow corner to card edge
const GOLD = "#C4A456";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CardLayout {
  cardLeft: number;
  cardTop: number;
  /** SVG path string for the elbow connector */
  elbowPath: string;
  /** Dot origin circle center in viewport coords */
  dotX: number;
  dotY: number;
  /** Elbow corner coords (where horizontal arm meets vertical arm) */
  elbowX: number;
  elbowY: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Placement logic
// ─────────────────────────────────────────────────────────────────────────────

function computeLayout(
  dotX: number,
  dotY: number,
  modelRect: DOMRect
): CardLayout {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Try placements in priority order: above-right, above-left, below-right, below-left
  type Side = "right" | "left";
  type Vertical = "above" | "below";

  const tryPlace = (hSide: Side, vSide: Vertical): CardLayout | null => {
    // Elbow corner — end of the horizontal arm, start of the vertical arm
    const elbowX = hSide === "right" ? dotX + ELBOW_H : dotX - ELBOW_H;
    const elbowY = vSide === "above" ? dotY - ELBOW_V : dotY + ELBOW_V;

    // Card is anchored at the elbow corner
    // Horizontal: card's left edge aligns with elbowX (right side) or right edge with elbowX (left side)
    const cardLeft = hSide === "right" ? elbowX : elbowX - CARD_W;
    // Vertical: card's bottom edge at elbowY (above) or top edge at elbowY (below)
    const cardTop = vSide === "above" ? elbowY - CARD_APPROX_H : elbowY;

    // Viewport bounds check
    if (cardLeft < EDGE) return null;
    if (cardLeft + CARD_W > vw - EDGE) return null;
    if (cardTop < EDGE) return null;
    if (cardTop + CARD_APPROX_H > vh - EDGE) return null;

    // Model overlap check
    const cardRight = cardLeft + CARD_W;
    const cardBottom = cardTop + CARD_APPROX_H;
    const overlapsModel =
      cardLeft < modelRect.right &&
      cardRight > modelRect.left &&
      cardTop < modelRect.bottom &&
      cardBottom > modelRect.top;
    if (overlapsModel) return null;

    // Connector: dot → horizontal arm → vertical arm → elbow corner (= card near-corner)
    const elbowPath = `M ${dotX} ${dotY} H ${elbowX} V ${elbowY}`;

    return { cardLeft, cardTop, elbowPath, dotX, dotY, elbowX, elbowY };
  };

  // Fallback: clamp to viewport, ignore model overlap (last resort)
  const fallback = (): CardLayout => {
    const spaceRight = vw - dotX - ELBOW_H;
    const hSide: Side = spaceRight >= CARD_W + EDGE ? "right" : "left";
    const elbowX = hSide === "right" ? dotX + ELBOW_H : dotX - ELBOW_H;
    const elbowY = Math.max(EDGE + CARD_APPROX_H, Math.min(dotY - ELBOW_V, vh - EDGE));
    const cardLeft = Math.max(EDGE, Math.min(hSide === "right" ? elbowX : elbowX - CARD_W, vw - CARD_W - EDGE));
    const cardTop = Math.max(EDGE, Math.min(elbowY - CARD_APPROX_H, vh - CARD_APPROX_H - EDGE));
    const elbowPath = `M ${dotX} ${dotY} H ${elbowX} V ${elbowY}`;
    return { cardLeft, cardTop, elbowPath, dotX, dotY, elbowX, elbowY };
  };

  return (
    tryPlace("right", "above") ??
    tryPlace("left", "above") ??
    tryPlace("right", "below") ??
    tryPlace("left", "below") ??
    fallback()
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ElbowConnector — fixed SVG overlay
// ─────────────────────────────────────────────────────────────────────────────

function ElbowConnector({ layout, visible }: { layout: CardLayout | null; visible: boolean }) {
  if (!layout || !visible) return null;
  return (
    <svg
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 95,
        overflow: "visible",
      }}
    >
      {/* Origin dot */}
      <circle cx={layout.dotX} cy={layout.dotY} r={4} fill={GOLD} opacity={0.9} />
      {/* Elbow path */}
      <path
        d={layout.elbowPath}
        fill="none"
        stroke={GOLD}
        strokeWidth={1}
        strokeOpacity={0.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ strokeLinejoin: "round" } as React.CSSProperties}
      />
      {/* Elbow corner circle */}
      <circle cx={layout.elbowX} cy={layout.elbowY} r={3} fill="#C4A456" opacity={0.6} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ObsidianCard — fixed-position info card
// ─────────────────────────────────────────────────────────────────────────────

const smokedObsidian: React.CSSProperties = {
  background: "rgba(18, 18, 18, 0.94)",
  border: "1px solid rgba(255,255,255,0.12)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
};

interface ObsidianCardProps {
  id: string;
  item: OutfitItem | StudioDot;
  layout: CardLayout;
  onClose: () => void;
  onAction: () => void;
}

function ObsidianCard({ id, item, layout, onClose, onAction }: ObsidianCardProps) {
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "fixed",
        left: layout.cardLeft,
        top: layout.cardTop,
        width: CARD_W,
        zIndex: 100,
        pointerEvents: "auto",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={{ ...smokedObsidian, borderRadius: 12, padding: "16px", position: "relative" }}>
        {/* Gold left accent bar */}
        <div style={{
          position: "absolute", left: 0, top: 16, bottom: 16, width: 3,
          background: "linear-gradient(to bottom, #C4A456, rgba(196,164,86,0.2))",
          borderRadius: "0 4px 4px 0",
        }} />
        {/* Close button */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{
            position: "absolute", top: 10, right: 10,
            background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 12,
          }}
        >✕</button>
        {/* Content */}
        <p style={{ fontSize: "10px", color: "#C4A456", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "6px" }}>
          {item.collection}
        </p>
        <h3 style={{ fontSize: "16px", color: "white", marginBottom: "4px" }}>{item.name}</h3>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginBottom: "16px" }}>{item.price}</p>
        <button
          onClick={(e) => { e.stopPropagation(); onAction(); }}
          style={{
            width: "100%", padding: "12px", borderRadius: "8px", fontSize: "11px", fontWeight: 600,
            textTransform: "uppercase", background: "rgba(196,164,86,0.08)",
            border: `1px solid ${GOLD}`, color: GOLD, cursor: "pointer",
          }}
        >
          Find Your Size
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PulseDot
// ─────────────────────────────────────────────────────────────────────────────

interface PulseDotProps {
  item?: OutfitItem;
  studioDot?: StudioDot;
  tapped: boolean;
  isStudioMode: boolean;
  modelContainerRef: React.RefObject<HTMLDivElement | null>;
  onStudioDotDrop?: (id: string, top: number, left: number) => void;
  onDotTap: () => void;
  onToggleDot: (id: string | null) => void;
  onOpenLookbook?: (ctx: LookbookContext) => void;
}

function PulseDot({
  item, studioDot, tapped, isStudioMode, modelContainerRef,
  onStudioDotDrop, onDotTap, onToggleDot, onOpenLookbook,
}: PulseDotProps) {
  const dot = studioDot ?? item!;
  const innerDotRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<CardLayout | null>(null);
  // Pointer-capture drag state — same approach as model drag
  const dotDragRef = useRef<{ startX: number; startY: number; startTopPct: number; startLeftPct: number; moved: boolean } | null>(null);

  // Recompute layout whenever the card is tapped open
  useEffect(() => {
    if (!tapped || isStudioMode) {
      setLayout(null);
      return;
    }
    const frame = requestAnimationFrame(() => {
      const dotEl = innerDotRef.current;
      const containerEl = modelContainerRef?.current ?? null;
      if (!dotEl) return;
      const dotRect = dotEl.getBoundingClientRect();
      const modelRect = containerEl ? containerEl.getBoundingClientRect() : new DOMRect();
      const cx = dotRect.left + dotRect.width / 2;
      const cy = dotRect.top + dotRect.height / 2;
      setLayout(computeLayout(cx, cy, modelRect));
    });
    return () => cancelAnimationFrame(frame);
  }, [tapped, isStudioMode, modelContainerRef]);

  return (
    <>
      <div
        data-studio-handle="dot"
        className={`absolute z-20 ${!isStudioMode && item ? item.dotPosition : ""}`}
        style={isStudioMode && studioDot ? { top: `${studioDot.topPct}%`, left: `${studioDot.leftPct}%`, touchAction: "none" } : {}}
        onPointerDown={isStudioMode ? (e) => {
          e.stopPropagation();
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          dotDragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startTopPct: studioDot?.topPct ?? 50,
            startLeftPct: studioDot?.leftPct ?? 50,
            moved: false,
          };
        } : undefined}
        onPointerMove={isStudioMode ? (e) => {
          if (!dotDragRef.current) return;
          const container = modelContainerRef.current;
          if (!container) return;
          const { startX, startY, startTopPct, startLeftPct } = dotDragRef.current;
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dotDragRef.current.moved = true;
          // offsetWidth/Height = natural (unscaled) container dimensions
          // getBoundingClientRect = scaled visual dimensions
          // dividing viewport delta by scale factor gives us natural-space delta
          const naturalW = container.offsetWidth;
          const naturalH = container.offsetHeight;
          const rect = container.getBoundingClientRect();
          const scaleX = rect.width / naturalW;
          const scaleY = rect.height / naturalH;
          const newLeft = startLeftPct + (dx / scaleX / naturalW) * 100;
          const newTop = startTopPct + (dy / scaleY / naturalH) * 100;
          onStudioDotDrop?.(dot.id, Math.max(0, Math.min(100, newTop)), Math.max(0, Math.min(100, newLeft)));
        } : undefined}
        onPointerUp={isStudioMode ? (e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
          if (dotDragRef.current && !dotDragRef.current.moved) onDotTap();
          dotDragRef.current = null;
        } : undefined}
        onPointerCancel={isStudioMode ? () => { dotDragRef.current = null; } : undefined}
        onClick={!isStudioMode ? onDotTap : undefined}
      >
        <div className="flex items-center justify-center w-11 h-11 -mt-[22px] -ml-[22px] cursor-pointer">
          <div ref={innerDotRef} className="w-3 h-3 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-pulse" />
        </div>
      </div>

      {/* Connector + card escape Portal's overflow:hidden via OverlayPortal */}
      {!isStudioMode && (
        <OverlayPortal>
          <ElbowConnector layout={layout} visible={tapped} />
          <AnimatePresence>
            {tapped && layout && (
              <ObsidianCard
                id={dot.id}
                item={dot}
                layout={layout}
                onClose={() => onToggleDot(null)}
                onAction={() => {
                  onToggleDot(null);
                  onOpenLookbook?.(dot as LookbookContext);
                }}
              />
            )}
          </AnimatePresence>
        </OverlayPortal>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ModelStage
// ─────────────────────────────────────────────────────────────────────────────

interface ModelStageProps {
  /** Full ModelSlot in normal mode; in studio mode a partial fallback (id + outfit) is acceptable
   *  because studioSlot provides the missing visual fields. */
  slot: Pick<ModelSlot, "id" | "outfit"> & Partial<Pick<ModelSlot, "position" | "scale" | "mobileScale" | "zIndex" | "imageSrc" | "shadow">>;
  index: number;
  revealed: boolean;
  isStudioMode: boolean;
  activeDotId: string | null;
  onToggleDot: (id: string | null) => void;
  // Studio-only props
  studioSlot?: StudioSlot;
  isSelected?: boolean;
  onSelect?: () => void;
  onStudioDotDrop?: (dotId: string, top: number, left: number) => void;
  onModelDrag?: (slotId: string, deltaX: number, deltaY: number) => void;
  onUpdateStudioSlot?: (id: string, patch: Partial<StudioSlot>) => void;
  onOpenLookbook?: (ctx: LookbookContext) => void;
}

function ModelStage({ slot, index, revealed, isStudioMode, studioSlot, isSelected, onSelect, onStudioDotDrop, onModelDrag, onUpdateStudioSlot, activeDotId, onToggleDot, onOpenLookbook }: ModelStageProps) {
  const imageSrc = isStudioMode && studioSlot ? studioSlot.imageSrc : slot.imageSrc;
  const shadow = (isStudioMode && studioSlot) ? studioSlot.shadow : (slot.shadow ?? DEFAULT_SHADOW);

  const left = isStudioMode && studioSlot ? `${studioSlot.leftPct}%` : "";
  const bottom = isStudioMode && studioSlot ? `${studioSlot.bottomPct}%` : "";
  const scale = isStudioMode && studioSlot ? studioSlot.scale : 1;
  const dots = isStudioMode && studioSlot ? studioSlot.dots : slot.outfit;

  // Ref passed to PulseDot so it can measure the model container bounding box
  const modelContainerRef = useRef<HTMLDivElement>(null);

  // Drag start snapshot — lets us compute absolute position without delta accumulation
  const dragStartRef = useRef<{ startX: number; startY: number; startLeftPct: number; startBottomPct: number; positionMode: "left" | "right" } | null>(null);

  // Refs holding the active resize-drag listeners so they can be cleaned up on unmount
  const resizeMoveRef = useRef<((e: PointerEvent) => void) | null>(null);
  const resizeUpRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    return () => {
      if (resizeMoveRef.current) window.removeEventListener("pointermove", resizeMoveRef.current);
      if (resizeUpRef.current) window.removeEventListener("pointerup", resizeUpRef.current);
    };
  }, []);

  const innerContent = (
    <div ref={modelContainerRef} className="relative w-fit h-fit model-container">
      {isStudioMode && isSelected && (
        <div className="absolute inset-0 border-2 border-[#D4B896] pointer-events-none z-50">
          <div className="absolute top-0 left-0 bg-[#D4B896] text-black text-[8px] px-1 font-bold uppercase tracking-tighter">SELECTED</div>
          <div
            data-studio-handle="resize"
            className="absolute -bottom-2 -right-2 w-6 h-6 bg-[#D4B896] pointer-events-auto cursor-ns-resize flex items-center justify-center shadow-lg"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              const startY = e.clientY;
              const startScale = scale;
              const onPointerMove = (m: PointerEvent) => {
                onUpdateStudioSlot?.(slot.id, { scale: Math.max(0.1, startScale + (startY - m.clientY) * 0.005) });
              };
              const onPointerUp = () => {
                window.removeEventListener("pointermove", onPointerMove);
                window.removeEventListener("pointerup", onPointerUp);
                resizeMoveRef.current = null;
                resizeUpRef.current = null;
              };
              resizeMoveRef.current = onPointerMove;
              resizeUpRef.current = onPointerUp;
              window.addEventListener("pointermove", onPointerMove);
              window.addEventListener("pointerup", onPointerUp);
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <span className="text-black text-[12px] font-bold">⇳</span>
          </div>
        </div>
      )}
      <img src={imageSrc} alt="" className="absolute inset-0 h-full w-full pointer-events-none select-none" draggable={false} onContextMenu={(e) => e.preventDefault()} style={{ filter: `brightness(0) blur(${shadow.blur}px) opacity(${shadow.opacity})`, transform: `translate(${shadow.offsetX}px, ${shadow.offsetY}px) scaleX(${shadow.scaleX}) scaleY(${shadow.scaleY})`, transformOrigin: "bottom center" }} />
      <img src={imageSrc} alt="" className="h-[40vh] md:h-[80vh] w-auto object-bottom select-none" draggable={false} onContextMenu={(e) => e.preventDefault()} style={{ filter: "brightness(0.85) contrast(1.1)" }} />
      {dots.map((dot: OutfitItem | StudioDot) => (
        <PulseDot
          key={dot.id}
          item={isStudioMode ? undefined : (dot as OutfitItem)}
          studioDot={isStudioMode ? (dot as StudioDot) : undefined}
          tapped={activeDotId === dot.id}
          isStudioMode={isStudioMode}
          modelContainerRef={modelContainerRef}
          onStudioDotDrop={onStudioDotDrop}
          onToggleDot={onToggleDot}
          onDotTap={() => onToggleDot(activeDotId === dot.id ? null : dot.id)}
          onOpenLookbook={onOpenLookbook}
        />
      ))}
    </div>
  );

  // Studio mode: plain div, pointer capture, absolute-from-start positioning
  // No window listeners, no delta accumulation, no FM transform conflicts
  if (isStudioMode && studioSlot) {
    const posKey = studioSlot.positionMode === "right" ? "right" : "left";
    const posStyle = posKey === "right" ? { right: left } : { left };
    return (
      <div
        className="absolute pointer-events-auto"
        style={{
          ...posStyle,
          bottom,
          zIndex: isSelected ? 4000 : (slot.zIndex || 20 + index),
          transform: `scale(${scale})`,
          transformOrigin: "bottom center",
          cursor: dragStartRef.current ? "grabbing" : "grab",
          touchAction: "none",
        }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("[data-studio-handle]")) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          onSelect?.();
          dragStartRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startLeftPct: studioSlot.leftPct,
            startBottomPct: studioSlot.bottomPct,
            positionMode: studioSlot.positionMode,
          };
        }}
        onPointerMove={(e) => {
          if (!dragStartRef.current) return;
          const { startX, startY, startLeftPct, startBottomPct, positionMode } = dragStartRef.current;
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const newLeft = startLeftPct + ((e.clientX - startX) / vw) * 100;
          const newBottom = startBottomPct - ((e.clientY - startY) / vh) * 100;
          onModelDrag?.(slot.id, newLeft, newBottom);
        }}
        onPointerUp={(e) => {
          dragStartRef.current = null;
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => { dragStartRef.current = null; }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {innerContent}
      </div>
    );
  }

  // Normal mode: Framer Motion reveal animation
  return (
    <motion.div
      className={`absolute pointer-events-auto origin-bottom ${slot.position} ${slot.mobileScale} ${slot.scale}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 16 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: revealed ? index * 0.18 : 0 }}
      style={{ zIndex: slot.zIndex || 20 + index }}
    >
      {innerContent}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Overlay Component
// ─────────────────────────────────────────────────────────────────────────────

interface CollectionOverlayProps {
  opacity: MotionValue<number>;
  onAddToCart: (item: LookbookContext, size: string) => void;
}

export default function CollectionOverlay({ opacity, onAddToCart }: CollectionOverlayProps) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [activeDotId, setActiveDotId] = useState<string | null>(null);
  const [isStudioMode, setIsStudioMode] = useState(false);
  const [studioSlots, setStudioSlots] = useState<StudioSlot[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [lookbookDot, setLookbookDot] = useState<LookbookContext | null>(null);
  const [copyConfirm, setCopyConfirm] = useState(false);
  const [saveConfirm, setSaveConfirm] = useState(false);

  useMotionValueEvent(opacity, "change", (v) => {
    setActive(v > 0.05);
    if (!revealed && v >= 0.99) setRevealed(true);
  });

  const updateSlot = useCallback((id: string, patch: Partial<StudioSlot>) => {
    setStudioSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const updateDot = useCallback((slotId: string, dotId: string, patch: Partial<StudioDot>) => {
    setStudioSlots((prev) => prev.map((s) => s.id === slotId ? { ...s, dots: s.dots.map((d) => (d.id === dotId ? { ...d, ...patch } : d)) } : s));
  }, []);

  // Receives absolute pct values computed from drag-start snapshot — no accumulation, no drift
  // Clamped to ±50% off-screen: allows 50% off either edge, then stops (no squishing)
  const handleModelDrag = useCallback((slotId: string, newLeftPct: number, newBottomPct: number) => {
    const clampedLeftPct = Math.max(-50, Math.min(150, newLeftPct));
    setStudioSlots(prev => prev.map(s => s.id === slotId ? { ...s, leftPct: clampedLeftPct, bottomPct: newBottomPct } : s));
  }, []);

  const handleClearDraft = useCallback(() => {
    const confirmed = window.confirm("Are you sure you want to delete your changes from this session?");
    if (confirmed) {
      localStorage.removeItem(STUDIO_DRAFT_KEY);
      setStudioSlots(MODEL_INVENTORY.map(modelSlotToStudio));
      setSelectedModelId(null);
    }
  }, []);

  return (
    <div
      className="absolute inset-0 z-[5000] main-container"
      style={{ pointerEvents: (active || isStudioMode) ? "auto" : "none" }}
      onPointerDown={(e) => {
          // Only deselect when clicking the bare background — not a model
          if (isStudioMode && (e.target as HTMLElement).classList.contains("main-container")) {
            setSelectedModelId(null);
          }
      }}
    >
      {isStudioMode && (
        <div
          className="fixed inset-y-0 left-0 w-[400px] z-[6000]"
          style={{ pointerEvents: "none" }}
        >
          <StudioInspector
            slots={studioSlots} 
            selectedId={selectedModelId} 
            onSelectSlot={(id: string) => {
                console.log("Inspector selecting character:", id);
                setSelectedModelId(id);
            }} 
            onUpdateSlot={updateSlot} 
            onUpdateDot={updateDot} 
            onSave={async () => {
                localStorage.setItem(STUDIO_DRAFT_KEY, JSON.stringify(studioSlots));
                setSaveConfirm(true);
                setTimeout(() => setSaveConfirm(false), 2000);
            }} 
            onCopyCode={() => {
              navigator.clipboard.writeText(exportInventoryCode(studioSlots));
              setCopyConfirm(true); setTimeout(() => setCopyConfirm(false), 2000);
            }}
            copyConfirm={copyConfirm}
            onAddDot={(slotId) => {
              const newDot: StudioDot = { id: `dot-${Date.now()}`, name: "New Item", collection: "The Constable", colorway: "", price: "", type: "public", topPct: 50, leftPct: 50, lookbook: [], filterDimensions: [], sizes: ["S", "M", "L", "XL", "XXL"], sizeChart: { S: { chest: '38"', length: '28"' }, M: { chest: '40"', length: '29"' }, L: { chest: '42"', length: '30"' }, XL: { chest: '44"', length: '31"' }, XXL: { chest: '46"', length: '32"' } }, story: "", materials: "", sizeGuide: "" };
              setStudioSlots(prev => prev.map(s => s.id === slotId ? { ...s, dots: [...s.dots, newDot] } : s));
            }}
            onRemoveDot={(slotId, dotId) => {
              setStudioSlots(prev => prev.map(s => s.id === slotId ? { ...s, dots: s.dots.filter(d => d.id !== dotId) } : s));
            }}
            onSwapImage={(id, src) => updateSlot(id, { imageSrc: src })}
            onAddSlot={() => {
               const id = `patron-${Date.now()}`;
               setStudioSlots(prev => [...prev, { id, displayName: "New Patron", imageSrc: "/model-center.png", positionMode: "left", leftPct: 40, bottomPct: 5, scale: 0.85, zIndex: 25, dots: [], shadow: { ...DEFAULT_SHADOW } }]);
               setSelectedModelId(id);
            }}
            onRemoveSlot={(slotId) => {
               setStudioSlots(prev => prev.filter(s => s.id !== slotId));
               setSelectedModelId(null);
            }}
            onUpdateShadow={(id, patch) => {
               const s = studioSlots.find(sl => sl.id === id);
               if (s) updateSlot(id, { shadow: { ...s.shadow, ...patch } });
            }}
          />
          
          <div className="absolute bottom-24 right-[-140px] pointer-events-auto">
             <button 
                onPointerDown={handleClearDraft}
                className="px-4 py-2 bg-red-900/40 border border-red-500/50 text-red-200 text-[8px] uppercase tracking-[0.2em] backdrop-blur-md hover:bg-red-900/60 transition-all duration-300"
             >
                ⚠ Clear Session Draft
             </button>
          </div>
        </div>
      )}

      {isStudioMode 
        ? studioSlots.map((s, i) => (
            <ModelStage key={s.id} slot={MODEL_INVENTORY.find(m => m.id === s.id) || { id: s.id, outfit: [] }} index={i} revealed={revealed} isStudioMode={true} studioSlot={s} isSelected={selectedModelId === s.id} onSelect={() => setSelectedModelId(s.id)} onStudioDotDrop={(dotId: string, top: number, left: number) => updateDot(s.id, dotId, { topPct: top, leftPct: left })} onModelDrag={handleModelDrag} onUpdateStudioSlot={updateSlot} activeDotId={activeDotId} onToggleDot={setActiveDotId} onOpenLookbook={setLookbookDot} />
          ))
        : MODEL_INVENTORY.map((slot, i) => (
            <ModelStage key={slot.id} slot={slot} index={i} revealed={revealed} isStudioMode={false} activeDotId={activeDotId} onToggleDot={setActiveDotId} onOpenLookbook={setLookbookDot} />
          ))
      }

      {saveConfirm && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#D4B896] text-black text-[10px] font-bold uppercase tracking-widest z-[7000] shadow-2xl">
          Draft Saved Locally
        </div>
      )}

      <div className="fixed bottom-6 right-6 flex gap-4 pointer-events-auto z-[6100]">
        <button 
          className="px-6 py-3 bg-black/90 border border-white/20 text-[10px] uppercase tracking-widest text-white backdrop-blur-xl"
          style={isStudioMode ? { color: "#D4B896", borderColor: "#D4B896" } : {}}
          onPointerDown={(e) => { 
            e.stopPropagation(); 
            if (isStudioMode) {
              setIsStudioMode(false);
            } else {
              const savedDraft = localStorage.getItem(STUDIO_DRAFT_KEY);
              if (savedDraft) {
                try {
                  setStudioSlots(JSON.parse(savedDraft));
                } catch {
                  localStorage.removeItem(STUDIO_DRAFT_KEY);
                  setStudioSlots(MODEL_INVENTORY.map(modelSlotToStudio));
                }
              } else {
                setStudioSlots(MODEL_INVENTORY.map(modelSlotToStudio));
              }
              const currentModel = MODEL_INVENTORY.find(m => m.outfit.some(d => d.id === activeDotId));
              if (currentModel) setSelectedModelId(currentModel.id);
              setIsStudioMode(true);
            }
          }}
        >
          {isStudioMode ? "✕ Close Studio" : "⊙ Studio Mode"}
        </button>
      </div>
      
      {lookbookDot && (
        <LookbookOverlay
          item={lookbookDot}
          onClose={() => setLookbookDot(null)}
          onAddToCart={(item, size) => {
            onAddToCart(item, size);
            setLookbookDot(null);
          }}
        />
      )}
    </div>
  );
}