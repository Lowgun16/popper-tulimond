// src/components/AtelierNav.tsx
"use client";

import { motion, type MotionValue, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import Image from "next/image";
import { useMemberSession } from "@/hooks/useMemberSession";
import { useCart } from "@/contexts/CartContext";
import { createPortal } from "react-dom";

export type NavPage = "vault" | "about" | "protocol" | "contact";

interface NavLink {
  id: NavPage;
  label: string;
  redDot?: boolean;
}

const NAV_LINKS: NavLink[] = [
  { id: "vault",    label: "Vault" },
  { id: "about",    label: "About" },
  { id: "protocol", label: "The Protocol", redDot: true },
  { id: "contact",  label: "Contact" },
];

interface Props {
  opacity: MotionValue<number>;
  onNavClick: (page: NavPage) => void;
  footerOpen: boolean;
  onLegalClick: () => void;
}

export default function AtelierNav({ opacity, onNavClick, footerOpen, onLegalClick }: Props) {
  const [active, setActive] = useState(false);
  useMotionValueEvent(opacity, "change", (v) => setActive(v > 0.05));

  const { session: memberSession, refresh: refreshMember } = useMemberSession();
  const { items, openCart } = useCart();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginStatus, setLoginStatus] = useState<"idle" | "loading" | "error">("idle");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);

  const handleLogin = async () => {
    setLoginStatus("loading");
    setLoginError(null);
    try {
      const optRes = await fetch("/api/member/webauthn/auth-options", { method: "POST" });
      const options = await optRes.json();
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const authResponse = await startAuthentication({ optionsJSON: options });
      const verifyRes = await fetch("/api/member/webauthn/auth-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authenticationResponse: authResponse }),
      });
      if (!verifyRes.ok) throw new Error("Authentication failed");
      await refreshMember();
      setLoginOpen(false);
      setLoginStatus("idle");
    } catch (err) {
      setLoginStatus("error");
      setLoginError(err instanceof Error ? err.message : "Authentication failed. Try again.");
    }
  };

  const handleRecovery = async () => {
    await fetch("/api/member/login-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: recoveryPhone }),
    });
    setRecoverySent(true);
  };

  const handleSignOut = async () => {
    await fetch("/api/member/webauthn/logout", { method: "POST" });
    refreshMember();
  };

  const closeModal = () => {
    setLoginOpen(false);
    setLoginStatus("idle");
    setLoginError(null);
    setRecoveryMode(false);
    setRecoveryPhone("");
    setRecoverySent(false);
  };

  return (
    <>
      <motion.nav
        aria-label="Primary navigation"
        className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center pt-8 md:pt-10 pb-4"
        style={{ opacity, pointerEvents: active ? "auto" : "none" }}
      >
        <Image
          src="/assets/branding/logo-horizontal.png"
          alt="Popper Tulimond"
          width={220} height={64}
          className="object-contain mb-4 w-[180px] md:w-[220px]"
          priority
        />

        <div className="flex items-center gap-3 md:gap-8">
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => onNavClick(link.id)}
              className="type-eyebrow py-3 px-1 inline-flex items-center gap-1.5 transition-colors duration-300 bg-transparent border-none cursor-pointer"
              style={{ color: "var(--color-parchment)", opacity: 0.75 }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.75")}
            >
              {link.redDot && (
                <span
                  aria-hidden="true"
                  style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#8B1A1A", display: "inline-block", flexShrink: 0 }}
                />
              )}
              {link.label}
            </button>
          ))}

          <div className="hidden md:flex items-center gap-2">
            <span aria-hidden="true" style={{ color: "rgba(240,232,215,0.15)", fontSize: "12px" }}>|</span>
            <button
              type="button"
              onClick={onLegalClick}
              className="type-eyebrow py-3 px-1 bg-transparent border-none cursor-pointer transition-colors duration-300"
              style={{ color: "var(--color-parchment)", opacity: footerOpen ? 0.9 : 0.4, fontSize: "9px", letterSpacing: "0.2em" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.75")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = footerOpen ? "0.9" : "0.4")}
            >
              {footerOpen ? "Close Footer" : "Legal"}
            </button>
          </div>

          {items.length > 0 && (
            <div className="flex items-center gap-2">
              <span aria-hidden="true" style={{ color: "rgba(240,232,215,0.15)", fontSize: "12px" }}>|</span>
              <button
                type="button"
                onClick={openCart}
                className="type-eyebrow py-3 px-1 bg-transparent border-none cursor-pointer transition-colors duration-300 inline-flex items-center gap-1.5"
                style={{ color: "var(--color-parchment)", opacity: 0.75, fontSize: "9px", letterSpacing: "0.2em" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.75")}
                aria-label={`Open cart — ${items.length} item${items.length !== 1 ? "s" : ""}`}
              >
                Cart
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: "16px", height: "16px", borderRadius: "50%",
                  background: "#C4A456", color: "#0e0e0e",
                  fontSize: "8px", fontFamily: "var(--font-title, serif)", fontWeight: 600,
                }}>
                  {items.length}
                </span>
              </button>
            </div>
          )}

          <div className="hidden md:flex items-center gap-2">
            <span aria-hidden="true" style={{ color: "rgba(240,232,215,0.15)", fontSize: "12px" }}>|</span>
            {memberSession ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="type-eyebrow py-3 px-1 bg-transparent border-none cursor-pointer transition-colors duration-300"
                style={{ color: "var(--color-parchment)", opacity: 0.4, fontSize: "9px", letterSpacing: "0.2em" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.75")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.4")}
              >
                Sign Out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="type-eyebrow py-3 px-1 bg-transparent border-none cursor-pointer transition-colors duration-300"
                style={{ color: "var(--color-parchment)", opacity: 0.4, fontSize: "9px", letterSpacing: "0.2em" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.75")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.4")}
              >
                Member Login
              </button>
            )}
          </div>
        </div>
      </motion.nav>

      {loginOpen && typeof document !== "undefined" && createPortal(
        <div
          onClick={closeModal}
          style={{
            position: "fixed", inset: 0, zIndex: 9000,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "420px", width: "100%",
              background: "rgba(10,10,10,0.98)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderTop: "2px solid #C4A456",
              padding: "36px 32px 28px",
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close login"
              style={{
                position: "absolute", top: 14, right: 16,
                background: "none", border: "none",
                color: "rgba(255,255,255,0.4)", fontSize: 16, cursor: "pointer",
              }}
            >
              ✕
            </button>

            {!recoveryMode ? (
              <>
                <p style={{
                  fontFamily: "var(--font-title, serif)",
                  fontSize: "9px", letterSpacing: "0.35em", textTransform: "uppercase",
                  color: "#C4A456", marginBottom: "16px",
                }}>
                  Member Access
                </p>
                <p style={{
                  fontFamily: "var(--font-display, serif)",
                  fontSize: "16px", color: "rgba(240,232,215,0.85)",
                  lineHeight: 1.6, marginBottom: "28px",
                }}>
                  Authenticate with your registered device.
                </p>

                {loginError && (
                  <p style={{ fontSize: "12px", color: "#e05555", marginBottom: "12px" }}>{loginError}</p>
                )}

                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loginStatus === "loading"}
                  style={{
                    width: "100%", padding: "14px",
                    background: "rgba(196,164,86,0.1)",
                    border: "1px solid #C4A456",
                    color: "#C4A456",
                    fontFamily: "var(--font-title, serif)",
                    fontSize: "10px", letterSpacing: "0.25em", textTransform: "uppercase",
                    cursor: loginStatus === "loading" ? "not-allowed" : "pointer",
                    opacity: loginStatus === "loading" ? 0.6 : 1,
                    marginBottom: "16px",
                  }}
                >
                  {loginStatus === "loading" ? "Authenticating..." : "Authenticate"}
                </button>

                <button
                  type="button"
                  onClick={() => setRecoveryMode(true)}
                  style={{
                    background: "none", border: "none", padding: 0,
                    color: "rgba(240,232,215,0.35)",
                    fontFamily: "var(--font-title, serif)",
                    fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase",
                    cursor: "pointer", textDecoration: "underline",
                  }}
                >
                  New device? Get a login link
                </button>
              </>
            ) : (
              <>
                <p style={{
                  fontFamily: "var(--font-title, serif)",
                  fontSize: "9px", letterSpacing: "0.35em", textTransform: "uppercase",
                  color: "#C4A456", marginBottom: "16px",
                }}>
                  New Device Recovery
                </p>

                {recoverySent ? (
                  <p style={{
                    fontFamily: "var(--font-display, serif)",
                    fontSize: "15px", color: "rgba(240,232,215,0.75)",
                    lineHeight: 1.6,
                  }}>
                    If that number is in our system, we sent a setup link. Check your messages.
                  </p>
                ) : (
                  <>
                    <p style={{
                      fontFamily: "var(--font-body, sans-serif)",
                      fontSize: "13px", color: "rgba(240,232,215,0.55)",
                      lineHeight: 1.6, marginBottom: "20px",
                    }}>
                      Enter your phone number and we&apos;ll text you a link to set up this device.
                    </p>
                    <input
                      type="tel"
                      placeholder="Phone number"
                      value={recoveryPhone}
                      onChange={(e) => setRecoveryPhone(e.target.value)}
                      style={{
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
                        marginBottom: "16px",
                      }}
                      aria-label="Phone number for recovery"
                    />
                    <button
                      type="button"
                      onClick={handleRecovery}
                      disabled={!recoveryPhone.trim()}
                      style={{
                        width: "100%", padding: "14px",
                        background: "rgba(196,164,86,0.1)",
                        border: "1px solid #C4A456",
                        color: "#C4A456",
                        fontFamily: "var(--font-title, serif)",
                        fontSize: "10px", letterSpacing: "0.25em", textTransform: "uppercase",
                        cursor: !recoveryPhone.trim() ? "not-allowed" : "pointer",
                        opacity: !recoveryPhone.trim() ? 0.5 : 1,
                        marginBottom: "12px",
                      }}
                    >
                      Send Login Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecoveryMode(false)}
                      style={{
                        background: "none", border: "none", padding: 0,
                        color: "rgba(240,232,215,0.35)",
                        fontFamily: "var(--font-title, serif)",
                        fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase",
                        cursor: "pointer", textDecoration: "underline",
                      }}
                    >
                      Back
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
