"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { parseAbout, parseProtocol, parseContact } from "@/lib/pageContent";
import { mergeInventoryWithOverrides, type ProductOverride } from "@/lib/productOverrides";
import AboutOverlay from "@/components/overlays/AboutOverlay";
import ProtocolOverlay from "@/components/overlays/ProtocolOverlay";
import ContactOverlay from "@/components/overlays/ContactOverlay";
import VaultOverlay from "@/components/overlays/VaultOverlay";

type Props = {
  pageSlug: string;
  drafts: Record<string, string>;
  liveContent: Record<string, string>;
  onClose: () => void;
};

type ContentRow = { field_key: string; value: string };

/**
 * Merges draft + live values and returns ContentRow[] for the parse functions.
 * Draft values take priority.
 */
function buildRows(drafts: Record<string, string>, live: Record<string, string>): ContentRow[] {
  const merged = { ...live, ...drafts };
  return Object.entries(merged).map(([field_key, value]) => ({ field_key, value }));
}

/**
 * Protocol parse expects field keys "cta" and "ctaSubtext", but PageEditor
 * stores them as "cta_text" and "cta_subtext". Remap before parsing.
 */
function remapProtocolKeys(drafts: Record<string, string>, live: Record<string, string>): ContentRow[] {
  const merged = { ...live, ...drafts };
  const remapped: Record<string, string> = { ...merged };
  if ("cta_text" in remapped) {
    remapped["cta"] = remapped["cta_text"];
    delete remapped["cta_text"];
  }
  if ("cta_subtext" in remapped) {
    remapped["ctaSubtext"] = remapped["cta_subtext"];
    delete remapped["cta_subtext"];
  }
  return Object.entries(remapped).map(([field_key, value]) => ({ field_key, value }));
}

function PreviewContent({ pageSlug, drafts, liveContent, onClose }: Props) {
  const [vaultOverrides, setVaultOverrides] = useState<ProductOverride[]>([]);

  useEffect(() => {
    if (pageSlug === "vault") {
      fetch("/api/edit-pages/products", { credentials: "include" })
        .then((r) => r.ok ? r.json() : [])
        .then((data: ProductOverride[]) => setVaultOverrides(data))
        .catch(() => setVaultOverrides([]));
    }
  }, [pageSlug]);

  if (pageSlug === "about") {
    const rows = buildRows(drafts, liveContent);
    const content = parseAbout(rows);
    return (
      <AboutOverlay
        content={content}
        isOpen={true}
        onClose={onClose}
      />
    );
  }

  if (pageSlug === "protocol") {
    const rows = remapProtocolKeys(drafts, liveContent);
    const content = parseProtocol(rows);
    return (
      <ProtocolOverlay
        content={content}
        isOpen={true}
        onClose={onClose}
        onRequestSmsSignup={() => {}}
      />
    );
  }

  if (pageSlug === "contact") {
    const rows = buildRows(drafts, liveContent);
    const content = parseContact(rows);
    return (
      <ContactOverlay
        content={content}
        isOpen={true}
        onClose={onClose}
      />
    );
  }

  if (pageSlug === "vault") {
    return (
      <VaultOverlay
        isOpen={true}
        onClose={onClose}
        onProtocolGate={() => {}}
        onOpenLookbook={() => {}}
        productOverrides={vaultOverrides}
      />
    );
  }

  // Legal pages and anything else
  return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-white/30 text-xs uppercase tracking-widest">
        Preview not available for this page.
      </p>
    </div>
  );
}

export function PreviewPane({ pageSlug, drafts, liveContent, onClose }: Props) {
  return (
    <motion.div
      key="preview-pane"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "tween", duration: 0.3 }}
      className="fixed inset-0 z-[9000] bg-[#0a0a0a] flex flex-col overflow-hidden"
    >
      {/* Top banner */}
      <div
        className="shrink-0 flex items-center justify-between px-6 border-b border-white/10"
        style={{ height: "40px" }}
      >
        <button
          onClick={onClose}
          className="text-[9px] uppercase tracking-widest text-white/50 hover:text-white"
        >
          ← Back to Editor
        </button>
        <span className="text-[8px] uppercase tracking-widest text-[#D4B896]/60">
          Draft Preview
        </span>
        <div style={{ width: "120px" }} />
      </div>

      {/* Overlay component fills remaining space */}
      <div className="flex-1 overflow-hidden relative">
        <PreviewContent
          pageSlug={pageSlug}
          drafts={drafts}
          liveContent={liveContent}
          onClose={onClose}
        />
      </div>
    </motion.div>
  );
}
