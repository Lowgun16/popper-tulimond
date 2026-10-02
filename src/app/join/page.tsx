import type { Metadata } from "next";
import JoinForm from "@/components/JoinForm";

export const metadata: Metadata = {
  title: "Get Notified — Popper Tulimond",
  description:
    "Popper Tulimond opens to new members only during brief, limited windows. Leave your number to be notified the moment the doors open.",
};

export default function JoinPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#0e0e0e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        <p
          style={{
            fontFamily: "var(--font-title, serif)",
            fontSize: "10px",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: "#C4A456",
            textAlign: "center",
            marginBottom: "20px",
          }}
        >
          Popper Tulimond
        </p>

        <h1
          style={{
            fontFamily: "var(--font-display, serif)",
            fontWeight: 300,
            fontSize: "26px",
            lineHeight: 1.35,
            color: "rgba(240,232,215,0.95)",
            textAlign: "center",
            marginBottom: "14px",
          }}
        >
          The doors open only for a short time.
        </h1>

        <p
          style={{
            fontFamily: "var(--font-body, sans-serif)",
            fontSize: "15px",
            lineHeight: 1.75,
            color: "rgba(240,232,215,0.75)",
            textAlign: "center",
            marginBottom: "28px",
          }}
        >
          Popper Tulimond is a men&apos;s clothing brand that opens to new members
          only during brief, limited windows. Leave your number and we&apos;ll text
          you the moment the doors are about to open.
        </p>

        <JoinForm />

        <p
          style={{
            fontFamily: "var(--font-body, sans-serif)",
            fontSize: "11px",
            lineHeight: 1.6,
            color: "rgba(240,232,215,0.4)",
            textAlign: "center",
            marginTop: "24px",
          }}
        >
          We only text — we never email, and we never spam. You&apos;ll rarely hear
          from us, and only when it matters. Reply STOP anytime to opt out.
        </p>
      </div>
    </main>
  );
}
