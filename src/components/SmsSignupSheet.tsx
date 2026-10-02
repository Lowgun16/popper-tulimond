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
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) { setError("First name is required."); return; }
    if (!phone.trim()) { setError("Phone number is required."); return; }
    if (!agreed) { setError("Please check the box to agree to receive texts."); return; }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/sms-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: firstName.trim(), phone: phone.trim(), source }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Submission failed");
      }
      setFirstName("");
      setSubmitted(true);
    } catch (err) {
      console.error("[SmsSignup] Submission error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFirstName("");
    setPhone("");
    setAgreed(false);
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
                  fontSize: "12px", color: "rgba(240,232,215,0.62)",
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
                    type="text"
                    placeholder="First name *"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    style={inputStyle}
                    aria-label="First name"
                  />
                  <input
                    type="tel"
                    placeholder="Phone number *"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    style={inputStyle}
                    aria-label="Phone number"
                  />
                </div>

                {/* Explicit, unchecked SMS consent checkbox — required for A2P/carrier web-form opt-in */}
                <label style={{
                  display: "flex", gap: "10px", alignItems: "flex-start",
                  marginBottom: "16px", cursor: "pointer",
                  fontFamily: "var(--font-body, sans-serif)",
                  fontSize: "10px", color: "rgba(240,232,215,0.6)", lineHeight: 1.6,
                }}>
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    style={{ marginTop: "2px", flexShrink: 0, width: "16px", height: "16px", accentColor: GOLD }}
                    aria-label="Agree to receive recurring marketing text messages"
                  />
                  <span>
                    Yes — text me. I agree to receive recurring automated marketing texts (early-access alerts and drop notifications) from Popper Tulimond at the number provided. Consent is not a condition of purchase. Message frequency varies. Msg &amp; data rates may apply. Reply HELP for help, STOP to cancel. See our{" "}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(240,232,215,0.8)", textDecoration: "underline" }}>Privacy Policy</a>
                    {" "}and{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(240,232,215,0.8)", textDecoration: "underline" }}>Terms</a>.
                  </span>
                </label>

                {error && (
                  <p style={{ fontSize: "12px", color: "#e05555", marginBottom: "12px" }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !agreed || !firstName.trim() || !phone.trim()}
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
                    cursor: (submitting || !agreed || !firstName.trim() || !phone.trim()) ? "not-allowed" : "pointer",
                    opacity: (submitting || !agreed || !firstName.trim() || !phone.trim()) ? 0.5 : 1,
                  }}
                >
                  {submitting ? "..." : "Get Early Access"}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
