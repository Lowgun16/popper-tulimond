// src/components/AtelierNav.tsx
"use client";

import { motion, type MotionValue, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import Image from "next/image";

export type NavPage = "vault" | "about" | "protocol" | "contact";

interface NavLink {
  id: NavPage;
  label: string;
  redDot?: boolean;
}

const NAV_LINKS: NavLink[] = [
  { id: "vault",    label: "Vault" },
  { id: "about",    label: "About" },
  { id: "protocol", label: "The Protocol", redDot: true },
  { id: "contact",  label: "Contact" },
];

interface Props {
  opacity: MotionValue<number>;
  onNavClick: (page: NavPage) => void;
  footerOpen: boolean;
  onLegalClick: () => void;
}

export default function AtelierNav({ opacity, onNavClick, footerOpen, onLegalClick }: Props) {
  const [active, setActive] = useState(false);
  useMotionValueEvent(opacity, "change", (v) => setActive(v > 0.05));

  return (
    <motion.nav
      aria-label="Primary navigation"
      className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center pt-8 md:pt-10 pb-4"
      style={{ opacity, pointerEvents: active ? "auto" : "none" }}
    >
      <Image
        src="/assets/branding/logo-horizontal.png"
        alt="Popper Tulimond"
        width={220} height={64}
        className="object-contain mb-4 w-[180px] md:w-[220px]"
        priority
      />

      <div className="flex items-center gap-3 md:gap-8">
        {NAV_LINKS.map((link) => (
          <button
            key={link.id}
            type="button"
            onClick={() => onNavClick(link.id)}
            className="type-eyebrow py-3 px-1 inline-flex items-center gap-1.5 transition-colors duration-300 bg-transparent border-none cursor-pointer"
            style={{ color: "var(--color-parchment)", opacity: 0.75 }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.75")}
          >
            {link.redDot && (
              <span
                aria-hidden="true"
                style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#8B1A1A", display: "inline-block", flexShrink: 0 }}
              />
            )}
            {link.label}
          </button>
        ))}

        <div className="hidden md:flex items-center gap-2">
          <span aria-hidden="true" style={{ color: "rgba(240,232,215,0.15)", fontSize: "12px" }}>|</span>
          <button
            type="button"
            onClick={onLegalClick}
            className="type-eyebrow py-3 px-1 bg-transparent border-none cursor-pointer transition-colors duration-300"
            style={{ color: "var(--color-parchment)", opacity: footerOpen ? 0.9 : 0.4, fontSize: "9px", letterSpacing: "0.2em" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.75")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = footerOpen ? "0.9" : "0.4")}
          >
            {footerOpen ? "Close Footer" : "Legal"}
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
