"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import type { ModelProfile } from "@/lib/contentTypes";

export const MODEL_CAROUSEL_ORDER = ["jerome", "angel", "jack", "ethan"] as const;

interface ChooseModelModalProps {
  isOpen: boolean;
  modelProfiles: ModelProfile[];
  defaultModelId?: string | null;
  onSelect: (modelId: string) => void;
  onDismiss?: () => void;
}

export function ChooseModelModal({
  isOpen,
  modelProfiles,
  defaultModelId,
  onSelect,
  onDismiss,
}: ChooseModelModalProps) {
  const defaultIdx = defaultModelId
    ? Math.max(0, MODEL_CAROUSEL_ORDER.indexOf(defaultModelId as typeof MODEL_CAROUSEL_ORDER[number]))
    : 0;

  const [activeIdx, setActiveIdx] = useState(defaultIdx);

  useEffect(() => {
    if (isOpen) {
      setActiveIdx(
        defaultModelId
          ? Math.max(0, MODEL_CAROUSEL_ORDER.indexOf(defaultModelId as typeof MODEL_CAROUSEL_ORDER[number]))
          : 0
      );
    }
  }, [isOpen, defaultModelId]);

  useEffect(() => {
    if (!isOpen) return;
    history.pushState({ chooseModel: true }, "");
    const handlePopState = () => { onDismiss?.(); };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (history.state?.chooseModel) history.back();
    };
  }, [isOpen, onDismiss]);

  const touchStartX = useRef<number | null>(null);

  const goNext = useCallback(() => {
    setActiveIdx((i) => Math.min(i + 1, MODEL_CAROUSEL_ORDER.length - 1));
  }, []);

  const goPrev = useCallback(() => {
    setActiveIdx((i) => Math.max(i - 1, 0));
  }, []);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx < -50) goNext();
    else if (dx > 50) goPrev();
  }

  const modelId = MODEL_CAROUSEL_ORDER[activeIdx];
  const profile = modelProfiles.find((p) => p.id === modelId);

  if (!isOpen || !profile) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="choose-model-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 7000,
            background: "rgba(6,6,6,0.97)",
            backdropFilter: "blur(24px)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Header */}
          <div style={{ textAlign: "center", padding: "32px 24px 16px", position: "relative" }}>
            {onDismiss && (
              <button
                onClick={onDismiss}
                aria-label="Close"
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.35)",
                  fontSize: 18,
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: 4,
                }}
              >✕</button>
            )}
            <p style={{
              fontFamily: "var(--font-title, serif)",
              fontSize: "9px",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "rgba(196,164,86,0.8)",
              marginBottom: "8px",
            }}>
              Popper Tulimond
            </p>
            <h2 style={{
              fontFamily: "var(--font-display, serif)",
              fontSize: "clamp(15px, 3vw, 20px)",
              fontWeight: 300,
              color: "rgba(240,232,215,0.95)",
              letterSpacing: "0.03em",
              marginBottom: "6px",
            }}>
              Choose the model who most closely resembles your body type.
            </h2>
            <p style={{
              fontFamily: "var(--font-body, sans-serif)",
              fontSize: "11px",
              color: "rgba(255,255,255,0.35)",
              letterSpacing: "0.05em",
            }}>
              Your choice personalizes the lookbook. You can always change it.
            </p>
          </div>

          {/* Carousel area */}
          <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", alignItems: "stretch" }}>
            {/* Left arrow */}
            {activeIdx > 0 && (
              <button
                onClick={goPrev}
                aria-label="Previous model"
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 10,
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.7)",
                  border: "1px solid rgba(196,164,86,0.3)",
                  color: "rgba(196,164,86,0.9)",
                  fontSize: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >‹</button>
            )}

            {/* Right arrow */}
            {activeIdx < MODEL_CAROUSEL_ORDER.length - 1 && (
              <button
                onClick={goNext}
                aria-label="Next model"
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 10,
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.7)",
                  border: "1px solid rgba(196,164,86,0.3)",
                  color: "rgba(196,164,86,0.9)",
                  fontSize: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >›</button>
            )}

            {/* Model slide */}
            <AnimatePresence mode="wait">
              <motion.div
                key={modelId}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.2 }}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "0 56px",
                  overflowY: "auto",
                }}
              >
                {/* Model visual — video or image */}
                <div style={{
                  width: "100%",
                  maxWidth: 320,
                  aspectRatio: "2/3",
                  position: "relative",
                  borderRadius: 4,
                  overflow: "hidden",
                  background: "#111",
                  marginBottom: 20,
                  flexShrink: 0,
                }}>
                  <Image
                    src={profile.imageSrc}
                    alt={profile.displayName}
                    fill
                    style={{ objectFit: "cover", objectPosition: "top center" }}
                    sizes="320px"
                  />
                  {profile.videoUrl && (
                    <video
                      key={profile.videoUrl}
                      src={profile.videoUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "top center",
                      }}
                    />
                  )}
                </div>

                {/* Name */}
                <p style={{
                  fontFamily: "var(--font-title, serif)",
                  fontSize: "11px",
                  letterSpacing: "0.35em",
                  textTransform: "uppercase",
                  color: "#C4A456",
                  marginBottom: 8,
                }}>
                  {profile.displayName}
                </p>

                {/* Stats */}
                {(profile.height || profile.weight || profile.bodyType) && (
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 14,
                    padding: "12px 20px",
                    border: "1px solid rgba(196,164,86,0.2)",
                    borderRadius: 2,
                    width: "100%",
                    maxWidth: 280,
                  }}>
                    {(profile.height || profile.weight) && (
                      <p style={{
                        fontFamily: "var(--font-body, sans-serif)",
                        fontSize: "13px",
                        color: "rgba(255,255,255,0.85)",
                        letterSpacing: "0.1em",
                        margin: 0,
                      }}>
                        {[profile.height, profile.weight].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {profile.bodyType && (
                      <p style={{
                        fontFamily: "var(--font-body, sans-serif)",
                        fontSize: "11px",
                        color: "rgba(196,164,86,0.7)",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        margin: 0,
                      }}>
                        {profile.bodyType}
                      </p>
                    )}
                  </div>
                )}

                {/* Tagline */}
                {profile.tagline && (
                  <p style={{
                    fontFamily: "var(--font-display, serif)",
                    fontSize: "13px",
                    fontWeight: 300,
                    fontStyle: "italic",
                    color: "rgba(240,232,215,0.7)",
                    textAlign: "center",
                    marginBottom: 12,
                    letterSpacing: "0.02em",
                  }}>
                    {profile.tagline}
                  </p>
                )}

                {/* Bio */}
                {profile.bio && (
                  <p
                    style={{
                      fontFamily: "var(--font-body, sans-serif)",
                      fontSize: "12px",
                      color: "rgba(255,255,255,0.5)",
                      lineHeight: 1.7,
                      textAlign: "center",
                      maxWidth: 280,
                      marginBottom: 24,
                    }}
                    dangerouslySetInnerHTML={{ __html: profile.bio }}
                  />
                )}

                {/* Choose button */}
                <button
                  onClick={() => onSelect(modelId)}
                  style={{
                    padding: "14px 40px",
                    background: "#C4A456",
                    color: "#0a0a0a",
                    border: "none",
                    fontFamily: "var(--font-title, serif)",
                    fontSize: "10px",
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    marginBottom: 32,
                  }}
                >
                  Choose {profile.displayName}
                </button>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots indicator */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            paddingBottom: 24,
          }}>
            {MODEL_CAROUSEL_ORDER.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                aria-label={`Go to model ${i + 1}`}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  background: i === activeIdx ? "#C4A456" : "rgba(255,255,255,0.2)",
                  transition: "background 0.2s",
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
