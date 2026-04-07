// src/components/builder/SliderPanel.tsx
"use client";
import type { SliderState } from "./builderTypes";

interface SliderRowProps {
  label: string;
  valueKey: keyof SliderState;
  min: number;
  max: number;
  value: number;
  onChange: (key: keyof SliderState, value: number) => void;
}

function SliderRow({ label, valueKey, min, max, value, onChange }: SliderRowProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-[10px] uppercase tracking-widest text-[#D4B896]/60 shrink-0">
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(valueKey, Number(e.target.value))}
        className="flex-1 accent-[#D4B896]"
      />
      <span className="w-8 text-right text-[10px] text-[#D4B896]/40 font-mono">
        {value > 0 ? `+${value}` : value}
      </span>
    </div>
  );
}

interface Props {
  sliders: SliderState;
  onChange: (key: keyof SliderState, value: number) => void;
  onReset: () => void;
}

export function SliderPanel({ sliders, onChange, onReset }: Props) {
  return (
    <div className="flex flex-col gap-3 p-4 bg-black/30 border border-[#D4B896]/10 rounded-lg">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[9px] uppercase tracking-[0.2em] text-[#D4B896]/40">
          Instant Adjustments
        </span>
        <button
          type="button"
          onClick={onReset}
          className="text-[9px] uppercase tracking-widest text-[#D4B896]/40 hover:text-[#D4B896]/70"
        >
          Reset
        </button>
      </div>
      <SliderRow label="Color / Hue" valueKey="hue" min={-180} max={180} value={sliders.hue} onChange={onChange} />
      <SliderRow label="Saturation" valueKey="saturation" min={-100} max={100} value={sliders.saturation} onChange={onChange} />
      <SliderRow label="Brightness" valueKey="brightness" min={-100} max={100} value={sliders.brightness} onChange={onChange} />
      <SliderRow label="Contrast" valueKey="contrast" min={-100} max={100} value={sliders.contrast} onChange={onChange} />
      <SliderRow label="Fabric Rough" valueKey="fabricRoughness" min={0} max={100} value={sliders.fabricRoughness} onChange={onChange} />
      <SliderRow label="Heather" valueKey="heatherIntensity" min={0} max={100} value={sliders.heatherIntensity} onChange={onChange} />
      <SliderRow label="Warmth" valueKey="warmth" min={-100} max={100} value={sliders.warmth} onChange={onChange} />
    </div>
  );
}
