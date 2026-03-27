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
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [showCheckmark, setShowCheckmark] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const items = dot.lookbook;
  const active = items[activeIdx];
  const needsSize = !dot.name.toLowerCase().includes('scarf') && !dot.name.toLowerCase().includes('belt');

  const handleAddToCart = () => {
    if (needsSize && !selectedSize) return;
    setShowCheckmark(true);
    setTimeout(() => setShowCheckmark(false), 2000);
  };

  if (!items.length) return null;

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ zIndex: 500, background: "rgba(0,0,0,0.93)", backdropFilter: "blur(24px)", opacity: mounted ? 1 : 0, transition: "opacity 0.4s ease" }}
      onClick={() => { setMounted(false); setTimeout(onClose, 400); }}
    >
      <div className="flex flex-col items-center gap-6" onClick={(e) => e.stopPropagation()}>
        {/* Media Section */}
        <div style={{ maxWidth: "min(92vw, 900px)", maxHeight: "50vh" }}>
          {active && isVideo(active) ? (
            <video src={active} style={{ maxHeight: "50vh", objectFit: "contain" }} autoPlay loop muted playsInline />
          ) : (
            <img src={active} alt={dot.name} style={{ maxHeight: "50vh", objectFit: "contain" }} />
          )}
        </div>

        {/* Info & Size Picker */}
        <div className="text-center">
          <p className="text-[10px] text-white/40 uppercase tracking-widest">{dot.collection}</p>
          <h2 className="text-white text-xl mt-1">{dot.name}</h2>
          <p className="text-white font-bold mt-2">{dot.price}</p>

          {needsSize && (
            <div className="mt-6">
              <p className="text-[9px] text-white/40 uppercase tracking-widest mb-3">Select Size</p>
              <div className="flex gap-4 justify-center">
                {['S', 'M', 'L', 'XL'].map(size => (
                  <button key={size} onClick={() => setSelectedSize(size)} style={{
                    width: 40, height: 40, borderRadius: '50%', border: `1px solid ${selectedSize === size ? '#D4AF37' : 'rgba(255,255,255,0.2)'}`,
                    background: selectedSize === size ? '#D4AF37' : 'transparent', color: selectedSize === size ? 'black' : 'white'
                  }}>{size}</button>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleAddToCart} disabled={needsSize && !selectedSize} style={{
            marginTop: 30, padding: "12px 40px", background: showCheckmark ? "#4ADE80" : (needsSize && !selectedSize ? "rgba(255,255,255,0.1)" : "#D4AF37"),
            color: "black", border: "none", borderRadius: 4, fontWeight: 'bold', textTransform: 'uppercase'
          }}>
            {showCheckmark ? "✓ Added" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}