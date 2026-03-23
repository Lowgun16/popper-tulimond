// src/components/PortalFlyingText.tsx
"use client";

import { motion, type MotionValue, type MotionStyle } from "framer-motion";

interface Props {
  text: string;
  x?: MotionValue<string>;
  y?: MotionValue<string>;
  scale?: MotionValue<number>;
  opacity: MotionValue<number>;
  className?: string;
  style?: MotionStyle;
}

export default function PortalFlyingText({
  text,
  x,
  y,
  scale,
  opacity,
  className = "",
  style,
}: Props) {
  return (
    <motion.span
      className={`absolute select-none pointer-events-none will-change-transform ${className}`}
      style={{ x, y, scale, opacity, ...style }}
    >
      {text}
    </motion.span>
  );
}
