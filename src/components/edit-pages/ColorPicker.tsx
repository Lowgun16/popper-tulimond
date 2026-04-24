"use client";
import { useState, useRef, useEffect } from "react";

type Props = {
  onSave: (hex: string) => void;
  onClose: () => void;
};

const PRESET_SWATCHES = [
  "#8B0000", "#1A1A2E", "#2C3E50", "#006400", "#4B0082",
  "#FF6B35", "#F7C59F", "#EFEFD0", "#004E89", "#1A936F",
];

export function ColorPicker({ onSave, onClose }: Props) {
  const [hex, setHex] = useState("#");
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(hex);

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-2 z-50 bg-[#111] border border-white/20 p-4 flex flex-col gap-3 shadow-2xl w-56"
    >
      <p className="text-[9px] uppercase tracking-widest text-white/40">Custom Color</p>
      <div className="flex gap-2 flex-wrap">
        {PRESET_SWATCHES.map((swatch) => (
          <button
            key={swatch}
            onClick={() => setHex(swatch)}
            className="w-5 h-5 rounded-sm border border-white/10 hover:border-white/40"
            style={{ backgroundColor: swatch }}
            title={swatch}
          />
        ))}
      </div>
      <input
        type="text"
        value={hex}
        onChange={(e) => setHex(e.target.value)}
        placeholder="#000000"
        className="bg-transparent border border-white/20 text-white text-xs px-2 py-1 w-full outline-none font-mono focus:border-[#D4B896]"
        maxLength={7}
      />
      <button
        onClick={() => { if (isValidHex) { onSave(hex); onClose(); } }}
        disabled={!isValidHex}
        className="px-4 py-1.5 bg-[#D4B896] text-black text-[9px] uppercase tracking-widest disabled:opacity-30"
      >
        Save Color
      </button>
    </div>
  );
}
