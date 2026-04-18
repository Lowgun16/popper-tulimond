// src/components/LegalPageLayout.tsx
import Link from "next/link";
import Image from "next/image";
import type { ReactNode, CSSProperties } from "react";

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

const eyebrow: CSSProperties = {
  fontFamily: "var(--font-title, serif)",
  fontSize: "9px",
  letterSpacing: "0.3em",
  textTransform: "uppercase",
  color: "rgba(196,164,86,0.6)",
  marginBottom: "16px",
};

export default function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "rgba(240,232,215,0.85)" }}>
      {/* Top bar */}
      <header style={{
        borderBottom: "1px solid rgba(196,164,86,0.2)",
        padding: "24px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center" }}>
          <Image
            src="/assets/branding/logo-horizontal.png"
            alt="Popper Tulimond"
            width={160} height={48}
            style={{ objectFit: "contain" }}
          />
        </Link>
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-title, serif)",
            fontSize: "9px",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "rgba(240,232,215,0.4)",
            textDecoration: "none",
          }}
        >
          ← Back to Store
        </Link>
      </header>

      {/* Content */}
      <main style={{ maxWidth: "680px", margin: "0 auto", padding: "60px 40px" }}>
        <p style={eyebrow}>Popper Tulimond — {lastUpdated}</p>
        <h1 style={{
          fontFamily: "var(--font-display, serif)",
          fontSize: "clamp(28px, 5vw, 40px)",
          color: "rgba(240,232,215,0.95)",
          fontWeight: 300,
          letterSpacing: "0.04em",
          marginBottom: "48px",
        }}>
          {title}
        </h1>

        <div style={{
          fontFamily: "var(--font-body, sans-serif)",
          fontSize: "14px",
          lineHeight: "1.85",
          color: "rgba(240,232,215,0.65)",
          whiteSpace: "pre-line",
        }}>
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "24px 40px",
        textAlign: "center",
      }}>
        <p style={{
          fontFamily: "var(--font-body, sans-serif)",
          fontSize: "10px",
          color: "rgba(240,232,215,0.2)",
          letterSpacing: "0.15em",
        }}>
          © {new Date().getFullYear()} Popper Tulimond. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
