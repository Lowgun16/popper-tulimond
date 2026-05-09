"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import type { MembershipCelebrationContent } from "@/lib/contentTypes";
import { playSealStampSound } from "@/lib/sounds";

const GOLD = "#C4A456";
const DARK = "#0e0e0e";

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
            position: "absolute", top: "50%", left: "50%",
            width: p.size, height: p.size, borderRadius: "50%",
            background: GOLD, filter: "blur(0.5px)",
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
}

function Shockwave() {
  return (
    <motion.div
      initial={{ scale: 0.2, opacity: 0.7 }}
      animate={{ scale: 3.5, opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
      style={{
        position: "absolute", top: "50%", left: "50%",
        width: 180, height: 180, marginTop: -90, marginLeft: -90,
        borderRadius: "50%", border: `1.5px solid ${GOLD}`, pointerEvents: "none",
      }}
    />
  );
}

export function VaultTransition({ onComplete }: { onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.9, ease: "easeIn" }}
      onAnimationComplete={onComplete}
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: DARK,
        // ── VAULT ANIMATION PLACEHOLDER ──────────────────────────────
        // When the vault door video is ready, replace this div with:
        //   <video src={vaultVideoUrl} autoPlay muted playsInline onEnded={onComplete} />
        // and remove the motion.div fade. The video should play the vault
        // door opening animation, then onComplete navigates to the vault.
        // ─────────────────────────────────────────────────────────────
      }}
    />
  );
}

interface MembershipCelebrationProps {
  onEnterVault: () => void;
  content: MembershipCelebrationContent;
  disableSound?: boolean;
}

export function MembershipCelebration({ onEnterVault, content, disableSound }: MembershipCelebrationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = 0;
    if (disableSound) return;

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      setTimeout(() => navigator.vibrate([80, 40, 80, 40, 120]), 450);
    }

    let played = false;
    const playOnce = () => {
      if (played) return;
      played = true;
      document.removeEventListener("pointerdown", playOnce);
      playSealStampSound();
    };

    // Check whether AudioContext will start running (requires a prior user gesture).
    // If suspended (e.g. direct URL navigation), skip the auto-timer and rely solely
    // on the pointerdown listener — first tap will fire the sound.
    let canAutoPlay = false;
    try {
      const probe = new AudioContext();
      canAutoPlay = probe.state === "running";
      probe.close();
    } catch { /* ignore */ }

    const soundTimer = canAutoPlay ? setTimeout(playOnce, 450) : null;
    document.addEventListener("pointerdown", playOnce, { once: true });

    return () => {
      if (soundTimer) clearTimeout(soundTimer);
      document.removeEventListener("pointerdown", playOnce);
    };
  }, [disableSound]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      style={{
        position: "fixed", inset: 0, background: DARK,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "flex-start",
        paddingTop: "clamp(64px, 10vh, 88px)",
        paddingBottom: 48, paddingLeft: 24, paddingRight: 24,
        overflowY: "auto", zIndex: 9999,
      }}
    >
      {/* Gold radial wash on impact */}
      <motion.div
        initial={{ opacity: 0.55 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.4, delay: 0.3, ease: "easeOut" }}
        style={{
          position: "fixed", inset: 0, pointerEvents: "none",
          background: "radial-gradient(circle at center, rgba(196,164,86,0.32) 0%, transparent 68%)",
        }}
      />

      {/* Seal container */}
      <div style={{ position: "relative", marginBottom: 36, flexShrink: 0 }}>
        <Shockwave />
        <GoldParticles />

        <motion.div
          initial={{ y: -56, scale: 0.65, opacity: 0, filter: "brightness(4) blur(4px)" }}
          animate={{ y: 0, scale: 1, opacity: 1, filter: "brightness(1) blur(0px)" }}
          transition={{
            y:       { type: "spring", stiffness: 420, damping: 22, delay: 0.2 },
            scale:   { type: "spring", stiffness: 420, damping: 22, delay: 0.2 },
            opacity: { duration: 0.25, delay: 0.2 },
            filter:  { duration: 0.5, delay: 0.2 },
          }}
          style={{ position: "relative", zIndex: 1, filter: "drop-shadow(0 0 28px rgba(196,164,86,0.6))" }}
        >
          <Image
            src="/assets/branding/logo-emblem.png"
            alt="Popper Tulimond seal"
            width={140} height={140}
            style={{ display: "block" }}
            priority
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: [0, 0.5, 0], scale: [1, 1.6, 1] }}
          transition={{ duration: 1.4, delay: 0.6, ease: "easeInOut" }}
          style={{
            position: "absolute", inset: -20, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(196,164,86,0.25) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Text reveals */}
      <div style={{ textAlign: "center", maxWidth: 480, width: "100%" }}>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.7, ease: "easeOut" }}
          style={{
            fontFamily: "var(--font-display, serif)",
            fontSize: "clamp(30px, 7vw, 42px)",
            fontWeight: 300,
            color: "rgba(240,232,215,0.97)",
            marginBottom: 12, lineHeight: 1.2,
          }}
        >
          {content.congratulations_headline}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          style={{
            fontFamily: "var(--font-title, serif)",
            fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase",
            color: GOLD, marginBottom: 32,
          }}
        >
          {content.subtitle}
        </motion.p>

        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 1.25, duration: 0.7 }}
          style={{ height: 1, background: `linear-gradient(to right, transparent, ${GOLD}, transparent)`, marginBottom: 32 }}
        />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.45, duration: 0.7 }}
        >
          <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "15px", color: "rgba(240,232,215,0.65)", lineHeight: 1.85, marginBottom: 20 }}>
            {content.body_1}
          </p>
          <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "15px", color: "rgba(240,232,215,0.65)", lineHeight: 1.85, marginBottom: 20 }}>
            {content.body_2}
          </p>
          <p style={{ fontFamily: "var(--font-display, serif)", fontSize: "16px", color: "rgba(240,232,215,0.8)", lineHeight: 1.75, marginBottom: 36, fontStyle: "italic" }}>
            {content.closing_line}
          </p>
        </motion.div>

        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.6 }}
          style={{ height: 1, background: `linear-gradient(to right, transparent, rgba(196,164,86,0.4), transparent)`, marginBottom: 32 }}
        />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.0, duration: 0.6 }}
        >
          <button
            onClick={onEnterVault}
            style={{
              padding: "16px 48px",
              background: "rgba(196,164,86,0.12)",
              border: `1px solid ${GOLD}`, color: GOLD,
              fontFamily: "var(--font-title, serif)",
              fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase",
              cursor: "pointer", transition: "background 0.2s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(196,164,86,0.22)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(196,164,86,0.12)")}
          >
            {content.cta_text}
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
