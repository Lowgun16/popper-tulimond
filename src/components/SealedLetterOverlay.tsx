"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import OverlayPortal from "@/components/OverlayPortal";
import { WHY_CONTENT } from "@/lib/staticContent";

const OBSIDIAN = "#272625";

interface Props {
  open: boolean;
  /** Called when the reader taps the X — "step inside the store." */
  onEnter: () => void;
}

export default function SealedLetterOverlay({ open, onEnter }: Props) {
  const [showLetter, setShowLetter] = useState(false); // fly-in done → letter
  const [broken, setBroken] = useState(false); // seal cracked
  const [atEnd, setAtEnd] = useState(false); // scrolled to the end
  const [leaving, setLeaving] = useState(false); // X tapped → fade, then enter
  const scrollRef = useRef<HTMLDivElement>(null);

  // Lock the page scroll while the letter is open (freeze the scene behind).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Choreography: fly in → break the seal → hand off to the letter.
  useEffect(() => {
    if (!open) {
      setShowLetter(false);
      setBroken(false);
      setAtEnd(false);
      setLeaving(false);
      return;
    }
    const tBreak = window.setTimeout(() => setBroken(true), 620);
    const tLetter = window.setTimeout(() => setShowLetter(true), 1150);
    return () => {
      window.clearTimeout(tBreak);
      window.clearTimeout(tLetter);
    };
  }, [open]);

  const handleLeave = useCallback(() => {
    setLeaving(true);
    window.setTimeout(() => onEnter(), 380); // let the letter fade to obsidian first
  }, [onEnter]);

  // Esc = step inside (accessible escape).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleLeave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleLeave]);

  // If the letter doesn't overflow, reveal the X right away.
  useEffect(() => {
    if (!showLetter) return;
    const el = scrollRef.current;
    if (el && el.scrollHeight - el.clientHeight < 40) setAtEnd(true);
  }, [showLetter]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) setAtEnd(true);
  }, []);

  const body = WHY_CONTENT.paragraphs.slice(0, -2);
  const closing = WHY_CONTENT.paragraphs.slice(-2);

  return (
    <OverlayPortal>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[7000] flex items-center justify-center"
            style={{ backgroundColor: OBSIDIAN }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Phase 1 — the envelope flies toward the viewer */}
            <AnimatePresence>
              {!showLetter && (
                <motion.div
                  key="envelope"
                  className="pointer-events-none will-change-transform"
                  style={{ width: "min(82vw, 520px)" }}
                  initial={{ scale: 0.25, rotate: -7, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 1.12, opacity: 0 }}
                  transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      broken
                        ? "/assets/branding/letter-open.png"
                        : "/assets/branding/letter-sealed.png"
                    }
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="block h-auto w-full select-none"
                    style={{ filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.55))" }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Phase 2 — the letter */}
            {showLetter && (
              <motion.div
                ref={scrollRef}
                onScroll={handleScroll}
                className="absolute inset-0 overflow-y-auto overscroll-contain"
                initial={{ opacity: 0 }}
                animate={{ opacity: leaving ? 0 : 1 }}
                transition={{ duration: leaving ? 0.35 : 0.9 }}
              >
                <article className="mx-auto max-w-[42rem] px-6 py-24 sm:py-28">
                  <h1
                    className="mb-14 text-center italic text-parchment"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 300,
                      fontSize: "clamp(2.75rem, 8vw, 4.5rem)",
                      lineHeight: 1,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {WHY_CONTENT.title}
                  </h1>

                  <div
                    className="space-y-7"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 400,
                      fontSize: "clamp(1.15rem, 2.2vw, 1.4rem)",
                      lineHeight: 1.75,
                      color: "rgba(242, 237, 228, 0.9)",
                    }}
                  >
                    {body.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>

                  <div
                    className="mt-14 space-y-3 pt-10 text-center"
                    style={{
                      borderTop: "1px solid rgba(196, 164, 86, 0.25)",
                      fontFamily: "var(--font-display)",
                      fontStyle: "italic",
                      fontSize: "clamp(1.25rem, 2.6vw, 1.6rem)",
                      color: "var(--color-gold)",
                    }}
                  >
                    {closing.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>

                  <div className="h-20" />
                </article>
              </motion.div>
            )}

            {/* The X — appears and pulses once he's read to the end; taps = enter */}
            <AnimatePresence>
              {showLetter && atEnd && !leaving && (
                <motion.button
                  type="button"
                  onClick={handleLeave}
                  aria-label="Step inside"
                  className="fixed right-5 top-5 z-[7001] flex h-11 w-11 items-center justify-center rounded-full"
                  style={{
                    border: "1px solid rgba(196, 164, 86, 0.5)",
                    color: "var(--color-gold)",
                    backgroundColor: "rgba(39, 38, 37, 0.6)",
                    backdropFilter: "blur(6px)",
                    fontSize: "1.1rem",
                    lineHeight: 1,
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: [1, 0.35, 1], scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    opacity: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
                    scale: { duration: 0.3 },
                  }}
                >
                  ✕
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </OverlayPortal>
  );
}
