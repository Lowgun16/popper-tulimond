// src/components/CollectionOverlay.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  type MotionValue,
  useMotionValue,
  useMotionValueEvent,
} from "framer-motion";
import { StudioInspector } from "./studio/StudioInspector";
import { modelSlotToStudio, exportInventoryCode } from "./studio/studioUtils";
import type { StudioSlot, StudioDot, ShadowConfig, LookbookContext } from "./studio/studioTypes";
import { MODEL_INVENTORY } from "@/data/inventory";
import type { ModelSlot, OutfitItem } from "@/data/inventory";
import { DEFAULT_SHADOW } from "./studio/studioTypes";
import { LookbookOverlay } from "./studio/LookbookOverlay";

function isVideo(src: string): boolean {
  return /\.(mp4|webm|mov)$/i.test(src.split("?")[0]);
}

// Toggle vault dots globally — set true to re-enable champagne gold markers
const SHOW_VAULT_DOTS = false;

// ─────────────────────────────────────────────────────────────────────────────
// HoverCard
// ─────────────────────────────────────────────────────────────────────────────
// flipLeft: when the dot's leftPct > 50, the card opens LEFT of the dot so it
//           never bleeds off the right side of the screen (the Ethan fix).

interface HoverCardProps {
  item: OutfitItem | StudioDot;
  visible: boolean;
  flipLeft: boolean;       // true → position right-6 instead of left-6
  onClose: () => void;     // X button + any internal close trigger
  onAction?: () => void;   // opens lookbook / find-your-size
}

