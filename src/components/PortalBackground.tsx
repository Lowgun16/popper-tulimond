// src/components/PortalBackground.tsx
"use client";

import { motion, type MotionValue } from "framer-motion";
import Image from "next/image";

// Door position fractions — must match DOOR constants in usePortalTransforms.ts.
// originX/originY are Framer Motion's internal transform-origin (not CSS transform-origin).
// They control the pivot point for scale, so the door stays pinned during zoom.
const ORIGIN = {
  desktop: { x: 0.67, y: 0.60 }, // door knob — left of bricks/sign
  mobile:  { x: 0.70, y: 0.65 }, // door knob — shifted left
} as const;

interface Props {
  storefrontScale: MotionValue<number>;
  storefrontOpacity: MotionValue<number>;
  storefrontPanXDesktop: MotionValue<string>;
  storefrontPanXMobile: MotionValue<string>;
  insideClipPath: MotionValue<string>;
  insideOpacity: MotionValue<number>;
  insideFilter: MotionValue<string>;
  showInside: boolean;
}

export default function PortalBackground({
  storefrontScale,
  storefrontOpacity,
  storefrontPanXDesktop,
  storefrontPanXMobile,
  insideClipPath,
  insideOpacity,
  insideFilter,
  showInside,
}: Props) {
  return (
    <>
      {/* ── Layer 1: Inside store ─────────────────────────────────────────
          Not rendered until scroll > 35%.
          .bp-mobile / .bp-desktop wrappers: 500ms CSS crossfade on resize.
      ── */}
      {showInside && (
        <>
          <div className="bp-mobile absolute inset-0 z-0">
            <motion.div
              className="absolute inset-0 will-change-[opacity,filter]"
              style={{ opacity: insideOpacity, filter: insideFilter }}
            >
              <Image
                src="/inside-store-tall.png"
                alt="Inside Popper Tulimond"
                fill
                className="object-cover object-center"
                aria-hidden="true"
              />
            </motion.div>
          </div>

          <div className="bp-desktop absolute inset-0 z-0">
            <motion.div
              className="absolute inset-0 will-change-[clip-path,filter]"
              style={{ clipPath: insideClipPath, filter: insideFilter }}
            >
              <Image
                src="/inside-store-wide.png"
                alt="Inside Popper Tulimond"
                fill
                className="object-cover object-center"
                aria-hidden="true"
              />
            </motion.div>
          </div>
        </>
      )}

      {/* ── Layer 2: Storefront — Universal Focal Point ───────────────────
          KEY: originX / originY are Framer Motion's own transform-origin,
          NOT the CSS `transform-origin` property. They pin the door in place
          during scale so the camera zooms directly into the door handle.

          CSS `transform-origin` is ignored by Framer Motion's transform
          pipeline — using it silently falls back to center (50% 50%), which
          is why the zoom was hitting bricks instead of the door.

          Pan (x) slides the pinned door from its native viewport position
          to 50% center as zoom completes. No y pan — eye level stays fixed.
      ── */}

      {/* Mobile — door at 75% x, 65% y on storefront-tall.png */}
      <div className="bp-mobile absolute inset-0 z-10">
        <motion.div
          className="absolute inset-0 will-change-transform bg-obsidian"
          style={{
            scale: storefrontScale,
            x: storefrontPanXMobile,
            opacity: storefrontOpacity,
            originX: ORIGIN.mobile.x,
            originY: ORIGIN.mobile.y,
          }}
        >
          <Image
            src="/storefront-tall.png"
            alt="Popper Tulimond storefront"
            fill
            className="object-cover object-center"
            priority
            aria-hidden="true"
          />
        </motion.div>
      </div>

      {/* Desktop — door at 82% x, 60% y on storefront.png */}
      <div className="bp-desktop absolute inset-0 z-10">
        <motion.div
          className="absolute inset-0 will-change-transform bg-obsidian"
          style={{
            scale: storefrontScale,
            x: storefrontPanXDesktop,
            opacity: storefrontOpacity,
            originX: ORIGIN.desktop.x,
            originY: ORIGIN.desktop.y,
          }}
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
      </div>

      {/* Obsidian base — floor beneath everything */}
      <div className="absolute inset-0 -z-10 bg-obsidian" />
    </>
  );
}
