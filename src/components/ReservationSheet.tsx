"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { RESERVATION_CONTENT } from "@/lib/staticContent";
import type { ReservationContent } from "@/lib/contentTypes";

const GOLD = "#C4A456";
const DARK = "rgba(10,10,10,0.98)";

interface CartItemSummary {
  name: string;
  size: string;
  colorway?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cartItems?: CartItemSummary[];
  contentOverride?: ReservationContent;
}

export default function ReservationSheet({ isOpen, onClose, cartItems = [], contentOverride }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [dropDate, setDropDate] = useState<string | null>(null);
  const [content, setContent] = useState<ReservationContent>(contentOverride ?? RESERVATION_CONTENT);

  useEffect(() => {
    if (contentOverride) {
      setContent(contentOverride);
      return;
    }
    fetch("/api/content/reservation")
      .then((r) => r.json())
      .then(({ content: overrides }) => {
        if (overrides && Object.keys(overrides).length > 0) {
          setContent((prev) => ({ ...prev, ...overrides }));
        }
      })
      .catch(() => {});
  }, [contentOverride]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/checkout/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, cartItems }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      if (data.dropDate) {
        const d = new Date(data.dropDate);
        setDropDate(d.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" }));
      }
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9100,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 460, width: "100%",
          background: DARK,
          borderTop: `2px solid ${GOLD}`,
          border: `1px solid rgba(196,164,86,0.18)`,
          borderTopColor: GOLD,
          padding: "40px 32px 32px",
          position: "relative",
          margin: "auto",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute", top: 14, right: 16,
            background: "none", border: "none",
            color: "rgba(255,255,255,0.3)", fontSize: 18, cursor: "pointer",
          }}
        >
          ✕
        </button>

        {status === "done" ? (
          /* ── Success state ─────────────────────────────────────── */
          <div style={{ textAlign: "center", paddingTop: 8 }}>
            <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "9px", letterSpacing: "0.35em", textTransform: "uppercase", color: GOLD, marginBottom: 24 }}>
              Popper Tulimond
            </p>
            <h2 style={{ fontFamily: "var(--font-display, serif)", fontSize: "24px", fontWeight: 300, color: "rgba(240,232,215,0.95)", marginBottom: 20, lineHeight: 1.35 }}>
              {content.success_headline}
            </h2>
            <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "15px", color: "rgba(240,232,215,0.6)", lineHeight: 1.75, marginBottom: 12 }}>
              {content.success_body}
            </p>
            <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "15px", color: "rgba(240,232,215,0.6)", lineHeight: 1.75, marginBottom: 32 }}>
              {dropDate
                ? `The Vault opens ${dropDate}. We'll send your early access link — fifteen minutes before anyone else.`
                : `We'll send your early access link the evening before the Vault opens.`}
            </p>
            {cartItems.length > 0 && (
              <div style={{ textAlign: "left", padding: "16px 0", borderTop: "1px solid rgba(196,164,86,0.15)", marginBottom: 24 }}>
                <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "9px", letterSpacing: "0.25em", textTransform: "uppercase", color: GOLD, marginBottom: 12 }}>
                  Your selection is saved
                </p>
                {cartItems.map((item, i) => (
                  <p key={i} style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "13px", color: "rgba(240,232,215,0.55)", margin: "0 0 4px" }}>
                    {item.name}{item.colorway ? ` — ${item.colorway}` : ""} / {item.size}
                  </p>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(196,164,86,0.08)", border: `1px solid ${GOLD}`,
                color: GOLD, padding: "13px 28px",
                fontFamily: "var(--font-title, serif)", fontSize: "10px",
                letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer",
              }}
            >
              Continue Browsing
            </button>
          </div>
        ) : (
          /* ── Form state ────────────────────────────────────────── */
          <>
            <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "9px", letterSpacing: "0.35em", textTransform: "uppercase", color: GOLD, marginBottom: 20 }}>
              Popper Tulimond
            </p>

            <h2 style={{ fontFamily: "var(--font-display, serif)", fontSize: "22px", fontWeight: 300, color: "rgba(240,232,215,0.95)", marginBottom: 16, lineHeight: 1.4 }}>
              {content.headline}
            </h2>

            <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "14px", color: "rgba(240,232,215,0.6)", lineHeight: 1.75, marginBottom: 10 }}>
              {content.body_1}
            </p>
            <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "14px", color: "rgba(240,232,215,0.6)", lineHeight: 1.75, marginBottom: 28 }}>
              {content.body_2}
            </p>

            {cartItems.length > 0 && (
              <div style={{ padding: "14px 0", borderTop: "1px solid rgba(196,164,86,0.15)", borderBottom: "1px solid rgba(196,164,86,0.15)", marginBottom: 24 }}>
                <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "9px", letterSpacing: "0.25em", textTransform: "uppercase", color: GOLD, marginBottom: 10 }}>
                  We'll hold your selection
                </p>
                {cartItems.map((item, i) => (
                  <p key={i} style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "13px", color: "rgba(240,232,215,0.5)", margin: "0 0 3px" }}>
                    {item.name}{item.colorway ? ` — ${item.colorway}` : ""} / Size {item.size}
                  </p>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="text"
                placeholder="First name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
                aria-label="First name"
              />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
                aria-label="Email address"
              />
              <input
                type="tel"
                placeholder="Phone for SMS reminder (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
                aria-label="Phone number"
              />

              {status === "error" && (
                <p style={{ fontSize: "12px", color: "#e05555", margin: 0 }}>
                  Something went wrong. Please try again.
                </p>
              )}

              <button
                type="submit"
                disabled={!email.trim() || status === "loading"}
                style={{
                  marginTop: 4,
                  padding: "15px",
                  background: "rgba(196,164,86,0.1)",
                  border: `1px solid ${GOLD}`,
                  color: GOLD,
                  fontFamily: "var(--font-title, serif)",
                  fontSize: "10px",
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  cursor: !email.trim() || status === "loading" ? "not-allowed" : "pointer",
                  opacity: !email.trim() || status === "loading" ? 0.5 : 1,
                }}
              >
                {status === "loading" ? "Reserving..." : content.cta_text}
              </button>

              <p style={{ textAlign: "center", margin: "4px 0 0", fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "rgba(240,232,215,0.25)", lineHeight: 1.6 }}>
                {content.fine_print}
              </p>
            </form>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  padding: "12px 14px",
  color: "rgba(240,232,215,0.9)",
  fontFamily: "var(--font-body, sans-serif)",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
  borderRadius: 0,
};
