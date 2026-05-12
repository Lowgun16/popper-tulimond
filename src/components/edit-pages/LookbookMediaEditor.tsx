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

function MediaStrip({
  outfitItemId,
  media,
  onReorder,
  onRemove,
}: {
  outfitItemId: string;
  media: LookbookMediaItem[];
  onReorder: (outfitItemId: string, items: LookbookMediaItem[]) => void;
  onRemove: (outfitItemId: string, index: number) => void;
}) {
  const [order, setOrder] = useState(media);
  const dragFrom = useRef<number | null>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    if (!isDragging.current) setOrder(media);
  }, [media]);

  function handleDragStart(e: React.DragEvent, i: number) {
    isDragging.current = true;
    dragFrom.current = i;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    const from = dragFrom.current;
    if (from === null || from === i) return;
    const updated = [...order];
    const [item] = updated.splice(from, 1);
    updated.splice(i, 0, item);
    setOrder(updated);
    dragFrom.current = i;
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    onReorder(outfitItemId, order);
  }

  function handleDragEnd() {
    isDragging.current = false;
    dragFrom.current = null;
  }

  function moveUp(i: number) {
    if (i === 0) return;
    const updated = [...order];
    [updated[i - 1], updated[i]] = [updated[i], updated[i - 1]];
    setOrder(updated);
    onReorder(outfitItemId, updated);
  }

  function moveDown(i: number) {
    if (i === order.length - 1) return;
    const updated = [...order];
    [updated[i], updated[i + 1]] = [updated[i + 1], updated[i]];
    setOrder(updated);
    onReorder(outfitItemId, updated);
  }

  return (
    <div className="flex gap-3 flex-wrap">
      {order.map((item, i) => (
        <div
          key={i}
          draggable
          onDragStart={(e) => handleDragStart(e, i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          className="flex flex-col gap-1 cursor-grab active:cursor-grabbing"
        >
          <div className="relative">
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
              onClick={() => onRemove(outfitItemId, i)}
              className="absolute top-0 right-0 w-5 h-5 bg-red-900/80 text-red-300 text-[8px] rounded-bl flex items-center justify-center"
            >
              ✕
            </button>
          </div>
          {/* Up/down arrows — mobile-friendly reorder fallback */}
          <div className="flex justify-between">
            <button
              onClick={() => moveUp(i)}
              disabled={i === 0}
              className="flex-1 text-center text-[10px] text-white/30 disabled:opacity-20 hover:text-white/60"
            >
              ‹
            </button>
            <button
              onClick={() => moveDown(i)}
              disabled={i === order.length - 1}
              className="flex-1 text-center text-[10px] text-white/30 disabled:opacity-20 hover:text-white/60"
            >
              ›
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LookbookMediaEditor() {
  const { drafts, loadDrafts, saveDraft } = useEditPages("models");
  const [localDrafts, setLocalDrafts] = useState<Record<string, string>>({});
  const [activeModel, setActiveModel] = useState<string>(MODEL_CAROUSEL_ORDER[0]);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);
  useEffect(() => { setLocalDrafts(drafts); }, [drafts]);

  const modelSlot = MODEL_INVENTORY.find((s) => s.id === activeModel);
  const outfitItems = modelSlot?.outfit ?? [];

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
    setLocalDrafts((prev) => ({ ...prev, [key]: value }));
    await saveDraft({ [key]: value });
  }

  async function handleReorder(outfitItemId: string, items: LookbookMediaItem[]) {
    await saveMedia(outfitItemId, items);
  }

  async function removeItem(outfitItemId: string, index: number) {
    await saveMedia(outfitItemId, getMedia(outfitItemId).filter((_, i) => i !== index));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, outfitItemId: string) {
    if (!e.target.files?.[0]) return;
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
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-col overflow-y-auto h-full">
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
                  const inputId = `upload-${outfitItem.id}`;

                  return (
                    <div key={outfitItem.id} className="flex flex-col gap-2">
                      <p className="text-[9px] uppercase tracking-widest text-white/40">
                        {outfitItem.name} — {outfitItem.colorway}
                      </p>

                      {media.length > 0 ? (
                        <MediaStrip
                          outfitItemId={outfitItem.id}
                          media={media}
                          onReorder={handleReorder}
                          onRemove={removeItem}
                        />
                      ) : (
                        <p className="text-[9px] text-white/20 italic">No media yet — upload below</p>
                      )}

                      {/* Per-item hidden file input */}
                      <input
                        id={inputId}
                        type="file"
                        accept="video/mp4,video/webm,image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => handleFileChange(e, outfitItem.id)}
                      />
                      <label
                        htmlFor={isUploading ? undefined : inputId}
                        className={`self-start px-4 py-2 border border-white/20 text-white/60 text-[9px] uppercase tracking-widest select-none ${
                          isUploading ? "opacity-40 cursor-default" : "hover:border-white/40 cursor-pointer"
                        }`}
                      >
                        {isUploading ? "Uploading…" : media.length > 0 ? "Add More" : "Upload Photo / Video"}
                      </label>

                      {error && (
                        <p className="text-red-400 text-[10px]">{error}</p>
                      )}

                      {media.length > 0 && (
                        <p className="text-[8px] text-white/20">
                          First item = tile cover. Drag or use ‹ › to reorder.
                        </p>
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
