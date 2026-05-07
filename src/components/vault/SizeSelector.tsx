"use client";

import { useState } from "react";

interface SizeSelectorProps {
  sizes: string[];
  onAddToCart: (size: string) => void;
  disabled?: boolean;
}

const GOLD = "#C4A456";

export default function SizeSelector({ sizes, onAddToCart, disabled }: SizeSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    if (!selected) return;
    onAddToCart(selected);
    setAdded(true);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(40);
    setTimeout(() => { setAdded(false); setSelected(null); }, 1800);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {sizes.map((size) => (
          <button
            key={size}
            onClick={() => setSelected(size)}
            disabled={disabled}
            style={{
              width: 40, height: 36,
              background: selected === size ? "rgba(196,164,86,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${selected === size ? GOLD : "rgba(255,255,255,0.12)"}`,
              color: selected === size ? GOLD : "rgba(240,232,215,0.55)",
              fontFamily: "var(--font-title, serif)",
              fontSize: "10px",
              letterSpacing: "0.1em",
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            {size}
          </button>
        ))}
      </div>
      {selected && (
        <button
          onClick={handleAdd}
          style={{
            padding: "10px 20px",
            background: added ? "rgba(56,161,105,0.15)" : "rgba(196,164,86,0.1)",
            border: `1px solid ${added ? "#38A169" : GOLD}`,
            color: added ? "#68D391" : GOLD,
            fontFamily: "var(--font-title, serif)",
            fontSize: "10px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "background 0.2s, border-color 0.2s, color 0.2s",
          }}
        >
          {added ? "Added!" : `Add to Cart — ${selected}`}
        </button>
      )}
    </div>
  );
}
