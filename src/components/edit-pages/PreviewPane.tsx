"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { parseAbout, parseProtocol, parseContact } from "@/lib/pageContent";
import { mergeInventoryWithOverrides, type ProductOverride } from "@/lib/productOverrides";
import {
  TERMS_CONTENT,
  PRIVACY_CONTENT,
  SHIPPING_CONTENT,
  REFUND_CONTENT,
  MEMBERSHIP_CELEBRATION_CONTENT,
  RESERVATION_CONTENT,
} from "@/lib/staticContent";
import type { LegalContent, ContactUsContent, MembershipCelebrationContent, ReservationContent } from "@/lib/contentTypes";
import AboutOverlay from "@/components/overlays/AboutOverlay";
import ProtocolOverlay from "@/components/overlays/ProtocolOverlay";
import ContactOverlay from "@/components/overlays/ContactOverlay";
import VaultOverlay from "@/components/overlays/VaultOverlay";
import LegalContentOverlay, { type LegalPage } from "@/components/overlays/LegalContentOverlay";
import { MembershipCelebration } from "@/components/MembershipCelebration";
import ReservationSheet from "@/components/ReservationSheet";
import { CONTACT_CONTENT } from "@/lib/staticContent";

type Props = {
  pageSlug: string;
  drafts: Record<string, string>;
  liveContent: Record<string, string>;
  onClose: () => void;
};

type ContentRow = { field_key: string; value: string };

function buildRows(drafts: Record<string, string>, live: Record<string, string>): ContentRow[] {
  const merged = { ...live, ...drafts };
  return Object.entries(merged).map(([field_key, value]) => ({ field_key, value }));
}

function remapProtocolKeys(drafts: Record<string, string>, live: Record<string, string>): ContentRow[] {
  const merged = { ...live, ...drafts };
  const remapped: Record<string, string> = { ...merged };
  if ("cta_text" in remapped) { remapped["cta"] = remapped["cta_text"]; delete remapped["cta_text"]; }
  if ("cta_subtext" in remapped) { remapped["ctaSubtext"] = remapped["cta_subtext"]; delete remapped["cta_subtext"]; }
  return Object.entries(remapped).map(([field_key, value]) => ({ field_key, value }));
}

function parseLegalPreview(
  drafts: Record<string, string>,
  live: Record<string, string>,
  fallback: { title: string; lastUpdated: string; body: string }
): LegalContent {
  const m = { ...live, ...drafts };
  return {
    title: m["title"] ?? fallback.title,
    lastUpdated: m["last_updated"] ?? m["lastUpdated"] ?? fallback.lastUpdated,
    body: m["body"] ?? fallback.body,
  };
}

function parseContactUsPreview(
  drafts: Record<string, string>,
  live: Record<string, string>,
): ContactUsContent {
  const m = { ...live, ...drafts };
  return {
    address: {
      line1: m["address_line1"] ?? CONTACT_CONTENT.address.line1,
      line2: m["address_line2"] ?? CONTACT_CONTENT.address.line2,
    },
    phone: m["phone"] ?? CONTACT_CONTENT.phone,
    email: m["email"] ?? CONTACT_CONTENT.email,
    note: m["note"] ?? "",
  };
}

function parseCelebrationPreview(
  drafts: Record<string, string>,
  live: Record<string, string>,
): MembershipCelebrationContent {
  const m = { ...live, ...drafts };
  return {
    congratulations_headline: m["congratulations_headline"] ?? MEMBERSHIP_CELEBRATION_CONTENT.congratulations_headline,
    subtitle: m["subtitle"] ?? MEMBERSHIP_CELEBRATION_CONTENT.subtitle,
    body_1: m["body_1"] ?? MEMBERSHIP_CELEBRATION_CONTENT.body_1,
    body_2: m["body_2"] ?? MEMBERSHIP_CELEBRATION_CONTENT.body_2,
    closing_line: m["closing_line"] ?? MEMBERSHIP_CELEBRATION_CONTENT.closing_line,
    cta_text: m["cta_text"] ?? MEMBERSHIP_CELEBRATION_CONTENT.cta_text,
  };
}

