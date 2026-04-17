// src/components/overlays/OverlayShell.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface OverlayShellProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Accessible label for the dialog */
  label: string;
}

export default function OverlayShell({ isOpen, onClose, children, label }: OverlayShellProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Move focus into dialog when it opens; restore when it closes
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Small timeout lets AnimatePresence render the panel before focusing
      const id = setTimeout(() => closeButtonRef.current?.focus(), 50);
      return () => clearTimeout(id);
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-[6000]"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 right-0 z-[6001] w-full md:w-[640px] overflow-y-auto"
            style={{
              background: "rgba(12,12,12,0.97)",
              backdropFilter: "blur(24px)",
              borderTop: "1px solid rgba(196,164,86,0.4)",
              borderLeft: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Close button */}
            <button
              ref={closeButtonRef}
              onClick={onClose}
              aria-label="Close"
              className="absolute top-6 right-6 z-10 flex items-center justify-center w-8 h-8"
              style={{ color: "rgba(255,255,255,0.5)", fontSize: 18, background: "none", border: "none", cursor: "pointer" }}
            >
              ✕
            </button>

            <div className="px-8 py-12 md:px-12">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
