// src/components/builder/useSliderFilters.ts
"use client";
import { useState, useCallback } from "react";
import type { SliderState } from "./builderTypes";
import { DEFAULT_SLIDER_STATE } from "./builderTypes";

/**
 * Converts SliderState into a CSS filter string.
 * Returns "" when all sliders are at zero (no filter applied).
 */
export function buildCSSFilter(state: SliderState): string {
  const parts: string[] = [];
  if (state.hue !== 0) parts.push(`hue-rotate(${state.hue}deg)`);
  if (state.saturation !== 0) parts.push(`saturate(${100 + state.saturation}%)`);
  if (state.brightness !== 0) parts.push(`brightness(${100 + state.brightness}%)`);
  if (state.contrast !== 0) parts.push(`contrast(${100 + state.contrast}%)`);
  // warmth is approximated as a sepia + hue combo
  if (state.warmth !== 0) {
    const sepia = Math.abs(state.warmth) * 0.3;
    parts.push(`sepia(${sepia}%)`);
    parts.push(`hue-rotate(${state.warmth > 0 ? -10 : 10}deg)`);
  }
  return parts.join(" ");
}

/** Fabric roughness overlay opacity (0–1) derived from slider value 0–100 */
export function fabricRoughnessOpacity(value: number): number {
  return Math.min(1, Math.max(0, value / 100)) * 0.6;
}

/** Heather overlay opacity (0–1) derived from slider value 0–100 */
export function heatherOpacity(value: number): number {
  return Math.min(1, Math.max(0, value / 100)) * 0.45;
}

export function useSliderFilters() {
  const [sliders, setSliders] = useState<SliderState>(DEFAULT_SLIDER_STATE);

  const updateSlider = useCallback(
    (key: keyof SliderState, value: number) => {
      setSliders((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const reset = useCallback(() => setSliders(DEFAULT_SLIDER_STATE), []);

  const cssFilter = buildCSSFilter(sliders);

  return { sliders, updateSlider, reset, cssFilter };
}
