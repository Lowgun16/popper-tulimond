"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const GOLD = "#C4A456";
const DARK = "#0e0e0e";

// ─── Particle ────────────────────────────────────────────────────────────────

function GoldParticles() {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 160,
    y: -(60 + Math.random() * 120),
    size: 2 + Math.random() * 3,
    delay: Math.random() * 0.6,
    duration: 1.2 + Math.random() * 0.8,
    opacity: 0.4 + Math.random() * 0.5,
  }));

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: p.x * 0.3, y: 0, opacity: 0, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: [0, p.opacity, 0], scale: [1, 0.5, 0] }}
          transition={{ delay: 0.5 + p.delay, duration: p.duration, ease: "easeOut" }}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: GOLD,
            filter: "blur(0.5px)",
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
}

// ─── Shockwave ────────────────────────────────────────────────────────────────

function Shockwave() {
  return (
    <motion.div
      initial={{ scale: 0.2, opacity: 0.7 }}
      animate={{ scale: 3.5, opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: 180,
        height: 180,
        marginTop: -90,
        marginLeft: -90,
        borderRadius: "50%",
        border: `1.5px solid ${GOLD}`,
        pointerEvents: "none",
      }}
    />
  );
}

// ─── Celebration screen ───────────────────────────────────────────────────────

function MembershipCelebration({ onEnterVault }: { onEnterVault: () => void }) {
  const screenRef = useRef<HTMLDivElement>(null);

  // Haptic on mount
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([80, 40, 80, 40, 120]);
    }
  }, []);

  return (
    <motion.div
      ref={screenRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        position: "fixed",
        inset: 0,
        background: DARK,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        overflowY: "auto",
        zIndex: 9999,
      }}
    >
      {/* Gold wash on impact */}
      <motion.div
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
        style={{
          position: "fixed",
          inset: 0,
          background: "radial-gradient(circle at center, rgba(196,164,86,0.35) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Seal container */}
      <div style={{ position: "relative", marginBottom: 40 }}>
        <Shockwave />
        <GoldParticles />

        {/* The wax seal — stamps in from above */}
        <motion.div
          initial={{ y: -60, scale: 0.6, opacity: 0, filter: "brightness(4) blur(4px)" }}
          animate={{ y: 0, scale: 1, opacity: 1, filter: "brightness(1) blur(0px)" }}
          transition={{
            y:       { type: "spring", stiffness: 420, damping: 22, delay: 0.2 },
            scale:   { type: "spring", stiffness: 420, damping: 22, delay: 0.2 },
            opacity: { duration: 0.25, delay: 0.2 },
            filter:  { duration: 0.5, delay: 0.2 },
          }}
          style={{
            position: "relative",
            zIndex: 1,
            filter: "drop-shadow(0 0 28px rgba(196,164,86,0.6))",
          }}
        >
          <Image
            src="/assets/branding/logo-emblem.png"
            alt="Popper Tulimond seal"
            width={140}
            height={140}
            style={{ display: "block" }}
            priority
          />
        </motion.div>

        {/* Glow pulse after stamp */}
        <motion.div
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: [0, 0.5, 0], scale: [1, 1.6, 1] }}
          transition={{ duration: 1.4, delay: 0.6, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: -20,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(196,164,86,0.25) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Text reveals — staggered */}
      <motion.div style={{ textAlign: "center", maxWidth: 480 }}>

        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          style={{
            fontFamily: "var(--font-title, serif)",
            fontSize: "9px",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            color: GOLD,
            marginBottom: 20,
          }}
        >
          Popper Tulimond
        </motion.p>

        {/* Congratulations */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.7, ease: "easeOut" }}
          style={{
            fontFamily: "var(--font-display, serif)",
            fontSize: "clamp(30px, 7vw, 42px)",
            fontWeight: 300,
            color: "rgba(240,232,215,0.97)",
            marginBottom: 12,
            lineHeight: 1.2,
          }}
        >
          Congratulations.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.35, duration: 0.6 }}
          style={{
            fontFamily: "var(--font-title, serif)",
            fontSize: "10px",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: GOLD,
            marginBottom: 32,
          }}
        >
          You are now a full member of the Vault.
        </motion.p>

        {/* Gold divider */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.7 }}
          style={{
            height: 1,
            background: `linear-gradient(to right, transparent, ${GOLD}, transparent)`,
            marginBottom: 32,
          }}
        />

        {/* Body copy */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7, duration: 0.7 }}
        >
          <p style={{
            fontFamily: "var(--font-body, sans-serif)",
            fontSize: "15px",
            color: "rgba(240,232,215,0.65)",
            lineHeight: 1.85,
            marginBottom: 20,
          }}>
            The Vault is yours now — open every hour of every day. No windows. No waiting. No schedule. You shop when you decide to, not when we allow it.
          </p>
          <p style={{
            fontFamily: "var(--font-body, sans-serif)",
            fontSize: "15px",
            color: "rgba(240,232,215,0.65)",
            lineHeight: 1.85,
            marginBottom: 20,
          }}>
            Every piece in this collection was built for the man who holds the room without asking for it. The man who leads quietly, provides completely, and carries weight that no one else sees. That's you. It always has been.
          </p>
          <p style={{
            fontFamily: "var(--font-display, serif)",
            fontSize: "16px",
            color: "rgba(240,232,215,0.8)",
            lineHeight: 1.75,
            marginBottom: 36,
            fontStyle: "italic",
          }}>
            You are the main character. You always were. Welcome home.
          </p>
        </motion.div>

        {/* Gold divider */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 2.0, duration: 0.6 }}
          style={{
            height: 1,
            background: `linear-gradient(to right, transparent, rgba(196,164,86,0.4), transparent)`,
            marginBottom: 32,
          }}
        />

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2, duration: 0.6 }}
        >
          <button
            onClick={onEnterVault}
            style={{
              padding: "16px 48px",
              background: "rgba(196,164,86,0.12)",
              border: `1px solid ${GOLD}`,
              color: GOLD,
              fontFamily: "var(--font-title, serif)",
              fontSize: "10px",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(196,164,86,0.2)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(196,164,86,0.12)")}
          >
            Enter the Vault
          </button>
        </motion.div>

      </motion.div>
    </motion.div>
  );
}

// ─── Setup form ───────────────────────────────────────────────────────────────

function MembershipSetupContent() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const preview = params.get("preview") === "1";
  const router = useRouter();

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(preview ? "success" : "idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        {status === "success" && (
          <MembershipCelebration onEnterVault={() => router.push("/")} />
        )}
      </AnimatePresence>

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

            <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "rgba(240,232,215,0.2)", lineHeight: 1.6 }}>
              This link expires in 7 days. If you don&apos;t register now, we&apos;ll send you a reminder.
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
