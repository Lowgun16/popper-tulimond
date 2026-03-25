// src/components/CollectionOverlay.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, type MotionValue, useMotionValueEvent } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// MODEL_INVENTORY
// Edit names, prices, and colorways here. Do not touch layout below this block.
// ─────────────────────────────────────────────────────────────────────────────

// Toggle vault dots globally — set true to re-enable champagne gold markers
const SHOW_VAULT_DOTS = false;

type AccessType = "public" | "vault";

interface OutfitItem {
  id: string;
  name: string;
  collection: string;
  colorway: string;
  price: string;
  type: AccessType;
  dotPosition: string; // Full Tailwind literal — must be a static string, no runtime assembly
}

interface ModelSlot {
  id: string;
  position: string;   // Responsive Tailwind position — includes sm:/md: breakpoints
  scale: string;      // Desktop scale: "md:scale-[X]" — applied at md+ breakpoint
  mobileScale: string;// Mobile scale: "scale-[X]" — base (mobile-first), overridden by scale
  zIndex: number;     // Depth perception: center=40 (closest), vault=20 (furthest)
  imageSrc: string;   // Path relative to /public
  outfit: OutfitItem[];
}

const MODEL_INVENTORY: ModelSlot[] = [
  {
    id: "lounge-model",
    position: "left-[-40%] md:left-[10%] bottom-[22%] md:bottom-[5%]",
    scale: "md:scale-[0.9]",
    mobileScale: "scale-[0.9]",
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
        dotPosition: "top-[30%] left-[85%]",
      },
      {
        id: "lounge-heartbreaker",
        name: "The Heartbreaker",
        collection: "The Constable",
        colorway: "Dark Grey",
        price: "$1,400",
        type: "vault",
        dotPosition: "top-[50%] left-[45%]",
      },
    ],
  },
  {
    id: "center-model",
    position: "left-[22%] md:left-[40%] bottom-[18%] md:bottom-[2%]",
    scale: "md:scale-[1.0]",
    mobileScale: "scale-[1.0]",
    zIndex: 40,
    imageSrc: "/model-center.png",
    outfit: [
      {
        id: "center-showstopper",
        name: "The Showstopper",
        collection: "The Constable",
        colorway: "Ivory",
        price: "$1,500",
        type: "public",
        dotPosition: "top-[35%] left-[45%]",
      },
      {
        id: "center-heartbreaker",
        name: "The Heartbreaker",
        collection: "The Constable",
        colorway: "Dark Grey",
        price: "$1,600",
        type: "vault",
        dotPosition: "top-[45%] left-[40%]",
      },
    ],
  },
  {
    id: "vault-model",
    position: "right-[32%] md:right-[25%] bottom-[24%] md:bottom-[8%]",
    scale: "md:scale-[0.8]",
    mobileScale: "scale-[0.83]",
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
        dotPosition: "top-[47%] left-[50%]",
      },
      {
        id: "vault-heartbreaker",
        name: "The Heartbreaker",
        collection: "The Constable",
        colorway: "Dark Grey",
        price: "$1,100",
        type: "vault",
        dotPosition: "top-[47%] left-[42%]",
      },
    ],
  },
  {
    id: "rack-model",
    position: "right-[-5%] md:right-[5%] bottom-[25%] md:bottom-[5%]",
    scale: "md:scale-[0.9]",
    mobileScale: "scale-[0.8]",
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
        dotPosition: "top-[58%] left-[88%]",
      },
      {
        id: "rack-heartbreaker",
        name: "The Heartbreaker",
        collection: "The Constable",
        colorway: "Dark Grey",
        price: "$1,300",
        type: "vault",
        dotPosition: "top-[50%] left-[40%]",
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HoverCard
// ─────────────────────────────────────────────────────────────────────────────

function HoverCard({ item, visible }: { item: OutfitItem; visible: boolean }) {
  const isVault = item.type === "vault";

  return (
    <div
      className="absolute left-6 top-1/2 z-30 w-48 transition-[opacity,transform] duration-500 pointer-events-none"
      style={{
        opacity: visible ? 1 : 0,
        transform: `translateY(-50%) translateX(${visible ? "0px" : "16px"})`,
      }}
    >
      <div className="bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-sm">
        {/* Collection eyebrow — inline style required: .type-eyebrow hardcodes color:gold in globals.css */}
        <p className="type-eyebrow mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          {item.collection}
        </p>

        <p className="text-xs text-white mb-1">{item.name}</p>
        <p className="text-[10px] text-white/50 mb-2">{item.colorway}</p>
        <p className="text-xs font-bold text-white/90 mb-3">{item.price}</p>

        {isVault ? (
          <>
            <p
              className="text-[9px] tracking-widest uppercase mb-2"
              style={{ color: "#D4B896" }}
            >
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
  item: OutfitItem;
  hovered: boolean;
  tapped: boolean;
  isEditMode: boolean;
  modelId: string;
  onDotDrop: (text: string) => void;
}

function PulseDot({ item, hovered, tapped, isEditMode, modelId, onDotDrop }: PulseDotProps) {
  const isVault = item.type === "vault";
  // #D4B896 = rgba(212,184,150) — single authoritative champagne gold, consistent with keyframes
  const dotColor = isVault ? "#D4B896" : "#FFFFFF";
  const glowColor = isVault ? "rgba(212,184,150,0.6)" : "rgba(255,255,255,0.8)";
  const animation = isVault
    ? "pulse-champagne 2s ease-in-out infinite"
    : "pulse-white 2s ease-in-out infinite";

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: { point: { x: number; y: number } }) => {
    const target = event.target as HTMLElement;
    const container = target.closest(".model-container");
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = ((info.point.x - rect.left) / rect.width) * 100;
    const y = ((info.point.y - rect.top) / rect.height) * 100;
    const text = `${modelId} · ${item.id}: top-[${y.toFixed(1)}%] left-[${x.toFixed(1)}%]`;
    console.log(text);
    onDotDrop(text);
  };

  return (
    <motion.div
      className={`absolute z-20 ${item.dotPosition}`}
      drag={isEditMode}
      dragMomentum={false}
      dragElastic={0}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onDragEnd={handleDragEnd as any}
      style={{ cursor: isEditMode ? "grab" : undefined }}
      whileDrag={{ cursor: "grabbing", scale: 1.5 }}
    >
      <div className="relative">
        <div
          className="w-3 h-3 rounded-full"
          style={{
            backgroundColor: dotColor,
            boxShadow: isEditMode
              ? `0 0 0 2px rgba(212,184,150,0.8), 0 0 15px ${glowColor}`
              : `0 0 15px ${glowColor}`,
            animation: isEditMode ? "none" : animation,
            cursor: isEditMode ? "inherit" : "pointer",
          }}
        />
        {/* HoverCard suppressed in edit mode to avoid overlay clutter */}
        {!isEditMode && <HoverCard item={item} visible={hovered || tapped} />}
      </div>
    </motion.div>
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
  onDotDrop: (text: string) => void;
}

function ModelStage({ slot, index, revealed, isEditMode, onDotDrop }: ModelStageProps) {
  const [hovered, setHovered] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Clean up pending leave timer on unmount to prevent setState on unmounted component.
  useEffect(() => {
    return () => clearTimeout(leaveTimer.current);
  }, []);

  // Small leave-delay lets the cursor travel from silhouette to hover card
  // without the card blinking out mid-transit.
  const handleEnter = () => {
    clearTimeout(leaveTimer.current);
    setHovered(true);
  };
  const handleLeave = () => {
    leaveTimer.current = setTimeout(() => setHovered(false), 120);
  };

  // Tap: toggle primary item card. Suppressed in edit mode so drag doesn't fight tap.
  const handleTap = () => {
    if (isEditMode) return;
    const primaryId = slot.outfit[0].id;
    setActiveItemId((prev) => (prev === primaryId ? null : primaryId));
  };

  const isActive = hovered || activeItemId !== null;

  return (
    <div
      className={`absolute bg-transparent pointer-events-auto transition-opacity duration-700 origin-bottom ${slot.position} ${slot.mobileScale} ${slot.scale}`}
      style={{
        opacity: revealed ? 1 : 0,
        transitionDelay: `${index * 150}ms`,
        zIndex: slot.zIndex,
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* Photo container — model-container class used by drag-end getBoundingClientRect() */}
      <div
        className="relative w-fit h-fit bg-transparent model-container cursor-pointer transition-transform duration-500"
        style={{ transform: isActive && !isEditMode ? "scale(1.03)" : "scale(1)" }}
        onClick={handleTap}
      >
        {/* Live photography */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slot.imageSrc}
          alt={slot.id}
          className="h-[40vh] md:h-[80vh] w-auto object-bottom origin-bottom select-none block"
          style={{
            filter: isEditMode
              ? "brightness(0.6) contrast(1.1) saturate(0.7)"
              : "brightness(0.85) contrast(1.1) saturate(0.9)",
            background: "transparent",
          }}
          draggable={false}
          loading="eager"
        />

        {/* Contact shadow — anchors feet to the floor */}
        <div
          className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none z-10"
          style={{
            background: "radial-gradient(ellipse 90% 100% at 50% 100%, rgba(0,0,0,0.55) 0%, transparent 100%)",
          }}
        />

        {/* Tap glow — subtle highlight on active state */}
        {activeItemId && !isEditMode && (
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{ boxShadow: "inset 0 0 50px rgba(255,255,255,0.07)" }}
          />
        )}

        {/* Edit mode overlay — dim grid hint */}
        {isEditMode && (
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{ border: "1px dashed rgba(212,184,150,0.25)" }}
          />
        )}

        {/* Label — desktop only */}
        <span className="absolute bottom-10 w-full text-center text-[10px] tracking-[0.3em] text-white/20 uppercase hidden md:block z-20">
          {slot.id}
        </span>

        {/* Pulse dots — filtered by SHOW_VAULT_DOTS; outfit[] supports unlimited items per model */}
        {slot.outfit
          .filter((item) => item.type === "public" || SHOW_VAULT_DOTS)
          .map((item) => (
            <PulseDot
              key={item.id}
              item={item}
              hovered={hovered}
              tapped={activeItemId === item.id}
              isEditMode={isEditMode}
              modelId={slot.id}
              onDotDrop={onDotDrop}
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

  useMotionValueEvent(opacity, "change", (v) => {
    // Gate pointer-events — matches AtelierNav pattern exactly
    setActive(v > 0.05);
    // Stagger trigger — fires once when nav opacity reaches full
    if (!revealed && v >= 0.99) setRevealed(true);
  });

  const handleDotDrop = (text: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  return (
    <div
      className="absolute inset-0 z-20"
      style={{ pointerEvents: active ? "auto" : "none" }}
    >
      {MODEL_INVENTORY.map((slot, index) => (
        <ModelStage
          key={slot.id}
          slot={slot}
          index={index}
          revealed={revealed}
          isEditMode={isEditMode}
          onDotDrop={handleDotDrop}
        />
      ))}

      {/* Edit mode toggle button — fixed bottom-right, always on top */}
      {active && (
        <button
          className="fixed bottom-6 right-6 z-[100] text-[9px] tracking-widest uppercase px-3 py-2 transition-colors duration-300 pointer-events-auto"
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

      {/* Toast coordinates — stack above the toggle button */}
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
