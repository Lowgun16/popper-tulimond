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

// ─────────────────────────────────────────────────────────────────────────────
// Visuals: Connector & Card
// ─────────────────────────────────────────────────────────────────────────────

function ConnectorLine({ flipLeft, visible }: { flipLeft: boolean; visible: boolean }) {
  const pathData = flipLeft ? "M 0 0 L -20 0 L -60 -20" : "M 0 0 L 20 0 L 60 -20"; 
  return (
    <svg className="absolute pointer-events-none overflow-visible z-40" style={{ top: 0, left: 0 }} width="100" height="100">
      <motion.path
        d={pathData}
        fill="none"
        stroke="#D4B896"
        strokeWidth="1"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={visible ? { pathLength: 1, opacity: 0.6 } : { pathLength: 0, opacity: 0 }}
      />
      <motion.circle cx={flipLeft ? -60 : 60} cy="-20" r="2" fill="#D4B896" animate={visible ? { opacity: 1 } : { opacity: 0 }} />
    </svg>
  );
}

function HoverCard({ item, visible, onAction, onClose, leftPct }: any) {
  const flipLeft = leftPct > 50; 
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
        <button onClick={(e) => { e.stopPropagation(); onClose?.(); }} className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center rounded-full border border-white/40 bg-black text-white hover:bg-white hover:text-black transition-all duration-300 z-[110]">
          <span className="text-[10px] font-bold">✕</span>
        </button>
        <p className="type-eyebrow mb-1 text-white/40 uppercase tracking-widest text-[8px]">{item.collection || ""}</p>
        <p className="text-xs text-white mb-1 font-medium">{item.name || ""}</p>
        <p className="text-[10px] text-white/50 mb-2">{item.colorway || ""}</p>
        <p className="text-xs font-bold text-white/90 mb-4">{item.price || ""}</p>
        <button onClick={(e) => { e.stopPropagation(); onAction?.(); }} className="w-full text-center text-[9px] tracking-widest uppercase py-2.5 border border-white/30 text-white hover:bg-white hover:text-black transition-all duration-300">
          Find Your Size
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PulseDot
// ─────────────────────────────────────────────────────────────────────────────

function PulseDot({ item, studioDot, tapped, isStudioMode, onStudioDotDrop, onDotTap, onToggleDot }: any) {
  const dot = studioDot ?? item!;
  const leftPct = useMemo(() => {
    if (studioDot) return studioDot.leftPct;
    const match = item?.dotPosition?.match(/left-\[(\d+(?:\.\d+)?)%\]/);
    return match ? parseFloat(match[1]) : 20;
  }, [studioDot, item]);

  const handleDragEnd = (e: any, info: any) => {
    const container = (e.target as HTMLElement).closest(".model-container");
    if (!container || !isStudioMode) return;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((info.point.x - window.scrollX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((info.point.y - window.scrollY - rect.top) / rect.height) * 100));
    onStudioDotDrop?.(dot.id, y, x);
  };

  return (
    <div className={`absolute z-20 ${!isStudioMode && item ? item.dotPosition : ""}`} style={isStudioMode && studioDot ? { top: `${studioDot.topPct}%`, left: `${studioDot.leftPct}%` } : {}}>
      {!isStudioMode && <ConnectorLine flipLeft={leftPct > 50} visible={tapped} />}
      <motion.div
        className="flex items-center justify-center w-11 h-11 -mt-[22px] -ml-[22px] cursor-pointer"
        drag={isStudioMode} dragMomentum={false} onDragEnd={handleDragEnd} onTap={onDotTap}
      >
        <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-pulse" />
      </motion.div>
      {!isStudioMode && <HoverCard item={dot} visible={tapped} leftPct={leftPct} onAction={onDotTap} onClose={() => onToggleDot(null)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ModelStage
// ─────────────────────────────────────────────────────────────────────────────

function ModelStage({ slot, index, revealed, isStudioMode, studioSlot, isSelected, onSelect, onStudioDotDrop, onModelDrag, onUpdateStudioSlot, onOpenLookbook, activeDotId, onToggleDot }: any) {
  const imageSrc = isStudioMode && studioSlot ? studioSlot.imageSrc : slot.imageSrc;
  const shadow = (isStudioMode && studioSlot) ? studioSlot.shadow : (slot.shadow ?? DEFAULT_SHADOW);

  const left = isStudioMode && studioSlot ? `${studioSlot.leftPct}%` : "";
  const bottom = isStudioMode && studioSlot ? `${studioSlot.bottomPct}%` : "";
  const scale = isStudioMode && studioSlot ? studioSlot.scale : 1;
  const dots = isStudioMode && studioSlot ? studioSlot.dots : slot.outfit;

  return (
    <motion.div
      className={isStudioMode ? "absolute pointer-events-auto origin-bottom" : `absolute pointer-events-auto origin-bottom ${slot.position} ${slot.mobileScale} ${slot.scale}`}
      style={{
        opacity: revealed ? 1 : 0,
        zIndex: isSelected ? 1000 : (slot.zIndex || 20 + index),
        ...(isStudioMode ? { left, bottom } : {})
      }}
      onClick={(e) => { 
        if (isStudioMode) { 
          e.stopPropagation(); // Shield: clicking character doesn't deselect
          onSelect(); 
        } 
      }}
      drag={isStudioMode && isSelected}
      dragMomentum={false}
      onDrag={(_, info) => {
        if (isStudioMode && isSelected) onModelDrag(slot.id, info.delta.x, info.delta.y);
      }}
    >
      <div className="relative w-fit h-fit model-container">
        {isStudioMode && isSelected && (
          <div className="absolute inset-0 border-2 border-[#D4B896] pointer-events-none z-50">
            <div className="absolute top-0 left-0 bg-[#D4B896] text-black text-[8px] px-1 font-bold uppercase tracking-tighter">SELECTED</div>
            <div 
              className="absolute -bottom-2 -right-2 w-5 h-5 bg-[#D4B896] pointer-events-auto cursor-ns-resize flex items-center justify-center shadow-lg"
              onPointerDown={(e) => {
                e.stopPropagation();
                const startY = e.clientY;
                const startScale = scale;
                const onPointerMove = (m: PointerEvent) => {
                  onUpdateStudioSlot(slot.id, { scale: Math.max(0.1, startScale + (startY - m.clientY) * 0.005) });
                };
                const onPointerUp = () => {
                  window.removeEventListener("pointermove", onPointerMove);
                  window.removeEventListener("pointerup", onPointerUp);
                };
                window.addEventListener("pointermove", onPointerMove);
                window.addEventListener("pointerup", onPointerUp);
              }}
            >
              <span className="text-black text-[12px] font-bold">⇳</span>
            </div>
          </div>
        )}
        <img src={imageSrc} alt="" className="absolute inset-0 h-full w-full pointer-events-none select-none" style={{ filter: `brightness(0) blur(${shadow.blur}px) opacity(${shadow.opacity})`, transform: `translate(${shadow.offsetX}px, ${shadow.offsetY}px) scaleX(${shadow.scaleX}) scaleY(${shadow.scaleY})`, transformOrigin: "bottom center", scale }} />
        <img src={imageSrc} alt="" className="h-[40vh] md:h-[80vh] w-auto object-bottom select-none" style={{ filter: "brightness(0.85) contrast(1.1)", scale }} />
        {dots.map((dot: any) => (
          <PulseDot key={dot.id} item={isStudioMode ? undefined : dot} studioDot={isStudioMode ? dot : undefined} tapped={activeDotId === dot.id} isStudioMode={isStudioMode} onStudioDotDrop={onStudioDotDrop} onToggleDot={onToggleDot} onDotTap={() => onToggleDot(activeDotId === dot.id ? null : dot.id)} />
        ))}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Overlay Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CollectionOverlay({ opacity }: { opacity: MotionValue<number> }) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [activeDotId, setActiveDotId] = useState<string | null>(null);
  const [isStudioMode, setIsStudioMode] = useState(false);
  const [studioSlots, setStudioSlots] = useState<StudioSlot[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [lookbookDot, setLookbookDot] = useState<LookbookContext | null>(null);
  const [copyConfirm, setCopyConfirm] = useState(false);

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

  const handleModelDrag = useCallback((slotId: string, deltaX: number, deltaY: number) => {
    const rect = document.querySelector(".main-container")?.getBoundingClientRect();
    if (!rect) return;
    const slot = studioSlots.find(s => s.id === slotId);
    if (!slot) return;
    updateSlot(slotId, { 
      leftPct: slot.leftPct + (deltaX / rect.width) * 100, 
      bottomPct: slot.bottomPct - (deltaY / rect.height) * 100 
    });
  }, [studioSlots, updateSlot]);

  return (
    <div 
      className="absolute inset-0 z-20 main-container" 
      style={{ pointerEvents: active ? "auto" : "none" }} 
      onClick={() => {
        if (isStudioMode) setSelectedModelId(null);
      }}
    >
      {isStudioMode && (
        <div 
          className="relative z-[2000]" // Shield: higher than characters
          onClick={(e) => e.stopPropagation()} // Shield: stop clicks from deselecting
        >
          <StudioInspector
            slots={studioSlots} 
            selectedId={selectedModelId} 
            onSelectSlot={setSelectedModelId}
            onUpdateSlot={updateSlot} 
            onUpdateDot={updateDot} 
            onSave={async () => {}} 
            onCopyCode={() => {
              navigator.clipboard.writeText(exportInventoryCode(studioSlots));
              setCopyConfirm(true); setTimeout(() => setCopyConfirm(false), 2000);
            }}
            copyConfirm={copyConfirm}
            onAddDot={(slotId) => {
              const newDot: StudioDot = { id: `dot-${Date.now()}`, name: "New Item", collection: "TULIMOND", colorway: "N/A", price: "$0", type: "public", topPct: 50, leftPct: 50, lookbook: [] };
              setStudioSlots(prev => prev.map(s => s.id === slotId ? { ...s, dots: [...s.dots, newDot] } : s));
            }}
            onRemoveDot={(slotId, dotId) => {
              setStudioSlots(prev => prev.map(s => s.id === slotId ? { ...s, dots: s.dots.filter(d => d.id !== dotId) } : s));
            }}
            onSwapImage={(id, src) => updateSlot(id, { imageSrc: src })}
            onAddSlot={() => {
               const id = `patron-${Date.now()}`;
               setStudioSlots(prev => [...prev, { id, displayName: "New Patron", imageSrc: "/model-center.png", leftPct: 40, bottomPct: 5, scale: 0.85, zIndex: 25, dots: [], shadow: { ...DEFAULT_SHADOW } }]);
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

      <div className="fixed bottom-6 right-6 flex gap-4 pointer-events-auto z-[2100]">
        <button 
          className="px-6 py-3 bg-black/90 border border-white/20 text-[10px] uppercase tracking-widest text-white backdrop-blur-xl"
          style={isStudioMode ? { color: "#D4B896", borderColor: "#D4B896" } : {}}
          onClick={(e) => { 
            e.stopPropagation(); 
            if (isStudioMode) {
              setIsStudioMode(false);
            } else {
              setStudioSlots(MODEL_INVENTORY.map(modelSlotToStudio));
              // SYNC: If you have a dot active, select that model automatically
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
        <LookbookOverlay dot={lookbookDot} onClose={() => setLookbookDot(null)} />
      )}
    </div>
  );
}