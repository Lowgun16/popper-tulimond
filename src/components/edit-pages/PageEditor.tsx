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
};

const PAGE_FIELDS: Record<string, Array<{ key: string; label: string }>> = {
  about: [
    { key: "headline", label: "Headline" },
    { key: "subheadline", label: "Subheadline" },
    { key: "section_billboard_title", label: "Section 1 — Title" },
    { key: "section_billboard_body", label: "Section 1 — Body" },
    { key: "section_foundation_title", label: "Section 2 — Title" },
    { key: "section_foundation_body", label: "Section 2 — Body" },
    { key: "section_meal_title", label: "Section 3 — Title" },
    { key: "section_meal_body", label: "Section 3 — Body" },
    { key: "section_silent_contract_title", label: "Section 4 — Title" },
    { key: "section_silent_contract_body", label: "Section 4 — Body" },
    { key: "closing", label: "Closing" },
  ],
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

  useEffect(() => {
    loadDrafts().then(() => {});
  }, [pageSlug, loadDrafts]);

  useEffect(() => {
    setLocalDrafts(drafts);
  }, [drafts]);

  const fields = PAGE_FIELDS[pageSlug] ?? [];

  function handleChange(fieldKey: string, value: string) {
    setLocalDrafts((prev) => ({ ...prev, [fieldKey]: value }));
    updateField(fieldKey, value);
  }

  async function handleSaveDraft() {
    await saveDraft(localDrafts);
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
  }), [handleSaveDraft, saving, publishing]);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar — desktop only; mobile bar lives in EditPagesPanel */}
      <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
        <h2 className="text-sm uppercase tracking-widest text-white">{PAGE_LABELS[pageSlug] ?? pageSlug}</h2>
        <div className="flex gap-3">
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="px-5 py-2 border border-white/20 text-white/60 text-[9px] uppercase tracking-widest hover:border-white/40 disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save Draft"}
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

      {/* Field list — single column (split view is handled by EditPagesPanel layout) */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {fields.map((field) => (
          <FieldEditor
            key={`${pageSlug}-${field.key}`}
            label={field.label}
            liveValue={liveContent[field.key] ?? ""}
            draftValue={localDrafts[field.key] ?? ""}
            customColors={customColors}
            onAddCustomColor={onAddCustomColor}
            onChange={(value) => handleChange(field.key, value)}
          />
        ))}
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
