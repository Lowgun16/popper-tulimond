"use client";
import { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { useEditPages } from "@/hooks/useEditPages";
import { FieldEditor } from "./FieldEditor";
import { PublishModal } from "./PublishModal";

export type PageEditorHandle = {
  save: () => Promise<void>;
  triggerPublish: () => void;
  saving: boolean;
  publishing: boolean;
  savedFlash: boolean;
  getDrafts: () => Record<string, string>;
};

const PAGE_FIELDS: Record<string, Array<{ key: string; label: string }>> = {
  protocol: [
    { key: "header", label: "Header" },
    { key: "title", label: "Title" },
    { key: "rule_01", label: "Rule 1" },
    { key: "rule_02", label: "Rule 2" },
    { key: "rule_03", label: "Rule 3" },
    { key: "cta_text", label: "CTA Text" },
    { key: "cta_subtext", label: "CTA Subtext" },
  ],
  contact: [
    { key: "headline", label: "Headline" },
    { key: "address_line1", label: "Address Line 1" },
    { key: "address_line2", label: "Address Line 2" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "note", label: "Note" },
  ],
  vault: [
    { key: "headline", label: "Headline" },
    { key: "subheadline", label: "Subheadline" },
  ],
  "membership-celebration": [
    { key: "congratulations_headline", label: "Headline (e.g. Congratulations.)" },
    { key: "subtitle", label: "Subtitle (small gold caps under headline)" },
    { key: "body_1", label: "Body — Paragraph 1" },
    { key: "body_2", label: "Body — Paragraph 2" },
    { key: "closing_line", label: "Closing Line (italic)" },
    { key: "cta_text", label: "Button Text" },
  ],
  reservation: [
    { key: "headline", label: "Headline (e.g. You have good taste.)" },
    { key: "body_1", label: "Body — Paragraph 1" },
    { key: "body_2", label: "Body — Paragraph 2" },
    { key: "cta_text", label: "Button Text (e.g. Reserve My Place)" },
    { key: "fine_print", label: "Fine Print (below the button)" },
    { key: "success_headline", label: "Success — Headline" },
    { key: "success_body", label: "Success — Body" },
  ],
  terms: [
    { key: "title", label: "Title" },
    { key: "last_updated", label: "Last Updated" },
    { key: "body", label: "Body" },
  ],
  privacy: [
    { key: "title", label: "Title" },
    { key: "last_updated", label: "Last Updated" },
    { key: "body", label: "Body" },
  ],
  shipping: [
    { key: "title", label: "Title" },
    { key: "last_updated", label: "Last Updated" },
    { key: "body", label: "Body" },
  ],
  refund: [
    { key: "title", label: "Title" },
    { key: "last_updated", label: "Last Updated" },
    { key: "body", label: "Body" },
  ],
  "contact-us": [
    { key: "address_line1", label: "Address Line 1" },
    { key: "address_line2", label: "Address Line 2" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
  ],
};

const PAGE_LABELS: Record<string, string> = {
  about: "About",
  protocol: "The Protocol",
  contact: "Contact",
  vault: "Vault",
  terms: "Terms of Use",
  privacy: "Privacy Policy",
  shipping: "Shipping & Fulfillment",
  refund: "Refund Policy",
  "contact-us": "Contact Us",
  reservation: "Reserve My Place Popup",
};

type Props = {
  pageSlug: string;
  liveContent: Record<string, string>;   // published values for this page (from page_content)
  customColors: Array<{ id: string; hex: string; label?: string | null }>;
  onAddCustomColor: (hex: string) => void;
};

export const PageEditor = forwardRef<PageEditorHandle, Props>(function PageEditor(
  { pageSlug, liveContent, customColors, onAddCustomColor }: Props,
  ref
) {
  const { drafts, saving, publishing, loadDrafts, updateField, saveDraft, publish } = useEditPages(pageSlug);
  const [localDrafts, setLocalDrafts] = useState<Record<string, string>>({});
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    loadDrafts().then(() => {});
  }, [pageSlug, loadDrafts]);

  useEffect(() => {
    setLocalDrafts(drafts);
  }, [drafts]);

  const fields = PAGE_FIELDS[pageSlug] ?? [];

  const sectionCount = pageSlug === "about"
    ? parseInt(localDrafts["section_count"] ?? liveContent["section_count"] ?? "4", 10)
    : 0;

  function handleChange(fieldKey: string, value: string) {
    setLocalDrafts((prev) => ({ ...prev, [fieldKey]: value }));
    updateField(fieldKey, value);
  }

  function addSection() {
    const newIdx = sectionCount;
    const newCount = sectionCount + 1;
    setLocalDrafts((prev) => ({
      ...prev,
      section_count: String(newCount),
      [`section_${newIdx}_title`]: "",
      [`section_${newIdx}_body`]: "",
    }));
    updateField("section_count", String(newCount));
  }

  function removeSection(idx: number) {
    const newCount = sectionCount - 1;
    setLocalDrafts((prev) => {
      const next: Record<string, string> = { ...prev, section_count: String(newCount) };
      for (let j = idx; j < newCount; j++) {
        next[`section_${j}_title`] = prev[`section_${j + 1}_title`] ?? "";
        next[`section_${j}_body`] = prev[`section_${j + 1}_body`] ?? "";
      }
      delete next[`section_${newCount}_title`];
      delete next[`section_${newCount}_body`];
      return next;
    });
    updateField("section_count", String(newCount));
  }

  async function handleSaveDraft() {
    await saveDraft(localDrafts);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }

  async function handlePublishConfirm() {
    await saveDraft(localDrafts);
    await publish();
    setShowPublishModal(false);
  }

  useImperativeHandle(ref, () => ({
    save: handleSaveDraft,
    triggerPublish: () => setShowPublishModal(true),
    saving,
    publishing,
    savedFlash,
    getDrafts: () => localDrafts,
  }), [handleSaveDraft, saving, publishing, savedFlash, localDrafts]);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar — desktop only; mobile bar lives in EditPagesPanel */}
      <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
        <h2 className="text-sm uppercase tracking-widest text-white">{PAGE_LABELS[pageSlug] ?? pageSlug}</h2>
        <div className="flex gap-3">
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className={`px-5 py-2 border text-[9px] uppercase tracking-widest transition-colors disabled:opacity-40 ${
              savedFlash
                ? "border-green-500/50 text-green-400"
                : "border-white/20 text-white/60 hover:border-white/40"
            }`}
          >
            {saving ? "Saving..." : savedFlash ? "Saved ✓" : "Save Draft"}
          </button>
          <button
            onClick={() => setShowPublishModal(true)}
            disabled={publishing}
            className="px-5 py-2 bg-[#D4B896] text-black text-[9px] uppercase tracking-widest disabled:opacity-40"
          >
            {publishing ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>

      {/* Field list */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {pageSlug === "about" ? (
          <>
            {/* Headline + Subheadline */}
            <FieldEditor
              key="about-headline"
              label="Headline"
              liveValue={liveContent["headline"] ?? ""}
              draftValue={localDrafts["headline"] ?? ""}
              customColors={customColors}
              onAddCustomColor={onAddCustomColor}
              onChange={(v) => handleChange("headline", v)}
            />
            <FieldEditor
              key="about-subheadline"
              label="Subheadline"
              liveValue={liveContent["subheadline"] ?? ""}
              draftValue={localDrafts["subheadline"] ?? ""}
              customColors={customColors}
              onAddCustomColor={onAddCustomColor}
              onChange={(v) => handleChange("subheadline", v)}
            />

            {/* Dynamic sections */}
            {Array.from({ length: sectionCount }, (_, i) => (
              <div key={i} className="border border-white/10 p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] uppercase tracking-widest text-white/30">Section {i + 1}</p>
                  {sectionCount > 1 && (
                    <button
                      onClick={() => removeSection(i)}
                      className="text-[9px] uppercase tracking-widest text-white/20 hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-[9px] uppercase tracking-widest text-white/30">Title</p>
                  <input
                    type="text"
                    value={localDrafts[`section_${i}_title`] ?? ""}
                    placeholder={liveContent[`section_${i}_title`] ?? ""}
                    onChange={(e) => handleChange(`section_${i}_title`, e.target.value)}
                    className="bg-transparent border border-white/10 text-white/80 text-sm px-3 py-2 outline-none focus:border-white/30 placeholder:text-white/20"
                  />
                </div>
                <FieldEditor
                  key={`about-section-${i}-body`}
                  label="Body"
                  liveValue={liveContent[`section_${i}_body`] ?? ""}
                  draftValue={localDrafts[`section_${i}_body`] ?? ""}
                  customColors={customColors}
                  onAddCustomColor={onAddCustomColor}
                  onChange={(v) => handleChange(`section_${i}_body`, v)}
                />
              </div>
            ))}

            <button
              onClick={addSection}
              className="border border-dashed border-white/20 py-3 text-white/30 hover:text-white/50 text-[9px] uppercase tracking-widest transition-colors"
            >
              + Add Section
            </button>

            {/* Closing */}
            <FieldEditor
              key="about-closing"
              label="Closing"
              liveValue={liveContent["closing"] ?? ""}
              draftValue={localDrafts["closing"] ?? ""}
              customColors={customColors}
              onAddCustomColor={onAddCustomColor}
              onChange={(v) => handleChange("closing", v)}
            />
          </>
        ) : (
          fields.map((field) => (
            <FieldEditor
              key={`${pageSlug}-${field.key}`}
              label={field.label}
              liveValue={liveContent[field.key] ?? ""}
              draftValue={localDrafts[field.key] ?? ""}
              customColors={customColors}
              onAddCustomColor={onAddCustomColor}
              onChange={(value) => handleChange(field.key, value)}
            />
          ))
        )}
      </div>

      {showPublishModal && (
        <PublishModal
          pageName={PAGE_LABELS[pageSlug] ?? pageSlug}
          onConfirm={handlePublishConfirm}
          onCancel={() => setShowPublishModal(false)}
        />
      )}
    </div>
  );
});
