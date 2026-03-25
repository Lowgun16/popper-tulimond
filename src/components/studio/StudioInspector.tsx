// src/components/studio/StudioInspector.tsx
"use client";
import React from "react";
import { AVAILABLE_IMAGES } from "./studioTypes";
import type { StudioSlot, StudioDot, AccessType } from "./studioTypes";

interface Props {
  slots: StudioSlot[];
  selectedId: string | null;
  onUpdateSlot: (id: string, patch: Partial<StudioSlot>) => void;
  onUpdateDot: (slotId: string, dotId: string, patch: Partial<StudioDot>) => void;
  onAddDot: (slotId: string) => void;
  onRemoveDot: (slotId: string, dotId: string) => void;
  onSwapImage: (slotId: string, imageSrc: string) => void;
  onRemoveSlot: (slotId: string) => void;
  onCopyCode: () => void;
  copyConfirm: boolean;
}

export function StudioInspector({
  slots,
  selectedId,
  onUpdateSlot,
  onUpdateDot,
  onAddDot,
  onRemoveDot,
  onSwapImage,
  onRemoveSlot,
  onCopyCode,
  copyConfirm,
}: Props) {
  const selected = selectedId ? (slots.find((s) => s.id === selectedId) ?? null) : null;

  return (
    <div
      className="fixed left-0 top-0 bottom-0 z-[200] flex flex-col"
      style={{
        width: 300,
        background: "rgba(8,8,8,0.97)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(16px)",
      }}
    >
      {/* ── Header ── */}
      <div
        className="px-5 pt-5 pb-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p
          className="text-[8px] tracking-[0.4em] uppercase mb-1"
          style={{ color: "#D4B896" }}
        >
          Popper Studio
        </p>
        <p className="text-white/40 text-[11px] tracking-wide">
          {selected ? selected.id : "Click a character to select"}
        </p>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <div className="px-5 py-4 flex flex-col gap-6">

            {/* Transform */}
            <Section label="Transform">
              <Row label="Left %">
                <NumInput
                  value={selected.leftPct}
                  onChange={(v) => onUpdateSlot(selected.id, { leftPct: v })}
                />
              </Row>
              <Row label="Bottom %">
                <NumInput
                  value={selected.bottomPct}
                  onChange={(v) => onUpdateSlot(selected.id, { bottomPct: v })}
                />
              </Row>
              <Row label="Scale">
                <NumInput
                  value={selected.scale}
                  step={0.05}
                  min={0.2}
                  max={2.5}
                  onChange={(v) => onUpdateSlot(selected.id, { scale: v })}
                />
              </Row>
              <Row label="Z-Index">
                <NumInput
                  value={selected.zIndex}
                  step={1}
                  min={1}
                  max={100}
                  onChange={(v) => onUpdateSlot(selected.id, { zIndex: v })}
                />
              </Row>
            </Section>

            {/* Character */}
            <Section label="Character">
              <label
                className="text-[9px] tracking-widest uppercase block mb-1"
                style={{ color: "rgba(255,255,255,0.25)" }}
              >
                Swap Image
              </label>
              <select
                className="w-full text-[11px] text-white/70 py-1.5 px-2 rounded-sm"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  outline: "none",
                }}
                value={selected.imageSrc}
                onChange={(e) => onSwapImage(selected.id, e.target.value)}
              >
                {AVAILABLE_IMAGES.map((src) => (
                  <option key={src} value={src} style={{ background: "#111" }}>
                    {src.replace("/", "").replace(".png", "")}
                  </option>
                ))}
              </select>
              <button
                className="mt-2 w-full text-[9px] tracking-widest uppercase py-2 transition-colors duration-200"
                style={{
                  border: "1px solid rgba(220,60,60,0.3)",
                  color: "rgba(220,90,90,0.75)",
                }}
                onClick={() => onRemoveSlot(selected.id)}
              >
                Remove Character
              </button>
            </Section>

            {/* Hotspots */}
            <Section label={`Hotspots (${selected.dots.length})`}>
              <div className="flex flex-col gap-3">
                {selected.dots.map((dot) => (
                  <DotEditor
                    key={dot.id}
                    dot={dot}
                    onUpdate={(patch) => onUpdateDot(selected.id, dot.id, patch)}
                    onRemove={() => onRemoveDot(selected.id, dot.id)}
                  />
                ))}
              </div>
              <button
                className="w-full text-[9px] tracking-widest uppercase py-2 mt-2 transition-colors duration-200"
                style={{
                  border: "1px solid rgba(212,184,150,0.25)",
                  color: "rgba(212,184,150,0.6)",
                }}
                onClick={() => onAddDot(selected.id)}
              >
                + Add Hotspot
              </button>
            </Section>

          </div>
        ) : (
          <div className="flex items-center justify-center h-full px-8">
            <p
              className="text-center text-[11px] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.18)" }}
            >
              Select a character on the canvas to inspect and edit their position, scale, and hotspots.
            </p>
          </div>
        )}
      </div>

      {/* ── Footer — Copy Code ── */}
      <div
        className="px-5 py-4 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          className="w-full text-[9px] tracking-widest uppercase py-3 transition-all duration-300"
          style={{
            border: `1px solid ${copyConfirm ? "#D4B896" : "rgba(255,255,255,0.18)"}`,
            color: copyConfirm ? "#D4B896" : "rgba(255,255,255,0.55)",
            background: copyConfirm ? "rgba(212,184,150,0.06)" : "transparent",
          }}
          onClick={onCopyCode}
        >
          {copyConfirm ? "✓  Copied to Clipboard" : "Copy Layout Code"}
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        className="text-[8px] tracking-[0.4em] uppercase mb-3"
        style={{ color: "rgba(255,255,255,0.22)" }}
      >
        {label}
      </p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className="text-[10px] flex-shrink-0"
        style={{ color: "rgba(255,255,255,0.35)", minWidth: 60 }}
      >
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function NumInput({
  value,
  step = 0.5,
  min = -150,
  max = 250,
  onChange,
}: {
  value: number;
  step?: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      className="w-full text-[11px] text-white/75 text-right py-1 px-2 rounded-sm"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.09)",
        outline: "none",
      }}
      value={step < 1 ? value.toFixed(2) : Math.round(value)}
      step={step}
      min={min}
      max={max}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
      }}
    />
  );
}

function TextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[9px] flex-shrink-0"
        style={{ color: "rgba(255,255,255,0.28)", minWidth: 60 }}
      >
        {label}
      </span>
      <input
        className="flex-1 text-[11px] text-white/75 py-0.5 px-2 rounded-sm"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.09)",
          outline: "none",
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function DotEditor({
  dot,
  onUpdate,
  onRemove,
}: {
  dot: StudioDot;
  onUpdate: (p: Partial<StudioDot>) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="rounded-sm p-3 flex flex-col gap-2"
      style={{
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      {/* Dot header */}
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-[8px] tracking-widest uppercase"
          style={{ color: dot.type === "vault" ? "#D4B896" : "rgba(255,255,255,0.35)" }}
        >
          {dot.type}
        </span>
        <button
          className="text-[10px] leading-none"
          style={{ color: "rgba(200,70,70,0.6)" }}
          onClick={onRemove}
        >
          ✕
        </button>
      </div>

      <TextInput label="Name"       value={dot.name}       onChange={(v) => onUpdate({ name: v })} />
      <TextInput label="Collection" value={dot.collection} onChange={(v) => onUpdate({ collection: v })} />
      <TextInput label="Colorway"   value={dot.colorway}   onChange={(v) => onUpdate({ colorway: v })} />
      <TextInput label="Price"      value={dot.price}      onChange={(v) => onUpdate({ price: v })} />

      {/* Type toggle */}
      <div className="flex gap-1.5 mt-1">
        {(["public", "vault"] as AccessType[]).map((t) => (
          <button
            key={t}
            className="flex-1 text-[8px] tracking-widest uppercase py-1.5 transition-colors duration-150"
            style={{
              border: `1px solid ${
                dot.type === t
                  ? t === "vault" ? "#D4B896" : "rgba(255,255,255,0.4)"
                  : "rgba(255,255,255,0.07)"
              }`,
              color:
                dot.type === t
                  ? t === "vault" ? "#D4B896" : "rgba(255,255,255,0.65)"
                  : "rgba(255,255,255,0.2)",
            }}
            onClick={() => onUpdate({ type: t })}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Position */}
      <div className="flex gap-2 mt-1">
        <div className="flex-1">
          <Row label="Top %">
            <NumInput value={dot.topPct}  onChange={(v) => onUpdate({ topPct: v })} />
          </Row>
        </div>
        <div className="flex-1">
          <Row label="Left %">
            <NumInput value={dot.leftPct} onChange={(v) => onUpdate({ leftPct: v })} />
          </Row>
        </div>
      </div>
    </div>
  );
}
