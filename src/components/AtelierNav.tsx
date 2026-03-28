"use client";

import { motion, type MotionValue, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import Image from "next/image";

interface Props {
  opacity: MotionValue<number>;
}

const NAV_LINKS = ["Collection", "Lookbook", "About", "Contact"] as const;

export default function AtelierNav({ opacity }: Props) {
  const [active, setActive] = useState(false);

  // Enable pointer events only once nav becomes visible
  useMotionValueEvent(opacity, "change", (v) => setActive(v > 0.05));

  return (
    <motion.nav
      aria-label="Primary navigation"
      className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center pt-8 md:pt-10 pb-4"
      style={{ opacity, pointerEvents: active ? "auto" : "none" }}
    >
      {/* Logo — Enhanced with multi-layered drop shadow for legibility against bright lights */}
      <Image
        src="/logo-horizontal.png"
        alt="Popper Tulimond"
        width={220}
        height={64}
        className="object-contain mb-4 w-[180px] md:w-[220px]"
        style={{
            // Layer 1: Tight shadow to define the gold script edges
            // Layer 2: Broad, soft shadow to separate the logo from the room's depth
            filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.8)) drop-shadow(0 4px 12px rgba(0,0,0,0.4))"
        }}
        priority
      />

      {/* Links — py-3 gives 44px+ touch target on mobile */}
      <ul className="flex items-center gap-6 md:gap-10">
        {NAV_LINKS.map((item) => (
          <li key={item}>
            <a
              href="#"
              className="type-eyebrow py-3 px-1 inline-block transition-colors duration-300"
              style={{ color: "var(--color-parchment)", opacity: 0.75 }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.opacity = "1")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.opacity = "0.75")
              }
            >
              {item}
            </a>
          </li>
        ))}
      </ul>
    </motion.nav>
  );
}