"use client";

import { useState, type FormEvent, type CSSProperties } from "react";

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

export default function JoinForm() {
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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
        body: JSON.stringify({
          firstName: firstName.trim(),
          phone: phone.trim(),
          source: "join_page",
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error || "Submission failed");
      }
      setSubmitted(true);
    } catch (err) {
      console.error("[JoinForm] Submission error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "10px", letterSpacing: "0.35em", textTransform: "uppercase", color: GOLD, marginBottom: "14px" }}>
          You&apos;re in.
        </p>
        <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "15px", color: "rgba(240,232,215,0.8)", lineHeight: 1.7 }}>
          We&apos;ll text you the moment the doors are about to open.
        </p>
      </div>
    );
  }

  const disabled = submitting || !agreed || !firstName.trim() || !phone.trim();

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "18px" }}>
        <input type="text" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={inputStyle} aria-label="First name" />
        <input type="tel" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} required style={inputStyle} aria-label="Phone number" />
      </div>

      {/* Explicit, unchecked SMS consent — publicly readable for carrier/A2P verification */}
      <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "16px", cursor: "pointer", fontFamily: "var(--font-body, sans-serif)", fontSize: "12px", color: "rgba(240,232,215,0.65)", lineHeight: 1.6 }}>
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: "2px", flexShrink: 0, width: "16px", height: "16px", accentColor: GOLD }} aria-label="Agree to receive recurring marketing text messages" />
        <span>
          Yes — text me. I agree to receive recurring automated marketing text messages (early-access alerts and drop notifications) from Popper Tulimond at the number provided. Consent is not a condition of purchase. Message frequency varies. Msg &amp; data rates may apply. Reply HELP for help, STOP to cancel. See our{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(240,232,215,0.85)", textDecoration: "underline" }}>Privacy Policy</a>
          {" "}and{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(240,232,215,0.85)", textDecoration: "underline" }}>Terms</a>.
        </span>
      </label>

      {error && <p style={{ fontSize: "12px", color: "#e05555", marginBottom: "12px" }}>{error}</p>}

      <button type="submit" disabled={disabled} style={{ width: "100%", padding: "14px", background: "rgba(196,164,86,0.1)", border: `1px solid ${GOLD}`, color: GOLD, fontFamily: "var(--font-title, serif)", fontSize: "10px", letterSpacing: "0.25em", textTransform: "uppercase", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}>
        {submitting ? "..." : "Notify Me"}
      </button>
    </form>
  );
}
