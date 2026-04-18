// src/components/SmsSignupSheet.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";

interface SmsSignupSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Where this was triggered from — for analytics later */
  source: "protocol_cta" | "blocked_purchase";
}

const GOLD = "#C4A456";

const inputStyle: CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "2px",
  padding: "12px 14px",
  color: "rgba(240,232,215,0.9)",
  fontFamily: "var(--font-body, sans-serif)",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

export default function SmsSignupSheet({ isOpen, onClose, source }: SmsSignupSheetProps) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) { setError("Phone number is required."); return; }
    setSubmitting(true);
    setError(null);

    try {
      // Phase B will wire this to the real API route.
      const payload = { phone: phone.trim(), email: email.trim() || null, source };
      console.log("[SmsSignup] Payload (Phase A stub):", payload);
      await new Promise<void>((r) => setTimeout(r, 600));
      setSubmitted(true);
    } catch (err) {
      console.error("[SmsSignup] Submission error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setPhone("");
    setEmail("");
    setSubmitted(false);
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 z-[7000] flex items-center justify-center p-5"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="z-[7001] w-full"
            style={{
              maxWidth: "480px",
              background: "rgba(10,10,10,0.98)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderTop: `2px solid ${GOLD}`,
              padding: "36px 32px 28px",
              maxHeight: "90dvh",
              overflowY: "auto",
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close signup sheet"
              style={{
                position: "absolute", top: 14, right: 16,
                background: "none", border: "none",
                color: "rgba(255,255,255,0.4)", fontSize: 16, cursor: "pointer",
              }}
            >
              ✕
            </button>

            {submitted ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <p style={{
                  fontFamily: "var(--font-title, serif)",
                  fontSize: "9px", letterSpacing: "0.35em", textTransform: "uppercase",
                  color: GOLD, marginBottom: "16px",
                }}>
                  You're in.
                </p>
                <p style={{
                  fontFamily: "var(--font-display, serif)",
                  fontSize: "18px", color: "rgba(240,232,215,0.9)",
                  lineHeight: 1.5,
                }}>
                  We'll text you 15 minutes before the door opens.
                </p>
                <p style={{
                  fontFamily: "var(--font-body, sans-serif)",
                  fontSize: "12px", color: "rgba(240,232,215,0.35)",
                  marginTop: "12px",
                }}>
                  Don't be late.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <p style={{
                  fontFamily: "var(--font-title, serif)",
                  fontSize: "9px", letterSpacing: "0.35em", textTransform: "uppercase",
                  color: GOLD, marginBottom: "16px",
                }}>
                  Early Access
                </p>
                <p style={{
                  fontFamily: "var(--font-display, serif)",
                  fontSize: "16px", color: "rgba(240,232,215,0.85)",
                  lineHeight: 1.6, marginBottom: "28px",
                }}>
                  15 minutes before the public. That's usually enough time.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                  <input
                    type="tel"
                    placeholder="Phone number *"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    style={inputStyle}
                    aria-label="Phone number"
                  />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={inputStyle}
                    aria-label="Email address (optional)"
                  />
                </div>

                {error && (
                  <p style={{ fontSize: "12px", color: "#e05555", marginBottom: "12px" }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "rgba(196,164,86,0.1)",
                    border: `1px solid ${GOLD}`,
                    color: GOLD,
                    fontFamily: "var(--font-title, serif)",
                    fontSize: "10px",
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? "..." : "Get Early Access"}
                </button>

                {/* TCPA compliance — required by law */}
                <p style={{
                  fontFamily: "var(--font-body, sans-serif)",
                  fontSize: "9px",
                  color: "rgba(240,232,215,0.25)",
                  marginTop: "14px",
                  lineHeight: 1.6,
                }}>
                  By submitting, you consent to receive recurring automated marketing text messages from Popper Tulimond at the number provided. Message & data rates may apply. Reply STOP to unsubscribe at any time.
                </p>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
