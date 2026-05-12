"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LookbookModelSwitcher } from "@/components/overlays/LookbookModelSwitcher";
import { LookbookVersionGrid, VersionItem } from "@/components/overlays/LookbookVersionGrid";
import { LookbookDeepDive } from "@/components/overlays/LookbookDeepDive";
import { LookbookCompareMode } from "@/components/overlays/LookbookCompareMode";
import { ChooseModelModal } from "@/components/overlays/ChooseModelModal";
import { MODEL_INVENTORY } from "@/data/inventory";
import OverlayPortal from "@/components/OverlayPortal";
import type { LookbookContext } from "./studioTypes";
import type { ModelProfile, LookbookMediaItem } from "@/lib/contentTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = "grid" | "deepdive" | "compare";

interface LookbookOverlayProps {
  item: LookbookContext | null;
  onClose: () => void;
  onAddToCart: (item: LookbookContext, size: string) => void;
  onChangeModel?: () => void;
  modelProfiles: ModelProfile[];
  activeModelId: string;
  onSwitchModel: (modelId: string) => void;
  isMember?: boolean;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function LookbookOverlay({
  item,
  onClose,
  onAddToCart,
  modelProfiles,
  activeModelId,
  onSwitchModel,
  isMember = false,
}: LookbookOverlayProps) {
  const [screen, setScreen] = useState<Screen>("grid");
  const [selectedVersion, setSelectedVersion] = useState<VersionItem | null>(null);
  const [compareVersions, setCompareVersions] = useState<[VersionItem, VersionItem] | null>(null);
  const [allMedia, setAllMedia] = useState<Record<string, LookbookMediaItem[]>>({});
  const [showProfileCarousel, setShowProfileCarousel] = useState(false);

  // Fetch all published lookbook media when overlay opens
  useEffect(() => {
    if (!item) return;
    fetch("/api/lookbook/media")
      .then((r) => r.json())
      .then((data: Record<string, LookbookMediaItem[]>) => setAllMedia(data))
      .catch(() => setAllMedia({}));
  }, [item]);

  // Reset to grid when model switches
  useEffect(() => {
    setScreen("grid");
    setSelectedVersion(null);
    setCompareVersions(null);
  }, [activeModelId]);

  // Keyboard close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Get all outfit items for active model in the same collection as the tapped item
  const activeSlot = MODEL_INVENTORY.find((s) => s.id === activeModelId);
  const versions: VersionItem[] = item
    ? (activeSlot?.outfit ?? []).filter((o) => o.collection === item.collection) as unknown as VersionItem[]
    : [];

  const activeProfile = modelProfiles.find((p) => p.id === activeModelId);
  const defaultSize = activeProfile?.defaultSize ?? "M";

  function handleSelectVersion(version: VersionItem) {
    setSelectedVersion(version);
    setScreen("deepdive");
  }

  function handleCompare(selected: [VersionItem, VersionItem]) {
    setCompareVersions(selected);
    setScreen("compare");
  }

  function handleAddToCartFromOverlay(versionItem: VersionItem, size: string) {
    onAddToCart(versionItem as unknown as LookbookContext, size);
  }

  const handleSwitchModel = useCallback((modelId: string) => {
    onSwitchModel(modelId);
  }, [onSwitchModel]);

  if (!item) return null;

  const content = (
    <AnimatePresence>
      <motion.div
        key="lookbook-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          position: "fixed", inset: 0, zIndex: 6000,
          background: "rgba(6,6,6,0.97)",
          backdropFilter: "blur(24px)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* Close button */}
        <div style={{ position: "absolute", top: 14, right: 16, zIndex: 10 }}>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none", border: "none", color: "rgba(255,255,255,0.3)",
              fontSize: 14, cursor: "pointer", padding: 4,
              fontFamily: "var(--font-body, sans-serif)",
            }}
          >✕</button>
        </div>

        {/* Model switcher — always visible at top */}
        <LookbookModelSwitcher
          models={modelProfiles}
          activeModelId={activeModelId}
          onSwitch={handleSwitchModel}
          onViewProfile={() => setShowProfileCarousel(true)}
        />

        {/* Screens */}
        <AnimatePresence mode="wait">
          {screen === "grid" && (
            <motion.div
              key="grid"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
              style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
            >
              <LookbookVersionGrid
                productName={item.collection}
                versions={versions}
                media={allMedia}
                onSelectVersion={handleSelectVersion}
                onCompare={handleCompare}
              />
            </motion.div>
          )}

          {screen === "deepdive" && selectedVersion && (
            <motion.div
              key="deepdive"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
              style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
            >
              <LookbookDeepDive
                item={selectedVersion}
                media={allMedia[selectedVersion.id] ?? []}
                defaultSize={defaultSize}
                isMember={isMember}
                onExit={() => setScreen("grid")}
                onAddToCart={handleAddToCartFromOverlay}
              />
            </motion.div>
          )}

          {screen === "compare" && compareVersions && (
            <motion.div
              key="compare"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
              style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
            >
              <LookbookCompareMode
                versions={compareVersions}
                media={allMedia}
                defaultSize={defaultSize}
                isMember={isMember}
                onBack={() => setScreen("grid")}
                onAddToCart={handleAddToCartFromOverlay}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );

  return (
    <OverlayPortal>
      {content}

      {/* Profile carousel */}
      {showProfileCarousel && (
        <ChooseModelModal
          isOpen={showProfileCarousel}
          modelProfiles={modelProfiles}
          defaultModelId={activeModelId}
          onSelect={(modelId) => {
            onSwitchModel(modelId);
            setShowProfileCarousel(false);
          }}
          onDismiss={() => setShowProfileCarousel(false)}
        />
      )}
    </OverlayPortal>
  );
}
