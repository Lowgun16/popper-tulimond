"use client";
import React from "react";
import { motion } from "framer-motion";
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
  onSave: () => Promise<void>;
}

function useMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
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
  onSave,
}: Props) {
  const selected = selectedId ? (slots.find((s) => s.id === selectedId) ?? null) : null;

  type SaveState = "idle" | "saving" | "saved" | "error";
  type PublishState = "idle" | "publishing";

  const [saveState, setSaveState] = React.useState<SaveState>("idle");
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [publishState, setPublishState] = React.useState<PublishState>("idle");

  const isMobile = useMobile();
  const sidePad = isMobile ? 12 : 20;
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const handleSaveClick = async () => {
    if (saveState === "saving") return;
    setSaveState("saving");
    setSaveError(null);
    try {
      await onSave();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setSaveError(msg);
      setSaveState("error");
      setTimeout(() => { setSaveState("idle"); setSaveError(null); }, 3000);
    }
  };

  const handlePublishClick = async () => {
    if (publishState === "publishing" || saveState === "saving") return;
    setPublishState("publishing");
    try {
      await onSave();
      await new Promise<void>((resolve) => setTimeout(resolve, 3000));
    } catch {
      // Errors handled by save state
    }
    setPublishState("idle");
  };

  return (
    <>
    <motion.div
      className="fixed left-0 top-0 bottom-0 z-[6000] flex flex-col shadow-2xl"
      animate={{ x: sidebarOpen ? 0 : "-100%" }}
      transition={{ type: "tween", duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      onPointerDown={(e) => e.stopPropagation()} 
      style={{
        width: "min(85vw, 320px)",
        background: isMobile ? "rgba(0,0,0,0.85)" : "rgba(8,8,8,0.98)",
        borderRight: "1px solid rgba(212,184,150,0.15)",
        backdropFilter: "blur(24px)",
        pointerEvents: "auto",
      }}
    >
      {/* ── Header ── */}
      <div
        className="pt-6 pb-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingLeft: sidePad, paddingRight: sidePad }}
      >
        <p
          className="text-[9px] font-bold tracking-[0.5em] uppercase mb-1"
          style={{ color: "#D4B896" }}
        >
          Popper Studio
        </p>
        <p className="text-white/40 text-[10px] tracking-wide uppercase">
          {selected ? `Editing: ${selected.displayName}` : `${slots.length} Patrons On Stage`}
        </p>
      </div>

      {/* ── Cast Roster ── */}
      <div
        className="py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingLeft: sidePad, paddingRight: sidePad }}
      >
        <p className="text-[8px] tracking-[0.4em] uppercase mb-3 text-white/30">Cast Selection</p>
        <div className="flex flex-wrap gap-2">
          {slots.map((slot) => {
            const active = slot.id === selectedId;
            return (
              <button
                key={slot.id}
                className="text-[9px] tracking-widest uppercase px-3 py-2 transition-all duration-200 border"
                style={{
                  borderColor: active ? "#D4B896" : "rgba(255,255,255,0.1)",
                  color: active ? "#000" : "rgba(255,255,255,0.5)",
                  background: active ? "#D4B896" : "rgba(255,255,255,0.03)",
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectSlot(slot.id);
                }}
              >
                {slot.displayName}
              </button>
            );
          })}
          <button
            className="text-[9px] tracking-widest uppercase px-3 py-2 transition-all duration-200 border border-dashed border-[#D4B896]/30 text-[#D4B896]/60 hover:text-[#D4B896]"
            onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddSlot();
            }}
          >
            + Patron
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {selected ? (
          <div className="py-6 flex flex-col gap-8" style={{ paddingLeft: sidePad, paddingRight: sidePad }}>

            {/* Transform */}
            <Section label="Spatial Config">
              <Row label="Horizontal %">
                <NumInput value={selected.leftPct} onChange={(v: number) => onUpdateSlot(selected.id, { leftPct: v })} isMobile={isMobile} />
              </Row>
              <Row label="Depth %">
                <NumInput value={selected.bottomPct} onChange={(v: number) => onUpdateSlot(selected.id, { bottomPct: v })} isMobile={isMobile} />
              </Row>
              <Row label="Scale Factor">
                <NumInput value={selected.scale} step={0.05} min={0.2} max={2.5} onChange={(v: number) => onUpdateSlot(selected.id, { scale: v })} isMobile={isMobile} />
              </Row>
              <Row label="Layer Order">
                <NumInput value={selected.zIndex} step={1} min={1} max={100} onChange={(v: number) => onUpdateSlot(selected.id, { zIndex: v })} isMobile={isMobile} />
              </Row>
            </Section>

            {/* Hotspots */}
            <Section label={`Garment Hotspots (${selected.dots.length})`}>
              <div className="flex flex-col gap-4">
                {selected.dots.map((dot) => (
                  <DotEditor
                    key={dot.id}
                    dot={dot}
                    isMobile={isMobile}
                    onUpdate={(patch: Partial<StudioDot>) => onUpdateDot(selected.id, dot.id, patch)}
                    onRemove={() => onRemoveDot(selected.id, dot.id)}
                  />
                ))}
              </div>
              <button
                className="w-full text-[9px] tracking-widest uppercase py-3 mt-2 border border-[#D4B896]/20 text-[#D4B896]/60 hover:bg-[#D4B896]/5"
                onPointerDown={(e: any) => { e.stopPropagation(); onAddDot(selected.id); }}
              >
                + Create Hotspot
              </button>
            </Section>

            {/* Character Info */}
            <Section label="Asset Config">
              <TextInput label="Label" value={selected.displayName} onChange={(v: string) => onUpdateSlot(selected.id, { displayName: v })} />
              <label className="text-[8px] tracking-widest uppercase block mt-4 mb-2 text-white/40">Path to Image</label>
              <ImagePathInput value={selected.imageSrc} onChange={(v: string) => onSwapImage(selected.id, v)} />
              <button
                className="mt-4 w-full text-[9px] tracking-[0.2em] uppercase py-2 border border-red-900/30 text-red-500/60 hover:bg-red-900/20"
                onPointerDown={(e: any) => { e.stopPropagation(); if(confirm('Delete Character?')) onRemoveSlot(selected.id); }}
              >
                Delete Character
              </button>
            </Section>

            {/* Shadow Controls */}
            <Section label="Shadow Calibration">
              <Row label="Offset X"><NumInput value={selected.shadow.offsetX} min={-300} max={300} onChange={(v: number) => onUpdateShadow(selected.id, { offsetX: v })} isMobile={isMobile} /></Row>
              <Row label="Offset Y"><NumInput value={selected.shadow.offsetY} min={-300} max={300} onChange={(v: number) => onUpdateShadow(selected.id, { offsetY: v })} isMobile={isMobile} /></Row>
              <Row label="Opacity"><NumInput value={selected.shadow.opacity} step={0.05} min={0} max={1} onChange={(v: number) => onUpdateShadow(selected.id, { opacity: v })} isMobile={isMobile} /></Row>
              <Row label="Softness"><NumInput value={selected.shadow.blur} min={0} max={100} onChange={(v: number) => onUpdateShadow(selected.id, { blur: v })} isMobile={isMobile} /></Row>
            </Section>

          </div>
        ) : (
          <div className="flex items-center justify-center h-full px-10">
            <p className="text-center text-[10px] uppercase tracking-[0.2em] leading-relaxed text-white/20">
              Select a Patron to begin calibration
            </p>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="p-5 flex flex-col gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          className="w-full text-[9px] tracking-widest uppercase py-3 border transition-all duration-300"
          style={{
            borderColor: copyConfirm ? "#D4B896" : "rgba(255,255,255,0.1)",
            color: copyConfirm ? "#D4B896" : "rgba(255,255,255,0.4)",
            background: copyConfirm ? "rgba(212,184,150,0.05)" : "transparent",
          }}
          onPointerDown={(e) => { e.stopPropagation(); onCopyCode(); }}
        >
          {copyConfirm ? "✓ Config Copied" : "Copy Production Config"}
        </button>

        <button
          onPointerDown={(e) => { e.stopPropagation(); handleSaveClick(); }}
          disabled={saveState === "saving"}
          className="w-full py-3 text-[9px] tracking-[0.3em] uppercase transition-all duration-300 flex items-center justify-center gap-2 bg-white text-black font-bold"
        >
          {saveState === "saving" ? "Writing..." : saveState === "saved" ? "✓ Saved Local" : "Save Place"}
        </button>
      </div>
    </motion.div>

    <button
      onPointerDown={() => setSidebarOpen(!sidebarOpen)}
      className="fixed top-1/2 -translate-y-1/2 z-[6001] flex items-center justify-center"
      style={{
        left: sidebarOpen ? "min(85vw, 320px)" : 0,
        transition: "left 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
        width: 32, height: 64,
        background: "rgba(212,184,150,0.9)",
        borderRadius: "0 4px 4px 0",
        color: "black",
        fontWeight: "bold"
      }}
    >
      {sidebarOpen ? "‹" : "›"}
    </button>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[8px] tracking-[0.4em] uppercase text-[#D4B896]/60 font-bold border-b border-white/5 pb-2">
        {label}
      </p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[9px] uppercase tracking-wider text-white/40 min-w-[80px]">
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function ImagePathInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);
  const commit = (domValue: string) => {
    const trimmed = domValue.trim();
    if (trimmed) onChange(trimmed);
  };
  return (
    <input
      className="w-full text-[10px] text-white/70 py-2 px-3 bg-white/5 border border-white/10 outline-none focus:border-[#D4B896]/40"
      value={draft}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
      onBlur={(e: React.FocusEvent<HTMLInputElement>) => commit(e.target.value)}
    />
  );
}

function NumInput({ value, step = 0.5, min = -150, max = 250, onChange, isMobile = false }: any) {
  const inputEl = (
    <input
      type="number"
      className="w-full text-[11px] text-white/90 text-center py-2 bg-white/5 border border-white/10 outline-none"
      value={step < 1 ? value.toFixed(2) : Math.round(value)}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
      }}
    />
  );

  return (
    <div className="flex items-center gap-1 w-full">
      <button className="w-8 h-8 bg-white/10 text-white" onPointerDown={(e: any) => { e.stopPropagation(); onChange(Math.max(min, value - step)); }}>−</button>
      {inputEl}
      <button className="w-8 h-8 bg-white/10 text-white" onPointerDown={(e: any) => { e.stopPropagation(); onChange(Math.min(max, value + step)); }}>+</button>
    </div>
  );
}

function TextInput({ label, value, onChange }: any) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[9px] uppercase tracking-wider text-white/40 min-w-[80px]">{label}</span>
      <input
        className="flex-1 text-[11px] text-white/90 py-2 px-3 bg-white/5 border border-white/10 outline-none"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
    </div>
  );
}

function DotEditor({ dot, onUpdate, onRemove, isMobile = false }: any) {
  return (
    <div className="p-4 bg-white/5 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[8px] font-bold tracking-[0.3em] uppercase text-[#D4B896]">{dot.type}</span>
        <button className="text-red-500/60 text-[10px]" onPointerDown={(e: any) => { e.stopPropagation(); onRemove(); }}>✕</button>
      </div>
      <div className="flex flex-col gap-2">
        <TextInput label="Name" value={dot.name} onChange={(v: string) => onUpdate({ name: v })} />
        <TextInput label="Price" value={dot.price} onChange={(v: string) => onUpdate({ price: v })} />
        <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
                <p className="text-[7px] uppercase text-white/30 mb-1">Top %</p>
                <NumInput value={dot.topPct} min={0} max={100} onChange={(v: number) => onUpdate({ topPct: v })} />
            </div>
            <div>
                <p className="text-[7px] uppercase text-white/30 mb-1">Left %</p>
                <NumInput value={dot.leftPct} min={0} max={100} onChange={(v: number) => onUpdate({ leftPct: v })} />
            </div>
        </div>
      </div>
    </div>
  );
}