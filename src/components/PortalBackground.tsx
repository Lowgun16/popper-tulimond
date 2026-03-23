// src/components/PortalBackground.tsx
"use client";

import { motion, type MotionValue } from "framer-motion";
import Image from "next/image";

interface Props {
  storefrontScale: MotionValue<number>;
  storefrontOpacity: MotionValue<number>;
  insideClipPath: MotionValue<string>;
  vignetteOpacity: MotionValue<number>;
}

export default function PortalBackground({
  storefrontScale,
  storefrontOpacity,
  insideClipPath,
  vignetteOpacity,
}: Props) {
  return (
    <>
      {/* ── Layer 1: Inside store — always present, revealed by clip-path ── */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{ clipPath: insideClipPath }}
      >
        <Image
          src="/inside-store.png"
          alt="Inside Popper Tulimond"
          fill
          className="object-cover object-center"
          aria-hidden="true"
        />
      </motion.div>

      {/* ── Layer 2: Storefront — zooms in, then fades ── */}
      <motion.div
        className="absolute inset-0 z-10 will-change-transform"
        style={{ scale: storefrontScale, opacity: storefrontOpacity }}
      >
        <Image
          src="/storefront.png"
          alt="Popper Tulimond storefront"
          fill
          className="object-cover object-center"
          priority
          aria-hidden="true"
        />
      </motion.div>

      {/* ── Layer 3: Radial vignette — closes from edges ── */}
      <motion.div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          opacity: vignetteOpacity,
          background:
            "radial-gradient(ellipse at center, transparent 20%, rgba(15,13,12,0.6) 55%, rgba(15,13,12,0.97) 100%)",
        }}
      />

      {/* ── Base: Obsidian fallback ── */}
      <div className="absolute inset-0 -z-10 bg-obsidian" />
    </>
  );
}
