"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";

const GOLD = "#C4A456";
const DARK = "#0e0e0e";

function MembershipSetupContent() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const router = useRouter();

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleActivate = async () => {
    setStatus("loading");
    setErrorMsg(null);

    try {
      // Get registration options
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

      // Trigger Face ID / fingerprint
      const registrationResponse = await startRegistration({ optionsJSON: options });

      // Verify
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
      setTimeout(() => router.push("/"), 2000);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  };

  if (!token) {
    return (
      <div style={{ minHeight: "100dvh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <p style={{ color: "rgba(240,232,215,0.5)", fontFamily: "var(--font-body, sans-serif)" }}>
          Invalid setup link. Contact us to get a new one.
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 440, width: "100%" }}>
        <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "9px", letterSpacing: "0.35em", textTransform: "uppercase", color: GOLD, marginBottom: 16 }}>
          Popper Tulimond
        </p>

        {status === "success" ? (
          <>
            <h1 style={{ fontFamily: "var(--font-display, serif)", fontSize: "28px", fontWeight: 300, color: "rgba(240,232,215,0.95)", marginBottom: 16 }}>
              Welcome to the Vault.
            </h1>
            <p style={{ fontFamily: "var(--font-body, sans-serif)", color: "rgba(240,232,215,0.55)", fontSize: "14px" }}>
              You can shop anytime. Redirecting...
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontFamily: "var(--font-display, serif)", fontSize: "28px", fontWeight: 300, color: "rgba(240,232,215,0.95)", marginBottom: 16, lineHeight: 1.3 }}>
              You&apos;re in. Finish your registration.
            </h1>
            <p style={{ fontFamily: "var(--font-body, sans-serif)", color: "rgba(240,232,215,0.6)", fontSize: "15px", lineHeight: 1.7, marginBottom: 32 }}>
              Register now and you can shop the Vault any time — not just once a month. This takes 10 seconds.
            </p>

            <button
              onClick={handleActivate}
              disabled={status === "loading"}
              style={{
                width: "100%",
                padding: "16px",
                background: "rgba(196,164,86,0.1)",
                border: `1px solid ${GOLD}`,
                color: GOLD,
                fontFamily: "var(--font-title, serif)",
                fontSize: "11px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: status === "loading" ? "not-allowed" : "pointer",
                opacity: status === "loading" ? 0.6 : 1,
                marginBottom: 16,
              }}
            >
              {status === "loading" ? "Activating..." : "Activate My Membership"}
            </button>

            {errorMsg && (
              <p style={{ color: "#e05555", fontSize: "13px", fontFamily: "var(--font-body, sans-serif)" }}>
                {errorMsg}
              </p>
            )}

            <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "rgba(240,232,215,0.25)", lineHeight: 1.6 }}>
              This link expires in 7 days. If you don&apos;t register now, we&apos;ll send you a reminder.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function MembershipSetupPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100dvh", background: "#0e0e0e", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "rgba(240,232,215,0.4)", fontFamily: "var(--font-body, sans-serif)" }}>Loading...</p>
      </div>
    }>
      <MembershipSetupContent />
    </Suspense>
  );
}
