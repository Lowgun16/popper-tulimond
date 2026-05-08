"use client";

import {
  playRevolverCock,
  playIceCubeInGlass,
  playShotGlassOnBar,
  playZippoFlick,
  playCoinOnMarble,
  playWhiskeyCorkPull,
  playCartAddSound,
} from "@/lib/sounds";

const GOLD = "#C4A456";
const DARK = "#0e0e0e";

const SOUNDS = [
  {
    id: "revolver",
    label: "Revolver Cock",
    description: "Two-stage metallic click. Dangerous, loaded, masculine. Ties to the logo.",
    fn: playRevolverCock,
    emoji: "🔫",
  },
  {
    id: "ice",
    label: "Ice Cube in Crystal Glass",
    description: "Sharp glass contact + long crystal ring. Speakeasy reward, confirmation.",
    fn: playIceCubeInGlass,
    emoji: "🥃",
  },
  {
    id: "shotglass",
    label: "Shot Glass on Bar",
    description: "Short decisive thud with wooden surface resonance. Done deal.",
    fn: playShotGlassOnBar,
    emoji: "🍶",
  },
  {
    id: "zippo",
    label: "Zippo Lighter Flick",
    description: "Metallic wheel scrape + soft ignition whoosh. Deliberate, dangerous.",
    fn: playZippoFlick,
    emoji: "🔥",
  },
  {
    id: "coin",
    label: "Coin on Marble",
    description: "Bright metallic ping + hard surface ring, slow decay. Wealth, restraint.",
    fn: playCoinOnMarble,
    emoji: "🪙",
  },
  {
    id: "cork",
    label: "Whiskey Cork Pull",
    description: "Cork squeak → pressure-release pop → soft air exhale. Opening something special.",
    fn: playWhiskeyCorkPull,
    emoji: "🍾",
  },
  {
    id: "current",
    label: "Current: Gold Coin Chime",
    description: "Two ascending sine tones. The sound currently used for Add to Cart.",
    fn: playCartAddSound,
    emoji: "✦",
  },
];

export default function SoundTestPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: DARK,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "48px 24px",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-title, serif)",
          fontSize: "9px",
          letterSpacing: "0.35em",
          textTransform: "uppercase",
          color: GOLD,
          marginBottom: 12,
        }}
      >
        Popper Tulimond
      </p>
      <h1
        style={{
          fontFamily: "var(--font-display, serif)",
          fontSize: "clamp(22px, 5vw, 32px)",
          fontWeight: 300,
          color: "rgba(240,232,215,0.95)",
          marginBottom: 8,
          textAlign: "center",
        }}
      >
        Sound Audition
      </h1>
      <p
        style={{
          fontFamily: "var(--font-body, sans-serif)",
          fontSize: "13px",
          color: "rgba(240,232,215,0.35)",
          marginBottom: 48,
          textAlign: "center",
        }}
      >
        Tap each button to preview. The last one is the current Add to Cart sound for comparison.
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          width: "100%",
          maxWidth: 520,
        }}
      >
        {SOUNDS.map((s) => (
          <button
            key={s.id}
            onClick={s.fn}
            style={{
              background: "rgba(196,164,86,0.05)",
              border: `1px solid rgba(196,164,86,0.2)`,
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              gap: 16,
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(196,164,86,0.12)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,164,86,0.5)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(196,164,86,0.05)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,164,86,0.2)";
            }}
          >
            <span style={{ fontSize: 28, flexShrink: 0 }}>{s.emoji}</span>
            <div>
              <p
                style={{
                  fontFamily: "var(--font-title, serif)",
                  fontSize: "11px",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: GOLD,
                  margin: "0 0 4px",
                }}
              >
                {s.label}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-body, sans-serif)",
                  fontSize: "12px",
                  color: "rgba(240,232,215,0.45)",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {s.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      <p
        style={{
          fontFamily: "var(--font-body, sans-serif)",
          fontSize: "11px",
          color: "rgba(240,232,215,0.18)",
          marginTop: 48,
          textAlign: "center",
        }}
      >
        This page is for internal use only. Remove or restrict before launch.
      </p>
    </div>
  );
}
