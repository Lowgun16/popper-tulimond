"use client";

import Image from "next/image";
import type { ModelProfile } from "@/lib/contentTypes";

interface LookbookModelSwitcherProps {
  models: ModelProfile[];
  activeModelId: string;
  onSwitch: (modelId: string) => void;
  onViewProfile: () => void;
}

export function LookbookModelSwitcher({
  models,
  activeModelId,
  onSwitch,
  onViewProfile,
}: LookbookModelSwitcherProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        justifyContent: "center",
        padding: "10px 16px 6px",
        flexShrink: 0,
      }}
    >
      {models.map((model) => {
        const isActive = model.id === activeModelId;
        return (
          <button
            key={model.id}
            onClick={() => (isActive ? onViewProfile() : onSwitch(model.id))}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {/* Face circle */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: isActive
                  ? "1.5px solid #C4A456"
                  : "1px solid rgba(255,255,255,0.15)",
                overflow: "hidden",
                position: "relative",
                background: "#1a1a1a",
              }}
            >
              {model.imageSrc ? (
                <Image
                  src={model.imageSrc}
                  alt={model.displayName}
                  fill
                  sizes="40px"
                  style={{ objectFit: "cover", objectPosition: "top center" }}
                />
              ) : (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      color: isActive
                        ? "#C4A456"
                        : "rgba(255,255,255,0.3)",
                      fontSize: 12,
                    }}
                  >
                    {model.displayName.charAt(0)}
                  </span>
                </div>
              )}
              {/* Active gold dot */}
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 1,
                    right: 1,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#C4A456",
                    border: "1.5px solid #0a0a0a",
                  }}
                />
              )}
            </div>

            {/* Name */}
            <p
              style={{
                fontFamily: "var(--font-title, serif)",
                fontSize: "6px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: isActive ? "#C4A456" : "rgba(255,255,255,0.3)",
                margin: 0,
              }}
            >
              {model.displayName}
            </p>

            {/* "Tap for more info" — only on active */}
            {isActive && (
              <p
                style={{
                  fontFamily: "var(--font-body, sans-serif)",
                  fontSize: "5px",
                  color: "rgba(196,164,86,0.45)",
                  margin: 0,
                  letterSpacing: "0.06em",
                  lineHeight: 1.3,
                  textAlign: "center",
                }}
              >
                Tap for<br />
                more info
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
