"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { useEffect } from "react";
import { TipTapToolbar } from "./TipTapToolbar";

type Props = {
  label: string;
  liveValue: string;       // currently published value (HTML or plain text)
  draftValue: string;      // current user's draft (empty string = no draft)
  customColors: Array<{ id: string; hex: string; label?: string | null }>;
  onAddCustomColor: (hex: string) => void;
  onChange: (value: string) => void;
};

export function FieldEditor({
  label,
  liveValue,
  draftValue,
  customColors,
  onAddCustomColor,
  onChange,
}: Props) {
  const editor = useEditor({
    extensions: [StarterKit, Color, TextStyle, Underline],
    content: draftValue || liveValue,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // When page changes, reset content
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(draftValue || liveValue);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveValue]);

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[9px] uppercase tracking-widest text-white/40">{label}</p>

      {/* Original / live box */}
      <div className="relative border border-white/10 px-3 py-2 bg-white/[0.02]">
        <span className="absolute top-1 right-2 text-[8px] uppercase tracking-widest text-[#D4B896]/60">live</span>
        <div
          className="text-white/30 text-xs leading-relaxed prose-sm"
          dangerouslySetInnerHTML={{ __html: liveValue || "(empty)" }}
        />
      </div>

      {/* TipTap editor */}
      <div className="border border-white/20 focus-within:border-[#D4B896]/60 transition-colors">
        {editor && (
          <TipTapToolbar
            editor={editor}
            customColors={customColors}
            onAddCustomColor={onAddCustomColor}
          />
        )}
        <EditorContent
          editor={editor}
          className="min-h-[60px] text-white text-xs leading-relaxed px-3 py-2 outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[48px]"
        />
      </div>
    </div>
  );
}
