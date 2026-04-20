// src/components/FooterOverlay.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { LegalPage } from "./overlays/LegalContentOverlay";

interface FooterOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onLegalOpen: (page: LegalPage) => void;
}

const LEGAL_LINKS: { label: string; slug: LegalPage }[] = [
  { label: "Terms of Use",           slug: "terms" },
  { label: "Privacy Policy",         slug: "privacy" },
  { label: "Shipping & Fulfillment", slug: "shipping" },
  { label: "Refund Policy",          slug: "refund" },
  { label: "Contact Us",             slug: "contact-us" },
];

const GOLD = "#C4A456";

export default function FooterOverlay({ isOpen, onClose, onLegalOpen }: FooterOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-0 left-0 right-0 z-[5900]"
          style={{
            height: "40vh",
            background: "rgba(8,8,8,0.97)",
            backdropFilter: "blur(20px)",
            borderTop: `1px solid rgba(196,164,86,0.35)`,
          }}
        >
          <div className="flex flex-col justify-center h-full px-8 md:px-16">
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-title, serif)",
                  fontSize: "8px",
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: "rgba(240,232,215,0.6)",
                  padding: "4px 0",
                }}
              >
                Close Footer ✕
              </button>
            </div>
            <nav aria-label="Legal pages">
              <ul style={{ display: "flex", flexDirection: "column", gap: "16px", listStyle: "none", padding: 0, margin: 0 }}>
                {LEGAL_LINKS.map((link) => (
                  <li key={link.slug}>
                    <button
                      type="button"
                      onClick={() => { onClose(); onLegalOpen(link.slug); }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "var(--font-title, serif)",
                        fontSize: "11px",
                        letterSpacing: "0.25em",
                        textTransform: "uppercase",
                        color: "rgba(240,232,215,0.6)",
                        textDecoration: "none",
                        padding: 0,
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = GOLD)}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(240,232,215,0.6)")}
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <p style={{
              fontFamily: "var(--font-body, sans-serif)",
              fontSize: "9px",
              color: "rgba(240,232,215,0.5)",
              letterSpacing: "0.15em",
              marginTop: "24px",
            }}>
              © {new Date().getFullYear()} Popper Tulimond. All rights reserved.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
