// src/components/CollectionSection.tsx
"use client";

import { motion, type MotionValue } from "framer-motion";

interface Props {
  opacity: MotionValue<number>;
  y: MotionValue<string>;
}

export default function CollectionSection({ opacity, y }: Props) {
  return (
    <motion.div
      className="relative z-30 flex flex-col items-center justify-center min-h-screen text-center px-6"
      style={{ opacity, y }}
    >
      <p className="type-eyebrow mb-6" style={{ color: "var(--color-gold)" }}>
        The Collection
      </p>
      <div className="divider-gold mx-auto mb-10" />
      <h2 className="type-display" style={{ color: "var(--color-parchment)" }}>
        Welcome to the World.
      </h2>
      <p className="type-body mt-6 max-w-md" style={{ opacity: 0.6 }}>
        Each piece carries the weight of intention. Explore the full Popper Tulimond collection.
      </p>
      <a
        href="#"
        className="type-eyebrow mt-12 px-10 py-4 border border-gold text-gold hover:bg-gold hover:text-obsidian transition-all duration-500 tracking-[0.25em]"
      >
        Enter Collection
      </a>
    </motion.div>
  );
}
