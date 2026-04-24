"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { MODEL_INVENTORY } from "@/data/inventory";
import type { ProductOverride } from "@/lib/productOverrides";

type Props = {
  onBack?: () => void;
};

function ImagePathInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);
  return (
    <input
      className="w-full text-[10px] text-white/70 py-1.5 px-3 bg-white/5 border border-white/10 outline-none focus:border-white/30"
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => onChange(e.target.value.trim())}
    />
  );
}

function sleeveLabel(colorway: string): string {
  const match = colorway.match(/\(([^)]+)\)/);
  return match ? match[1] : colorway;
}

export function ProductEditor({ onBack: _onBack }: Props) {
  const [overrides, setOverrides] = useState<
    Record<string, Partial<ProductOverride>>
  >({});
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    fetch("/api/edit-pages/products", { credentials: "include" })
      .then((r) => r.json())
      .then((rows: ProductOverride[]) => {
        const map: Record<string, Partial<ProductOverride>> = {};
        for (const row of rows) {
          map[row.item_id] = row;
        }
        setOverrides(map);
      })
      .catch(() => {
        // silently ignore on network error
      });
  }, []);

  function getField<K extends keyof ProductOverride>(
    itemId: string,
    field: K,
    fallback: ProductOverride[K]
  ): ProductOverride[K] {
    return (overrides[itemId]?.[field] ?? fallback) as ProductOverride[K];
  }

  function handleChange<K extends keyof ProductOverride>(
    itemId: string,
    field: K,
    value: ProductOverride[K]
  ) {
    setOverrides((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const entries = Object.entries(overrides);
      await Promise.all(
        entries.map(([item_id, override]) =>
          fetch("/api/edit-pages/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ item_id, ...override }),
          })
        )
      );
      setLastSaved(new Date());
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!window.confirm("Publish product changes to the live site?")) return;
    setPublishing(true);
    try {
      await fetch("/api/edit-pages/products/publish", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setPublishing(false);
    }
  }

  // Group items by collection
  const allItems = MODEL_INVENTORY.flatMap((slot) => slot.outfit);
  const collectionsMap = new Map<string, typeof allItems>();
  for (const item of allItems) {
    if (!collectionsMap.has(item.collection)) {
      collectionsMap.set(item.collection, []);
    }
    collectionsMap.get(item.collection)!.push(item);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar — desktop only */}
      <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4">
          <p className="text-[9px] uppercase tracking-widest text-white/50">
            Products
          </p>
          {lastSaved && (
            <span className="text-[9px] text-white/30">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 border border-white/20 text-white/60 text-[9px] uppercase tracking-widest disabled:opacity-40 hover:text-white/80 transition-colors"
          >
            {saving ? "Saving…" : "Save Draft"}
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="px-4 py-1.5 bg-[#D4B896] text-black text-[9px] uppercase tracking-widest disabled:opacity-40 hover:bg-[#c9a87c] transition-colors"
          >
            {publishing ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {Array.from(collectionsMap.entries()).map(([collection, items]) => (
          <div key={collection} className="mb-8">
            {/* Collection header */}
            <h2 className="text-[10px] uppercase tracking-widest text-[#D4B896] pb-2 mb-4 border-b border-[#D4B896]/30">
              {collection}
            </h2>

            {/* Product rows */}
            {items.map((item) => {
              const productImage = getField(
                item.id,
                "product_image",
                item.productImage ?? ""
              ) as string | null;
              const effectiveImage = productImage ?? item.productImage ?? "";

              return (
                <div
                  key={item.id}
                  className="flex gap-4 border-b border-white/10 py-4"
                >
                  {/* Thumbnail */}
                  <div className="shrink-0 w-[60px] h-[80px] bg-white/5 border border-white/10 overflow-hidden">
                    {effectiveImage ? (
                      <Image
                        src={effectiveImage}
                        alt={item.name}
                        width={60}
                        height={80}
                        style={{
                          objectFit: "cover",
                          objectPosition: "top center",
                          width: "100%",
                          height: "100%",
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20 text-lg">
                        +
                      </div>
                    )}
                  </div>

                  {/* Info + fields */}
                  <div className="flex-1 min-w-0">
                    {/* Name / colorway */}
                    <p className="text-[10px] text-white/50 mb-3">
                      <span className="text-white/70">{item.name}</span>
                      {" — "}
                      <span>{sleeveLabel(item.colorway)}</span>
                    </p>

                    {/* Price */}
                    <div className="mb-3">
                      <p className="text-[8px] uppercase tracking-widest text-white/30 mb-1">
                        Price
                      </p>
                      <ImagePathInput
                        value={
                          getField(item.id, "price", item.price) as string
                        }
                        onChange={(v) => handleChange(item.id, "price", v)}
                        placeholder={item.price}
                      />
                    </div>

                    {/* Product image path */}
                    <div className="mb-3">
                      <p className="text-[8px] uppercase tracking-widest text-white/30 mb-1">
                        Product Image Path
                      </p>
                      <ImagePathInput
                        value={
                          (getField(
                            item.id,
                            "product_image",
                            item.productImage ?? ""
                          ) as string | null) ?? ""
                        }
                        onChange={(v) =>
                          handleChange(item.id, "product_image", v)
                        }
                        placeholder={item.productImage ?? ""}
                      />
                    </div>

                    {/* Status toggle */}
                    <div>
                      <p className="text-[8px] uppercase tracking-widest text-white/30 mb-1">
                        Status
                      </p>
                      <div className="flex gap-1">
                        {(["active", "sold_out", "hidden"] as const).map(
                          (s) => {
                            const isCurrent =
                              getField(item.id, "status", "active") === s;
                            return (
                              <button
                                key={s}
                                onClick={() =>
                                  handleChange(item.id, "status", s)
                                }
                                className={`px-3 py-1 text-[9px] uppercase tracking-widest border transition-colors ${
                                  isCurrent
                                    ? s === "active"
                                      ? "bg-[#D4B896] text-black border-[#D4B896]"
                                      : s === "sold_out"
                                      ? "bg-[rgba(196,164,86,0.3)] text-[#D4B896] border-[rgba(196,164,86,0.5)]"
                                      : "bg-white/10 text-white/60 border-white/20"
                                    : "text-white/30 border-white/10 hover:text-white/50"
                                }`}
                              >
                                {s === "active"
                                  ? "Active"
                                  : s === "sold_out"
                                  ? "Sold Out"
                                  : "Hidden"}
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
