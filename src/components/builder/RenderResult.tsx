// src/components/builder/RenderResult.tsx
"use client";
import type { CorrectionContext } from "./builderTypes";

interface Props {
  imageBase64: string;
  correctionContext: CorrectionContext;
  onEditThisRender: () => void;
  onApproveAndSave: () => void;
  onRegenerate: () => void;
  onDiscard: () => void;
  saving: boolean;
}

export function RenderResult({
  imageBase64,
  correctionContext: _ctx,
  onEditThisRender,
  onApproveAndSave,
  onRegenerate,
  onDiscard,
  saving,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative bg-black/20 border border-[#D4B896]/10 rounded-lg overflow-hidden">
        <img
          src={`data:image/png;base64,${imageBase64}`}
          alt="VTON render"
          className="w-full object-contain max-h-[55vh]"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onEditThisRender}
          className="py-3 border border-[#D4B896]/30 text-[#D4B896]/80 text-[10px] uppercase tracking-widest hover:bg-[#D4B896]/5"
        >
          Edit This Render
        </button>
        <button
          type="button"
          onClick={onApproveAndSave}
          disabled={saving}
          className="py-3 bg-[#D4B896] text-black text-[10px] uppercase tracking-widest font-medium hover:bg-[#c9a88a] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Approve & Save"}
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          className="py-3 border border-[#D4B896]/20 text-[#D4B896]/50 text-[10px] uppercase tracking-widest hover:bg-[#D4B896]/5"
        >
          Regenerate
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="py-3 border border-white/10 text-white/30 text-[10px] uppercase tracking-widest hover:bg-white/5"
        >
          Discard
        </button>
      </div>
    </div>
  );
}
