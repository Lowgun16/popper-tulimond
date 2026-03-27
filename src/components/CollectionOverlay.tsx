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
  const pathData = flipLeft 
    ? "M 0 0 L -20 0 L -60 -20" 
    : "M 0 0 L 20 0 L 60 -20"; 

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
        transition={{ duration: 0.4, ease: "easeOut" }}
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
// HoverCard - The Info Box
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
  hovered: boolean;
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

  // Drag logic for Studio Mode
  const dotDragX = useMotionValue(0);
  const dotDragY = useMotionValue(0);

  const handleDragEnd = (event: any, info: any) => {
    const target = event.target as HTMLElement;
    const container = target.closest(".model-container");
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const scrollX = window.scrollX ?? 0;
    const scrollY = window.scrollY ?? 0;
    const x = Math.max(0, Math.min(100, ((info.point.x - scrollX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((info.point.y - scrollY - rect.top) / rect.height) * 100));

    if (isStudioMode && onStudioDotDrop) {
      onStudioDotDrop(dot.id, y, x);
      dotDragX.set(0);
      dotDragY.set(0);
    } else {
      onDotDrop(`${modelId} · ${dot.id}: top-[${y.toFixed(1)}%] left-[${x.toFixed(1)}%]`);
    }
  };

  return (
    <div 
      className={`absolute z-20 ${!isStudioMode && item ? item.dotPosition : ""}`}
      style={isStudioMode && studioDot ? { top: `${studioDot.topPct}%`, left: `${studioDot.leftPct}%` } : {}}
    >
      {!draggable && <ConnectorLine flipLeft={flipLeft} visible={tapped} />}

      <motion.div
        className="flex items-center justify-center w-11 h-11 -mt-[22px] -ml-[22px] pointer-events-auto cursor-pointer"
        style={{ x: dotDragX, y: dotDragY }}
        drag={draggable}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
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
  isSelected,
  onSelect,
  onDotDrop,
  onStudioDotDrop,
  onModelDragEnd,
  onUpdateStudioSlot,
  onOpenLookbook,
  activeDotId,
  onToggleDot
}: ModelStageProps) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  const imageSrc = isStudioMode && studioSlot ? studioSlot.imageSrc : slot.imageSrc;
  const shadow: ShadowConfig = (isStudioMode && studioSlot) ? studioSlot.shadow : (slot.shadow ?? DEFAULT_SHADOW);

  const isActive = hovered || slot.outfit.some(item => item.id === activeDotId) || (studioSlot?.dots.some(d => d.id === activeDotId));

  const containerStyle: React.CSSProperties = {
    opacity: revealed ? 1 : 0,
    transitionDelay: `${index * 150}ms`,
    zIndex: isActive ? 999 : (slot.zIndex || 20 + index),
    ...(isStudioMode && studioSlot ? {
      position: "absolute",
      left: `${studioSlot.leftPct}%`,
      bottom: `${studioSlot.bottomPct}%`,
      transformOrigin: "bottom center",
      scale: studioSlot.scale,
    } : {})
  };

  const dots = isStudioMode && studioSlot ? studioSlot.dots : slot.outfit;

  return (
    <motion.div
      className={isStudioMode ? "absolute pointer-events-auto origin-bottom" : `absolute pointer-events-auto origin-bottom ${slot.position} ${slot.mobileScale} ${slot.scale}`}
      style={{ ...containerStyle, x: dragX, y: dragY }}
      drag={isStudioMode && isSelected}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        onModelDragEnd(slot.id, info.offset.x, info.offset.y);
        dragX.set(0);
        dragY.set(0);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => isStudioMode && onSelect()}
    >
      <div className="relative w-fit h-fit model-container">
        {!imgError && (
          <img
            src={imageSrc}
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
            onDotDrop={onDotDrop}
            onStudioDotDrop={onStudioDotDrop}
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
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CollectionOverlay
// ─────────────────────────────────────────────────────────────────────────────

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
  const [copyConfirm, setCopyConfirm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useMotionValueEvent(opacity, "change", (v) => {
    setActive(v > 0.05);
    if (!revealed && v >= 0.99) setRevealed(true);
  });

  // ── Studio Callbacks ──
  const updateSlot = useCallback((id: string, patch: Partial<StudioSlot>) => {
    setStudioSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setHasUnsavedChanges(true);
  }, []);

  const updateDot = useCallback((slotId: string, dotId: string, patch: Partial<StudioDot>) => {
    setStudioSlots((prev) => prev.map((s) => s.id === slotId ? { ...s, dots: s.dots.map((d) => (d.id === dotId ? { ...d, ...patch } : d)) } : s));
    setHasUnsavedChanges(true);
  }, []);

  const addDot = useCallback((slotId: string) => {
    const newDot: StudioDot = { id: `${slotId}-dot-${Date.now()}`, name: "New Item", collection: "Collection", colorway: "Color", price: "$0", type: "public", topPct: 50, leftPct: 50, lookbook: [] };
    setStudioSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, dots: [...s.dots, newDot] } : s)));
  }, []);

  const removeDot = useCallback((slotId: string, dotId: string) => {
    setStudioSlots((prev) => prev.map((s) => s.id === slotId ? { ...s, dots: s.dots.filter((d) => d.id !== dotId) } : s));
  }, []);

  const addSlot = useCallback(() => {
    const id = `patron-${Date.now()}`;
    const newSlot: StudioSlot = { id, displayName: "New Patron", imageSrc: "/model-center.png", leftPct: 40, bottomPct: 5, scale: 0.85, zIndex: 25, dots: [], shadow: { ...DEFAULT_SHADOW } };
    setStudioSlots((prev) => [...prev, newSlot]);
    setSelectedModelId(id);
  }, []);

  const removeSlot = useCallback((slotId: string) => {
    setStudioSlots((prev) => prev.filter((s) => s.id !== slotId));
    setSelectedModelId(null);
  }, []);

  const handleSave = async () => {
    await fetch("/api/save-inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slots: studioSlots }) });
    setHasUnsavedChanges(false);
    router.refresh();
  };

  const copyCode = useCallback(() => {
    const code = exportInventoryCode(studioSlots);
    navigator.clipboard.writeText(code);
    setCopyConfirm(true);
    setTimeout(() => setCopyConfirm(false), 2000);
  }, [studioSlots]);

  const handleModelDragEnd = useCallback((slotId: string, offsetX: number, offsetY: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const slot = studioSlots.find((s) => s.id === slotId);
    if (!slot) return;
    updateSlot(slotId, { leftPct: slot.leftPct + (offsetX / rect.width) * 100, bottomPct: slot.bottomPct - (offsetY / rect.height) * 100 });
  }, [studioSlots, updateSlot]);

  const enterStudio = () => {
    setStudioSlots(MODEL_INVENTORY.map(modelSlotToStudio));
    setIsStudioMode(true);
  };

  return (
    <div ref={containerRef} className="absolute inset-0 z-20" style={{ pointerEvents: active ? "auto" : "none" }}>
      
      {isStudioMode && (
        <StudioInspector
          slots={studioSlots}
          selectedId={selectedModelId}
          onSelectSlot={setSelectedModelId}
          onUpdateSlot={updateSlot}
          onUpdateDot={updateDot}
          onAddDot={addDot}
          onRemoveDot={removeDot}
          onSwapImage={(id, src) => updateSlot(id, { imageSrc: src })}
          onAddSlot={addSlot}
          onRemoveSlot={removeSlot}
          onUpdateShadow={(id, patch) => updateSlot(id, { shadow: { ...studioSlots.find(s=>s.id===id)!.shadow, ...patch } })}
          onCopyCode={copyCode}
          copyConfirm={copyConfirm}
          onSave={handleSave}
        />
      )}

      {isStudioMode 
        ? studioSlots.map((studioSlot, index) => (
            <ModelStage
              key={studioSlot.id}
              slot={MODEL_INVENTORY.find(s => s.id === studioSlot.id) || { id: studioSlot.id, position: "", scale: "", mobileScale: "", zIndex: studioSlot.zIndex, imageSrc: studioSlot.imageSrc, outfit: [] }}
              index={index}
              revealed={revealed}
              isEditMode={false}
              isStudioMode={true}
              studioSlot={studioSlot}
              isSelected={selectedModelId === studioSlot.id}
              onSelect={() => setSelectedModelId(studioSlot.id)}
              onDotDrop={() => {}}
              onStudioDotDrop={(dotId, top, left) => updateDot(studioSlot.id, dotId, { topPct: top, leftPct: left })}
              onModelDragEnd={handleModelDragEnd}
              onUpdateStudioSlot={updateSlot}
              onOpenLookbook={setLookbookDot}
              activeDotId={activeDotId}
              onToggleDot={setActiveDotId}
            />
          ))
        : MODEL_INVENTORY.map((slot, index) => (
            <ModelStage
              key={slot.id}
              slot={slot}
              index={index}
              revealed={revealed}
              isEditMode={isEditMode}
              isStudioMode={false}
              studioSlot={undefined}
              isSelected={false}
              onSelect={() => {}}
              onDotDrop={() => {}}
              onStudioDotDrop={() => {}}
              onModelDragEnd={() => {}}
              onUpdateStudioSlot={() => {}}
              onOpenLookbook={setLookbookDot}
              activeDotId={activeDotId}
              onToggleDot={setActiveDotId}
            />
          ))
      }

      {lookbookDot && (
        <LookbookOverlay dot={lookbookDot} onClose={() => setLookbookDot(null)} />
      )}

      {active && (
        <div className="fixed bottom-6 right-6 flex gap-4 pointer-events-auto z-[201]">
          {!isStudioMode && (
            <button 
              className="px-4 py-2 bg-black/80 border border-white/20 text-[9px] uppercase tracking-widest text-white/40 backdrop-blur-md"
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? "✕ Exit Edit" : "⊙ Edit Dots"}
            </button>
          )}
          <button 
            className="px-4 py-2 bg-black/80 border border-white/20 text-[9px] uppercase tracking-widest text-white/40 backdrop-blur-md"
            style={isStudioMode ? { color: "#D4B896", borderColor: "#D4B896" } : {}}
            onClick={() => isStudioMode ? setIsStudioMode(false) : enterStudio()}
          >
            {isStudioMode ? "✕ Exit Studio" : "⊙ Studio Mode"}
          </button>
        </div>
      )}
    </div>
  );
}