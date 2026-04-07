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
  // Accumulate hue contributions from both hue slider and warmth compensation
  const warmthHueOffset = state.warmth !== 0 ? (state.warmth > 0 ? -10 : 10) : 0;
  const totalHue = state.hue + warmthHueOffset;
  if (totalHue !== 0) parts.push(`hue-rotate(${totalHue}deg)`);
  if (state.saturation !== 0) parts.push(`saturate(${100 + state.saturation}%)`);
  if (state.brightness !== 0) parts.push(`brightness(${100 + state.brightness}%)`);
  if (state.contrast !== 0) parts.push(`contrast(${100 + state.contrast}%)`);
  if (state.warmth !== 0) {
    const sepia = Math.abs(state.warmth) * 0.3;
    parts.push(`sepia(${sepia}%)`);
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
