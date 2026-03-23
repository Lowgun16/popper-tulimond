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

  // Smooth the scroll for the scale — prevents jitter on fast scrolls
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 25,
    restDelta: 0.001,
  });

  // Background zoom: ramps up then settles back to flat as portal resolves
  const bgScale = useTransform(
    smoothProgress,
    [0, 0.1, 0.65, 0.85, 1],
    [1, 1, 2.8, 1.2, 1.0]
  );

  // Vignette: closes then reopens
  const vignetteOpacity = useTransform(
    scrollYProgress,
    [0.2, 0.5, 0.7, 1.0],
    [0, 1, 1, 0]
  );

  // Hero content exit: fades up and out
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.25], ["0%", "-15%"]);

  // Flying text transforms
  const heritageX = useTransform(scrollYProgress, [0.25, 0.75], ["0vw", "-120vw"]);
  const heritageOpacity = useTransform(scrollYProgress, [0.25, 0.3, 0.7, 0.75], [0, 1, 1, 0]);

  const craftX = useTransform(scrollYProgress, [0.3, 0.75], ["0vw", "120vw"]);
  const craftOpacity = useTransform(scrollYProgress, [0.3, 0.35, 0.7, 0.75], [0, 1, 1, 0]);

  const powerY = useTransform(scrollYProgress, [0.35, 0.75], ["0vh", "-100vh"]);
  const powerOpacity = useTransform(scrollYProgress, [0.35, 0.4, 0.65, 0.72], [0, 1, 1, 0]);

  const tulimondScale = useTransform(scrollYProgress, [0.3, 0.75], [0.5, 4]);
  const tulimondOpacity = useTransform(scrollYProgress, [0.3, 0.38, 0.6, 0.72], [0, 1, 1, 0]);

  const ptScale = useTransform(scrollYProgress, [0.25, 0.85], [1, 6]);
  const ptOpacity = useTransform(scrollYProgress, [0.25, 0.32, 0.65, 0.75], [0, 0.3, 0.3, 0]);

  // Collection section entrance
  const collectionOpacity = useTransform(scrollYProgress, [0.82, 1.0], [0, 1]);
  const collectionY = useTransform(scrollYProgress, [0.82, 1.0], ["4%", "0%"]);

  return {
    containerRef,
    bgScale,
    vignetteOpacity,
    heroOpacity,
    heroY,
    heritageX,
    heritageOpacity,
    craftX,
    craftOpacity,
    powerY,
    powerOpacity,
    tulimondScale,
    tulimondOpacity,
    ptScale,
    ptOpacity,
    collectionOpacity,
    collectionY,
  };
}
