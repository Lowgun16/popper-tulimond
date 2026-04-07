// src/components/builder/StructuralEditPanel.tsx
"use client";
import { useState } from "react";
import type { StructuralEditType, StructuralEditDirection } from "./builderTypes";

const EDITS: { type: StructuralEditType; label: string; increaseLabel: string; decreaseLabel: string }[] = [
  { type: "placket-width", label: "Placket Opening", increaseLabel: "Wider ↔", decreaseLabel: "Narrower ↔" },
  { type: "neckline-depth", label: "Neckline Depth", increaseLabel: "Deeper ↕", decreaseLabel: "Higher ↕" },
  { type: "sleeve-length", label: "Sleeve Length", increaseLabel: "Longer ↕", decreaseLabel: "Shorter ↕" },
  { type: "sleeve-compression", label: "Sleeve Fit", increaseLabel: "Tighter", decreaseLabel: "Looser" },
];

interface Props {
  /** Current canvas state as base64 PNG — sent as the image to edit */
  currentImageBase64: string;
  /** Optional style reference (approved Garment Truth) for Gemini to anchor against */
  styleReferenceBase64?: string;
  onEditComplete: (resultBase64: string, editType: StructuralEditType, direction: StructuralEditDirection) => void;
  onError: (msg: string) => void;
}

export function StructuralEditPanel({ currentImageBase64, styleReferenceBase64, onEditComplete, onError }: Props) {
  const [loading, setLoading] = useState<string | null>(null); // "<type>-<direction>" while running

  async function runEdit(editType: StructuralEditType, direction: StructuralEditDirection) {
    const key = `${editType}-${direction}`;
    setLoading(key);
    try {
      const res = await fetch("/api/builder/structural-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: currentImageBase64,
          editType,
          direction,
          styleReferenceBase64,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      onEditComplete(data.imageBase64, editType, direction);
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-2 p-4 bg-black/30 border border-[#D4B896]/10 rounded-lg">
      <span className="text-[9px] uppercase tracking-[0.2em] text-[#D4B896]/40 mb-1">
        AI Structural Edits
      </span>
      {EDITS.map((edit) => (
        <div key={edit.type} className="flex items-center gap-2">
          <span className="w-28 text-[10px] uppercase tracking-widest text-[#D4B896]/60 shrink-0">
            {edit.label}
          </span>
          <button
            type="button"
            onClick={() => runEdit(edit.type, "decrease")}
            disabled={loading !== null}
            className="flex-1 py-2 text-[10px] border border-[#D4B896]/20 text-[#D4B896]/70 hover:bg-[#D4B896]/5 disabled:opacity-30"
          >
            {loading === `${edit.type}-decrease` ? "..." : edit.decreaseLabel}
          </button>
          <button
            type="button"
            onClick={() => runEdit(edit.type, "increase")}
            disabled={loading !== null}
            className="flex-1 py-2 text-[10px] border border-[#D4B896]/20 text-[#D4B896]/70 hover:bg-[#D4B896]/5 disabled:opacity-30"
          >
            {loading === `${edit.type}-increase` ? "..." : edit.increaseLabel}
          </button>
        </div>
      ))}
      {loading && (
        <p className="text-[10px] text-[#D4B896]/40 mt-1">
          Editing via Gemini (~15s)…
        </p>
      )}
    </div>
  );
}
