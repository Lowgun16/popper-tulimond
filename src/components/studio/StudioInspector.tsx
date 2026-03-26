// src/components/studio/StudioInspector.tsx
"use client";
import React from "react";
import type { StudioSlot, StudioDot, ShadowConfig, AccessType } from "./studioTypes";

interface Props {
  slots: StudioSlot[];
  selectedId: string | null;
  onSelectSlot: (id: string) => void;
  onUpdateSlot: (id: string, patch: Partial<StudioSlot>) => void;
  onUpdateDot: (slotId: string, dotId: string, patch: Partial<StudioDot>) => void;
  onAddDot: (slotId: string) => void;
  onRemoveDot: (slotId: string, dotId: string) => void;
  onSwapImage: (slotId: string, imageSrc: string) => void;
  onAddSlot: () => void;
  onRemoveSlot: (slotId: string) => void;
  onUpdateShadow: (slotId: string, patch: Partial<ShadowConfig>) => void;
  onCopyCode: () => void;
  copyConfirm: boolean;
}

export function StudioInspector({
  slots,
  selectedId,
  onSelectSlot,
  onUpdateSlot,
  onUpdateDot,
  onAddDot,
  onRemoveDot,
  onSwapImage,
  onAddSlot,
  onRemoveSlot,
  onUpdateShadow,
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
        pointerEvents: "auto",   // explicit override — sidebar must never inherit pointer-events:none
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
          {selected ? selected.displayName : `${slots.length} character${slots.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* ── Character Roster — always visible, click to select ── */}
      <div
        className="px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p
          className="text-[8px] tracking-[0.4em] uppercase mb-2"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          Cast
        </p>
        <div className="flex flex-wrap gap-1.5">
          {slots.map((slot) => {
            const active = slot.id === selectedId;
            return (
              <button
                key={slot.id}
                className="text-[8px] tracking-widest uppercase px-2.5 py-1.5 transition-all duration-150"
                style={{
                  border: `1px solid ${active ? "#D4B896" : "rgba(255,255,255,0.14)"}`,
                  color: active ? "#D4B896" : "rgba(255,255,255,0.5)",
                  background: active ? "rgba(212,184,150,0.07)" : "transparent",
                }}
                onClick={() => onSelectSlot(slot.id)}
              >
                {slot.displayName}
              </button>
            );
          })}
          <button
            className="text-[8px] tracking-widest uppercase px-2.5 py-1.5 transition-all duration-150"
            style={{
              border: "1px solid rgba(212,184,150,0.2)",
              color: "rgba(212,184,150,0.5)",
            }}
            onClick={onAddSlot}
          >
            + Patron
          </button>
        </div>
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
              {selected.leftPct < 15 && (
                <div className="flex items-center justify-between gap-2 mt-1">
                  <p className="text-[8px] leading-snug" style={{ color: "rgba(255,180,60,0.85)" }}>
                    ⚠ Behind sidebar
                  </p>
                  <button
                    className="text-[8px] tracking-widest uppercase px-2 py-1 flex-shrink-0"
                    style={{ border: "1px solid rgba(255,180,60,0.4)", color: "rgba(255,180,60,0.75)" }}
                    onClick={() => onUpdateSlot(selected.id, { leftPct: 22 })}
                  >
                    Nudge →
                  </button>
                </div>
              )}
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
              <TextInput
                label="Display Name"
                value={selected.displayName}
                onChange={(v) => onUpdateSlot(selected.id, { displayName: v })}
              />
              <label
                className="text-[9px] tracking-widest uppercase block mt-2 mb-1"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                Image Path
              </label>
              <ImagePathInput
                value={selected.imageSrc}
                onChange={(v) => onSwapImage(selected.id, v)}
              />
              <button
                className="w-full text-[9px] tracking-widest uppercase py-1.5 mt-1 transition-colors duration-200"
                style={{
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.4)",
                }}
                onClick={() => {
                  const base = selected.imageSrc.replace(/\?t=\d+$/, "");
                  onSwapImage(selected.id, `${base}?t=${Date.now()}`);
                }}
              >
                ↻  Reload Image
              </button>
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

            {/* Shadow */}
            <Section label="Shadow Plane">
              <Row label="Offset X">
                <NumInput
                  value={selected.shadow.offsetX}
                  step={1}
                  min={-300}
                  max={300}
                  onChange={(v) => onUpdateShadow(selected.id, { offsetX: v })}
                />
              </Row>
              <Row label="Offset Y">
                <NumInput
                  value={selected.shadow.offsetY}
                  step={1}
                  min={-300}
                  max={300}
                  onChange={(v) => onUpdateShadow(selected.id, { offsetY: v })}
                />
              </Row>
              <Row label="Scale W">
                <NumInput
                  value={selected.shadow.scaleX}
                  step={0.05}
                  min={0}
                  max={5}
                  onChange={(v) => onUpdateShadow(selected.id, { scaleX: v })}
                />
              </Row>
              <Row label="Scale H">
                <NumInput
                  value={selected.shadow.scaleY}
                  step={0.01}
                  min={0}
                  max={2}
                  onChange={(v) => onUpdateShadow(selected.id, { scaleY: v })}
                />
              </Row>
              <Row label="Opacity">
                <NumInput
                  value={selected.shadow.opacity}
                  step={0.05}
                  min={0}
                  max={1}
                  onChange={(v) => onUpdateShadow(selected.id, { opacity: v })}
                />
              </Row>
              <Row label="Blur">
                <NumInput
                  value={selected.shadow.blur}
                  step={1}
                  min={0}
                  max={60}
                  onChange={(v) => onUpdateShadow(selected.id, { blur: v })}
                />
              </Row>
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
        style={{ color: "rgba(255,255,255,0.65)" }}
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
        style={{ color: "rgba(255,255,255,0.7)", minWidth: 60 }}
      >
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

/** Free-form image path input.
 *  Reads the live DOM value on commit so there are zero stale-closure bugs.
 *  Commits on Enter, Tab, or blur — whichever comes first.
 */
function ImagePathInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = React.useState(value);
  // Sync draft if parent swaps the value from outside (e.g. patron creation)
  React.useEffect(() => setDraft(value), [value]);

  // Read from the DOM element directly — avoids any stale-state closure issue
  const commit = (domValue: string) => {
    const trimmed = domValue.trim();
    if (trimmed) onChange(trimmed);
  };

  return (
    <input
      className="w-full text-[11px] text-white/75 py-1 px-2 rounded-sm font-mono"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.09)",
        outline: "none",
      }}
      value={draft}
      placeholder="/models/jerome-pro.png"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => commit(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Tab") {
          commit(e.currentTarget.value);
        }
      }}
    />
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
        style={{ color: "rgba(255,255,255,0.65)", minWidth: 60 }}
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
          style={{ color: dot.type === "vault" ? "#D4B896" : "rgba(255,255,255,0.65)" }}
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

      {/* Position — full-width columns so the number is never clipped */}
      <div className="grid grid-cols-2 gap-2 mt-1">
        <div>
          <p className="text-[8px] mb-1" style={{ color: "rgba(255,255,255,0.65)" }}>Top %</p>
          <NumInput
            value={dot.topPct}
            min={0}
            max={100}
            onChange={(v) => onUpdate({ topPct: v })}
          />
        </div>
        <div>
          <p className="text-[8px] mb-1" style={{ color: "rgba(255,255,255,0.65)" }}>Left %</p>
          <NumInput
            value={dot.leftPct}
            min={0}
            max={100}
            onChange={(v) => onUpdate({ leftPct: v })}
          />
        </div>
      </div>

      {/* Lookbook gallery */}
      <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <p className="text-[8px] tracking-[0.35em] uppercase mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
          Lookbook ({dot.lookbook.length})
        </p>
        {dot.lookbook.map((src: string, idx: number) => (
          <div key={src} className="flex items-center gap-1.5 mb-1.5">
            <span
              className="flex-1 text-[9px] font-mono truncate"
              style={{ color: "rgba(255,255,255,0.45)" }}
              title={src}
            >
              {src.split("/").pop()}
            </span>
            <button
              className="text-[10px] leading-none flex-shrink-0"
              style={{ color: "rgba(200,70,70,0.6)" }}
              onClick={() => onUpdate({ lookbook: dot.lookbook.filter((_, i) => i !== idx) })}
            >
              ✕
            </button>
          </div>
        ))}
        <LookbookAdder
          onAdd={(src) =>
            onUpdate({ lookbook: [...dot.lookbook, src] })
          }
        />
      </div>
    </div>
  );
}

function LookbookAdder({ onAdd }: { onAdd: (src: string) => void }) {
  const [src, setSrc] = React.useState("");

  const submit = () => {
    if (!src.trim()) return;
    onAdd(src.trim());
    setSrc("");
  };

  return (
    <div className="flex flex-col gap-1 mt-1">
      <input
        className="w-full text-[10px] text-white/65 py-1 px-2 rounded-sm font-mono"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", outline: "none" }}
        value={src}
        placeholder="/media/look.png or .mp4"
        onChange={(e) => setSrc(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
      />
      <button
        className="w-full text-[8px] tracking-widest uppercase py-1.5 transition-colors duration-150"
        style={{ border: "1px solid rgba(212,184,150,0.2)", color: "rgba(212,184,150,0.55)" }}
        onClick={submit}
      >
        + Add Media
      </button>
    </div>
  );
}
