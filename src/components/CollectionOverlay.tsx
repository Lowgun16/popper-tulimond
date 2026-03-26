// src/components/CollectionOverlay.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  motion,
  type MotionValue,
  useMotionValue,
  useMotionValueEvent,
} from "framer-motion";
import { StudioInspector } from "./studio/StudioInspector";
import { modelSlotToStudio, exportInventoryCode } from "./studio/studioUtils";
import type { StudioSlot, StudioDot, ShadowConfig, LookbookContext, AccessType } from "./studio/studioTypes";
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

function HoverCard({ item, visible }: { item: OutfitItem | StudioDot; visible: boolean }) {
  const isVault = item.type === "vault";

  // Support both raw OutfitItem and StudioDot shapes
  const name       = "name"       in item ? item.name       : "";
  const collection = "collection" in item ? item.collection : "";
  const colorway   = "colorway"   in item ? item.colorway   : "";
  const price      = "price"      in item ? item.price      : "";

  return (
    <div
      className="absolute left-6 top-1/2 z-30 w-48 transition-[opacity,transform] duration-500 pointer-events-none"
      style={{
        opacity: visible ? 1 : 0,
        transform: `translateY(-50%) translateX(${visible ? "0px" : "16px"})`,
      }}
    >
      <div className="bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-sm">
        <p className="type-eyebrow mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          {collection}
        </p>
        <p className="text-xs text-white mb-1">{name}</p>
        <p className="text-[10px] text-white/50 mb-2">{colorway}</p>
        <p className="text-xs font-bold text-white/90 mb-3">{price}</p>

        {isVault ? (
          <>
            <p className="text-[9px] tracking-widest uppercase mb-2" style={{ color: "#D4B896" }}>
              Vault Access Required
            </p>
            <div className="w-full text-center text-[9px] tracking-widest uppercase py-2 border border-white/10 text-white/20 rounded-sm select-none">
              Members Only
            </div>
          </>
        ) : (
          <div className="w-full text-center text-[9px] tracking-widest uppercase py-2 border border-white/30 text-white/70 rounded-sm select-none transition-colors duration-300">
            Add to Cart
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PulseDot
// ─────────────────────────────────────────────────────────────────────────────

interface PulseDotProps {
  // Normal mode
  item?: OutfitItem;
  // Studio mode
  studioDot?: StudioDot;
  hovered: boolean;
  tapped: boolean;
  isEditMode: boolean;
  isStudioMode: boolean;
  modelId: string;
  onDotDrop: (text: string) => void;
  onStudioDotDrop?: (dotId: string, topPct: number, leftPct: number) => void;
  onDotTap?: () => void;
}

function PulseDot({
  item,
  studioDot,
  hovered,
  tapped,
  isEditMode,
  isStudioMode,
  modelId,
  onDotDrop,
  onStudioDotDrop,
  onDotTap,
}: PulseDotProps) {
  const dot = studioDot ?? item!;
  const isVault = dot.type === "vault";
  const dotColor = isVault ? "#D4B896" : "#FFFFFF";
  const glowColor = isVault ? "rgba(212,184,150,0.6)" : "rgba(255,255,255,0.8)";
  const animation = isVault
    ? "pulse-champagne 2s ease-in-out infinite"
    : "pulse-white 2s ease-in-out infinite";

  const draggable = isEditMode || isStudioMode;

  // Reset internal drag offset after each drop to prevent ghost-position accumulation
  const dotDragX = useMotionValue(0);
  const dotDragY = useMotionValue(0);

  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: { point: { x: number; y: number } }
  ) => {
    const target = event.target as HTMLElement;
    const container = target.closest(".model-container");
    if (!container) return;
    const rect = container.getBoundingClientRect();

    // info.point uses page coordinates (pageX/Y); getBoundingClientRect uses
    // viewport coordinates (clientX/Y). Subtract scroll offset to align them.
    const scrollX = window.scrollX ?? 0;
    const scrollY = window.scrollY ?? 0;
    const rawX = ((info.point.x - scrollX - rect.left) / rect.width)  * 100;
    const rawY = ((info.point.y - scrollY - rect.top)  / rect.height) * 100;

    // Clamp to [0, 100] — dots cannot live outside the model container
    const x = Math.max(0, Math.min(100, rawX));
    const y = Math.max(0, Math.min(100, rawY));

    if (isStudioMode && onStudioDotDrop) {
      onStudioDotDrop(dot.id, y, x);
      // Reset Framer Motion's internal drag offset so new top/left% from state
      // is the sole position source (no stale transform layered on top)
      dotDragX.set(0);
      dotDragY.set(0);
    } else {
      const text = `${modelId} · ${dot.id}: top-[${y.toFixed(1)}%] left-[${x.toFixed(1)}%]`;
      console.log(text);
      onDotDrop(text);
    }
  };

  // In studio mode, position via inline style from studioDot percentages
  const positionStyle = isStudioMode && studioDot
    ? { position: "absolute" as const, top: `${studioDot.topPct}%`, left: `${studioDot.leftPct}%` }
    : undefined;

  const positionClass = !isStudioMode && item
    ? `absolute z-20 ${item.dotPosition}`
    : "absolute z-20";

  return (
    <motion.div
      className={positionClass}
      style={positionStyle
        ? { ...positionStyle, zIndex: 20, cursor: draggable ? "grab" : undefined, x: dotDragX, y: dotDragY, pointerEvents: "auto" }
        : { cursor: draggable ? "grab" : undefined, ...(draggable ? { pointerEvents: "auto" as const } : {}) }}
      drag={draggable}
      dragMomentum={false}
      dragElastic={0}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onDragEnd={handleDragEnd as any}
      onTap={onDotTap}
      whileDrag={{ cursor: "grabbing", scale: 1.5 }}
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
            cursor: draggable ? "inherit" : "pointer",
          }}
        />
        {!draggable && <HoverCard item={dot} visible={hovered || tapped} />}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// useImageContentBounds — canvas alpha-scan to find tight non-transparent rect
// ─────────────────────────────────────────────────────────────────────────────

interface ContentBounds {
  leftPct: number;
  topPct: number;
  rightPct: number;  // inset from right (not absolute position)
  bottomPct: number; // inset from bottom
}

function useImageContentBounds(src: string): ContentBounds | null {
  const [bounds, setBounds] = useState<ContentBounds | null>(null);

  useEffect(() => {
    // Clear stale bounds immediately so the bounding box doesn't lag behind
    setBounds(null);

    if (isVideo(src)) return; // cannot alpha-scan video frames

    let cancelled = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const img = new window.Image();
    img.onload = () => {
      if (cancelled) return; // src changed before this load finished — discard

      // Scale down to max 512px for performance
      const maxDim = 512;
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.floor(img.naturalWidth * scale));
      const h = Math.max(1, Math.floor(img.naturalHeight * scale));
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      const data = ctx.getImageData(0, 0, w, h).data;
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
// useSafeImageSrc — holds the last successfully loaded src so the <img> never
// flashes a broken icon during a swap; updates to the new src once it's ready
// ─────────────────────────────────────────────────────────────────────────────

function useSafeImageSrc(targetSrc: string): string {
  const [readySrc, setReadySrc] = useState(targetSrc);

  useEffect(() => {
    let cancelled = false;
    // Videos can't be preloaded via Image() — use src directly
    if (isVideo(targetSrc)) {
      setReadySrc(targetSrc);
      return;
    }
    const img = new window.Image();
    img.onload = () => { if (!cancelled) setReadySrc(targetSrc); };
    // On error, readySrc keeps its previous value — no broken icon
    img.src = targetSrc;
    return () => { cancelled = true; };
  }, [targetSrc]);

  return readySrc;
}

// ─────────────────────────────────────────────────────────────────────────────
// ModelStage
// ─────────────────────────────────────────────────────────────────────────────

interface ModelStageProps {
  slot: ModelSlot;
  index: number;
  revealed: boolean;
  isEditMode: boolean;
  isStudioMode: boolean;
  studioSlot?: StudioSlot;
  isSelected: boolean;
  onSelect: () => void;
  onDotDrop: (text: string) => void;
  onStudioDotDrop: (dotId: string, topPct: number, leftPct: number) => void;
  onModelDragEnd: (slotId: string, offsetX: number, offsetY: number) => void;
  onUpdateStudioSlot: (id: string, patch: Partial<StudioSlot>) => void;
  onOpenLookbook: (ctx: LookbookContext) => void;
}

function ModelStage({
  slot,
  index,
  revealed,
  isEditMode,
  isStudioMode,
  studioSlot,
  isSelected,
  onSelect,
  onDotDrop,
  onStudioDotDrop,
  onModelDragEnd,
  onUpdateStudioSlot,
  onOpenLookbook,
}: ModelStageProps) {
  const [hovered, setHovered] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Framer Motion drag offset values — reset to 0 after each drag to avoid accumulation
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  const toLookbookCtx = (dot: StudioDot | OutfitItem): LookbookContext => ({
    name: dot.name,
    collection: dot.collection,
    colorway: dot.colorway,
    price: dot.price,
    type: dot.type,
    lookbook: ('lookbook' in dot ? dot.lookbook : undefined) ?? [],
  });

  // Target src — may be mid-swap (new path not loaded yet)
  const imageSrc = isStudioMode && studioSlot ? studioSlot.imageSrc : slot.imageSrc;
  // Reset image error flag whenever the src target changes
  useEffect(() => setImgError(false), [imageSrc]);
  // Safe src — holds previous image until new one loads, preventing broken-icon flash.
  // In studio mode we bypass this so typed paths appear immediately (prefer broken icon over ghost).
  const safeSrc = useSafeImageSrc(imageSrc);
  const displaySrc = isStudioMode ? imageSrc : safeSrc;
  // Content bounds — resets to null on src change, repopulates once new image loads
  const contentBounds = useImageContentBounds(imageSrc);

  // Shadow config: studio overrides live on studioSlot; normal mode uses slot.shadow or default
  const shadow: ShadowConfig = (isStudioMode && studioSlot) ? studioSlot.shadow : (slot.shadow ?? DEFAULT_SHADOW);

  // Fallback bounds when alpha-scan hasn't completed — near-full-image insets so character is
  // always clickable and bounding box is always visible even before the scan finishes
  const effectiveBounds = contentBounds ?? { leftPct: 5, topPct: 5, rightPct: 5, bottomPct: 5 };

  useEffect(() => {
    return () => clearTimeout(leaveTimer.current);
  }, []);

  const handleEnter = () => {
    clearTimeout(leaveTimer.current);
    setHovered(true);
  };
  const handleLeave = () => {
    leaveTimer.current = setTimeout(() => setHovered(false), 120);
  };

  const handleTap = () => {
    if (isEditMode || isStudioMode) return;
    const primaryId = slot.outfit[0].id;
    setActiveItemId((prev) => (prev === primaryId ? null : primaryId));
  };

  // Scale handle — pointerdown on the corner grip
  const handleScalePointerDown = (e: React.PointerEvent) => {
    if (!studioSlot) return;
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startScale = studioSlot.scale;

    const onMove = (me: PointerEvent) => {
      // Drag right or up → larger; left or down → smaller
      const delta = ((me.clientX - startX) - (me.clientY - startY)) / 200;
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

  const isActive = hovered || activeItemId !== null;
  const showBoundingBox = isStudioMode && isSelected && studioSlot;

  // In studio mode: position/scale via inline style; otherwise Tailwind classes
  const studioPositionStyle: React.CSSProperties = isStudioMode && studioSlot
    ? {
        position: "absolute",
        left: `${studioSlot.leftPct}%`,
        bottom: `${studioSlot.bottomPct}%`,
        zIndex: studioSlot.zIndex,
        transformOrigin: "bottom center",
      }
    : {};

  const containerClass = isStudioMode
    ? "bg-transparent pointer-events-auto transition-opacity duration-700 origin-bottom"
    : `absolute bg-transparent pointer-events-auto transition-opacity duration-700 origin-bottom ${slot.position} ${slot.mobileScale} ${slot.scale}`;

  const containerStyle: React.CSSProperties = {
    opacity: revealed ? 1 : 0,
    transitionDelay: `${index * 150}ms`,
    ...(isStudioMode ? {} : { zIndex: isEditMode && hovered ? 999 : slot.zIndex }),
    ...studioPositionStyle,
  };

  // Dots to render
  const dots = isStudioMode && studioSlot
    ? studioSlot.dots.filter((d) => d.type === "public" || SHOW_VAULT_DOTS)
    : slot.outfit.filter((item) => item.type === "public" || SHOW_VAULT_DOTS);

  if (isStudioMode && studioSlot) {
    // In studio mode: wrap in motion.div for drag-to-move
    return (
      <motion.div
        className={containerClass}
        style={{
          ...containerStyle,
          scale: studioSlot.scale,
          cursor: isSelected ? "grab" : "pointer",
          x: dragX,
          y: dragY,
        }}
        drag={isSelected}
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={{ top: -2000, bottom: 2000, left: -2000, right: 2000 }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onDragEnd={(_: any, info: { offset: { x: number; y: number } }) => {
          onModelDragEnd(slot.id, info.offset.x, info.offset.y);
          dragX.set(0);
          dragY.set(0);
        }}
        onClick={() => {
          if (!isSelected) onSelect();
        }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        <div
          className="relative w-fit h-fit bg-transparent model-container"
          style={{ transform: isSelected ? "none" : undefined, overflow: "visible", isolation: "isolate" }}
        >
          {/* Dynamic Shadow Plane — suppressed when main image has errored */}
          {!imgError && (
            isVideo(displaySrc) ? (
              <video
                key={displaySrc}
                src={displaySrc}
                className="absolute inset-0 h-full w-full select-none pointer-events-none"
                style={{
                  objectFit: "contain",
                  objectPosition: "bottom",
                  filter: `brightness(0) saturate(100%) blur(${shadow.blur}px) opacity(${shadow.opacity})`,
                  transform: `translate(${shadow.offsetX}px, ${shadow.offsetY}px) scaleX(${shadow.scaleX}) scaleY(${shadow.scaleY})`,
                  transformOrigin: "bottom center",
                  zIndex: 0,
                }}
                muted loop autoPlay playsInline
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={displaySrc}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full select-none pointer-events-none"
                style={{
                  objectFit: "contain",
                  objectPosition: "bottom",
                  filter: `brightness(0) saturate(100%) blur(${shadow.blur}px) opacity(${shadow.opacity})`,
                  transform: `translate(${shadow.offsetX}px, ${shadow.offsetY}px) scaleX(${shadow.scaleX}) scaleY(${shadow.scaleY})`,
                  transformOrigin: "bottom center",
                  zIndex: 0,
                }}
                draggable={false}
              />
            )
          )}

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
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={displaySrc}
              alt={slot.id}
              className="h-[40vh] md:h-[80vh] w-auto object-bottom origin-bottom select-none"
              style={{
                position: "relative",
                zIndex: 1,
                display: imgError ? "none" : "block",
                filter: "brightness(0.6) contrast(1.1) saturate(0.7) drop-shadow(0 6px 10px rgba(0,0,0,0.5)) drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                background: "transparent",
              }}
              draggable={false}
              loading="eager"
              onError={() => setImgError(true)}
            />
          )}

          {/* Ghost box — shown when the image path is missing or fails to load */}
          {imgError && (
            <div
              className="h-[40vh] md:h-[80vh] flex flex-col items-center justify-center gap-3 select-none"
              style={{
                width: "12vw",
                minWidth: 120,
                position: "relative",
                zIndex: 1,
                border: "2px dashed rgba(255,255,255,0.7)",
                background: "rgba(255,255,255,0.03)",
                pointerEvents: "none",  // never block clicks behind it
              }}
            >
              <span
                className="text-[8px] tracking-widest uppercase text-center px-2"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                {studioSlot.displayName}
              </span>
              <span
                className="text-[7px] tracking-wide text-center px-2 font-mono"
                style={{ color: "rgba(255,255,255,0.3)", wordBreak: "break-all" }}
              >
                {studioSlot.imageSrc}
              </span>
            </div>
          )}

          {/* Bounding box + scale handle — uses content bounds from alpha-scan */}
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
              {/* Scale handle — bottom-right corner */}
              <div
                className="absolute bottom-0 right-0 w-3 h-3 pointer-events-auto z-40 cursor-se-resize"
                style={{
                  background: "#D4B896",
                  transform: "translate(50%, 50%)",
                  boxShadow: "0 0 6px rgba(0,0,0,0.6)",
                }}
                onPointerDown={handleScalePointerDown}
              />
              {/* Display name + scale readout */}
              <div
                className="absolute -top-5 left-0 text-[8px] tracking-widest pointer-events-none whitespace-nowrap"
                style={{ color: "#D4B896" }}
              >
                {studioSlot.displayName}  ·  {studioSlot.scale.toFixed(2)}×
              </div>
            </div>
          )}

          {/* Label suppressed in studio mode — name is shown in bounding box */}

          {/* Dots */}
          {(dots as StudioDot[]).map((dot) => (
            <PulseDot
              key={dot.id}
              studioDot={dot}
              hovered={hovered}
              tapped={false}
              isEditMode={false}
              isStudioMode={true}
              modelId={slot.id}
              onDotDrop={onDotDrop}
              onStudioDotDrop={onStudioDotDrop}
              onDotTap={dot.lookbook.length > 0 ? () => onOpenLookbook(toLookbookCtx(dot)) : undefined}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  // ── Normal (non-studio) mode ──
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
          cursor: isEditMode ? undefined : "pointer",
          transform: isActive && !isEditMode ? "scale(1.03)" : "scale(1)",
          overflow: "visible",
          ...(isEditMode ? { pointerEvents: "none" } : {}),
        }}
        onClick={isEditMode ? undefined : handleTap}
      >
        {/* Dynamic Shadow Plane */}
        {isVideo(displaySrc) ? (
          <video
            key={displaySrc}
            src={displaySrc}
            className="absolute inset-0 h-full w-full select-none pointer-events-none"
            style={{
              objectFit: "contain",
              objectPosition: "bottom",
              filter: `brightness(0) saturate(100%) blur(${shadow.blur}px) opacity(${shadow.opacity})`,
              transform: `translate(${shadow.offsetX}px, ${shadow.offsetY}px) scaleX(${shadow.scaleX}) scaleY(${shadow.scaleY})`,
              transformOrigin: "bottom center",
              zIndex: 0,
            }}
            muted loop autoPlay playsInline
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={displaySrc}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full select-none pointer-events-none"
            style={{
              objectFit: "contain",
              objectPosition: "bottom",
              filter: `brightness(0) saturate(100%) blur(${shadow.blur}px) opacity(${shadow.opacity})`,
              transform: `translate(${shadow.offsetX}px, ${shadow.offsetY}px) scaleX(${shadow.scaleX}) scaleY(${shadow.scaleY})`,
              transformOrigin: "bottom center",
              zIndex: 0,
            }}
            draggable={false}
          />
        )}

        {isVideo(displaySrc) ? (
          <video
            key={displaySrc}
            src={displaySrc}
            className="h-[40vh] md:h-[80vh] w-auto object-bottom origin-bottom select-none block"
            style={{
              position: "relative",
              zIndex: 1,
              filter: isEditMode
                ? "brightness(0.6) contrast(1.1) saturate(0.7) drop-shadow(0 6px 10px rgba(0,0,0,0.5)) drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                : "brightness(0.85) contrast(1.1) saturate(0.9) drop-shadow(0 8px 14px rgba(0,0,0,0.45)) drop-shadow(0 2px 4px rgba(0,0,0,0.25))",
            }}
            muted loop autoPlay playsInline
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={displaySrc}
            alt={slot.id}
            className="h-[40vh] md:h-[80vh] w-auto object-bottom origin-bottom select-none block"
            style={{
              position: "relative",
              zIndex: 1,
              filter: isEditMode
                ? "brightness(0.6) contrast(1.1) saturate(0.7) drop-shadow(0 6px 10px rgba(0,0,0,0.5)) drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                : "brightness(0.85) contrast(1.1) saturate(0.9) drop-shadow(0 8px 14px rgba(0,0,0,0.45)) drop-shadow(0 2px 4px rgba(0,0,0,0.25))",
              background: "transparent",
            }}
            draggable={false}
            loading="eager"
          />
        )}

        {/* Tap glow */}
        {activeItemId && !isEditMode && (
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{ boxShadow: "inset 0 0 50px rgba(255,255,255,0.07)" }}
          />
        )}

        {/* Edit mode: tight hit-area using alpha-scan content bounds.
            Restricts click/hover to the character's actual body pixels. */}
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
            onClick={handleTap}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          />
        )}

        {/* Pulse dots */}
        {(dots as OutfitItem[]).map((item) => (
          <PulseDot
            key={item.id}
            item={item}
            hovered={hovered}
            tapped={activeItemId === item.id}
            isEditMode={isEditMode}
            isStudioMode={false}
            modelId={slot.id}
            onDotDrop={onDotDrop}
            onStudioDotDrop={() => {}}
            onDotTap={item.lookbook?.length ? () => onOpenLookbook(toLookbookCtx(item)) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CollectionOverlay — exported default
// ─────────────────────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  text: string;
}

interface Props {
  opacity: MotionValue<number>;
}

export default function CollectionOverlay({ opacity }: Props) {
  const [active, setActive] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  // ── Studio Mode state ──
  const [isStudioMode, setIsStudioMode] = useState(false);
  const [studioSlots, setStudioSlots] = useState<StudioSlot[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [copyConfirm, setCopyConfirm] = useState(false);
  const [lookbookDot, setLookbookDot] = useState<LookbookContext | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useMotionValueEvent(opacity, "change", (v) => {
    setActive(v > 0.05);
    if (!revealed && v >= 0.99) setRevealed(true);
  });

  const handleDotDrop = (text: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  // ── Studio entry / exit ──
  const enterStudio = () => {
    setStudioSlots(MODEL_INVENTORY.map(modelSlotToStudio));
    setSelectedModelId(null);
    setIsEditMode(false);
    setIsStudioMode(true);
  };

  const exitStudio = () => {
    setIsStudioMode(false);
    setSelectedModelId(null);
  };

  // ── Studio state updaters ──
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
      id: `${slotId}-dot-${Date.now()}`,
      name: "New Item",
      collection: "The Constable",
      colorway: "Ivory",
      price: "$0",
      type: "public",
      topPct: 50,
      leftPct: 50,
      lookbook: [],
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
      imageSrc: "/model-center.png",
      leftPct: 40,
      bottomPct: 5,
      scale: 0.85,
      zIndex: 25,
      dots: [],
      shadow: { ...DEFAULT_SHADOW },
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
    const code = exportInventoryCode(studioSlots);
    navigator.clipboard.writeText(code);
    setCopyConfirm(true);
    setTimeout(() => setCopyConfirm(false), 2500);
  }, [studioSlots]);

  const openLookbook = useCallback((ctx: LookbookContext) => {
    setLookbookDot(ctx);
  }, []);

  // Mark dirty whenever studioSlots changes while in Studio mode
  useEffect(() => {
    if (isStudioMode) {
      setHasUnsavedChanges(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studioSlots]);

  const handleSave = async () => {
    const res = await fetch("/api/save-inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slots: studioSlots }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error ?? "Save failed");
    setHasUnsavedChanges(false);
  };

  // Prevent accidental loss of unsaved changes on refresh / tab close
  useEffect(() => {
    if (!hasUnsavedChanges || !isStudioMode) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges, isStudioMode]);

  // ── Model drag-to-reposition ──
  const handleModelDragEnd = useCallback(
    (slotId: string, offsetX: number, offsetY: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const slot = studioSlots.find((s) => s.id === slotId);
      if (!slot) return;

      const deltaLeftPct   =  (offsetX / rect.width)  * 100;
      const deltaBottomPct = -(offsetY / rect.height)  * 100; // invert Y

      updateSlot(slotId, {
        leftPct:   slot.leftPct   + deltaLeftPct,
        bottomPct: slot.bottomPct + deltaBottomPct,
      });
    },
    [studioSlots, updateSlot]
  );

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-20"
      style={{ pointerEvents: active ? "auto" : "none" }}
    >
      {/* Studio Inspector sidebar */}
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

      {/* Models — studio mode iterates studioSlots directly so removed slots are
          fully unmounted and patron slots (not in MODEL_INVENTORY) render correctly.
          Normal mode iterates MODEL_INVENTORY as before. */}
      {isStudioMode
        ? studioSlots.map((studioSlot, index) => {
            // Use the raw ModelSlot if it exists; synthesize a minimal one for patrons
            const rawSlot: ModelSlot = MODEL_INVENTORY.find((s) => s.id === studioSlot.id) ?? {
              id: studioSlot.id,
              position: `left-[${studioSlot.leftPct}%] bottom-[${studioSlot.bottomPct}%]`,
              scale: `md:scale-[${studioSlot.scale}]`,
              mobileScale: `scale-[${studioSlot.scale}]`,
              zIndex: studioSlot.zIndex,
              imageSrc: studioSlot.imageSrc,
              outfit: [],
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
        />
      ))}

      {lookbookDot && (
        <LookbookOverlay
          dot={lookbookDot}
          onClose={() => setLookbookDot(null)}
        />
      )}

      {/* Toggle button — Studio Mode / Exit Studio */}
      {active && (
        <button
          className="fixed bottom-6 right-6 z-[201] text-[9px] tracking-widest uppercase px-4 py-2.5 transition-colors duration-300 pointer-events-auto"
          style={{
            border: `1px solid ${isStudioMode ? "#D4B896" : isEditMode ? "#D4B896" : "rgba(255,255,255,0.2)"}`,
            color: isStudioMode ? "#D4B896" : isEditMode ? "#D4B896" : "rgba(255,255,255,0.4)",
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
          }}
          onClick={() => {
            if (isStudioMode) {
              exitStudio();
            } else {
              enterStudio();
            }
          }}
        >
          {isStudioMode ? "✕  Exit Studio" : "⊙  Studio Mode"}
        </button>
      )}

      {/* Legacy dot-edit toggle — only shown in normal mode */}
      {active && !isStudioMode && (
        <button
          className="fixed bottom-6 right-36 z-[100] text-[9px] tracking-widest uppercase px-3 py-2 transition-colors duration-300 pointer-events-auto"
          style={{
            border: `1px solid ${isEditMode ? "#D4B896" : "rgba(255,255,255,0.2)"}`,
            color: isEditMode ? "#D4B896" : "rgba(255,255,255,0.4)",
            background: "rgba(0,0,0,0.75)",
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
              background: "rgba(0,0,0,0.88)",
              border: "1px solid rgba(212,184,150,0.35)",
              color: "#D4B896",
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