function parseReservationPreview(
  drafts: Record<string, string>,
  live: Record<string, string>,
): ReservationContent {
  const m = { ...live, ...drafts };
  return {
    headline: m["headline"] ?? RESERVATION_CONTENT.headline,
    body_1: m["body_1"] ?? RESERVATION_CONTENT.body_1,
    body_2: m["body_2"] ?? RESERVATION_CONTENT.body_2,
    cta_text: m["cta_text"] ?? RESERVATION_CONTENT.cta_text,
    fine_print: m["fine_print"] ?? RESERVATION_CONTENT.fine_print,
    success_headline: m["success_headline"] ?? RESERVATION_CONTENT.success_headline,
    success_body: m["success_body"] ?? RESERVATION_CONTENT.success_body,
  };
}

const LEGAL_SLUGS: LegalPage[] = ["terms", "privacy", "shipping", "refund", "contact-us"];

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
    return <AboutOverlay content={parseAbout(buildRows(drafts, liveContent))} isOpen={true} onClose={onClose} />;
  }

  if (pageSlug === "protocol") {
    return (
      <ProtocolOverlay
        content={parseProtocol(remapProtocolKeys(drafts, liveContent))}
        isOpen={true}
        onClose={onClose}
        onRequestSmsSignup={() => {}}
      />
    );
  }

  if (pageSlug === "contact") {
    return <ContactOverlay content={parseContact(buildRows(drafts, liveContent))} isOpen={true} onClose={onClose} />;
  }

  if (pageSlug === "vault") {
    return (
      <VaultOverlay
        isOpen={true}
        onClose={onClose}
        onAddToCart={() => {}}
        onOpenLookbook={() => {}}
        productOverrides={vaultOverrides}
      />
    );
  }

  if (LEGAL_SLUGS.includes(pageSlug as LegalPage)) {
    const slug = pageSlug as LegalPage;
    const fallbacks = {
      terms: TERMS_CONTENT, privacy: PRIVACY_CONTENT,
      shipping: SHIPPING_CONTENT, refund: REFUND_CONTENT,
    };
    const allLegal = {
      terms: parseLegalPreview(drafts, liveContent, TERMS_CONTENT),
      privacy: parseLegalPreview(drafts, liveContent, PRIVACY_CONTENT),
      shipping: parseLegalPreview(drafts, liveContent, SHIPPING_CONTENT),
      refund: parseLegalPreview(drafts, liveContent, REFUND_CONTENT),
      contactUs: parseContactUsPreview(drafts, liveContent),
    };
    // For legal pages we only want the current slug's content to reflect drafts;
    // others stay at their published defaults so the overlay renders correctly.
    const stableLegal = {
      terms: slug === "terms" ? allLegal.terms : parseLegalPreview({}, {}, TERMS_CONTENT),
      privacy: slug === "privacy" ? allLegal.privacy : parseLegalPreview({}, {}, PRIVACY_CONTENT),
      shipping: slug === "shipping" ? allLegal.shipping : parseLegalPreview({}, {}, SHIPPING_CONTENT),
      refund: slug === "refund" ? allLegal.refund : parseLegalPreview({}, {}, REFUND_CONTENT),
      contactUs: slug === "contact-us" ? allLegal.contactUs : parseContactUsPreview({}, {}),
    };
    void fallbacks; // used above indirectly
    return <LegalContentOverlay isOpen={true} onClose={onClose} page={slug} allLegal={stableLegal} />;
  }

  if (pageSlug === "membership-celebration") {
    return (
      <MembershipCelebration
        content={parseCelebrationPreview(drafts, liveContent)}
        onEnterVault={onClose}
        disableSound
      />
    );
  }

  if (pageSlug === "reservation") {
    return (
      <ReservationSheet
        isOpen={true}
        onClose={onClose}
        contentOverride={parseReservationPreview(drafts, liveContent)}
      />
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-white/30 text-xs uppercase tracking-widest">Preview not available for this page.</p>
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