function HoverCard({ item, visible, flipLeft, onClose, onAction }: HoverCardProps) {
  const isVault = item.type === "vault";

  const name       = "name"       in item ? item.name       : "";
  const collection = "collection" in item ? item.collection : "";
  const colorway   = "colorway"   in item ? item.colorway   : "";
  const price      = "price"      in item ? item.price      : "";

  // Slide direction mirrors position: card on the right slides in from right,
  // card on the left slides in from left.
  const hiddenTranslate = flipLeft ? "translateX(-12px)" : "translateX(12px)";

  return (
    <div
      className="absolute top-1/2 z-50 w-48 transition-[opacity,transform] duration-500"
      style={{
        // ── Smart flip: right-side characters open card to the LEFT ──
        ...(flipLeft
          ? { right: "1.5rem", left: "auto" }
          : { left: "1.5rem", right: "auto" }),
        opacity:       visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transform: `translateY(-50%) ${visible ? "translateX(0px)" : hiddenTranslate}`,
      }}
    >
      <div className="relative bg-black/95 backdrop-blur-xl border border-white/20 p-4 rounded-sm shadow-2xl">

        {/* ── X close button ── */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute top-2 right-2 flex items-center justify-center transition-colors duration-150"
          style={{
            width: 16, height: 16, borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.15)",
            background: "transparent",
            color: "rgba(255,255,255,0.30)",
            fontSize: 7, cursor: "pointer",
            lineHeight: 1, padding: 0,
          }}
          aria-label="Close"
        >
          ✕
        </button>

        <p className="type-eyebrow mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{collection}</p>
        <p className="text-xs text-white mb-1">{name}</p>
        <p className="text-[10px] text-white/50 mb-2">{colorway}</p>
        <p className="text-xs font-bold text-white/90 mb-3">{price}</p>

        {isVault ? (
          <div className="w-full text-center text-[9px] tracking-widest uppercase py-2 border border-white/10 text-white/20 rounded-sm">
            Members Only
          </div>
        ) : (
          // ── Real <button> that fires onAction ──
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onAction) onAction();
            }}
            className="w-full text-center text-[9px] tracking-widest uppercase py-2.5 border border-white/30 text-white hover:bg-white hover:text-black transition-all duration-300 cursor-pointer active:scale-95"
          >
            {name.toLowerCase().includes("scarf") || name.toLowerCase().includes("belt")
              ? "Lookbook"
              : "Find Your Size"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PulseDot
// ─────────────────────────────────────────────────────────────────────────────

interface PulseDotProps {
  item?:           OutfitItem;
  studioDot?:      StudioDot;
  // Central-brain props — replaces the old local `tapped` boolean
  isActive:        boolean;           // this specific dot is the open one
  onDotActivate:   (id: string) => void; // tell the brain to open this dot
  onDotClose:      () => void;           // tell the brain to close all dots
  // Unchanged props
  hovered:         boolean;
  isEditMode:      boolean;
  isStudioMode:    boolean;
  modelId:         string;
  onDotDrop:       (text: string) => void;
  onStudioDotDrop?: (dotId: string, topPct: number, leftPct: number) => void;
  onOpenLookbook?: () => void;         // fires lookbook directly in studio mode
}

function PulseDot({
  item,
  studioDot,
  isActive,
  onDotActivate,
  onDotClose,
  hovered,
  isEditMode,
  isStudioMode,
  modelId,
  onDotDrop,
  onStudioDotDrop,
  onOpenLookbook,
}: PulseDotProps) {
  const dot       = studioDot ?? item!;
  const isVault   = dot.type === "vault";
  const dotColor  = isVault ? "#D4B896" : "#FFFFFF";
  const glowColor = isVault ? "rgba(212,184,150,0.6)" : "rgba(255,255,255,0.8)";
  const animation = isVault
    ? "pulse-champagne 2s ease-in-out infinite"
    : "pulse-white 2s ease-in-out infinite";

  const draggable = isEditMode || isStudioMode;

  const dotDragX = useMotionValue(0);
  const dotDragY = useMotionValue(0);

  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: { point: { x: number; y: number } }
  ) => {
    const target    = event.target as HTMLElement;
    const container = target.closest(".model-container");
    if (!container) return;
    const rect    = container.getBoundingClientRect();
    const scrollX = window.scrollX ?? 0;
    const scrollY = window.scrollY ?? 0;
    const rawX    = ((info.point.x - scrollX - rect.left) / rect.width)  * 100;
    const rawY    = ((info.point.y - scrollY - rect.top)  / rect.height) * 100;
    const x       = Math.max(0, Math.min(100, rawX));
    const y       = Math.max(0, Math.min(100, rawY));

    if (isStudioMode && onStudioDotDrop) {
      onStudioDotDrop(dot.id, y, x);
      dotDragX.set(0);
      dotDragY.set(0);
    } else {
      const text = `${modelId} · ${dot.id}: top-[${y.toFixed(1)}%] left-[${x.toFixed(1)}%]`;
      console.log(text);
      onDotDrop(text);
    }
  };

  // ── Toggle logic: tap open dot → close; tap closed dot → open ──
  const handleTap = () => {
    if (draggable) return;
    if (isStudioMode && onOpenLookbook) { onOpenLookbook(); return; }
    if (isActive) {
      onDotClose();
    } else {
      onDotActivate(dot.id);
    }
  };

  // leftPct for flip detection — works for both OutfitItem (dotPosition string) and StudioDot
  const leftPct: number = (() => {
    if (studioDot) return studioDot.leftPct;
    if (item) {
      // dotPosition is a Tailwind class string like "top-[35.0%] left-[51.6%]"
      const match = item.dotPosition.match(/left-\[([0-9.]+)%\]/);
      return match ? parseFloat(match[1]) : 50;
    }
    return 50;
  })();

  const positionStyle = isStudioMode && studioDot
    ? { position: "absolute" as const, top: `${studioDot.topPct}%`, left: `${studioDot.leftPct}%` }
    : undefined;

  const positionClass = !isStudioMode && item
    ? `absolute z-20 ${item.dotPosition}`
    : "absolute z-20";

  return (
    <motion.div
      className={`${positionClass} flex items-center justify-center`}
      style={{
        ...(positionStyle || {}),
        zIndex:        20,
        cursor:        draggable ? "grab" : undefined,
        x:             dotDragX,
        y:             dotDragY,
        pointerEvents: "auto",
        width:         "44px",
        height:        "44px",
        marginTop:     "-22px",
        marginLeft:    "-22px",
      }}
      drag={draggable}
      dragMomentum={false}
      dragElastic={0}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onDragEnd={handleDragEnd as any}
      onTap={handleTap}
      whileDrag={{ cursor: "grabbing", scale: 1.5 }}
      whileTap={{ scale: 0.9 }}
    >
      <div className="relative">
        <div
          className="w-3 h-3 rounded-full"
          style={{
            backgroundColor: dotColor,
            boxShadow: draggable
              ? `0 0 0 2px rgba(212,184,150,0.8), 0 0 15px ${glowColor}`
              : `0 0 15px ${glowColor}`,
            animation: draggable ? "none" : animation,
            cursor:    draggable ? "inherit" : "pointer",
          }}
        />
        {/* HoverCard — only in normal (non-drag) mode */}
        {!draggable && (
          <HoverCard
            item={dot}
            visible={hovered || isActive}
            flipLeft={leftPct > 50}
            onClose={onDotClose}
            onAction={onOpenLookbook}
          />
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// useImageContentBounds
// ─────────────────────────────────────────────────────────────────────────────

interface ContentBounds {
  leftPct:   number;
  topPct:    number;
  rightPct:  number;
  bottomPct: number;
}

function useImageContentBounds(src: string): ContentBounds | null {
  const [bounds, setBounds] = useState<ContentBounds | null>(null);

  useEffect(() => {
    setBounds(null);
    if (isVideo(src)) return;

    let cancelled = false;
    const canvas  = document.createElement("canvas");
    const ctx     = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const img = new window.Image();
    img.onload = () => {
      if (cancelled) return;
      const maxDim = 512;
      const scale  = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const w      = Math.max(1, Math.floor(img.naturalWidth  * scale));
      const h      = Math.max(1, Math.floor(img.naturalHeight * scale));
      canvas.width  = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      const data  = ctx.getImageData(0, 0, w, h).data;
      const ALPHA = 12;
      let minX = w, maxX = 0, minY = h, maxY = 0;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] > ALPHA) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (maxX <= minX || maxY <= minY) return;
      setBounds({
        leftPct:   (minX / w) * 100,
        topPct:    (minY / h) * 100,
        rightPct:  ((w - maxX - 1) / w) * 100,
        bottomPct: ((h - maxY - 1) / h) * 100,
      });
    };
    img.src = src;
    return () => { cancelled = true; };
  }, [src]);

  return bounds;
}

// ─────────────────────────────────────────────────────────────────────────────
// useSafeImageSrc
// ─────────────────────────────────────────────────────────────────────────────

function useSafeImageSrc(targetSrc: string): string {
  const [readySrc, setReadySrc] = useState(targetSrc);

  useEffect(() => {
    let cancelled = false;
    if (isVideo(targetSrc)) { setReadySrc(targetSrc); return; }
    const img    = new window.Image();
    img.onload   = () => { if (!cancelled) setReadySrc(targetSrc); };
    img.src      = targetSrc;
    return () => { cancelled = true; };
  }, [targetSrc]);

  return readySrc;
}

// ─────────────────────────────────────────────────────────────────────────────
// ModelStage
// ─────────────────────────────────────────────────────────────────────────────

interface ModelStageProps {
  slot:               ModelSlot;
  index:              number;
  revealed:           boolean;
  isEditMode:         boolean;
  isStudioMode:       boolean;
  studioSlot?:        StudioSlot;
  isSelected:         boolean;
  // Central-brain props threaded from CollectionOverlay
  activeDotId:        string | null;
  onDotActivate:      (id: string) => void;
  onDotClose:         () => void;
  onSelect:           () => void;
  onDotDrop:          (text: string) => void;
  onStudioDotDrop:    (dotId: string, topPct: number, leftPct: number) => void;
  onModelDragEnd:     (slotId: string, offsetX: number, offsetY: number) => void;
  onUpdateStudioSlot: (id: string, patch: Partial<StudioSlot>) => void;
  onOpenLookbook:     (ctx: LookbookContext) => void;
}

function ModelStage({
  slot,
  index,
  revealed,
  isEditMode,
  isStudioMode,
  studioSlot,
  isSelected,
  activeDotId,
  onDotActivate,
  onDotClose,
  onSelect,
  onDotDrop,
  onStudioDotDrop,
  onModelDragEnd,
  onUpdateStudioSlot,
  onOpenLookbook,
}: ModelStageProps) {
  const [hovered,  setHovered]  = useState(false);
  const [imgError, setImgError] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  const toLookbookCtx = (dot: StudioDot | OutfitItem): LookbookContext => ({
    name:       dot.name,
    collection: dot.collection,
    colorway:   dot.colorway,
    price:      dot.price,
    type:       dot.type,
    lookbook:   ("lookbook" in dot ? dot.lookbook : undefined) ?? [],
  });

  const imageSrc = isStudioMode && studioSlot ? studioSlot.imageSrc : slot.imageSrc;
  useEffect(() => setImgError(false), [imageSrc]);
  const safeSrc    = useSafeImageSrc(imageSrc);
  const displaySrc = isStudioMode ? imageSrc : safeSrc;
  const contentBounds = useImageContentBounds(imageSrc);

  const shadow: ShadowConfig =
    isStudioMode && studioSlot ? studioSlot.shadow : (slot.shadow ?? DEFAULT_SHADOW);

  const effectiveBounds = contentBounds ?? { leftPct: 5, topPct: 5, rightPct: 5, bottomPct: 5 };

  useEffect(() => { return () => clearTimeout(leaveTimer.current); }, []);

  const handleEnter = () => { clearTimeout(leaveTimer.current); setHovered(true); };
  const handleLeave = () => { leaveTimer.current = setTimeout(() => setHovered(false), 120); };

  // isActive is true if any dot on THIS stage is the open one
  const stageHasActiveCard = (dots: Array<OutfitItem | StudioDot>) =>
    dots.some((d) => d.id === activeDotId);

  const handleScalePointerDown = (e: React.PointerEvent) => {
    if (!studioSlot) return;
    e.stopPropagation();
    e.preventDefault();
    const startX     = e.clientX;
    const startY     = e.clientY;
    const startScale = studioSlot.scale;
    const onMove     = (me: PointerEvent) => {
      const delta    = ((me.clientX - startX) - (me.clientY - startY)) / 200;
      const newScale = Math.max(0.2, Math.min(2.5, startScale + delta));
      onUpdateStudioSlot(studioSlot.id, { scale: newScale });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const dots = isStudioMode && studioSlot
    ? studioSlot.dots.filter((d) => d.type === "public" || SHOW_VAULT_DOTS)
    : slot.outfit.filter((item) => item.type === "public" || SHOW_VAULT_DOTS);

  const isAnyDotActive = stageHasActiveCard(dots);
  const isActive       = hovered || isAnyDotActive;

  const showBoundingBox = isStudioMode && isSelected && studioSlot;

  const studioPositionStyle: React.CSSProperties =
    isStudioMode && studioSlot
      ? {
          position:        "absolute",
          left:            `${studioSlot.leftPct}%`,
          bottom:          `${studioSlot.bottomPct}%`,
          zIndex:          studioSlot.zIndex,
          transformOrigin: "bottom center",
        }
      : {};

  const containerClass = isStudioMode
    ? "bg-transparent pointer-events-auto transition-opacity duration-700 origin-bottom"
    : `absolute bg-transparent pointer-events-auto transition-opacity duration-700 origin-bottom ${slot.position} ${slot.mobileScale} ${slot.scale}`;

  const containerStyle: React.CSSProperties = {
    opacity:       revealed ? 1 : 0,
    transitionDelay: `${index * 150}ms`,
    zIndex:        (isActive || (isEditMode && hovered)) ? 999 : (slot.zIndex || 20 + index),
    ...studioPositionStyle,
  };

  // ── Shared dot renderer — used in both studio and normal branches ──
  const renderDots = () =>
    isStudioMode && studioSlot
      ? (dots as StudioDot[]).map((dot) => (
          <PulseDot
            key={dot.id}
            studioDot={dot}
            isActive={activeDotId === dot.id}
            onDotActivate={onDotActivate}
            onDotClose={onDotClose}
            hovered={hovered}
            isEditMode={false}
            isStudioMode={true}
            modelId={slot.id}
            onDotDrop={onDotDrop}
            onStudioDotDrop={onStudioDotDrop}
            onOpenLookbook={dot.lookbook.length > 0 ? () => onOpenLookbook(toLookbookCtx(dot)) : undefined}
          />
        ))
      : (dots as OutfitItem[]).map((item) => (
          <PulseDot
            key={item.id}
            item={item}
            isActive={activeDotId === item.id}
            onDotActivate={onDotActivate}
            onDotClose={onDotClose}
            hovered={hovered}
            isEditMode={isEditMode}
            isStudioMode={false}
            modelId={slot.id}
            onDotDrop={onDotDrop}
            onStudioDotDrop={() => {}}
            onOpenLookbook={item.lookbook?.length ? () => onOpenLookbook(toLookbookCtx(item)) : undefined}
          />
        ));

  // ── Shadow plane — shared between both branches ──
  const renderShadow = () =>
    isVideo(displaySrc) ? (
      <video
        key={`shadow-${displaySrc}`}
        src={displaySrc}
        className="absolute inset-0 h-full w-full select-none pointer-events-none"
        style={{
          objectFit:       "contain",
          objectPosition:  "bottom",
          filter:          `brightness(0) saturate(100%) blur(${shadow.blur}px) opacity(${shadow.opacity})`,
          transform:       `translate(${shadow.offsetX}px, ${shadow.offsetY}px) scaleX(${shadow.scaleX}) scaleY(${shadow.scaleY})`,
          transformOrigin: "bottom center",
          zIndex:          0,
        }}
        muted loop autoPlay playsInline
      />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={displaySrc}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full select-none pointer-events-none"
        style={{
          objectFit:       "contain",
          objectPosition:  "bottom",
          filter:          `brightness(0) saturate(100%) blur(${shadow.blur}px) opacity(${shadow.opacity})`,
          transform:       `translate(${shadow.offsetX}px, ${shadow.offsetY}px) scaleX(${shadow.scaleX}) scaleY(${shadow.scaleY})`,
          transformOrigin: "bottom center",
          zIndex:          0,
        }}
        draggable={false}
      />
    );

  // ── Studio branch ──
  if (isStudioMode && studioSlot) {
    return (
      <motion.div
        className={containerClass}
        style={{
          ...containerStyle,
          scale:  studioSlot.scale,
          cursor: isSelected ? "grab" : "pointer",
          x:      dragX,
          y:      dragY,
        }}
        drag={isStudioMode}
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={{ top: -2000, bottom: 2000, left: -2000, right: 2000 }}
        onDragStart={() => { if (!isSelected) onSelect(); }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onDragEnd={(_: any, info: { offset: { x: number; y: number } }) => {
          onModelDragEnd(slot.id, info.offset.x, info.offset.y);
          dragX.set(0);
          dragY.set(0);
        }}
        onClick={() => { if (!isSelected) onSelect(); }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        <div
          className="relative w-fit h-fit bg-transparent model-container"
          style={{ overflow: "visible", isolation: "isolate" }}
        >
          {!imgError && renderShadow()}

          {isVideo(displaySrc) ? (
            <video
              key={displaySrc}
              src={displaySrc}
              className="h-[40vh] md:h-[80vh] w-auto object-bottom origin-bottom select-none"
              style={{ position: "relative", zIndex: 1, display: imgError ? "none" : "block" }}
              muted loop autoPlay playsInline
              onError={() => setImgError(true)}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displaySrc}
              alt={slot.id}
              className="h-[40vh] md:h-[80vh] w-auto object-bottom origin-bottom select-none"
              style={{
                position: "relative", zIndex: 1,
                display:  imgError ? "none" : "block",
                filter:   "brightness(0.6) contrast(1.1) saturate(0.7) drop-shadow(0 6px 10px rgba(0,0,0,0.5)) drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                background: "transparent",
              }}
              draggable={false}
              loading="eager"
              onError={() => setImgError(true)}
            />
          )}

          {imgError && (
            <div
              className="h-[40vh] md:h-[80vh] flex flex-col items-center justify-center gap-3 select-none"
              style={{
                width: "12vw", minWidth: 120,
                position: "relative", zIndex: 1,
                border: "2px dashed rgba(255,255,255,0.7)",
                background: "rgba(255,255,255,0.03)",
                pointerEvents: "none",
              }}
            >
              <span className="text-[8px] tracking-widest uppercase text-center px-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                {studioSlot.displayName}
              </span>
              <span className="text-[7px] tracking-wide text-center px-2 font-mono" style={{ color: "rgba(255,255,255,0.3)", wordBreak: "break-all" }}>
                {studioSlot.imageSrc}
              </span>
            </div>
          )}

          {showBoundingBox && (
            <div
              className="absolute pointer-events-none z-30"
              style={{
                left:   `${effectiveBounds.leftPct}%`,
                top:    `${effectiveBounds.topPct}%`,
                right:  `${effectiveBounds.rightPct}%`,
                bottom: `${effectiveBounds.bottomPct}%`,
                border: "1.5px solid rgba(212,184,150,0.75)",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.4) inset",
              }}
            >
              <div
                className="absolute bottom-0 right-0 w-3 h-3 pointer-events-auto z-40 cursor-se-resize"
                style={{ background: "#D4B896", transform: "translate(50%, 50%)", boxShadow: "0 0 6px rgba(0,0,0,0.6)" }}
                onPointerDown={handleScalePointerDown}
              />
              <div
                className="absolute -top-5 left-0 text-[8px] tracking-widest pointer-events-none whitespace-nowrap"
                style={{ color: "#D4B896" }}
              >
                {studioSlot.displayName}  ·  {studioSlot.scale.toFixed(2)}×
              </div>
            </div>
          )}

          {renderDots()}
        </div>
      </motion.div>
    );
  }

  // ── Normal mode ──
  return (
    <div
      className={containerClass}
      style={{ ...containerStyle, ...(isEditMode ? { pointerEvents: "none" } : {}) }}
      onMouseEnter={isEditMode ? undefined : handleEnter}
      onMouseLeave={isEditMode ? undefined : handleLeave}
    >
      <div
        className="relative w-fit h-fit bg-transparent model-container transition-transform duration-500"
        style={{
          cursor:    isEditMode ? undefined : "pointer",
          transform: isActive && !isEditMode ? "scale(1.03)" : "scale(1)",
          overflow:  "visible",
          ...(isEditMode ? { pointerEvents: "none" } : {}),
        }}
        onClick={isEditMode ? undefined : () => {
          // Clicking the character body (not a dot) closes any open card
          onDotClose();
        }}
      >
        {renderShadow()}

        {isVideo(displaySrc) ? (
          <video
            key={displaySrc}
            src={displaySrc}
            className="h-[40vh] md:h-[80vh] w-auto object-bottom origin-bottom select-none block"
            style={{
              position: "relative", zIndex: 1,
              filter: isEditMode
                ? "brightness(0.6) contrast(1.1) saturate(0.7) drop-shadow(0 6px 10px rgba(0,0,0,0.5))"
                : "brightness(0.85) contrast(1.1) saturate(0.9) drop-shadow(0 8px 14px rgba(0,0,0,0.45))",
            }}
            muted loop autoPlay playsInline
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displaySrc}
            alt={slot.id}
            className="h-[40vh] md:h-[80vh] w-auto object-bottom origin-bottom select-none block"
            style={{
              position: "relative", zIndex: 1,
              filter: isEditMode
                ? "brightness(0.6) contrast(1.1) saturate(0.7) drop-shadow(0 6px 10px rgba(0,0,0,0.5)) drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                : "brightness(0.85) contrast(1.1) saturate(0.9) drop-shadow(0 8px 14px rgba(0,0,0,0.45)) drop-shadow(0 2px 4px rgba(0,0,0,0.25))",
              background: "transparent",
            }}
            draggable={false}
            loading="eager"
          />
        )}

        {/* Tap glow — shown while a card is open on this character */}
        {isAnyDotActive && !isEditMode && (
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{ boxShadow: "inset 0 0 50px rgba(255,255,255,0.07)" }}
          />
        )}

        {/* Edit mode hit-area using alpha-scan content bounds */}
        {isEditMode && (
          <div
            className="absolute z-30"
            style={{
              left:   `${effectiveBounds.leftPct}%`,
              top:    `${effectiveBounds.topPct}%`,
              right:  `${effectiveBounds.rightPct}%`,
              bottom: `${effectiveBounds.bottomPct}%`,
              pointerEvents: "auto",
              cursor: "pointer",
            }}
            onClick={handleEnter}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          />
        )}

        {renderDots()}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CollectionOverlay — exported default
// ─────────────────────────────────────────────────────────────────────────────

interface Toast { id: number; text: string; }
interface Props  { opacity: MotionValue<number>; }

export default function CollectionOverlay({ opacity }: Props) {
  const router = useRouter();
  const [active,   setActive]   = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  // ── THE CENTRAL BRAIN ──────────────────────────────────────────────────────
  // One state value governs which dot is open across ALL characters.
  // Setting a new id closes the previous one automatically (no extra logic needed).
  // null = all cards closed.
  const [activeDotId, setActiveDotId] = useState<string | null>(null);

  const handleDotActivate = useCallback((id: string) => setActiveDotId(id), []);
  const handleDotClose    = useCallback(()           => setActiveDotId(null), []);
  // ─────────────────────────────────────────────────────────────────────────

  // ── Studio Mode state ──
  const [isStudioMode,      setIsStudioMode]      = useState(false);
  const [studioSlots,       setStudioSlots]       = useState<StudioSlot[]>([]);
  const [selectedModelId,   setSelectedModelId]   = useState<string | null>(null);
  const [copyConfirm,       setCopyConfirm]       = useState(false);
  const [lookbookDot,       setLookbookDot]       = useState<LookbookContext | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useMotionValueEvent(opacity, "change", (v) => {
    setActive(v > 0.05);
    if (!revealed && v >= 0.99) setRevealed(true);
  });

  // Close any open card when the overlay scrolls out of view
  useEffect(() => {
    if (!active) setActiveDotId(null);
  }, [active]);

  const handleDotDrop = (text: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const enterStudio = () => {
    setStudioSlots(MODEL_INVENTORY.map(modelSlotToStudio));
    setSelectedModelId(null);
    setIsEditMode(false);
    setIsStudioMode(true);
    setActiveDotId(null);
  };

  const exitStudio = () => {
    setIsStudioMode(false);
    setSelectedModelId(null);
  };

  const updateSlot = useCallback((id: string, patch: Partial<StudioSlot>) => {
    setStudioSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const updateDot = useCallback((slotId: string, dotId: string, patch: Partial<StudioDot>) => {
    setStudioSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, dots: s.dots.map((d) => (d.id === dotId ? { ...d, ...patch } : d)) }
          : s
      )
    );
  }, []);

  const addDot = useCallback((slotId: string) => {
    const newDot: StudioDot = {
      id:         `${slotId}-dot-${Date.now()}`,
      name:       "New Item",
      collection: "The Constable",
      colorway:   "Ivory",
      price:      "$0",
      type:       "public",
      topPct:     50,
      leftPct:    50,
      lookbook:   [],
    };
    setStudioSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, dots: [...s.dots, newDot] } : s))
    );
  }, []);

  const removeDot = useCallback((slotId: string, dotId: string) => {
    setStudioSlots((prev) =>
      prev.map((s) =>
        s.id === slotId ? { ...s, dots: s.dots.filter((d) => d.id !== dotId) } : s
      )
    );
  }, []);

  const swapImage = useCallback((slotId: string, imageSrc: string) => {
    setStudioSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, imageSrc } : s)));
  }, []);

  const removeSlot = useCallback((slotId: string) => {
    setStudioSlots((prev) => prev.filter((s) => s.id !== slotId));
    setSelectedModelId((prev) => (prev === slotId ? null : prev));
  }, []);

  const addSlot = useCallback(() => {
    const id = `patron-${Date.now()}`;
    const newSlot: StudioSlot = {
      id,
      displayName: "New Patron",
      imageSrc:    "/model-center.png",
      leftPct:     40,
      bottomPct:   5,
      scale:       0.85,
      zIndex:      25,
      dots:        [],
      shadow:      { ...DEFAULT_SHADOW },
    };
    setStudioSlots((prev) => [...prev, newSlot]);
    setSelectedModelId(id);
  }, []);

  const updateShadow = useCallback((slotId: string, patch: Partial<ShadowConfig>) => {
    setStudioSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, shadow: { ...s.shadow, ...patch } } : s))
    );
  }, []);

  const copyCode = useCallback(() => {
    const header = `// src/data/inventory.ts
// ⚠️  This file is auto-generated by Studio Mode. Do not edit manually.
//     Make changes in the Studio, then click SAVE CHANGES.

import type { ShadowConfig } from "@/components/studio/studioTypes";

export interface OutfitItem {
  id: string;
  name: string;
  collection: string;
  colorway: string;
  price: string;
  type: "public" | "vault";
  dotPosition: string;
  lookbook?: string[];
}

export interface ModelSlot {
  id: string;
  displayName?: string;
  position: string;
  scale: string;
  mobileScale: string;
  zIndex: number;
  imageSrc: string;
  outfit: OutfitItem[];
  shadow?: ShadowConfig;
}

`;
    const code = header + exportInventoryCode(studioSlots) + "\n";
    navigator.clipboard.writeText(code);
    setCopyConfirm(true);
    setTimeout(() => setCopyConfirm(false), 2500);
  }, [studioSlots]);

  const openLookbook = useCallback((ctx: LookbookContext) => {
    setLookbookDot(ctx);
  }, []);

  useEffect(() => {
    if (isStudioMode) setHasUnsavedChanges(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studioSlots]);

  const handleSave = async () => {
    const res  = await fetch("/api/save-inventory", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ slots: studioSlots }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error ?? "Save failed");
    setHasUnsavedChanges(false);
    router.refresh();
  };

  useEffect(() => {
    if (!hasUnsavedChanges || !isStudioMode) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges, isStudioMode]);

  const handleModelDragEnd = useCallback(
    (slotId: string, offsetX: number, offsetY: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const slot = studioSlots.find((s) => s.id === slotId);
      if (!slot) return;
      updateSlot(slotId, {
        leftPct:   slot.leftPct   + (offsetX / rect.width)  * 100,
        bottomPct: slot.bottomPct - (offsetY / rect.height) * 100,
      });
    },
    [studioSlots, updateSlot]
  );

  // ── Shared ModelStage props threaded from the brain ──
  const brainProps = {
    activeDotId,
    onDotActivate: handleDotActivate,
    onDotClose:    handleDotClose,
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-20"
      style={{ pointerEvents: active ? "auto" : "none" }}
    >
      {isStudioMode && (
        <StudioInspector
          slots={studioSlots}
          selectedId={selectedModelId}
          onSelectSlot={setSelectedModelId}
          onUpdateSlot={updateSlot}
          onUpdateDot={updateDot}
          onAddDot={addDot}
          onRemoveDot={removeDot}
          onSwapImage={swapImage}
          onAddSlot={addSlot}
          onRemoveSlot={removeSlot}
          onUpdateShadow={updateShadow}
          onCopyCode={copyCode}
          copyConfirm={copyConfirm}
          onSave={handleSave}
        />
      )}

      {isStudioMode
        ? studioSlots.map((studioSlot, index) => {
            const rawSlot: ModelSlot = MODEL_INVENTORY.find((s) => s.id === studioSlot.id) ?? {
              id:          studioSlot.id,
              position:    `left-[${studioSlot.leftPct}%] bottom-[${studioSlot.bottomPct}%]`,
              scale:       `md:scale-[${studioSlot.scale}]`,
              mobileScale: `scale-[${studioSlot.scale}]`,
              zIndex:      studioSlot.zIndex,
              imageSrc:    studioSlot.imageSrc,
              outfit:      [],
            };
            return (
              <ModelStage
                key={studioSlot.id}
                slot={rawSlot}
                index={index}
                revealed={revealed}
                isEditMode={false}
                isStudioMode={true}
                studioSlot={studioSlot}
                isSelected={selectedModelId === studioSlot.id}
                onSelect={() => setSelectedModelId(studioSlot.id)}
                onDotDrop={handleDotDrop}
                onStudioDotDrop={(dotId, topPct, leftPct) => updateDot(studioSlot.id, dotId, { topPct, leftPct })}
                onModelDragEnd={handleModelDragEnd}
                onUpdateStudioSlot={updateSlot}
                onOpenLookbook={openLookbook}
                {...brainProps}
              />
            );
          })
        : MODEL_INVENTORY.map((slot, index) => (
            <ModelStage
              key={slot.id}
              slot={slot}
              index={index}
              revealed={revealed}
              isEditMode={isEditMode}
              isStudioMode={false}
              studioSlot={undefined}
              isSelected={selectedModelId === slot.id}
              onSelect={() => setSelectedModelId(slot.id)}
              onDotDrop={handleDotDrop}
              onStudioDotDrop={(dotId, topPct, leftPct) => updateDot(slot.id, dotId, { topPct, leftPct })}
              onModelDragEnd={handleModelDragEnd}
              onUpdateStudioSlot={updateSlot}
              onOpenLookbook={openLookbook}
              {...brainProps}
            />
          ))}

      {lookbookDot && (
        <LookbookOverlay dot={lookbookDot} onClose={() => setLookbookDot(null)} />
      )}

      {/* Studio Mode toggle */}
      {active && (
        <button
          className="fixed bottom-6 right-6 z-[201] text-[9px] tracking-widest uppercase px-4 py-2.5 transition-colors duration-300 pointer-events-auto"
          style={{
            border:     `1px solid ${isStudioMode ? "#D4B896" : "rgba(255,255,255,0.2)"}`,
            color:       isStudioMode ? "#D4B896" : "rgba(255,255,255,0.4)",
            background:  "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
          }}
          onClick={() => isStudioMode ? exitStudio() : enterStudio()}
        >
          {isStudioMode ? "✕  Exit Studio" : "⊙  Studio Mode"}
        </button>
      )}

      {/* Legacy dot-edit toggle */}
      {active && !isStudioMode && (
        <button
          className="fixed bottom-6 right-36 z-[100] text-[9px] tracking-widest uppercase px-3 py-2 transition-colors duration-300 pointer-events-auto"
          style={{
            border:     `1px solid ${isEditMode ? "#D4B896" : "rgba(255,255,255,0.2)"}`,
            color:       isEditMode ? "#D4B896" : "rgba(255,255,255,0.4)",
            background:  "rgba(0,0,0,0.75)",
            backdropFilter: "blur(8px)",
          }}
          onClick={() => setIsEditMode((e) => !e)}
        >
          {isEditMode ? "✕ Exit Edit" : "⊙ Edit Dots"}
        </button>
      )}

      {/* Toast coordinates */}
      <div className="fixed bottom-16 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="text-[10px] font-mono px-3 py-2 rounded-sm"
            style={{
              background:     "rgba(0,0,0,0.88)",
              border:         "1px solid rgba(212,184,150,0.35)",
              color:          "#D4B896",
              backdropFilter: "blur(6px)",
            }}
          >
            {toast.text}
          </div>
        ))}
      </div>
    </div>
  );
}