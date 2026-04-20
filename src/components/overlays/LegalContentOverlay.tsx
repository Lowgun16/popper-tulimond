// src/components/overlays/LegalContentOverlay.tsx
"use client";

import type { CSSProperties } from "react";
import OverlayShell from "./OverlayShell";
import type { AllLegalContent, LegalContent, ContactUsContent } from "@/lib/contentTypes";

export type LegalPage = "terms" | "privacy" | "shipping" | "refund" | "contact-us";

interface LegalContentOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  page: LegalPage | null;
  allLegal: AllLegalContent;
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

function LegalTextContent({ content }: { content: LegalContent }) {
  return (
    <>
      <p style={eyebrow}>Popper Tulimond — {content.lastUpdated}</p>
      <h1 style={heading}>{content.title}</h1>
      <p style={body}>{content.body}</p>
    </>
  );
}

function ContactUsPageContent({ content }: { content: ContactUsContent }) {
  const optionalLines = [
    content.phone ? `Phone: ${content.phone}` : null,
    content.email ? `Email: ${content.email}` : null,
  ].filter((x): x is string => x !== null);
  const lines = [
    content.address.line1,
    content.address.line2,
    ...(optionalLines.length ? ["", ...optionalLines] : []),
    "",
    content.note,
  ].join("\n");
  return (
    <>
      <p style={eyebrow}>Popper Tulimond</p>
      <h1 style={heading}>Contact Us</h1>
      <p style={body}>{lines}</p>
    </>
  );
}

function LegalPageContent({ page, allLegal }: { page: LegalPage; allLegal: AllLegalContent }) {
  switch (page) {
    case "terms":      return <LegalTextContent content={allLegal.terms} />;
    case "privacy":    return <LegalTextContent content={allLegal.privacy} />;
    case "shipping":   return <LegalTextContent content={allLegal.shipping} />;
    case "refund":     return <LegalTextContent content={allLegal.refund} />;
    case "contact-us": return <ContactUsPageContent content={allLegal.contactUs} />;
    default:           return null;
  }
}

export default function LegalContentOverlay({ isOpen, onClose, page, allLegal }: LegalContentOverlayProps) {
  return (
    <OverlayShell isOpen={isOpen} onClose={onClose} label={page ? `Legal — ${page}` : "Legal"}>
      {page && <LegalPageContent page={page} allLegal={allLegal} />}
    </OverlayShell>
  );
}
