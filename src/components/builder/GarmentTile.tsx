// src/components/builder/GarmentTile.tsx
"use client";
import type { GarmentTruth } from "./builderTypes";

interface Props {
  garment: GarmentTruth;
  selected: boolean;
  onClick: () => void;
}

export function GarmentTile({ garment, selected, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center p-3 border rounded-lg transition-colors ${
        selected
          ? "border-[#D4B896] bg-[#D4B896]/10"
          : "border-[#D4B896]/15 bg-black/20 hover:border-[#D4B896]/40"
      }`}
    >
      <div className="w-16 h-20 bg-black/30 rounded overflow-hidden mb-2">
        <img
          src={garment.approvedImagePath}
          alt={garment.name}
          className="w-full h-full object-cover object-top"
        />
      </div>
      <span className="text-[11px] font-medium text-[#D4B896] uppercase tracking-wider">
        {garment.name}
      </span>
      <span className="text-[9px] text-[#D4B896]/50 mt-0.5">
        v{garment.version} · {garment.availableSizes.join(", ")}
      </span>
    </button>
  );
}
