"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { OutfitItem } from "@/data/inventory";
import type { LookbookContext } from "@/components/studio/studioTypes";

export const CARD_W = 184; 
const CARD_GAP = 40;
const EDGE = 12;

export const smokedObsidian: React.CSSProperties = {
  background: "rgba(18, 18, 18, 0.94)",
  border: "1px solid rgba(255,255,255,0.12)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
};

export interface CardPlacement {
  left: number;
  top: number;
  goRight: boolean;
  dotX: number;
  dotY: number;
}

export interface OpenCard {
  item: OutfitItem;
  placement: CardPlacement;
}

export function computeCardPlacement(dotX: number, dotY: number): CardPlacement {
  if (typeof window === "undefined") return { left: 0, top: 0, goRight: true, dotX, dotY };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = dotX + CARD_GAP;
  let goRight = true;
  if (left + CARD_W > vw - EDGE) {
    left = dotX - CARD_GAP - CARD_W;
    goRight = false;
  }
  left = Math.max(EDGE, Math.min(left, vw - CARD_W - EDGE));
  let top = Math.max(EDGE, Math.min(dotY - 70, vh - 200));
  return { left, top, goRight, dotX, dotY };
}

interface SpatialCardProps {
  item: OutfitItem;
  placement: CardPlacement;
  onClose: () => void;
  onLookbook: (ctx: LookbookContext) => void;
}

export function SpatialCard({ item, placement, onClose, onLookbook }: SpatialCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        position: "fixed",
        left: placement.left,
        top: placement.top,
        width: CARD_W,
        zIndex: 100,
        pointerEvents: "auto",
      }}
    >
      <div style={{ ...smokedObsidian, borderRadius: 12, padding: "16px", position: "relative" }}>
        <div style={{
          position: "absolute", left: 0, top: 16, bottom: 16, width: 3,
          background: "linear-gradient(to bottom, #D4AF37, rgba(212, 175, 55, 0.2))",
          borderRadius: "0 4px 4px 0"
        }} />

        <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{
          position: "absolute", top: 10, right: 10, background: "none", border: "none", color: "white", cursor: "pointer"
        }}>✕</button>

        <p style={{ fontSize: "10px", color: "#D4AF37", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "6px" }}>
          {item.collection}
        </p>
        <h3 style={{ fontSize: "16px", color: "white", marginBottom: "4px" }}>{item.name}</h3>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginBottom: "16px" }}>{item.price}</p>

        <button 
          onClick={(e) => { e.stopPropagation(); onLookbook(item as any); }} 
          style={{
            width: "100%", padding: "12px", borderRadius: "8px", fontSize: "11px", fontWeight: 600,
            textTransform: "uppercase", background: "rgba(212, 175, 55, 0.08)", border: "1px solid #D4AF37", color: "#D4AF37", cursor: "pointer"
          }}
        >
          {item.name.toLowerCase().includes('scarf') || item.name.toLowerCase().includes('belt') ? "Lookbook" : "Find Your Size"}
        </button>
      </div>
    </motion.div>
  );
}

export function LeaderLines({ openCards }: { openCards: Map<string, OpenCard> }) {
  return (
    <svg style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 45 }}>
      {Array.from(openCards.values()).map(({ item, placement }) => (
        <line
          key={item.id}
          x1={placement.dotX} y1={placement.dotY}
          x2={placement.dotX < placement.left ? placement.left : placement.left + CARD_W} 
          y2={placement.top + 30}
          stroke="#D4AF37" strokeWidth="1" strokeOpacity="0.4"
        />
      ))}
    </svg>
  );
}