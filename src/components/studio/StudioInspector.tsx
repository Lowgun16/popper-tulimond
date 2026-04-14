"use client";
import React from "react";
import { motion } from "framer-motion";
import type { StudioSlot, StudioDot, ShadowConfig, AccessType, LookbookItem, FilterDimension } from "./studioTypes";

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
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const isMobile = useMobile();
  const sidePad = isMobile ? 12 : 20;
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const handleSaveClick = async () => {
    if (saveState === "saving") return;
    setSaveState("saving");
    try {
      await onSave();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
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
        pointerEvents: sidebarOpen ? "auto" : "none",
      }}
    >
      <div className="pt-6 pb-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingLeft: sidePad, paddingRight: sidePad }}>
        <p className="text-[9px] font-bold tracking-[0.5em] uppercase mb-1" style={{ color: "#D4B896" }}>Popper Studio</p>
        <p className="text-white/40 text-[10px] tracking-wide uppercase">{selected ? `Editing: ${selected.displayName}` : `${slots.length} Patrons On Stage`}</p>
      </div>

      <div className="py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingLeft: sidePad, paddingRight: sidePad }}>
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
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onSelectSlot(slot.id); }}
              >
                {slot.displayName}
              </button>
            );
          })}
          <button
            className="text-[9px] tracking-widest uppercase px-3 py-2 transition-all duration-200 border border-dashed border-[#D4B896]/30 text-[#D4B896]/60 hover:text-[#D4B896]"
            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onAddSlot(); }}
          >
            + Patron
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {selected ? (
          <div className="py-6 flex flex-col gap-8" style={{ paddingLeft: sidePad, paddingRight: sidePad }}>
            <Section label="Spatial Config">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[9px] uppercase tracking-wider text-white/40 min-w-[80px]">Position</span>
                <div className="flex gap-2">
                  {(["left", "right"] as const).map((mode) => (
                    <button key={mode} className="text-[8px] uppercase tracking-widest px-3 py-1.5 border transition-all duration-150"
                      style={{ borderColor: selected.positionMode === mode ? "#D4B896" : "rgba(255,255,255,0.1)", color: selected.positionMode === mode ? "#000" : "rgba(255,255,255,0.5)", background: selected.positionMode === mode ? "#D4B896" : "transparent" } as React.CSSProperties}
                      onPointerDown={(e: any) => { e.stopPropagation(); onUpdateSlot(selected.id, { positionMode: mode }); }}
                    >{mode === "left" ? "← LEFT" : "RIGHT →"}</button>
                  ))}
                </div>
              </div>
              <Row label="Horizontal %"><NumInput value={selected.leftPct} onChange={(v: number) => onUpdateSlot(selected.id, { leftPct: v })} /></Row>
              <Row label="Depth %"><NumInput value={selected.bottomPct} onChange={(v: number) => onUpdateSlot(selected.id, { bottomPct: v })} /></Row>
              <Row label="Scale Factor"><NumInput value={selected.scale} step={0.05} min={0.2} max={2.5} onChange={(v: number) => onUpdateSlot(selected.id, { scale: v })} /></Row>
              <Row label="Layer Order"><NumInput value={selected.zIndex} step={1} min={1} max={100} onChange={(v: number) => onUpdateSlot(selected.id, { zIndex: v })} /></Row>
            </Section>

            <Section label={`Garment Hotspots (${selected.dots.length})`}>
              <div className="flex flex-col gap-4">
                {selected.dots.map((dot) => (
                  <DotEditor key={dot.id} dot={dot} onUpdate={(patch: Partial<StudioDot>) => onUpdateDot(selected.id, dot.id, patch)} onRemove={() => onRemoveDot(selected.id, dot.id)} />
                ))}
              </div>
              <button className="w-full text-[9px] tracking-widest uppercase py-3 mt-2 border border-[#D4B896]/20 text-[#D4B896]/60 hover:bg-[#D4B896]/5" onPointerDown={(e: any) => { e.stopPropagation(); onAddDot(selected.id); }}>+ Create Hotspot</button>
            </Section>

            <Section label="Asset Config">
              <TextInput label="Label" value={selected.displayName} onChange={(v: string) => onUpdateSlot(selected.id, { displayName: v })} />
              <label className="text-[8px] tracking-widest uppercase block mt-4 mb-2 text-white/40">Path to Image</label>
              <ImagePathInput value={selected.imageSrc} onChange={(v: string) => onSwapImage(selected.id, v)} />
            </Section>

            <Section label="Shadow Calibration">
              <Row label="Offset X"><NumInput value={selected.shadow.offsetX} min={-300} max={300} onChange={(v: number) => onUpdateShadow(selected.id, { offsetX: v })} /></Row>
              <Row label="Offset Y"><NumInput value={selected.shadow.offsetY} min={-300} max={300} onChange={(v: number) => onUpdateShadow(selected.id, { offsetY: v })} /></Row>
              <Row label="Opacity"><NumInput value={selected.shadow.opacity} step={0.05} min={0} max={1} onChange={(v: number) => onUpdateShadow(selected.id, { opacity: v })} /></Row>
              <Row label="Softness"><NumInput value={selected.shadow.blur} min={0} max={100} onChange={(v: number) => onUpdateShadow(selected.id, { blur: v })} /></Row>
            </Section>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full px-10">
            <p className="text-center text-[10px] uppercase tracking-[0.2em] leading-relaxed text-white/20">Select a Patron to begin calibration</p>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button className="w-full text-[9px] tracking-widest uppercase py-3 border transition-all duration-300" style={{ borderColor: copyConfirm ? "#D4B896" : "rgba(255,255,255,0.1)", color: copyConfirm ? "#D4B896" : "rgba(255,255,255,0.4)", background: copyConfirm ? "rgba(212,184,150,0.05)" : "transparent" }} onPointerDown={(e) => { e.stopPropagation(); onCopyCode(); }}>{copyConfirm ? "✓ Config Copied" : "Copy Production Config"}</button>
        <button onPointerDown={(e) => { e.stopPropagation(); handleSaveClick(); }} disabled={saveState === "saving"} className="w-full py-3 text-[9px] tracking-[0.3em] uppercase transition-all duration-300 flex items-center justify-center gap-2 bg-white text-black font-bold">{saveState === "saving" ? "Writing..." : saveState === "saved" ? "✓ Saved Local" : "Save Place"}</button>
      </div>
    </motion.div>

    <button onPointerDown={() => setSidebarOpen(!sidebarOpen)} className="fixed top-1/2 -translate-y-1/2 z-[6001] flex items-center justify-center" style={{ left: sidebarOpen ? "min(85vw, 320px)" : 0, transition: "left 0.28s cubic-bezier(0.4, 0, 0.2, 1)", width: 32, height: 64, background: "rgba(212,184,150,0.9)", borderRadius: "0 4px 4px 0", color: "black", fontWeight: "bold", pointerEvents: "auto" }}>{sidebarOpen ? "‹" : "›"}</button>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[8px] tracking-[0.4em] uppercase text-[#D4B896]/60 font-bold border-b border-white/5 pb-2">{label}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[9px] uppercase tracking-wider text-white/40 min-w-[80px]">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function ImagePathInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);
  return (
    <input className="w-full text-[10px] text-white/70 py-2 px-3 bg-white/5 border border-white/10 outline-none" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={(e) => onChange(e.target.value.trim())} />
  );
}

function NumInput({ value, step = 0.5, min = -150, max = 250, onChange }: any) {
  return (
    <div className="flex items-center gap-1 w-full">
      <button className="w-8 h-8 bg-white/10 text-white" onPointerDown={(e: any) => { e.stopPropagation(); onChange(Math.max(min, value - step)); }}>−</button>
      <input type="number" className="w-full text-[11px] text-white/90 text-center py-2 bg-white/5 border border-white/10 outline-none" value={step < 1 ? value.toFixed(2) : Math.round(value)} onChange={(e: any) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v); }} />
      <button className="w-8 h-8 bg-white/10 text-white" onPointerDown={(e: any) => { e.stopPropagation(); onChange(Math.min(max, value + step)); }}>+</button>
    </div>
  );
}

