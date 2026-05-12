"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/contexts/CartContext";

const GOLD = "#C4A456";

export default function CartIcon() {
  const { items, openCart, justAdded } = useCart();
  const badgeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!justAdded || !badgeRef.current) return;
    const el = badgeRef.current;
    el.animate(
      [
        { transform: "scale(1)", boxShadow: `0 0 0px ${GOLD}` },
        { transform: "scale(1.45)", boxShadow: `0 0 14px ${GOLD}` },
        { transform: "scale(1)", boxShadow: `0 0 0px ${GOLD}` },
      ],
      { duration: 500, easing: "ease-out" }
    );
  }, [justAdded]);

  if (items.length === 0) return null;

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={`Open cart — ${items.length} item${items.length !== 1 ? "s" : ""}`}
      style={{
        position: "fixed",
        top: 72,
        right: 20,
        zIndex: 700,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Bag SVG */}
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        <path
          d="M9 10V8a5 5 0 0 1 10 0v2"
          stroke={GOLD}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <rect
          x="4.5"
          y="10"
          width="19"
          height="14"
          rx="1.5"
          stroke={GOLD}
          strokeWidth="1.4"
        />
      </svg>

      {/* Count badge */}
      <span
        ref={badgeRef}
        style={{
          position: "absolute",
          top: -4,
          right: -4,
          minWidth: 18,
          height: 18,
          borderRadius: "50%",
          background: GOLD,
          color: "#0e0e0e",
          fontSize: "9px",
          fontFamily: "var(--font-title, serif)",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 3px",
          lineHeight: 1,
        }}
      >
        {items.length}
      </span>
    </button>
  );
}
