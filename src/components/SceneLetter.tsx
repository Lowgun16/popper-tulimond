"use client";

// The sealed letter resting on the ground by the door — the only human door to
// THE WHY. Rendered INSIDE the storefront layer so it scales, pans, and fades
// with the building as a man scrolls to enter. Positions are fractions of the
// storefront layer; TUNE them on-device against the real photo.
const POS = {
  desktop: {
    env: { left: "57%", top: "81%", width: "7.5%", rotate: "-14deg" },
    bulb: { left: "70.5%", top: "40%", size: "10%" },
  },
  mobile: {
    env: { left: "58%", top: "84%", width: "14%", rotate: "-14deg" },
    bulb: { left: "72%", top: "47%", size: "17%" },
  },
} as const;

export default function SceneLetter({
  variant,
  onTap,
  hidden,
}: {
  variant: "mobile" | "desktop";
  onTap: () => void;
  hidden: boolean;
}) {
  if (hidden) return null;
  const pos = POS[variant];

  return (
    <>
      {/* Bulb flicker — a warm glow over the caged bulb, on the 5s heartbeat */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full"
        style={{
          left: pos.bulb.left,
          top: pos.bulb.top,
          width: pos.bulb.size,
          aspectRatio: "1 / 1",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, rgba(255,196,110,0.5) 0%, rgba(255,196,110,0) 70%)",
          animation: "pt-bulb-flicker 5s ease-in-out infinite",
        }}
      />

      {/* The letter itself */}
      <button
        type="button"
        onClick={onTap}
        aria-label="A sealed letter lies on the ground"
        className="absolute cursor-pointer border-0 bg-transparent p-0"
        style={{
          left: pos.env.left,
          top: pos.env.top,
          width: pos.env.width,
          transform: `translate(-50%, -50%) rotate(${pos.env.rotate})`,
        }}
      >
        <span className="relative block">
          {/* soft contact shadow on the gravel */}
          <span
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              transform: "translateY(10%) scale(1.03)",
              background:
                "radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 70%)",
              filter: "blur(5px)",
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/branding/letter-sealed.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            className="relative block w-full select-none"
          />
          {/* seal twinkle — glints just after the bulb flickers */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute rounded-full"
            style={{
              left: "47%",
              top: "54%",
              width: "24%",
              aspectRatio: "1 / 1",
              background:
                "radial-gradient(circle, rgba(255,245,222,0.95) 0%, rgba(255,245,222,0) 65%)",
              mixBlendMode: "screen",
              animation: "pt-seal-twinkle 5s ease-in-out infinite",
            }}
          />
        </span>
      </button>
    </>
  );
}
