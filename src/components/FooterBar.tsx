// src/components/FooterBar.tsx
"use client";

import { motion, type MotionValue, useMotionValueEvent } from "framer-motion";
import { useState } from "react";

interface FooterBarProps {
  navOpacity: MotionValue<number>;
  footerOpen: boolean;
  onToggle: () => void;
}

export default function FooterBar({ navOpacity, footerOpen, onToggle }: FooterBarProps) {
  const [active, setActive] = useState(false);
  useMotionValueEvent(navOpacity, "change", (v) => setActive(v > 0.05));

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-[5800] flex justify-center pb-3 pt-2"
      style={{ opacity: navOpacity, pointerEvents: active ? "auto" : "none" }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "var(--font-title, serif)",
          fontSize: "8px",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: "rgba(240,232,215,0.35)",
          transition: "color 0.2s",
          padding: "4px 8px",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(240,232,215,0.65)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(240,232,215,0.35)")}
      >
        {footerOpen ? "Close Footer" : "View Footer"}
      </button>
    </motion.div>
  );
}
