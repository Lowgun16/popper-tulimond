"use client";

import {
  playRevolverCock,
  playIceCubeInGlass,
  playShotGlassOnBar,
  playZippoFlick,
  playCoinOnMarble,
  playWhiskeyCorkPull,
  playCartAddSound,
  playSealStampSound,
} from "@/lib/sounds";

const GOLD = "#C4A456";
const DARK = "#0e0e0e";

function playFile(path: string, fallback: () => void) {
  const audio = new Audio(path);
  audio.play().catch(() => fallback());
}

const SOUNDS = [
  {
    id: "revolver",
    label: "Revolver Cock",
    description: "Two-stage metallic click. Dangerous, loaded, masculine. Ties to the logo.",
    filePath: "/assets/sounds/revolver-cock.mp3",
    synth: playRevolverCock,
    emoji: "🔫",
  },
  {
    id: "ice",
    label: "Ice Cube in Crystal Glass",
    description: "Sharp glass contact + long crystal ring. Speakeasy reward, confirmation.",
    filePath: "/assets/sounds/ice-cube-glass.mp3",
    synth: playIceCubeInGlass,
    emoji: "🥃",
  },
  {
    id: "shotglass",
    label: "Shot Glass on Bar",
    description: "Short decisive thud with wooden surface resonance. Done deal.",
    filePath: "/assets/sounds/shot-glass-bar.mp3",
    synth: playShotGlassOnBar,
    emoji: "🍶",
  },
  {
    id: "zippo",
    label: "Zippo Lighter Flick",
    description: "Metallic wheel scrape + soft ignition whoosh. Deliberate, dangerous.",
    filePath: "/assets/sounds/zippo-flick.mp3",
    synth: playZippoFlick,
    emoji: "🔥",
  },
  {
    id: "coin",
    label: "Coin on Marble",
    description: "Bright metallic ping + hard surface ring, slow decay. Wealth, restraint.",
    filePath: "/assets/sounds/coin-marble.mp3",
    synth: playCoinOnMarble,
    emoji: "🪙",
  },
  {
    id: "cork",
    label: "Whiskey Cork Pull",
    description: "Cork squeak → pressure-release pop → soft air exhale. Opening something special.",
    filePath: "/assets/sounds/whiskey-cork.mp3",
    synth: playWhiskeyCorkPull,
    emoji: "🍾",
  },
  {
    id: "seal",
    label: "Wax Seal Stamp",
    description: "Three-layer impact: thud, warm resonant bloom, gold shimmer. Plays on the New Member Congratulations screen.",
    filePath: null,
    synth: playSealStampSound,
    emoji: "🔏",
  },
  {
    id: "current",
    label: "Current: Add to Cart (Revolver Cock)",
    description: "The live Add to Cart sound.",
    filePath: "/assets/sounds/revolver-cock.mp3",
    synth: playCartAddSound,
    emoji: "🔫",
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
          marginBottom: 8,
          textAlign: "center",
        }}
      >
        Tap each button to preview. The last one is the current Add to Cart sound for comparison.
      </p>
      <p
        style={{
          fontFamily: "var(--font-body, sans-serif)",
          fontSize: "11px",
          color: "rgba(196,164,86,0.45)",
          marginBottom: 48,
          textAlign: "center",
        }}
      >
        Drop your exported MP3s into <code style={{ color: GOLD }}>public/assets/sounds/</code> using the filenames shown below each button.
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
          <div key={s.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <button
              onClick={() => {
                if (s.filePath) {
                  playFile(s.filePath, s.synth);
                } else {
                  s.synth();
                }
              }}
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
                width: "100%",
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

            {s.filePath && (
              <p
                style={{
                  fontFamily: "var(--font-body, sans-serif)",
                  fontSize: "10px",
                  color: "rgba(196,164,86,0.3)",
                  margin: "0 0 4px 4px",
                  letterSpacing: "0.04em",
                }}
              >
                📁 {s.filePath.replace("/assets/sounds/", "public/assets/sounds/")}
              </p>
            )}
          </div>
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
        Internal use only. Remove or restrict before launch.
      </p>
    </div>
  );
}
