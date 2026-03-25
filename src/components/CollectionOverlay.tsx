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
import type { StudioSlot, StudioDot } from "./studio/studioTypes";

// ─────────────────────────────────────────────────────────────────────────────
// MODEL_INVENTORY
// Edit names, prices, and colorways here. Do not touch layout below this block.
// ─────────────────────────────────────────────────────────────────────────────

// Toggle vault dots globally — set true to re-enable champagne gold markers
const SHOW_VAULT_DOTS = false;

type AccessType = "public" | "vault";

export interface OutfitItem {
  id: string;
  name: string;
  collection: string;
  colorway: string;
  price: string;
  type: AccessType;
  dotPosition: string; // Full Tailwind literal — must be a static string, no runtime assembly
}

export interface ModelSlot {
  id: string;
  position: string;    // Responsive Tailwind position — includes sm:/md: breakpoints
  scale: string;       // Desktop scale: "md:scale-[X]" — applied at md+ breakpoint
  mobileScale: string; // Mobile scale: "scale-[X]" — base (mobile-first), overridden by scale
  zIndex: number;      // Depth perception: center=40 (closest), vault=20 (furthest)
  imageSrc: string;    // Path relative to /public
  outfit: OutfitItem[];
}

const MODEL_INVENTORY: ModelSlot[] = [
  {
    id: "lounge-model",
    // displayName: "Lounge"
    position: "left-[0.6%] md:left-[0.6%] bottom-[7.4%] md:bottom-[7.4%]",
    scale: "md:scale-[0.88]",
    mobileScale: "scale-[0.88]",
    zIndex: 30,
    imageSrc: "/model-lounge.png",
    outfit: [
      {
        id: "lounge-showstopper",
        name: "The Showstopper",
        collection: "The Constable",
        colorway: "Ivory",
        price: "$1,200",
        type: "public",
        dotPosition: "top-[30.0%] left-[85.0%]",
      },
      {
        id: "lounge-heartbreaker",
        name: "The Heartbreaker",
        collection: "The Constable",
        colorway: "Dark Grey",
        price: "$1,400",
        type: "vault",
        dotPosition: "top-[50.0%] left-[45.0%]",
      },
    ],
  },
  {
    id: "center-model",
    // displayName: "Jerome"
    position: "left-[34.2%] md:left-[34.2%] bottom-[16.4%] md:bottom-[16.4%]",
    scale: "md:scale-[0.70]",
    mobileScale: "scale-[0.70]",
    zIndex: 29,
    imageSrc: "/model-center.png",
    outfit: [
      {
        id: "center-showstopper",
        name: "The Showstopper",
        collection: "The Constable",
        colorway: "Ivory",
        price: "$1,500",
        type: "public",
        dotPosition: "top-[30.0%] left-[57.4%]",
      },
      {
        id: "center-heartbreaker",
        name: "The Heartbreaker",
        collection: "The Constable",
        colorway: "Dark Grey",
        price: "$1,600",
        type: "vault",
        dotPosition: "top-[45.0%] left-[40.0%]",
      },
    ],
  },
  {
    id: "vault-model",
    // displayName: "Jack"
    position: "left-[24.3%] md:left-[24.3%] bottom-[9.3%] md:bottom-[9.3%]",
    scale: "md:scale-[0.84]",
    mobileScale: "scale-[0.84]",
    zIndex: 20,
    imageSrc: "/model-vault.png",
    outfit: [
      {
        id: "vault-showstopper",
        name: "The Showstopper",
        collection: "The Constable",
        colorway: "Ivory",
        price: "$980",
        type: "public",
        dotPosition: "top-[35.0%] left-[51.6%]",  // was 350.0% (typo) → clamped to 35.0%
      },
      {
        id: "vault-heartbreaker",
        name: "The Heartbreaker",
        collection: "The Constable",
        colorway: "Dark Grey",
        price: "$1,100",
        type: "vault",
        dotPosition: "top-[47.0%] left-[42.0%]",
      },
    ],
  },
  {
    id: "rack-model",
    // displayName: "Ethan"
    position: "left-[63.4%] md:left-[63.4%] bottom-[8.0%] md:bottom-[8.0%]",
    scale: "md:scale-[0.83]",
    mobileScale: "scale-[0.83]",
    zIndex: 30,
    imageSrc: "/model-rack.png",
    outfit: [
      {
        id: "rack-showstopper",
        name: "The Showstopper",
        collection: "The Constable",
        colorway: "Ivory",
        price: "$1,100",
        type: "public",
        dotPosition: "top-[58.0%] left-[88.0%]",
      },
      {
        id: "rack-heartbreaker",
        name: "The Heartbreaker",
        collection: "The Constable",
        colorway: "Dark Grey",
        price: "$1,300",
        type: "vault",
        dotPosition: "top-[50.0%] left-[40.0%]",
      },
    ],
  },
];

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
        ? { ...positionStyle, zIndex: 20, cursor: draggable ? "grab" : undefined, x: dotDragX, y: dotDragY }
        : { cursor: draggable ? "grab" : undefined }}
      drag={draggable}
      dragMomentum={false}
      dragElastic={0}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onDragEnd={handleDragEnd as any}
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
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const img = new window.Image();
    img.onload = () => {
      // Scale down to max 512px for performance
      const maxDim = 512;
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.floor(img.naturalWidth * scale));
      const h = Math.max(1, Math.floor(img.naturalHeight * scale));
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      const data = ctx.getImageData(0, 0, w, h).data;
      const ALPHA = 12; // threshold — ignore near-transparent fringe pixels

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

      if (maxX <= minX || maxY <= minY) return; // all transparent

      setBounds({
        leftPct:   (minX / w) * 100,
        topPct:    (minY / h) * 100,
        rightPct:  ((w - maxX - 1) / w) * 100,
        bottomPct: ((h - maxY - 1) / h) * 100,
      });
    };
    img.src = src;
  }, [src]);

  return bounds;
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
}: ModelStageProps) {
  const [hovered, setHovered] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Framer Motion drag offset values — reset to 0 after each drag to avoid accumulation
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  // Canvas alpha-scan: detect the tight non-transparent content bounds for bounding box
  const imageSrc = isStudioMode && studioSlot ? studioSlot.imageSrc : slot.imageSrc;
  const contentBounds = useImageContentBounds(imageSrc);

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
    ...(isStudioMode ? {} : { zIndex: slot.zIndex }),
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
          style={{ transform: isSelected ? "none" : undefined }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={studioSlot.imageSrc}
            alt={slot.id}
            className="h-[40vh] md:h-[80vh] w-auto object-bottom origin-bottom select-none block"
            style={{
              filter: "brightness(0.6) contrast(1.1) saturate(0.7) drop-shadow(0 6px 10px rgba(0,0,0,0.5)) drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
              background: "transparent",
            }}
            draggable={false}
            loading="eager"
          />

          {/* Foot shadow — tight ellipse at ground contact, reinforces depth */}
          <div
            className="absolute bottom-0 pointer-events-none z-10"
            style={{
              left: "35%", right: "35%", height: 12,
              background: "radial-gradient(ellipse 100% 100% at 50% 100%, rgba(0,0,0,0.45) 0%, transparent 100%)",
            }}
          />

          {/* Bounding box + scale handle — uses content bounds from alpha-scan */}
          {showBoundingBox && (
            <div
              className="absolute pointer-events-none z-30"
              style={{
                left:   contentBounds ? `${contentBounds.leftPct}%`   : 0,
                top:    contentBounds ? `${contentBounds.topPct}%`    : 0,
                right:  contentBounds ? `${contentBounds.rightPct}%`  : 0,
                bottom: contentBounds ? `${contentBounds.bottomPct}%` : 0,
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
            />
          ))}
        </div>
      </motion.div>
    );
  }

  // ── Normal (non-studio) mode — unchanged layout ──
  return (
    <div
      className={containerClass}
      style={containerStyle}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div
        className="relative w-fit h-fit bg-transparent model-container cursor-pointer transition-transform duration-500"
        style={{ transform: isActive && !isEditMode ? "scale(1.03)" : "scale(1)" }}
        onClick={handleTap}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slot.imageSrc}
          alt={slot.id}
          className="h-[40vh] md:h-[80vh] w-auto object-bottom origin-bottom select-none block"
          style={{
            filter: isEditMode
              ? "brightness(0.6) contrast(1.1) saturate(0.7) drop-shadow(0 6px 10px rgba(0,0,0,0.5)) drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
              : "brightness(0.85) contrast(1.1) saturate(0.9) drop-shadow(0 8px 14px rgba(0,0,0,0.45)) drop-shadow(0 2px 4px rgba(0,0,0,0.25))",
            background: "transparent",
          }}
          draggable={false}
          loading="eager"
        />

        {/* Foot shadow — tight ellipse at ground contact */}
        <div
          className="absolute bottom-0 pointer-events-none z-10"
          style={{
            left: "35%", right: "35%", height: 12,
            background: "radial-gradient(ellipse 100% 100% at 50% 100%, rgba(0,0,0,0.4) 0%, transparent 100%)",
          }}
        />

        {/* Tap glow */}
        {activeItemId && !isEditMode && (
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{ boxShadow: "inset 0 0 50px rgba(255,255,255,0.07)" }}
          />
        )}

        {/* Edit mode dashed border */}
        {isEditMode && (
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{ border: "1px dashed rgba(212,184,150,0.25)" }}
          />
        )}

        {/* Label */}
        <span className="absolute bottom-10 w-full text-center text-[10px] tracking-[0.3em] text-white/20 uppercase hidden md:block z-20">
          {slot.id}
        </span>

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
      topPct: 40,
      leftPct: 50,
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

  const copyCode = useCallback(() => {
    const code = exportInventoryCode(studioSlots);
    navigator.clipboard.writeText(code);
    setCopyConfirm(true);
    setTimeout(() => setCopyConfirm(false), 2500);
  }, [studioSlots]);

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
          onUpdateSlot={updateSlot}
          onUpdateDot={updateDot}
          onAddDot={addDot}
          onRemoveDot={removeDot}
          onSwapImage={swapImage}
          onRemoveSlot={removeSlot}
          onCopyCode={copyCode}
          copyConfirm={copyConfirm}
        />
      )}

      {/* Models — always iterate MODEL_INVENTORY for raw slot shape;
          look up matching StudioSlot by id for studio overrides */}
      {MODEL_INVENTORY.map((slot, index) => (
        <ModelStage
          key={slot.id}
          slot={slot}
          index={index}
          revealed={revealed}
          isEditMode={isEditMode && !isStudioMode}
          isStudioMode={isStudioMode}
          studioSlot={isStudioMode ? studioSlots.find((s) => s.id === slot.id) : undefined}
          isSelected={selectedModelId === slot.id}
          onSelect={() => setSelectedModelId(slot.id)}
          onDotDrop={handleDotDrop}
          onStudioDotDrop={(dotId, topPct, leftPct) => updateDot(slot.id, dotId, { topPct, leftPct })}
          onModelDragEnd={handleModelDragEnd}
          onUpdateStudioSlot={updateSlot}
        />
      ))}

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
