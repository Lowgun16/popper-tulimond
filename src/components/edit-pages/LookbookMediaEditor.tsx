"use client";

import { useEffect, useState, useRef } from "react";
import { useEditPages } from "@/hooks/useEditPages";
import { MODEL_INVENTORY } from "@/data/inventory";
import { MODEL_CAROUSEL_ORDER } from "@/components/overlays/ChooseModelModal";
import type { LookbookMediaItem } from "@/lib/contentTypes";

function parseMedia(raw: string | undefined): LookbookMediaItem[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as LookbookMediaItem[]; } catch { return []; }
}

type UploadState = { outfitItemId: string; uploading: boolean; error: string | null };

export function LookbookMediaEditor() {
  const { drafts, loadDrafts, saveDraft } = useEditPages("lookbook");
  const [localDrafts, setLocalDrafts] = useState<Record<string, string>>({});
  const [activeModel, setActiveModel] = useState<string>(MODEL_CAROUSEL_ORDER[0]);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingOutfitRef = useRef<string | null>(null);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);
  useEffect(() => { setLocalDrafts(drafts); }, [drafts]);

  const modelSlot = MODEL_INVENTORY.find((s) => s.id === activeModel);
  const outfitItems = modelSlot?.outfit ?? [];

  // Group outfit items by collection
  const byCollection = outfitItems.reduce<Record<string, typeof outfitItems>>((acc, item) => {
    (acc[item.collection] ??= []).push(item);
    return acc;
  }, {});

  function getMedia(outfitItemId: string): LookbookMediaItem[] {
    return parseMedia(localDrafts[`lookbook_${outfitItemId}`]);
  }

  async function saveMedia(outfitItemId: string, items: LookbookMediaItem[]) {
    const key = `lookbook_${outfitItemId}`;
    const value = JSON.stringify(items);
    const updated = { ...localDrafts, [key]: value };
    setLocalDrafts(updated);
    await saveDraft({ [key]: value });
  }

  async function removeItem(outfitItemId: string, index: number) {
    const current = getMedia(outfitItemId);
    await saveMedia(outfitItemId, current.filter((_, i) => i !== index));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const outfitItemId = uploadingOutfitRef.current;
    if (!outfitItemId || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    setUploadState({ outfitItemId, uploading: true, error: null });

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("outfitItemId", outfitItemId);
      const res = await fetch("/api/upload/lookbook-media", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setUploadState({ outfitItemId, uploading: false, error: (err as { error?: string }).error ?? "Upload failed." });
        return;
      }
      const { url, type } = await res.json() as { url: string; type: "video" | "image" };
      await saveMedia(outfitItemId, [...getMedia(outfitItemId), { url, type }]);
      setUploadState(null);
    } catch {
      setUploadState({ outfitItemId, uploading: false, error: "Upload failed. Check connection." });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col overflow-y-auto h-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Model tabs */}
      <div className="flex border-b border-white/10 shrink-0">
        {MODEL_CAROUSEL_ORDER.map((modelId) => {
          const slot = MODEL_INVENTORY.find((s) => s.id === modelId);
          return (
            <button
              key={modelId}
              onClick={() => { setActiveModel(modelId); setExpandedProduct(null); }}
              className={`px-4 py-3 text-[9px] uppercase tracking-widest border-b-2 transition-colors ${
                activeModel === modelId
                  ? "border-[#C4A456] text-[#C4A456]"
                  : "border-transparent text-white/30 hover:text-white/60"
              }`}
            >
              {slot?.displayName ?? modelId}
            </button>
          );
        })}
      </div>

      {/* Product accordions */}
      <div className="flex flex-col divide-y divide-white/10">
        {Object.entries(byCollection).map(([collection, items]) => (
          <div key={collection}>
            <button
              onClick={() => setExpandedProduct(expandedProduct === collection ? null : collection)}
              className="w-full flex items-center justify-between px-6 py-4 text-left"
            >
              <span className="text-[10px] uppercase tracking-widest text-white/70">{collection}</span>
              <span className="text-white/30 text-sm">{expandedProduct === collection ? "−" : "+"}</span>
            </button>

            {expandedProduct === collection && (
              <div className="px-6 pb-6 flex flex-col gap-6">
                {items.map((outfitItem) => {
                  const media = getMedia(outfitItem.id);
                  const isUploading = uploadState?.outfitItemId === outfitItem.id && uploadState.uploading;
                  const error = uploadState?.outfitItemId === outfitItem.id ? uploadState.error : null;

                  return (
                    <div key={outfitItem.id} className="flex flex-col gap-2">
                      <p className="text-[9px] uppercase tracking-widest text-white/40">
                        {outfitItem.name} — {outfitItem.colorway}
                      </p>

                      {/* Thumbnail strip */}
                      {media.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {media.map((item, i) => (
                            <div key={i} className="relative group">
                              {item.type === "video" ? (
                                <video
                                  src={item.url}
                                  muted
                                  playsInline
                                  className="w-16 h-24 object-cover rounded border border-white/10"
                                />
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.url}
                                  alt=""
                                  className="w-16 h-24 object-cover rounded border border-white/10"
                                />
                              )}
                              <div className="absolute top-0 left-0 w-4 h-4 bg-black/60 flex items-center justify-center rounded-br text-[7px] text-white/40">
                                {i + 1}
                              </div>
                              <button
                                onClick={() => removeItem(outfitItem.id, i)}
                                className="absolute top-0 right-0 w-5 h-5 bg-red-900/80 text-red-300 text-[8px] rounded-bl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {media.length === 0 && (
                        <p className="text-[9px] text-white/20 italic">No media yet — upload below</p>
                      )}

                      <button
                        onClick={() => {
                          uploadingOutfitRef.current = outfitItem.id;
                          fileInputRef.current?.click();
                        }}
                        disabled={isUploading}
                        className="self-start px-4 py-2 border border-white/20 text-white/60 text-[9px] uppercase tracking-widest hover:border-white/40 disabled:opacity-40"
                      >
                        {isUploading ? "Uploading…" : media.length > 0 ? "Add More" : "Upload Photo / Video"}
                      </button>

                      {error && (
                        <p className="text-red-400 text-[10px]">{error}</p>
                      )}

                      {media.length > 0 && (
                        <p className="text-[8px] text-white/20">First item = tile cover in the Lookbook.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {outfitItems.length === 0 && (
          <p className="px-6 py-8 text-white/25 text-[10px]">
            No outfit items found for {activeModel}.
          </p>
        )}
      </div>
    </div>
  );
}
