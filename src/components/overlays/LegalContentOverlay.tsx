// src/components/overlays/LegalContentOverlay.tsx
"use client";

import type { CSSProperties } from "react";
import OverlayShell from "./OverlayShell";
import {
  TERMS_CONTENT,
  PRIVACY_CONTENT,
  SHIPPING_CONTENT,
  REFUND_CONTENT,
  CONTACT_CONTENT,
} from "@/lib/staticContent";

export type LegalPage = "terms" | "privacy" | "shipping" | "refund" | "contact-us";

interface LegalContentOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  page: LegalPage | null;
}

const GOLD = "rgba(196,164,86,0.7)";

const eyebrow: CSSProperties = {
  fontFamily: "var(--font-title, serif)",
  fontSize: "9px",
  letterSpacing: "0.3em",
  textTransform: "uppercase",
  color: GOLD,
  marginBottom: "16px",
};

const heading: CSSProperties = {
  fontFamily: "var(--font-display, serif)",
  fontSize: "clamp(24px, 4vw, 36px)",
  color: "rgba(240,232,215,0.95)",
  fontWeight: 300,
  letterSpacing: "0.04em",
  marginBottom: "40px",
};

const body: CSSProperties = {
  fontFamily: "var(--font-body, sans-serif)",
  fontSize: "14px",
  lineHeight: "1.85",
  color: "rgba(240,232,215,0.65)",
  whiteSpace: "pre-line",
};

function LegalContent({ page }: { page: LegalPage }) {
  switch (page) {
    case "terms":
      return (
        <>
          <p style={eyebrow}>Popper Tulimond — {TERMS_CONTENT.lastUpdated}</p>
          <h1 style={heading}>{TERMS_CONTENT.title}</h1>
          <p style={body}>{TERMS_CONTENT.body}</p>
        </>
      );
    case "privacy":
      return (
        <>
          <p style={eyebrow}>Popper Tulimond — {PRIVACY_CONTENT.lastUpdated}</p>
          <h1 style={heading}>{PRIVACY_CONTENT.title}</h1>
          <p style={body}>{PRIVACY_CONTENT.body}</p>
        </>
      );
    case "shipping":
      return (
        <>
          <p style={eyebrow}>Popper Tulimond — {SHIPPING_CONTENT.lastUpdated}</p>
          <h1 style={heading}>{SHIPPING_CONTENT.title}</h1>
          <p style={body}>{SHIPPING_CONTENT.body}</p>
        </>
      );
    case "refund":
      return (
        <>
          <p style={eyebrow}>Popper Tulimond — {REFUND_CONTENT.lastUpdated}</p>
          <h1 style={heading}>{REFUND_CONTENT.title}</h1>
          <p style={body}>{REFUND_CONTENT.body}</p>
        </>
      );
    case "contact-us": {
      const { address, phone, email, note } = CONTACT_CONTENT;
      const optionalLines = [
        phone ? `Phone: ${phone}` : null,
        email ? `Email: ${email}` : null,
      ].filter((x): x is string => x !== null);
      const lines = [
        address.line1,
        address.line2,
        ...(optionalLines.length ? ["", ...optionalLines] : []),
        "",
        note,
      ].join("\n");
      return (
        <>
          <p style={eyebrow}>Popper Tulimond — April 2026</p>
          <h1 style={heading}>Contact Us</h1>
          <p style={body}>{lines}</p>
        </>
      );
    }
    default:
      return null;
  }
}

export default function LegalContentOverlay({ isOpen, onClose, page }: LegalContentOverlayProps) {
  return (
    <OverlayShell isOpen={isOpen} onClose={onClose} label={page ? `Legal — ${page}` : "Legal"}>
      {page && <LegalContent page={page} />}
    </OverlayShell>
  );
}
