// src/components/overlays/AboutOverlay.tsx
"use client";

import type { CSSProperties } from "react";
import OverlayShell from "./OverlayShell";
import type { AboutContent } from "@/lib/contentTypes";

interface AboutOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  content: AboutContent;
}

const eyebrow: CSSProperties = {
  fontFamily: "var(--font-title, serif)",
  fontSize: "9px",
  letterSpacing: "0.35em",
  textTransform: "uppercase",
  color: "rgba(196,164,86,0.7)",
};

const sectionTitle: CSSProperties = {
  fontFamily: "var(--font-display, serif)",
  fontSize: "18px",
  color: "rgba(240,232,215,0.9)",
  letterSpacing: "0.06em",
  marginBottom: "16px",
  marginTop: "40px",
};

const bodyText: CSSProperties = {
  fontFamily: "var(--font-body, sans-serif)",
  fontSize: "14px",
  color: "rgba(240,232,215,0.65)",
  lineHeight: "1.85",
  letterSpacing: "0.02em",
  whiteSpace: "pre-line",
};

export default function AboutOverlay({ isOpen, onClose, content }: AboutOverlayProps) {
  return (
    <OverlayShell isOpen={isOpen} onClose={onClose} label="About Popper Tulimond">
      {/* Header */}
      <p style={eyebrow}>Popper Tulimond</p>
      <h1 style={{
        fontFamily: "var(--font-display, serif)",
        fontSize: "clamp(28px, 5vw, 44px)",
        color: "rgba(240,232,215,0.95)",
        letterSpacing: "0.04em",
        marginTop: "12px",
        marginBottom: "6px",
        fontWeight: 300,
      }}>
        {content.headline}
      </h1>
      <p style={{ ...eyebrow, color: "rgba(240,232,215,0.35)", marginBottom: "40px" }}>
        {content.subheadline}
      </p>

      {/* Gold divider */}
      <div style={{ width: "48px", height: "1px", background: "rgba(196,164,86,0.5)", marginBottom: "40px" }} />

      {/* Sections */}
      {content.sections.map((section) => (
        <div key={section.id}>
          <h2 style={sectionTitle}>{section.title}</h2>
          <p style={bodyText}>{section.body}</p>
        </div>
      ))}

      {/* Closing */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "48px", paddingTop: "32px" }}>
        <p style={{ ...bodyText, color: "rgba(196,164,86,0.5)", whiteSpace: "pre-line" }}>
          {content.closing}
        </p>
      </div>
    </OverlayShell>
  );
}
