"use client";

import { useEffect, useState, useImperativeHandle, forwardRef, useRef } from "react";
import { upload } from "@vercel/blob/client";
import { useEditPages } from "@/hooks/useEditPages";
import { FieldEditor } from "./FieldEditor";
import { PublishModal } from "./PublishModal";
import { MODEL_CAROUSEL_ORDER } from "@/components/overlays/ChooseModelModal";
import type { PageEditorHandle } from "./PageEditor";

const MODEL_NAMES: Record<string, string> = {
  jerome: "Jerome",
  angel: "Angel",
  jack: "Jack",
  ethan: "Ethan",
};

type PaletteColor = { id: string; hex: string; label?: string | null };

type Props = {
  liveContent: Record<string, string>;
  customColors: PaletteColor[];
  onAddCustomColor: (hex: string) => void;
};

export const ModelProfileEditor = forwardRef<PageEditorHandle, Props>(
  function ModelProfileEditor({ liveContent, customColors, onAddCustomColor }, ref) {
    const { drafts, saving, publishing, loadDrafts, updateField, saveDraft, publish } =
      useEditPages("models");
    const [localDrafts, setLocalDrafts] = useState<Record<string, string>>({});
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);
    const [expandedModel, setExpandedModel] = useState<string>("jerome");
    const [uploadingFor, setUploadingFor] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadingModelRef = useRef<string | null>(null);

    useEffect(() => { loadDrafts(); }, [loadDrafts]);
    useEffect(() => { setLocalDrafts(drafts); }, [drafts]);

    useImperativeHandle(ref, () => ({
      save: async () => {
        await saveDraft(localDrafts);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1800);
      },
      triggerPublish: () => setShowPublishModal(true),
      saving,
      publishing,
      savedFlash,
      getDrafts: () => localDrafts,
    }));

    function handleChange(fieldKey: string, value: string) {
      setLocalDrafts((prev) => ({ ...prev, [fieldKey]: value }));
      updateField(fieldKey, value);
    }

    function getVal(fieldKey: string): string {
      return localDrafts[fieldKey] ?? liveContent[fieldKey] ?? "";
    }

    async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
      const modelId = uploadingModelRef.current;
      if (!modelId || !e.target.files?.[0]) return;
      const file = e.target.files[0];
      setUploadingFor(modelId);
      setUploadError(null);
      try {
        const ext = file.type === "video/webm" ? "webm" : "mp4";
        const blob = await upload(`models/${modelId}/${Date.now()}.${ext}`, file, {
          access: "public",
          handleUploadUrl: "/api/upload/model-video",
          clientPayload: JSON.stringify({ modelId }),
        });
        handleChange(`${modelId}_video_url`, blob.url);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed. Check your connection.");
      } finally {
        setUploadingFor(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }

    async function handlePublishConfirm() {
      await saveDraft(localDrafts);
      await publish();
      setShowPublishModal(false);
    }

    return (
      <div className="flex flex-col gap-0 overflow-y-auto h-full">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm"
          className="hidden"
          onChange={handleVideoUpload}
        />

        {MODEL_CAROUSEL_ORDER.map((modelId) => {
          const isExpanded = expandedModel === modelId;
          const name = MODEL_NAMES[modelId] ?? modelId;
          const videoUrl = getVal(`${modelId}_video_url`);

          return (
            <div key={modelId} className="border-b border-white/10">
              <button
                onClick={() => setExpandedModel(isExpanded ? "" : modelId)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <span className="text-[10px] uppercase tracking-widest text-white/70">{name}</span>
                <span className="text-white/30 text-sm">{isExpanded ? "−" : "+"}</span>
              </button>

              {isExpanded && (
                <div className="px-6 pb-6 flex flex-col gap-4">
                  {[
                    { key: `${modelId}_tagline`, label: "Tagline (one line)" },
                    { key: `${modelId}_height`, label: "Height (e.g. 5'10\")" },
                    { key: `${modelId}_weight`, label: "Weight (e.g. 175 lbs)" },
                    { key: `${modelId}_body_type`, label: "Body Type (e.g. Lean, athletic)" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex flex-col gap-1">
                      <p className="text-[9px] uppercase tracking-widest text-white/40">{label}</p>
                      <input
                        type="text"
                        value={getVal(key)}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="bg-transparent border border-white/20 text-white/80 text-[11px] px-3 py-2 outline-none focus:border-white/40 placeholder:text-white/20"
                        placeholder={label}
                      />
                    </div>
                  ))}

                  <FieldEditor
                    label="Bio (3–5 sentences)"
                    liveValue={liveContent[`${modelId}_bio`] ?? ""}
                    draftValue={localDrafts[`${modelId}_bio`] ?? ""}
                    customColors={customColors}
                    onAddCustomColor={onAddCustomColor}
                    onChange={(v) => handleChange(`${modelId}_bio`, v)}
                  />

                  <div className="flex flex-col gap-2">
                    <p className="text-[9px] uppercase tracking-widest text-white/40">Intro Video</p>
                    {videoUrl && (
                      <div className="flex items-center gap-3">
                        <video
                          src={videoUrl}
                          muted
                          playsInline
                          className="w-20 h-28 object-cover rounded border border-white/10"
                        />
                        <button
                          onClick={() => handleChange(`${modelId}_video_url`, "")}
                          className="text-[9px] uppercase tracking-widest text-red-400/60 hover:text-red-400"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        uploadingModelRef.current = modelId;
                        fileInputRef.current?.click();
                      }}
                      disabled={uploadingFor === modelId}
                      className="self-start px-4 py-2 border border-white/20 text-white/60 text-[9px] uppercase tracking-widest hover:border-white/40 disabled:opacity-40"
                    >
                      {uploadingFor === modelId ? "Uploading…" : videoUrl ? "Replace Video" : "Upload Video (.mp4 / .webm)"}
                    </button>
                    {uploadError && uploadingModelRef.current === modelId && (
                      <p className="text-red-400 text-[10px]">{uploadError}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {showPublishModal && (
          <PublishModal
            pageName="Models"
            onConfirm={handlePublishConfirm}
            onCancel={() => setShowPublishModal(false)}
          />
        )}
      </div>
    );
  }
);
