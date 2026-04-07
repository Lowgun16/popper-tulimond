// src/components/builder/CharacterDresser.tsx
"use client";
import { useState } from "react";
import { BUILDER_CHARACTERS } from "@/data/characters";
import { CharacterCard } from "./CharacterCard";
import { GarmentTile } from "./GarmentTile";
import { RenderResult } from "./RenderResult";
import { GarmentEditor } from "./GarmentEditor";
import type { BuilderCharacter, GarmentTruth, CorrectionContext, CorrectionLogEntry } from "./builderTypes";

interface Props {
  garments: GarmentTruth[];
}

type DresserView = "picker" | "generating" | "result" | "correcting";

export function CharacterDresser({ garments }: Props) {
  const [selectedCharacter, setSelectedCharacter] = useState<BuilderCharacter | null>(null);
  const [selectedGarment, setSelectedGarment] = useState<GarmentTruth | null>(null);
  const [view, setView] = useState<DresserView>("picker");
  const [resultBase64, setResultBase64] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const correctionContext: CorrectionContext | undefined =
    selectedCharacter && selectedGarment && resultBase64
      ? {
          characterId: selectedCharacter.id,
          garmentId: selectedGarment.id,
          renderImageDataUrl: `data:image/png;base64,${resultBase64}`,
        }
      : undefined;

  async function loadImageAsBase64(path: string): Promise<string> {
    const res = await fetch(path);
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async function handleGenerate() {
    if (!selectedCharacter || !selectedGarment) return;
    setView("generating");
    setError(null);
    try {
      const [personBase64, garmentBase64] = await Promise.all([
        loadImageAsBase64(selectedCharacter.referenceImagePath),
        loadImageAsBase64(selectedGarment.approvedImagePath),
      ]);
      const res = await fetch("/api/builder/vton-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personBase64, garmentBase64 }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setResultBase64(data.imageBase64);
      setView("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setView("picker");
    }
  }

  async function handleApproveAndSave() {
    if (!selectedCharacter || !selectedGarment || !resultBase64) return;
    setSaving(true);
    try {
      await fetch("/api/builder/save-render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: resultBase64,
          characterId: selectedCharacter.id,
          garmentId: selectedGarment.id,
          corrections: [],
        }),
      });
      setView("picker");
      setResultBase64("");
    } finally {
      setSaving(false);
    }
  }

  async function handleApproveCorrectedRender(imageBase64: string, corrections: CorrectionLogEntry[]) {
    if (!selectedCharacter || !selectedGarment) return;
    setSaving(true);
    try {
      await fetch("/api/builder/save-render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          characterId: selectedCharacter.id,
          garmentId: selectedGarment.id,
          corrections,
        }),
      });
      setView("picker");
      setResultBase64("");
    } finally {
      setSaving(false);
    }
  }

  if (view === "correcting" && correctionContext) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 mb-2">
          <button
            type="button"
            onClick={() => setView("result")}
            className="text-[10px] uppercase tracking-widest text-[#D4B896]/50 hover:text-[#D4B896]/80"
          >
            ← Back to Render
          </button>
          <span className="text-[10px] uppercase tracking-widest text-[#D4B896]/40">
            Correcting for {selectedCharacter?.displayName}
          </span>
        </div>
        <GarmentEditor
          mode="correction"
          correctionContext={correctionContext}
          garmentTruths={garments}
          onApproveAsCharacterRender={handleApproveCorrectedRender}
        />
      </div>
    );
  }

  if (view === "result" && resultBase64 && correctionContext) {
    return (
      <RenderResult
        imageBase64={resultBase64}
        correctionContext={correctionContext}
        onEditThisRender={() => setView("correcting")}
        onApproveAndSave={handleApproveAndSave}
        onRegenerate={handleGenerate}
        onDiscard={() => { setView("picker"); setResultBase64(""); }}
        saving={saving}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Character selection */}
      <div>
        <p className="text-[9px] uppercase tracking-[0.2em] text-[#D4B896]/40 mb-3">Select Character</p>
        <div className="grid grid-cols-2 gap-3">
          {BUILDER_CHARACTERS.map((c) => (
            <CharacterCard
              key={c.id}
              character={c}
              selected={selectedCharacter?.id === c.id}
              onClick={() => setSelectedCharacter(c)}
            />
          ))}
        </div>
      </div>

      {/* Garment selection */}
      <div>
        <p className="text-[9px] uppercase tracking-[0.2em] text-[#D4B896]/40 mb-3">Select Garment</p>
        {garments.length === 0 ? (
          <p className="text-[11px] text-[#D4B896]/30 italic">
            No approved garments yet. Use the Garment Editor to approve your first one.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {garments.map((g) => (
              <GarmentTile
                key={g.id}
                garment={g}
                selected={selectedGarment?.id === g.id}
                onClick={() => setSelectedGarment(g)}
              />
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-[10px]">{error}</p>}

      {view === "generating" && (
        <p className="text-[11px] text-[#D4B896]/60 text-center py-4">
          Transferring garment via IDM-VTON… (45–90 seconds)
        </p>
      )}

      {view === "picker" && (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!selectedCharacter || !selectedGarment}
          className="w-full py-4 bg-[#D4B896] text-black text-[11px] uppercase tracking-widest font-medium hover:bg-[#c9a88a] disabled:opacity-30"
        >
          Generate Render ⚡
        </button>
      )}
    </div>
  );
}
