// src/hooks/usePortalTransforms.ts
"use client";

import { useRef } from "react";
import { useScroll, useTransform, useSpring } from "framer-motion";

export function usePortalTransforms() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Spring-smooth the progress used for the storefront scale only
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 25,
    restDelta: 0.001,
  });

  // ── Storefront (exterior) ──────────────────────────────
  const storefrontScale = useTransform(
    smoothProgress,
    [0, 0.1, 0.7],
    [1.0, 1.0, 2.2]
  );
  const storefrontOpacity = useTransform(
    scrollYProgress,
    [0.75, 0.9],
    [1, 0]
  );

  // ── Inside store (interior) ───────────────────────────
  const insideClipPath = useTransform(
    scrollYProgress,
    [0.6, 0.9],
    ["circle(0% at 50% 50%)", "circle(150% at 50% 50%)"]
  );

  // ── Vignette ──────────────────────────────────────────
  const vignetteOpacity = useTransform(
    scrollYProgress,
    [0.2, 0.5, 0.7, 1.0],
    [0, 1, 1, 0]
  );

  // ── "Dressed in Power." flying text ───────────────────
  const dressingOpacity = useTransform(
    scrollYProgress,
    [0.25, 0.32, 0.58, 0.72],
    [0, 1, 1, 0]
  );
  const dressingY = useTransform(
    scrollYProgress,
    [0.25, 0.72],
    ["20%", "-30%"]
  );

  // ── PT monogram ───────────────────────────────────────
  const ptScale = useTransform(scrollYProgress, [0.25, 0.85], [1, 6]);
  const ptOpacity = useTransform(
    scrollYProgress,
    [0.25, 0.32, 0.65, 0.75],
    [0, 0.3, 0.3, 0]
  );

  // ── Collection section entrance ───────────────────────
  const collectionOpacity = useTransform(scrollYProgress, [0.82, 1.0], [0, 1]);
  const collectionY = useTransform(scrollYProgress, [0.82, 1.0], ["4%", "0%"]);

  return {
    containerRef,
    storefrontScale,
    storefrontOpacity,
    insideClipPath,
    vignetteOpacity,
    dressingOpacity,
    dressingY,
    ptScale,
    ptOpacity,
    collectionOpacity,
    collectionY,
  };
}
