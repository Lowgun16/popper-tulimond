"use client";
import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { ColorPicker } from "./ColorPicker";

const BASE_COLORS = [
  { name: "Parchment", hex: "#F5ECD7" },
  { name: "Gold",      hex: "#D4B896" },
  { name: "Red Gun",   hex: "#8B1A1A" },
  { name: "Muted",     hex: "#5C5C5C" },
  { name: "Soft",      hex: "#E8E0D5" },
];

type Props = {
  editor: Editor;
  customColors: Array<{ id: string; hex: string; label?: string | null }>;
  onAddCustomColor: (hex: string) => void;
};

export function TipTapToolbar({ editor, customColors, onAddCustomColor }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  function applyColor(hex: string) {
    editor.chain().focus().setColor(hex).run();
  }

  return (
    <div className="flex items-center gap-1 flex-wrap relative px-1 py-1 border-b border-white/10">
      {/* Text format buttons */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`px-2 py-0.5 text-xs font-bold ${editor.isActive("bold") ? "text-[#D4B896]" : "text-white/60 hover:text-white"}`}
        title="Bold"
      >B</button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`px-2 py-0.5 text-xs italic ${editor.isActive("italic") ? "text-[#D4B896]" : "text-white/60 hover:text-white"}`}
        title="Italic"
      >I</button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`px-2 py-0.5 text-xs underline ${editor.isActive("underline") ? "text-[#D4B896]" : "text-white/60 hover:text-white"}`}
        title="Underline"
      >U</button>

      {/* Separator */}
      <div className="w-px h-4 bg-white/20 mx-1" />

      {/* Brand base color dots */}
      {BASE_COLORS.map((color) => (
        <button
          key={color.hex}
          onClick={() => applyColor(color.hex)}
          title={color.name}
          className="w-4 h-4 rounded-full border border-white/20 hover:border-white/60 transition-all"
          style={{ backgroundColor: color.hex }}
        />
      ))}

      {/* Separator */}
      {customColors.length > 0 && <div className="w-px h-4 bg-white/20 mx-1" />}

      {/* Custom color dots */}
      {customColors.map((color) => (
        <button
          key={color.id}
          onClick={() => applyColor(color.hex)}
          title={color.label ?? color.hex}
          className="w-4 h-4 rounded-full border border-white/20 hover:border-white/60 transition-all"
          style={{ backgroundColor: color.hex }}
        />
      ))}

      {/* Add custom color */}
      <div className="relative">
        <button
          onClick={() => setShowPicker((p) => !p)}
          className="w-4 h-4 rounded-full border border-dashed border-white/40 hover:border-white text-white/40 hover:text-white text-[9px] flex items-center justify-center"
          title="Add custom color"
        >+</button>
        {showPicker && (
          <ColorPicker
            onSave={(hex) => {
              applyColor(hex);
              onAddCustomColor(hex);
            }}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>
    </div>
  );
}
