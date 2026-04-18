// src/components/ProtocolGate.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";

interface ProtocolGateProps {
  isOpen: boolean;
  onClose: () => void;
  onViewProtocol: () => void;
  onRequestSmsSignup: () => void;
}

const GOLD = "#C4A456";

export default function ProtocolGate({ isOpen, onClose, onViewProtocol, onRequestSmsSignup }: ProtocolGateProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[7000] flex items-center justify-center p-5"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Membership required"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full"
            style={{
              maxWidth: "440px",
              background: "rgba(10,10,10,0.98)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderTop: "1px solid rgba(196,164,86,0.4)",
              padding: "36px 32px",
              maxHeight: "90dvh",
              overflowY: "auto",
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                position: "absolute", top: 14, right: 16,
                background: "none", border: "none",
                color: "rgba(255,255,255,0.3)", fontSize: 16, cursor: "pointer",
              }}
            >
              ✕
            </button>

            <p style={{
              fontFamily: "var(--font-title, serif)",
              fontSize: "9px", letterSpacing: "0.35em", textTransform: "uppercase",
              color: "rgba(196,164,86,0.6)", marginBottom: "16px",
            }}>
              Popper Tulimond
            </p>

            <p style={{
              fontFamily: "var(--font-display, serif)",
              fontSize: "17px", color: "rgba(240,232,215,0.88)",
              lineHeight: 1.7, marginBottom: "28px",
            }}>
              We see you. The Constable isn't available right now — but it will be. On the 16th of every month at midnight EST, we open the door for a limited number of new members. Text CONSTABLE to get 15 minutes of early access before the public. That's usually enough time.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                onClick={() => { onClose(); onRequestSmsSignup(); }}
                style={{
                  width: "100%", padding: "13px",
                  background: "rgba(196,164,86,0.1)",
                  border: `1px solid ${GOLD}`,
                  color: GOLD,
                  fontFamily: "var(--font-title, serif)",
                  fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Get Early Access
              </button>
              <button
                type="button"
                onClick={() => { onClose(); onViewProtocol(); }}
                style={{
                  width: "100%", padding: "13px",
                  background: "none",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(240,232,215,0.5)",
                  fontFamily: "var(--font-title, serif)",
                  fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                View The Protocol
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
