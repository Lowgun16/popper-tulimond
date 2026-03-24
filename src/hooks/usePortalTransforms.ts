// src/hooks/usePortalTransforms.ts
"use client";

import { useRef, useState } from "react";
import {
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useMotionValueEvent,
} from "framer-motion";

// ── Door coordinates ──────────────────────────────────────────────────────
// Measured as fractions of VIEWPORT space (what you see in the browser).
// These are the only values to change if the composition shifts.
const DOOR = {
  desktop: { x: 0.67, y: 0.60 }, // storefront.png  — door knob, left of bricks/sign
  mobile:  { x: 0.70, y: 0.65 }, // storefront-tall.png — door knob, shifted left
} as const;

// Horizontal pan that slides the door from its native viewport position
// to dead-center (50%) as zoom completes. Y-axis intentionally fixed —
// no vertical translation avoids any "fainting" or sinking sensation.
// translateX(%) in Framer Motion = % of element's own width = % of viewport.
const PAN_X = {
  desktop: `${(0.5 - DOOR.desktop.x) * 100}%`, // "-32%"
  mobile:  `${(0.5 - DOOR.mobile.x)  * 100}%`, // "-25%"
} as const;

export function usePortalTransforms() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // ── The Clamp: Ratchet MotionValue ────────────────────────────────────
  // Only moves forward. Once past 0.95 it locks at 1.0 — one-way door.
  const lockedProgress = useMotionValue(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (lockedProgress.get() >= 0.95) {
      lockedProgress.set(1.0);
    } else {
      lockedProgress.set(v);
    }
  });

  // ── The Spring: Heavy Door Momentum ───────────────────────────────────
  // stiffness 100 / damping 40 — fast response, slow energy bleed.
  // All visual transforms derive from this single curve.
  const smoothProgress = useSpring(lockedProgress, {
    stiffness: 100,
    damping: 40,
    restDelta: 0.001,
  });

  // ── Storefront Scale + Fade ───────────────────────────────────────────
  const storefrontScale = useTransform(smoothProgress, [0, 0.82], [1.0, 2.4]);
  const storefrontOpacity = useTransform(smoothProgress, [0.75, 0.95], [1, 0]);

  // ── Ken Burns Pan — X axis only ───────────────────────────────────────
  // Slides the door from its off-center native position to viewport center.
  // No Y pan — camera stays at eye level, no sinking or fainting.
  // Scale goes from 0→82%, pan matches that range exactly so both complete
  // together: door arrives at 50% the same frame the zoom finishes.
  const storefrontPanXDesktop = useTransform(
    smoothProgress, [0, 0.82], ["0%", PAN_X.desktop]
  );
  const storefrontPanXMobile = useTransform(
    smoothProgress, [0, 0.82], ["0%", PAN_X.mobile]
  );

  // ── Inside store ──────────────────────────────────────────────────────
  const insideClipPath = useTransform(
    smoothProgress,
    [0.6, 0.92],
    ["inset(8% 3% 3% 77% round 2px)", "inset(0% 0% 0% 0%)"]
  );
  const insideOpacity = useTransform(smoothProgress, [0.65, 0.92], [0, 1]);
  const insideFilter = useTransform(
    smoothProgress,
    [0.6, 0.92],
    ["blur(5px)", "blur(0px)"]
  );

  // ── Nav reveal ────────────────────────────────────────────────────────
  const navOpacity = useTransform(smoothProgress, [0.93, 1.0], [0, 1]);

  // ── Deferred inside-store render ──────────────────────────────────────
  const [showInside, setShowInside] = useState(false);
  useMotionValueEvent(smoothProgress, "change", (v) => {
    if (!showInside && v > 0.35) setShowInside(true);
  });

  // ── The Heartbeat — synced to the first visual frame of door opening ──
  const heartbeatFiredRef = useRef(false);
  const [heartbeatFired, setHeartbeatFired] = useState(false);
  useMotionValueEvent(smoothProgress, "change", (v) => {
    if (!heartbeatFiredRef.current && v >= 0.6) {
      heartbeatFiredRef.current = true;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([50, 30, 50]);
      }
      setHeartbeatFired(true);
    }
  });

  return {
    containerRef,
    storefrontScale,
    storefrontOpacity,
    storefrontPanXDesktop,
    storefrontPanXMobile,
    insideClipPath,
    insideOpacity,
    insideFilter,
    navOpacity,
    showInside,
    heartbeatFired,
  };
}
