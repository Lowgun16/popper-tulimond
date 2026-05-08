"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";
import { AnimatePresence } from "framer-motion";
import { MEMBERSHIP_CELEBRATION_CONTENT } from "@/lib/staticContent";
import type { MembershipCelebrationContent } from "@/lib/contentTypes";
import { MembershipCelebration, VaultTransition } from "@/components/MembershipCelebration";

const GOLD = "#C4A456";
const DARK = "#0e0e0e";

// ─── Setup form ───────────────────────────────────────────────────────────────

function MembershipSetupContent() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const preview = params.get("preview") === "1";
  const router = useRouter();

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(preview ? "success" : "idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  // Load editable celebration content
  const [content, setContent] = useState<MembershipCelebrationContent>(MEMBERSHIP_CELEBRATION_CONTENT);
  useEffect(() => {
    fetch("/api/content/membership-celebration")
      .then((r) => r.json())
      .then(({ content: overrides }) => {
        if (overrides && Object.keys(overrides).length > 0) {
          setContent((prev) => ({ ...prev, ...overrides }));
        }
      })
      .catch(() => {});
  }, []);

  const handleActivate = async () => {
    setStatus("loading");
    setErrorMsg(null);
    try {
      const optRes = await fetch("/api/member/webauthn/register-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupToken: token }),
      });
      if (!optRes.ok) {
        const d = await optRes.json();
        throw new Error(d.error ?? "Failed to start registration");
      }
      const options = await optRes.json();
      const registrationResponse = await startRegistration({ optionsJSON: options });
      const verifyRes = await fetch("/api/member/webauthn/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupToken: token, registrationResponse }),
      });
      if (!verifyRes.ok) {
        const d = await verifyRes.json();
        throw new Error(d.error ?? "Verification failed");
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  };

  const handleEnterVault = () => {
    setTransitioning(true);
    // VaultTransition fades to black, then onComplete fires which navigates
  };

  if (!token && !preview) {
    return (
      <div style={{ minHeight: "100dvh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <p style={{ color: "rgba(240,232,215,0.4)", fontFamily: "var(--font-body, sans-serif)" }}>
          Invalid setup link. Contact us to get a new one.
        </p>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {status === "success" && !transitioning && (
          <MembershipCelebration
            onEnterVault={handleEnterVault}
            content={content}
          />
        )}
      </AnimatePresence>

      {transitioning && (
        <VaultTransition onComplete={() => router.push("/")} />
      )}

      {status !== "success" && (
        <div style={{ minHeight: "100dvh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 440, width: "100%" }}>
            <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "9px", letterSpacing: "0.35em", textTransform: "uppercase", color: GOLD, marginBottom: 16 }}>
              Popper Tulimond
            </p>
            <h1 style={{ fontFamily: "var(--font-display, serif)", fontSize: "28px", fontWeight: 300, color: "rgba(240,232,215,0.95)", marginBottom: 16, lineHeight: 1.3 }}>
              You&apos;re in. One last step.
            </h1>
            <p style={{ fontFamily: "var(--font-body, sans-serif)", color: "rgba(240,232,215,0.6)", fontSize: "15px", lineHeight: 1.75, marginBottom: 12 }}>
              Register your device with Face ID or Touch ID. Ten seconds, and the Vault is yours — open anytime, forever.
            </p>
            <p style={{ fontFamily: "var(--font-body, sans-serif)", color: "rgba(240,232,215,0.4)", fontSize: "13px", lineHeight: 1.7, marginBottom: 32 }}>
              No passwords. No logins. Your face or fingerprint is your key.
            </p>
            <button
              onClick={handleActivate}
              disabled={status === "loading"}
              style={{
                width: "100%", padding: "16px",
                background: "rgba(196,164,86,0.1)", border: `1px solid ${GOLD}`, color: GOLD,
                fontFamily: "var(--font-title, serif)", fontSize: "11px",
                letterSpacing: "0.2em", textTransform: "uppercase",
                cursor: status === "loading" ? "not-allowed" : "pointer",
                opacity: status === "loading" ? 0.6 : 1, marginBottom: 16,
              }}
            >
              {status === "loading" ? "Activating..." : "Activate My Membership"}
            </button>
            {errorMsg && (
              <p style={{ color: "#e05555", fontSize: "13px", fontFamily: "var(--font-body, sans-serif)" }}>
                {errorMsg}
              </p>
            )}
            <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "rgba(240,232,215,0.2)", lineHeight: 1.6 }}>
              This link expires in 7 days.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default function MembershipSetupPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100dvh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "rgba(240,232,215,0.4)", fontFamily: "var(--font-body, sans-serif)" }}>Loading...</p>
      </div>
    }>
      <MembershipSetupContent />
    </Suspense>
  );
}