function TextInput({ label, value, onChange }: any) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[9px] uppercase tracking-wider text-white/40 min-w-[80px]">{label}</span>
      <input className="flex-1 text-[11px] text-white/90 py-2 px-3 bg-white/5 border border-white/10 outline-none" value={value} onChange={(e: any) => onChange(e.target.value)} />
    </div>
  );
}

function DotEditor({ dot, onUpdate, onRemove }: any) {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <div className="bg-white/5 border border-white/10">
      {/* Header row — always visible */}
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onPointerDown={(e: any) => { e.stopPropagation(); setExpanded(x => !x); }}>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-bold tracking-[0.3em] uppercase" style={{ color: dot.type === "vault" ? "#A07850" : "#D4B896" }}>{dot.type === "vault" ? "⚿ VAULT" : "◉ PUBLIC"}</span>
          <span className="text-[9px] text-white/60 truncate max-w-[120px]">{dot.name || "Unnamed"}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/30 text-[10px]">{expanded ? "▲" : "▼"}</span>
          <button className="text-red-500/60 text-[10px]" onPointerDown={(e: any) => { e.stopPropagation(); onRemove(); }}>✕</button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-white/5">
          {/* Card content */}
          <p className="text-[7px] uppercase tracking-[0.3em] text-[#D4B896]/50 mt-3 mb-1">Card Content</p>
          <TextInput label="Item Name" value={dot.name} onChange={(v: string) => onUpdate({ name: v })} />
          <TextInput label="Collection" value={dot.collection} onChange={(v: string) => onUpdate({ collection: v })} />
          <TextInput label="Colorway" value={dot.colorway} onChange={(v: string) => onUpdate({ colorway: v })} />
          <TextInput label="Price" value={dot.price} onChange={(v: string) => onUpdate({ price: v })} />

          {/* Access type toggle */}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[9px] uppercase tracking-wider text-white/40 min-w-[80px]">Access</span>
            <div className="flex gap-2">
              {(["public", "vault"] as const).map((t) => (
                <button key={t} className="text-[8px] uppercase tracking-widest px-3 py-1.5 border transition-all duration-150"
                  style={{ borderColor: dot.type === t ? "#D4B896" : "rgba(255,255,255,0.1)", color: dot.type === t ? "#000" : "rgba(255,255,255,0.5)", background: dot.type === t ? "#D4B896" : "transparent" } as React.CSSProperties}
                  onPointerDown={(e: any) => { e.stopPropagation(); onUpdate({ type: t }); }}
                >{t}</button>
              ))}
            </div>
          </div>

          {/* Sizes */}
          <div className="mt-1">
            <p className="text-[7px] uppercase tracking-[0.3em] text-white/30 mb-1.5">Sizes (comma separated)</p>
            <input
              className="w-full text-[10px] text-white/70 py-2 px-3 bg-white/5 border border-white/10 outline-none"
              value={(dot.sizes ?? []).join(", ")}
              onChange={(e: any) => onUpdate({ sizes: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })}
              placeholder="S, M, L, XL, XXL"
              onPointerDown={(e: any) => e.stopPropagation()}
            />
          </div>

          {/* Size Chart — Chest & Length per size */}
          {(dot.sizes ?? []).length > 0 && (
            <div className="mt-1">
              <p className="text-[7px] uppercase tracking-[0.3em] text-white/30 mb-2">Size Chart</p>
              <div className="flex flex-col gap-1.5">
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-[7px] uppercase text-[#D4B896]/50 text-center">Size</span>
                  <span className="text-[7px] uppercase text-[#D4B896]/50 text-center">Chest</span>
                  <span className="text-[7px] uppercase text-[#D4B896]/50 text-center">Length</span>
                </div>
                {(dot.sizes ?? []).map((size: string) => {
                  const chart = dot.sizeChart ?? {};
                  const row = chart[size] ?? { chest: "", length: "" };
                  return (
                    <div key={size} className="grid grid-cols-3 gap-1 items-center">
                      <span className="text-[9px] text-white/50 text-center uppercase">{size}</span>
                      <input
                        className="text-[10px] text-white/70 py-1 px-2 bg-white/5 border border-white/10 outline-none text-center"
                        value={row.chest}
                        placeholder='38"'
                        onChange={(e: any) => onUpdate({ sizeChart: { ...chart, [size]: { ...row, chest: e.target.value } } })}
                        onPointerDown={(e: any) => e.stopPropagation()}
                      />
                      <input
                        className="text-[10px] text-white/70 py-1 px-2 bg-white/5 border border-white/10 outline-none text-center"
                        value={row.length}
                        placeholder='29"'
                        onChange={(e: any) => onUpdate({ sizeChart: { ...chart, [size]: { ...row, length: e.target.value } } })}
                        onPointerDown={(e: any) => e.stopPropagation()}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Position */}
          <p className="text-[7px] uppercase tracking-[0.3em] text-[#D4B896]/50 mt-2 mb-1">Position</p>
          <div className="grid grid-cols-2 gap-2">
            <div><p className="text-[7px] uppercase text-white/30 mb-1">Top %</p><NumInput value={dot.topPct} min={0} max={100} onChange={(v: number) => onUpdate({ topPct: v })} /></div>
            <div><p className="text-[7px] uppercase text-white/30 mb-1">Left %</p><NumInput value={dot.leftPct} min={0} max={100} onChange={(v: number) => onUpdate({ leftPct: v })} /></div>
          </div>

          {/* Long-form copy */}
          <p className="text-[7px] uppercase tracking-[0.3em] text-[#D4B896]/50 mt-2 mb-1">Lookbook Copy</p>
          <TextArea label="Story" value={dot.story ?? ""} onChange={(v: string) => onUpdate({ story: v })} />
          <TextArea label="Materials" value={dot.materials ?? ""} onChange={(v: string) => onUpdate({ materials: v })} />
          <TextArea label="Size Guide" value={dot.sizeGuide ?? ""} onChange={(v: string) => onUpdate({ sizeGuide: v })} />

          {/* ── Filter Dimensions ── */}
          <p className="text-[7px] uppercase tracking-[0.3em] text-[#D4B896]/50 mt-3 mb-1">Filter Dimensions</p>
          {(dot.filterDimensions ?? []).map((dim: FilterDimension, dimIdx: number) => (
            <div key={dimIdx} className="bg-white/5 border border-white/10 p-2 mb-2">
              {/* Dimension name + remove */}
              <div className="flex items-center gap-2 mb-2">
                <input
                  className="flex-1 text-[10px] text-white/70 py-1 px-2 bg-white/5 border border-white/10 outline-none"
                  value={dim.name}
                  placeholder='Name (e.g. "Color")'
                  onChange={(e) => {
                    const dims = [...(dot.filterDimensions ?? [])];
                    dims[dimIdx] = { ...dims[dimIdx], name: e.target.value };
                    onUpdate({ filterDimensions: dims });
                  }}
                  onPointerDown={(e: any) => e.stopPropagation()}
                />
                <button
                  className="text-red-500/60 text-[10px] shrink-0"
                  onPointerDown={(e: any) => {
                    e.stopPropagation();
                    onUpdate({ filterDimensions: (dot.filterDimensions ?? []).filter((_: any, i: number) => i !== dimIdx) });
                  }}
                >✕</button>
              </div>
              {/* Options */}
              {dim.options.map((opt, optIdx: number) => (
                <div key={optIdx} className="flex items-center gap-1 mb-1">
                  <input
                    className="flex-1 text-[10px] text-white/70 py-1 px-2 bg-white/5 border border-white/10 outline-none"
                    value={opt.value}
                    placeholder="Value"
                    onChange={(e) => {
                      const dims = [...(dot.filterDimensions ?? [])];
                      const opts = [...dims[dimIdx].options];
                      opts[optIdx] = { ...opts[optIdx], value: e.target.value };
                      dims[dimIdx] = { ...dims[dimIdx], options: opts };
                      onUpdate({ filterDimensions: dims });
                    }}
                    onPointerDown={(e: any) => e.stopPropagation()}
                  />
                  <input
                    className="flex-1 text-[10px] text-white/40 py-1 px-2 bg-white/5 border border-white/10 outline-none"
                    value={opt.subtitle ?? ""}
                    placeholder="(subtitle)"
                    onChange={(e) => {
                      const dims = [...(dot.filterDimensions ?? [])];
                      const opts = [...dims[dimIdx].options];
                      opts[optIdx] = { ...opts[optIdx], subtitle: e.target.value || undefined };
                      dims[dimIdx] = { ...dims[dimIdx], options: opts };
                      onUpdate({ filterDimensions: dims });
                    }}
                    onPointerDown={(e: any) => e.stopPropagation()}
                  />
                  <button
                    className="text-red-500/60 text-[10px] shrink-0"
                    onPointerDown={(e: any) => {
                      e.stopPropagation();
                      const dims = [...(dot.filterDimensions ?? [])];
                      dims[dimIdx] = { ...dims[dimIdx], options: dims[dimIdx].options.filter((_: any, i: number) => i !== optIdx) };
                      onUpdate({ filterDimensions: dims });
                    }}
                  >✕</button>
                </div>
              ))}
              <button
                className="text-[8px] uppercase tracking-widest text-[#D4B896]/50 mt-1 hover:text-[#D4B896]"
                onPointerDown={(e: any) => {
                  e.stopPropagation();
                  const dims = [...(dot.filterDimensions ?? [])];
                  dims[dimIdx] = { ...dims[dimIdx], options: [...dims[dimIdx].options, { value: "" }] };
                  onUpdate({ filterDimensions: dims });
                }}
              >+ Option</button>
            </div>
          ))}
          <button
            className="w-full text-[9px] tracking-widest uppercase py-2 border border-[#D4B896]/20 text-[#D4B896]/50 hover:text-[#D4B896] mb-2"
            onPointerDown={(e: any) => {
              e.stopPropagation();
              onUpdate({ filterDimensions: [...(dot.filterDimensions ?? []), { name: "", options: [] }] });
            }}
          >+ Add Dimension</button>

          {/* ── Lookbook Media ── */}
          <p className="text-[7px] uppercase tracking-[0.3em] text-[#D4B896]/50 mt-3 mb-1">
            Lookbook Media ({dot.lookbook.length})
          </p>
          <LookbookUrlInput
            onAdd={(url: string) => onUpdate({ lookbook: [...dot.lookbook, { url, tags: {} }] })}
          />
          {dot.lookbook.map((media: LookbookItem, idx: number) => (
            <LookbookItemEditor
              key={idx}
              item={media}
              index={idx}
              total={dot.lookbook.length}
              dimensions={dot.filterDimensions ?? []}
              onUpdate={(patch: Partial<LookbookItem>) => {
                const lb = [...dot.lookbook];
                lb[idx] = { ...lb[idx], ...patch };
                onUpdate({ lookbook: lb });
              }}
              onMoveUp={() => {
                if (idx === 0) return;
                const lb = [...dot.lookbook];
                [lb[idx - 1], lb[idx]] = [lb[idx], lb[idx - 1]];
                onUpdate({ lookbook: lb });
              }}
              onMoveDown={() => {
                if (idx === dot.lookbook.length - 1) return;
                const lb = [...dot.lookbook];
                [lb[idx], lb[idx + 1]] = [lb[idx + 1], lb[idx]];
                onUpdate({ lookbook: lb });
              }}
              onRemove={() => onUpdate({ lookbook: dot.lookbook.filter((_: any, i: number) => i !== idx) })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TextArea({ label, value, onChange }: any) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[8px] uppercase tracking-wider text-white/40">{label}</span>
      <textarea
        className="w-full text-[10px] text-white/70 py-2 px-3 bg-white/5 border border-white/10 outline-none resize-none"
        rows={3}
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        onPointerDown={(e: any) => e.stopPropagation()}
      />
    </div>
  );
}

function LookbookUrlInput({ onAdd }: { onAdd: (url: string) => void }) {
  const [draft, setDraft] = React.useState("");
  return (
    <div className="flex gap-1 mb-2">
      <input
        className="flex-1 text-[10px] text-white/70 py-1.5 px-2 bg-white/5 border border-white/10 outline-none"
        value={draft}
        placeholder="Paste Cloudinary URL..."
        onChange={(e) => setDraft(e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
      />
      <button
        className="text-[9px] uppercase tracking-wider px-3 py-1.5 border border-[#D4B896]/30 text-[#D4B896]/60 hover:text-[#D4B896] shrink-0"
        onPointerDown={(e) => {
          e.stopPropagation();
          const url = draft.trim();
          if (!url) return;
          onAdd(url);
          setDraft("");
        }}
      >+ Add</button>
    </div>
  );
}

function LookbookItemEditor({
  item, index, total, dimensions, onUpdate, onMoveUp, onMoveDown, onRemove,
}: {
  item: LookbookItem;
  index: number;
  total: number;
  dimensions: FilterDimension[];
  onUpdate: (patch: Partial<LookbookItem>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const isVid = /\.(mp4|webm)$/i.test(item.url.split("?")[0]);
  const filename = item.url.split("/").pop()?.split("?")[0] ?? item.url;

  return (
    <div className="flex flex-col gap-1 bg-white/5 border border-white/10 p-2 mb-1">
      {/* Top row: reorder arrows + type icon + filename + remove */}
      <div className="flex items-center gap-1">
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            className="text-[8px] leading-none px-1"
            style={{ color: index === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.4)" }}
            disabled={index === 0}
            onPointerDown={(e) => { e.stopPropagation(); onMoveUp(); }}
          >▲</button>
          <button
            className="text-[8px] leading-none px-1"
            style={{ color: index === total - 1 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.4)" }}
            disabled={index === total - 1}
            onPointerDown={(e) => { e.stopPropagation(); onMoveDown(); }}
          >▼</button>
        </div>
        <span className="text-[9px] shrink-0" style={{ color: isVid ? "#C4A456" : "rgba(255,255,255,0.4)" }}>
          {isVid ? "▶" : "□"}
        </span>
        <span className="flex-1 text-[9px] text-white/50 truncate min-w-0">{filename}</span>
        <button
          className="text-red-500/60 text-[10px] shrink-0"
          onPointerDown={(e) => { e.stopPropagation(); onRemove(); }}
        >✕</button>
      </div>

      {/* Tag selector per dimension */}
      {dimensions.map((dim) => (
        <div key={dim.name} className="flex items-center gap-1 flex-wrap">
          <span className="text-[7px] uppercase text-white/30 shrink-0" style={{ minWidth: 40 }}>{dim.name}</span>
          <div className="flex gap-1 flex-wrap">
            {dim.options.map((opt) => {
              const isActive = item.tags[dim.name] === opt.value;
              return (
                <button
                  key={opt.value}
                  className="text-[7px] uppercase tracking-wider px-2 py-0.5 border transition-all"
                  style={{
                    borderColor: isActive ? "#D4B896" : "rgba(255,255,255,0.1)",
                    color: isActive ? "#D4B896" : "rgba(255,255,255,0.4)",
                    background: isActive ? "rgba(212,184,150,0.05)" : "transparent",
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    const newTags = { ...item.tags };
                    if (isActive) { delete newTags[dim.name]; }
                    else { newTags[dim.name] = opt.value; }
                    onUpdate({ tags: newTags });
                  }}
                >{opt.value}</button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}