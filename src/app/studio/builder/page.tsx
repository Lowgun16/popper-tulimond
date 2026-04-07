// src/app/studio/builder/page.tsx
"use client";
import { useState } from "react";
import { BuilderAuthGate } from "@/components/builder/BuilderAuthGate";
import { GarmentEditor } from "@/components/builder/GarmentEditor";
import { CharacterDresser } from "@/components/builder/CharacterDresser";
import { GARMENT_LIBRARY } from "@/data/garments";
import type { GarmentTruth } from "@/components/builder/builderTypes";

type Tab = "editor" | "dresser";

export default function BuilderPage() {
  const [tab, setTab] = useState<Tab>("editor");
  const [garments, setGarments] = useState<GarmentTruth[]>(GARMENT_LIBRARY);

  async function handleApproveAsTruth(imageBase64: string) {
    const name = prompt("Garment name (e.g. Constable Henley):");
    const sku = prompt("SKU (e.g. PT-HENLEY-CG):");
    if (!name || !sku) return;
    const version = (garments.filter((g) => g.sku === sku).length) + 1;
    const res = await fetch("/api/builder/save-garment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64,
        name,
        sku,
        fabricComposition: "28% Merino Wool, 72% Pima Cotton",
        availableSizes: ["S", "M", "L", "XL", "XXL"],
        version,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      const newGarment: GarmentTruth = {
        id: `${sku.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-v${version}`,
        name,
        sku,
        fabricComposition: "28% Merino Wool, 72% Pima Cotton",
        availableSizes: ["S", "M", "L", "XL", "XXL"],
        approvedImagePath: data.imagePath,
        version,
        approvedAt: Date.now(),
      };
      setGarments((prev) => [...prev, newGarment]);
      alert(`Garment Truth saved: ${data.imagePath}`);
    }
  }

  return (
    <BuilderAuthGate>
      <div className="min-h-screen bg-obsidian text-parchment">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-black/80 backdrop-blur border-b border-[#D4B896]/10 px-4 py-3 flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-[0.3em] text-[#D4B896]/60">
            PT Outfit Builder
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setTab("editor")}
              className={`px-4 py-2 text-[9px] uppercase tracking-widest ${
                tab === "editor"
                  ? "bg-[#D4B896] text-black"
                  : "border border-[#D4B896]/20 text-[#D4B896]/60"
              }`}
            >
              Garment Editor
            </button>
            <button
              type="button"
              onClick={() => setTab("dresser")}
              className={`px-4 py-2 text-[9px] uppercase tracking-widest ${
                tab === "dresser"
                  ? "bg-[#D4B896] text-black"
                  : "border border-[#D4B896]/20 text-[#D4B896]/60"
              }`}
            >
              Character Dresser
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6">
          {tab === "editor" ? (
            <GarmentEditor
              mode="truth"
              onApproveAsTruth={handleApproveAsTruth}
            />
          ) : (
            <CharacterDresser garments={garments} />
          )}
        </div>
      </div>
    </BuilderAuthGate>
  );
}
