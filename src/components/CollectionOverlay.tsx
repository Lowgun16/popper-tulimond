"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
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

// ─────────────────────────────────────────────────────────────────────────────
// ConnectorLine - The "High-Tech Elbow"
// ─────────────────────────────────────────────────────────────────────────────

function ConnectorLine({ flipLeft, visible }: { flipLeft: boolean; visible: boolean }) {
  // We use an SVG path to create the "elbow" look. 
  // If flipLeft (Ethan), the box is to the left of the dot.
  // The path moves from the dot (0,0) horizontally, then angles to the box.
  
  const pathData = flipLeft 
    ? "M 0 0 L -20 0 L -60 -20" // Elbow for right-side characters
    : "M 0 0 L 20 0 L 60 -20";   // Elbow for left-side characters

  return (
    <svg 
      className="absolute pointer-events-none overflow-visible"
      style={{ zIndex: 40, top: 0, left: 0 }}
      width="100" height="100"
    >
      <motion.path
        d={pathData}
        fill="none"
        stroke="#D4B896"
        strokeWidth="1"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={visible ? { pathLength: 1, opacity: 0.6 } : { pathLength: 0, opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      <motion.circle 
        cx={flipLeft ? -60 : 60} 
        cy="-20" 
        r="2" 
        fill="#D4B896" 
        animate={visible ? { opacity: 1 } : { opacity: 0 }}
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HoverCard
// ─────────────────────────────────────────────────────────────────────────────

function HoverCard({ 
  item, 
  visible, 
  onAction, 
  onClose,
  leftPct 
}: { 
  item: OutfitItem | StudioDot; 
  visible: boolean; 
  onAction?: () => void;
  onClose?: () => void;
  leftPct: number;
}) {
  const isVault = item.type === "vault";
  const flipLeft = leftPct > 50; 

  const name       = "name"       in item ? item.name       : "";
  const collection = "collection" in item ? item.collection : "";
  const colorway   = "colorway"   in item ? item.colorway   : "";
  const price      = "price"      in item ? item.price      : "";

  return (
    <div
      className="absolute z-[100] w-44 transition-[opacity,transform] duration-500"
      style={{
        // Positioning the box in the "Safe Zone" (Gutters)
        // Offset vertically (-40px) to match the "elbow" diagonal
        top: "-40px",
        ...(flipLeft ? { right: "5.5rem", left: "auto" } : { left: "5.5rem", right: "auto" }),
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transform: visible ? "scale(1) translateY(0)" : "scale(0.95) translateY(10px)",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="relative bg-black/95 backdrop-blur-xl border border-white/20 p-4 rounded-sm shadow-2xl">
        <button
          onClick={(e) => { e.stopPropagation(); onClose?.(); }}
          className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center rounded-full border border-white/40 bg-black text-white hover:bg-white hover:text-black transition-all duration-300 cursor-pointer z-[110]"
        >
          <span className="text-[10px] leading-none font-bold">✕</span>
        </button>

        <p className="type-eyebrow mb-1 text-white/40 uppercase tracking-widest text-[8px]">{collection}</p>
        <p className="text-xs text-white mb-1 font-medium">{name}</p>
        <p className="text-[10px] text-white/50 mb-2">{colorway}</p>
        <p className="text-xs font-bold text-white/90 mb-4">{price}</p>

        {!isVault && (
          <button
            onClick={(e) => { e.stopPropagation(); onAction?.(); }}
            className="w-full text-center text-[9px] tracking-widest uppercase py-2.5 border border-white/30 text-white hover:bg-white hover:text-black transition-all duration-300 cursor-pointer active:scale-95"
          >
            {name.toLowerCase().includes("scarf") || name.toLowerCase().includes("belt") ? "Lookbook" : "Find Your Size"}
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
  item?: OutfitItem;
  studioDot?: StudioDot;
  tapped: boolean;
  isEditMode: boolean;
  isStudioMode: boolean;
  modelId: string;
  onDotDrop: (text: string) => void;
  onStudioDotDrop?: (dotId: string, topPct: number, leftPct: number) => void;
  onDotTap?: () => void;
  onToggleDot: (id: string | null) => void;
}

function PulseDot({
  item,
  studioDot,
  tapped,
  isEditMode,
  isStudioMode,
  modelId,
  onDotDrop,
  onStudioDotDrop,
  onDotTap,
  onToggleDot
}: PulseDotProps) {
  const dot = studioDot ?? item!;
  const draggable = isEditMode || isStudioMode;

  const leftPct = useMemo(() => {
    if (studioDot) return studioDot.leftPct;
    if (item?.dotPosition) {
      const match = item.dotPosition.match(/left-\[(\d+(?:\.\d+)?)%\]/);
      return match ? parseFloat(match[1]) : 20;
    }
    return 20;
  }, [studioDot, item]);

  const flipLeft = leftPct > 50;

  return (
    <div 
      className={`absolute z-20 ${!isStudioMode && item ? item.dotPosition : ""}`}
      style={isStudioMode && studioDot ? { top: `${studioDot.topPct}%`, left: `${studioDot.leftPct}%` } : {}}
    >
      {/* ELBOW CONNECTOR */}
      {!draggable && <ConnectorLine flipLeft={flipLeft} visible={tapped} />}

      {/* THE DOT */}
      <motion.div
        className="flex items-center justify-center w-11 h-11 -mt-[22px] -ml-[22px] pointer-events-auto cursor-pointer"
        onTap={onDotTap}
        whileTap={{ scale: 0.9 }}
      >
        <div
          className="w-3 h-3 rounded-full"
          style={{
            backgroundColor: dot.type === "vault" ? "#D4B896" : "#FFFFFF",
            boxShadow: `0 0 15px ${dot.type === "vault" ? "rgba(212,184,150,0.6)" : "rgba(255,255,255,0.8)"}`,
            animation: draggable ? "none" : "pulse-white 2s ease-in-out infinite"
          }}
        />
      </motion.div>

      {/* THE CARD */}
      {!draggable && (
        <HoverCard 
          item={dot} 
          visible={tapped} 
          leftPct={leftPct}
          onAction={onDotTap}
          onClose={() => onToggleDot(null)} 
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ModelStage & CollectionOverlay (Structure kept stable)
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
  activeDotId: string | null;
  onToggleDot: (id: string | null) => void;
}

function ModelStage({
  slot,
  index,
  revealed,
  isEditMode,
  isStudioMode,
  studioSlot,
  activeDotId,
  onToggleDot,
  onOpenLookbook
}: ModelStageProps) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  const imageSrc = isStudioMode && studioSlot ? studioSlot.imageSrc : slot.imageSrc;
  const shadow: ShadowConfig = (isStudioMode && studioSlot) ? studioSlot.shadow : (slot.shadow ?? DEFAULT_SHADOW);

  const isActive = hovered || slot.outfit.some(item => item.id === activeDotId) || studioSlot?.dots.some(d => d.id === activeDotId);

  const containerStyle: React.CSSProperties = {
    opacity: revealed ? 1 : 0,
    transitionDelay: `${index * 150}ms`,
    zIndex: isActive ? 999 : (slot.zIndex || 20 + index),
    ...(isStudioMode && studioSlot ? {
      position: "absolute",
      left: `${studioSlot.leftPct}%`,
      bottom: `${studioSlot.bottomPct}%`,
      transformOrigin: "bottom center",
    } : {})
  };

  const dots = isStudioMode && studioSlot ? studioSlot.dots : slot.outfit;

  return (
    <div
      className={isStudioMode ? "absolute pointer-events-auto origin-bottom" : `absolute pointer-events-auto origin-bottom ${slot.position} ${slot.mobileScale} ${slot.scale}`}
      style={containerStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative w-fit h-fit model-container">
        {!imgError && (
          <img
            src={imageSrc}
            alt=""
            className="absolute inset-0 h-full w-full pointer-events-none select-none"
            style={{
              filter: `brightness(0) blur(${shadow.blur}px) opacity(${shadow.opacity})`,
              transform: `translate(${shadow.offsetX}px, ${shadow.offsetY}px) scaleX(${shadow.scaleX}) scaleY(${shadow.scaleY})`,
              transformOrigin: "bottom center",
            }}
          />
        )}
        <img
          src={imageSrc}
          alt={slot.id}
          className="h-[40vh] md:h-[80vh] w-auto object-bottom select-none"
          style={{ filter: "brightness(0.85) contrast(1.1)" }}
          onError={() => setImgError(true)}
        />
        {dots.map((dot: any) => (
          <PulseDot
            key={dot.id}
            item={isStudioMode ? undefined : dot}
            studioDot={isStudioMode ? dot : undefined}
            hovered={hovered}
            tapped={activeDotId === dot.id}
            isEditMode={isEditMode}
            isStudioMode={isStudioMode}
            modelId={slot.id}
            onDotDrop={() => {}}
            onToggleDot={onToggleDot}
            onDotTap={() => {
              if (isEditMode) return;
              if (dot.lookbook?.length > 0 || (dot as StudioDot).lookbook?.length > 0) {
                 onOpenLookbook({
                   name: dot.name,
                   collection: dot.collection,
                   colorway: dot.colorway,
                   price: dot.price,
                   type: dot.type,
                   lookbook: dot.lookbook || []
                 });
              }
              onToggleDot(activeDotId === dot.id ? null : dot.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function CollectionOverlay({ opacity }: { opacity: MotionValue<number> }) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeDotId, setActiveDotId] = useState<string | null>(null);
  const [isStudioMode, setIsStudioMode] = useState(false);
  const [studioSlots, setStudioSlots] = useState<StudioSlot[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [lookbookDot, setLookbookDot] = useState<LookbookContext | null>(null);

  useMotionValueEvent(opacity, "change", (v) => {
    setActive(v > 0.05);
    if (!revealed && v >= 0.99) setRevealed(true);
  });

  const enterStudio = () => {
    setStudioSlots(MODEL_INVENTORY.map(modelSlotToStudio));
    setIsStudioMode(true);
  };

  return (
    <div className="absolute inset-0 z-20" style={{ pointerEvents: active ? "auto" : "none" }}>
      {MODEL_INVENTORY.map((slot, index) => (
        <ModelStage
          key={slot.id}
          slot={slot}
          index={index}
          revealed={revealed}
          isEditMode={isEditMode}
          isStudioMode={isStudioMode}
          activeDotId={activeDotId}
          onToggleDot={setActiveDotId}
          isSelected={selectedModelId === slot.id}
          onSelect={() => setSelectedModelId(slot.id)}
          onDotDrop={() => {}}
          onStudioDotDrop={() => {}}
          onModelDragEnd={() => {}}
          onUpdateStudioSlot={() => {}}
          onOpenLookbook={setLookbookDot}
        />
      ))}
      {lookbookDot && (
        <LookbookOverlay dot={lookbookDot} onClose={() => setLookbookDot(null)} />
      )}
      {active && (
        <div className="fixed bottom-6 right-6 flex gap-4 pointer-events-auto">
          <button 
            className="px-4 py-2 bg-black/80 border border-white/20 text-[9px] uppercase tracking-widest text-white/40"
            onClick={() => setIsEditMode(!isEditMode)}
          >
            {isEditMode ? "Exit Edit" : "Edit Dots"}
          </button>
          <button 
            className="px-4 py-2 bg-black/80 border border-white/20 text-[9px] uppercase tracking-widest text-white/40"
            onClick={() => isStudioMode ? setIsStudioMode(false) : enterStudio()}
          >
            {isStudioMode ? "Exit Studio" : "Studio Mode"}
          </button>
        </div>
      )}
    </div>
  );
}