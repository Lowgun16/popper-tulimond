// src/components/builder/CharacterCard.tsx
"use client";
import { formatHeight } from "@/data/characters";
import type { BuilderCharacter } from "./builderTypes";

interface Props {
  character: BuilderCharacter;
  selected: boolean;
  onClick: () => void;
}

export function CharacterCard({ character, selected, onClick }: Props) {
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
          src={character.referenceImagePath}
          alt={character.displayName}
          className="w-full h-full object-cover object-top"
        />
      </div>
      <span className="text-[11px] font-medium text-[#D4B896] uppercase tracking-wider">
        {character.displayName}
      </span>
      <span className="text-[9px] text-[#D4B896]/50 mt-0.5">
        {formatHeight(character.heightIn)} · {character.weightLb}lb
      </span>
      <span className="text-[9px] text-[#D4B896]/50">
        {character.chestIn}" chest · {character.defaultSize}
      </span>
    </button>
  );
}
