// src/components/builder/GarmentEditor.tsx
"use client";
import { useRef, useState, useCallback } from "react";
import { SliderPanel } from "./SliderPanel";
import { StructuralEditPanel } from "./StructuralEditPanel";
import { useSliderFilters, fabricRoughnessOpacity, heatherOpacity } from "./useSliderFilters";
import { makeCorrectionEntry } from "./builderUtils";
import type {
  EditorMode,
  CorrectionContext,
  GarmentTruth,
  StructuralEditType,
  StructuralEditDirection,
  CorrectionLogEntry,
} from "./builderTypes";

interface Props {
  mode: EditorMode;
  /** In "truth" mode: the initial upload or current source image data URL */
  initialImageDataUrl?: string;
  /** In "correction" mode: full context about the character + garment being corrected */
  correctionContext?: CorrectionContext;
  /** Available Garment Truths for style reference in structural edits */
  garmentTruths?: GarmentTruth[];
  onApproveAsTruth?: (imageBase64: string) => void;
  onApproveAsCharacterRender?: (imageBase64: string, corrections: CorrectionLogEntry[]) => void;
}

function getBase64FromDataUrl(dataUrl: string): string {
  return dataUrl.replace(/^data:image\/\w+;base64,/, "");
}

export function GarmentEditor({
  mode,
  initialImageDataUrl,
  correctionContext,
  garmentTruths = [],
  onApproveAsTruth,
  onApproveAsCharacterRender,
}: Props) {
  const [imageDataUrl, setImageDataUrl] = useState<string>(
    mode === "correction" && correctionContext
      ? correctionContext.renderImageDataUrl
      : (initialImageDataUrl ?? "")
  );
  const [corrections, setCorrections] = useState<CorrectionLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { sliders, updateSlider, reset, cssFilter } = useSliderFilters();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageDataUrl(ev.target?.result as string);
      setCorrections([]);
      reset();
    };
    reader.readAsDataURL(file);
  };

  const handleStructuralEditComplete = useCallback(
    (resultBase64: string, editType: StructuralEditType, direction: StructuralEditDirection) => {
      const newDataUrl = `data:image/png;base64,${resultBase64}`;
      setImageDataUrl(newDataUrl);
      if (mode === "correction" && correctionContext) {
        const entry = makeCorrectionEntry(
          correctionContext.characterId,
          correctionContext.garmentId,
          editType,
          direction,
          1
        );
        setCorrections((prev) => [...prev, entry]);
      }
    },
    [mode, correctionContext]
  );

  const handleSliderChange = useCallback(
    (key: Parameters<typeof updateSlider>[0], value: number) => {
      updateSlider(key, value);
      if (mode === "correction" && correctionContext) {
        const entry = makeCorrectionEntry(
          correctionContext.characterId,
          correctionContext.garmentId,
          key,
          "set",
          value
        );
        setCorrections((prev) => [...prev, entry]);
      }
    },
    [updateSlider, mode, correctionContext]
  );

  const exportCurrentImageBase64 = useCallback((): string => {
    return getBase64FromDataUrl(imageDataUrl);
  }, [imageDataUrl]);

  const handleApprove = async () => {
    setSaving(true);
    const base64 = exportCurrentImageBase64();
    try {
      if (mode === "truth") {
        onApproveAsTruth?.(base64);
      } else {
        onApproveAsCharacterRender?.(base64, corrections);
      }
    } finally {
      setSaving(false);
    }
  };

  const approveLabel =
    mode === "truth"
      ? "Approve & Lock Garment Truth"
      : `Approve for ${correctionContext?.characterId ?? "Character"}`;

  const currentBase64 = imageDataUrl ? getBase64FromDataUrl(imageDataUrl) : "";

  return (
    <div className="flex flex-col gap-4 w-full max-w-md mx-auto pb-8">
      {/* Image preview with live CSS filter */}
      <div className="relative bg-black/20 border border-[#D4B896]/10 rounded-lg overflow-hidden">
        {imageDataUrl ? (
          <>
            <img
              src={imageDataUrl}
              alt="Garment preview"
              className="w-full object-contain max-h-[50vh]"
              style={{ filter: cssFilter || undefined }}
            />
            {/* Fabric roughness overlay */}
            {sliders.fabricRoughness > 0 && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  opacity: fabricRoughnessOpacity(sliders.fabricRoughness),
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Ccircle cx='1' cy='1' r='0.5' fill='%23fff' opacity='0.4'/%3E%3Ccircle cx='3' cy='3' r='0.5' fill='%23000' opacity='0.3'/%3E%3C/svg%3E\")",
                  backgroundSize: "4px 4px",
                  mixBlendMode: "overlay",
                }}
              />
            )}
            {/* Heather overlay */}
            {sliders.heatherIntensity > 0 && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  opacity: heatherOpacity(sliders.heatherIntensity),
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='3' height='3'%3E%3Cline x1='0' y1='1.5' x2='3' y2='1.5' stroke='%23aaa' stroke-width='0.3' opacity='0.6'/%3E%3C/svg%3E\")",
                  backgroundSize: "3px 3px",
                  mixBlendMode: "overlay",
                }}
              />
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-16 text-[11px] uppercase tracking-widest text-[#D4B896]/40 hover:text-[#D4B896]/70"
          >
            + Upload Garment Image
          </button>
        )}
      </div>

      {imageDataUrl && mode === "truth" && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-[9px] uppercase tracking-widest text-[#D4B896]/40 hover:text-[#D4B896]/60 text-center"
        >
          Replace image
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={handleFileUpload}
      />

      {imageDataUrl && (
        <>
          <SliderPanel sliders={sliders} onChange={handleSliderChange} onReset={reset} />
          <StructuralEditPanel
            currentImageBase64={currentBase64}
            onEditComplete={handleStructuralEditComplete}
            onError={setError}
          />
          {error && (
            <p className="text-red-400 text-[10px] px-2">{error}</p>
          )}
          <button
            type="button"
            onClick={handleApprove}
            disabled={saving}
            className="w-full py-4 bg-[#D4B896] text-black text-[11px] uppercase tracking-widest font-medium hover:bg-[#c9a88a] disabled:opacity-50"
          >
            {saving ? "Saving…" : approveLabel}
          </button>
        </>
      )}
    </div>
  );
}
