// src/components/studio/LookbookOverlay.tsx
"use client";
import React, { useState, useEffect } from "react";
import type { LookbookContext } from "./studioTypes";

interface Props {
  dot: LookbookContext;
  onClose: () => void;
}

function isVideo(src: string): boolean {
  return /\.(mp4|webm|mov)$/i.test(src.split("?")[0]);
}

export function LookbookOverlay({ dot, onClose }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [mediaVisible, setMediaVisible] = useState(true);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const items = dot.lookbook;
  const active = items[activeIdx];

  const switchTo = (idx: number) => {
    if (idx === activeIdx || !items[idx]) return;
    setMediaVisible(false);
    setTimeout(() => {
      setActiveIdx(idx);
      setMediaVisible(true);
    }, 200);
  };

  const handleClose = () => {
    setMounted(false);
    setTimeout(onClose, 400);
  };

  if (!items.length) return null;

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        zIndex: 500,
        background: "rgba(0,0,0,0.93)",
        backdropFilter: "blur(24px)",
        opacity: mounted ? 1 : 0,
        transition: "opacity 0.4s ease",
      }}
      onClick={handleClose}
    >
      {/* Main media */}
      <div
        style={{
          opacity: mediaVisible ? 1 : 0,
          transition: "opacity 0.2s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          maxWidth: "min(80vw, 900px)",
          maxHeight: "65vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {active && isVideo(active) ? (
          <video
            key={active}
            src={active}
            style={{ maxHeight: "65vh", maxWidth: "min(80vw, 900px)", objectFit: "contain", display: "block" }}
            autoPlay loop muted playsInline
          />
        ) : active ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={active}
            src={active}
            alt={dot.name}
            style={{ maxHeight: "65vh", maxWidth: "min(80vw, 900px)", objectFit: "contain", display: "block" }}
          />
        ) : null}
      </div>

      {/* Product info */}
      <div className="mt-5 text-center flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <p className="text-[8px] tracking-[0.45em] uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
          {dot.collection}
        </p>
        <p className="text-white text-[13px] tracking-wider">{dot.name}</p>
        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>{dot.colorway}</p>
        <p className="text-white text-[13px] font-semibold mt-0.5">{dot.price}</p>
        {dot.type === "vault" && (
          <p className="text-[8px] tracking-widest uppercase mt-1" style={{ color: "#D4B896" }}>
            Vault Access Required
          </p>
        )}
      </div>

      {/* Media tray */}
      {items.length > 1 && (
        <div className="fixed bottom-8 flex gap-3" onClick={(e) => e.stopPropagation()}>
          {items.map((src: string, idx: number) => {
            const isActive = idx === activeIdx;
            return (
              <button
                key={src}
                className="w-14 h-14 overflow-hidden flex items-center justify-center transition-all duration-300"
                style={{
                  border: `1.5px solid ${isActive ? "#D4B896" : "rgba(255,255,255,0.18)"}`,
                  opacity: isActive ? 1 : 0.55,
                  background: "rgba(0,0,0,0.4)",
                  transform: isActive ? "scale(1.08)" : "scale(1)",
                }}
                onClick={() => switchTo(idx)}
              >
                {isVideo(src) ? (
                  <div className="flex flex-col items-center justify-center w-full h-full gap-0.5"
                    style={{ background: "rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: 16, color: "rgba(255,255,255,0.6)" }}>▶</span>
                    <span className="text-[7px] tracking-wider uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>mp4</span>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" className="w-full h-full object-cover" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Close */}
      <button
        className="fixed top-6 right-6 text-[9px] tracking-widest uppercase px-4 py-2 transition-colors duration-200"
        style={{ border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.5)", background: "rgba(0,0,0,0.4)" }}
        onClick={handleClose}
      >
        ✕  Close
      </button>
    </div>
  );
}
