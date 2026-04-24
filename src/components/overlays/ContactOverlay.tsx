// src/components/overlays/ContactOverlay.tsx
"use client";

import type { CSSProperties } from "react";
import OverlayShell from "./OverlayShell";
import type { ContactContent } from "@/lib/contentTypes";

interface ContactOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  content: ContactContent;
}

const eyebrowStyle: CSSProperties = {
  fontFamily: "var(--font-title, serif)",
  fontSize: "9px",
  letterSpacing: "0.35em",
  textTransform: "uppercase",
  color: "rgba(196,164,86,0.6)",
  marginBottom: "8px",
};

const fieldLabelStyle: CSSProperties = {
  fontFamily: "var(--font-title, serif)",
  fontSize: "9px",
  letterSpacing: "0.35em",
  textTransform: "uppercase",
  color: "rgba(196,164,86,0.6)",
  marginBottom: "8px",
};

const valueStyle: CSSProperties = {
  fontFamily: "var(--font-body, sans-serif)",
  fontSize: "15px",
  color: "rgba(240,232,215,0.85)",
  lineHeight: "1.6",
};

export default function ContactOverlay({ isOpen, onClose, content }: ContactOverlayProps) {
  return (
    <OverlayShell isOpen={isOpen} onClose={onClose} label="Contact Popper Tulimond">
      <p style={{ ...eyebrowStyle, marginBottom: "16px" }}>Popper Tulimond</p>
      <h1 style={{
        fontFamily: "var(--font-display, serif)",
        fontSize: "clamp(24px, 4vw, 36px)",
        color: "rgba(240,232,215,0.95)",
        letterSpacing: "0.04em",
        marginBottom: "48px",
        fontWeight: 300,
      }}>
        <span dangerouslySetInnerHTML={{ __html: content.headline }} />
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        {/* Address */}
        <div>
          <p style={fieldLabelStyle}>Headquarters</p>
          <p style={valueStyle}
            dangerouslySetInnerHTML={{ __html: `${content.address.line1}<br />${content.address.line2}` }} />
        </div>

        {/* Phone — only shown when populated */}
        {content.phone && (
          <div>
            <p style={fieldLabelStyle}>Phone</p>
            <a href={`tel:${content.phone}`} style={{ ...valueStyle, textDecoration: "none" }}>
              {content.phone}
            </a>
          </div>
        )}

        {/* Email — only shown when populated */}
        {content.email && (
          <div>
            <p style={fieldLabelStyle}>Email</p>
            <a href={`mailto:${content.email}`} style={{ ...valueStyle, textDecoration: "none" }}>
              {content.email}
            </a>
          </div>
        )}

        {/* Note */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: "24px",
          marginTop: "8px",
        }}>
          <p style={{
            fontFamily: "var(--font-body, sans-serif)",
            fontSize: "13px",
            color: "rgba(240,232,215,0.4)",
            lineHeight: "1.7",
            fontStyle: "italic",
          }} dangerouslySetInnerHTML={{ __html: content.note }} />
        </div>
      </div>
    </OverlayShell>
  );
}
