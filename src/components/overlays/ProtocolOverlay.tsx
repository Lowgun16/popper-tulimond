// src/components/overlays/ProtocolOverlay.tsx
"use client";

import type { CSSProperties } from "react";
import OverlayShell from "./OverlayShell";
import type { ProtocolContent } from "@/lib/contentTypes";

interface ProtocolOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when user clicks the SMS early access CTA */
  onRequestSmsSignup: () => void;
  content: ProtocolContent;
}

/** Red gun SVG — outline only, vertical orientation, barrel up. Matches physical tag. */
function RedGunSvg() {
  return (
    <svg width="22" height="38" viewBox="0 0 44 76" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="17" y="2" width="10" height="28" rx="2" stroke="#8B1A1A" strokeWidth="2.5" fill="none"/>
      <rect x="14" y="8" width="16" height="22" rx="2" stroke="#8B1A1A" strokeWidth="2" fill="none"/>
      <rect x="16" y="12" width="8" height="8" rx="1" stroke="#8B1A1A" strokeWidth="1.5" fill="none"/>
      <rect x="16" y="28" width="16" height="10" rx="1" stroke="#8B1A1A" strokeWidth="2" fill="none"/>
      <path d="M20 38 Q14 46 20 52 L28 52" stroke="#8B1A1A" strokeWidth="2" fill="none"/>
      <line x1="24" y1="39" x2="24" y2="48" stroke="#8B1A1A" strokeWidth="2.5" strokeLinecap="round"/>
      <rect x="18" y="50" width="12" height="22" rx="2" stroke="#8B1A1A" strokeWidth="2" fill="none"/>
      <line x1="19" y1="56" x2="29" y2="56" stroke="#8B1A1A" strokeWidth="1" strokeOpacity="0.6"/>
      <line x1="19" y1="61" x2="29" y2="61" stroke="#8B1A1A" strokeWidth="1" strokeOpacity="0.6"/>
      <line x1="19" y1="66" x2="29" y2="66" stroke="#8B1A1A" strokeWidth="1" strokeOpacity="0.6"/>
      <circle cx="24" cy="8" r="3" stroke="#8B1A1A" strokeWidth="2" fill="none"/>
      <rect x="20" y="0" width="4" height="4" rx="1" fill="#8B1A1A"/>
    </svg>
  );
}

export default function ProtocolOverlay({ isOpen, onClose, onRequestSmsSignup, content }: ProtocolOverlayProps) {
  return (
    <OverlayShell isOpen={isOpen} onClose={onClose} label="The Protocol">
      {/* Dark background fills the overlay shell; card is centered within */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100%" }}>

        {/* The Card */}
        <div style={{
          background: "linear-gradient(160deg, #EDE8DC, #E0D9C8)",
          padding: "36px 36px 52px 40px",
          maxWidth: "380px",
          width: "100%",
          position: "relative",
          transform: "rotate(-1.2deg)",
          boxShadow: "4px 8px 32px rgba(0,0,0,0.8), inset 0 0 40px rgba(0,0,0,0.04)",
          borderRadius: "1px 3px 3px 1px",
        }}>

          {/* Red pin */}
          <div style={{
            position: "absolute", top: "-7px", left: "50%", transform: "translateX(-50%)",
            width: "11px", height: "11px", borderRadius: "50%",
            background: "#8B1A1A", boxShadow: "0 2px 6px rgba(0,0,0,0.6)",
          }} />

          {/* Header */}
          <p style={{
            fontFamily: "'Courier New', monospace",
            fontSize: "8px", letterSpacing: "0.3em",
            color: "#4a3f2f", textTransform: "uppercase" as CSSProperties["textTransform"], marginBottom: "10px",
          }} dangerouslySetInnerHTML={{ __html: content.header }} />

          <h2 style={{
            fontFamily: "'Courier New', monospace",
            fontSize: "20px", color: "#1a140a",
            marginBottom: "18px", letterSpacing: "0.08em", fontWeight: 700,
          }} dangerouslySetInnerHTML={{ __html: content.title }} />

          <div style={{ width: "100%", height: "1px", background: "#9a8a6a", marginBottom: "22px" }} />

          {/* Rules */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "26px" }}>
            {content.rules.map((rule) => (
              <div key={rule.number} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <span style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: "11px", color: "#8B1A1A",
                  fontWeight: 700, minWidth: "28px", paddingTop: "1px",
                }}>
                  {rule.number} —
                </span>
                <p style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: "11.5px", color: "#1a140a", lineHeight: 1.65,
                }} dangerouslySetInnerHTML={{ __html: rule.text }} />
              </div>
            ))}
          </div>

          <div style={{ width: "100%", height: "1px", background: "#9a8a6a", marginBottom: "18px" }} />

          {/* CTA */}
          <div style={{
            fontFamily: "'Courier New', monospace",
            fontSize: "10px", color: "#4a3f2f", lineHeight: 1.65,
          }}>
            <button
              onClick={onRequestSmsSignup}
              style={{
                background: "none", border: "none", padding: 0, cursor: "pointer",
                fontFamily: "'Courier New', monospace",
                fontSize: "10px", color: "#1a140a", fontWeight: 700,
                textDecoration: "underline", textUnderlineOffset: "3px",
              }}
            >
              <span dangerouslySetInnerHTML={{ __html: content.cta }} />
            </button>
            <br />
            <span style={{ color: "#4a3f2f" }} dangerouslySetInnerHTML={{ __html: content.ctaSubtext }} />
          </div>

          {/* Bottom-right image slot — swappable via Edit Pages (Phase B) */}
          {/* To swap: replace this div's contents with <img src="..." /> */}
          <div style={{
            position: "absolute", bottom: "16px", right: "18px", opacity: 0.15,
          }}>
            <RedGunSvg />
          </div>
        </div>
      </div>
    </OverlayShell>
  );
}
