// src/components/Portal.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAnimate } from "framer-motion";
import { usePortalTransforms } from "@/hooks/usePortalTransforms";
import PortalBackground from "@/components/PortalBackground";
import CollectionOverlay from "@/components/CollectionOverlay";
import SealedLetterOverlay from "@/components/SealedLetterOverlay";
import type { LookbookContext } from "@/components/studio/studioTypes";
import type { AllPageContent, ModelProfile } from "@/lib/contentTypes";
import type { ProductOverride } from "@/lib/productOverrides";

interface PortalProps {
  onAddToCart: (item: LookbookContext, size: string) => void;
  allContent: AllPageContent;
  productOverrides: ProductOverride[];
  modelProfiles: ModelProfile[];
  isAdmin: boolean;
}

export default function Portal({ onAddToCart, allContent, productOverrides, modelProfiles, isAdmin }: PortalProps) {
  const t = usePortalTransforms();
  const [scope, animate] = useAnimate();
  const shakeRanRef = useRef(false);
  const [letterOpen, setLetterOpen] = useState(false);

  // The letter hands a man inside by quietly pulling the existing scroll engine:
  // scroll to the bottom → the one-way ratchet locks him into the interior →
  // the obsidian letter fades away and he's standing in the speakeasy.
  const handleEnterFromLetter = useCallback(() => {
    document.body.style.overflow = "";
    requestAnimationFrame(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "auto" });
    });
    window.setTimeout(() => setLetterOpen(false), 700);
  }, []);

  // ── Scroll reset — force top of page on every load ────────────────────
  // Prevents browser scroll restoration from dropping the user mid-portal.
  useEffect(() => {
    if (typeof history !== "undefined") {
      history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  // ── The Heartbeat — screen shake ─────────────────────────────────────
  // Fires once when lockedProgress crosses 0.70.
  // 0.5px microscopic shake over 100ms simulates the physical "click" of
  // the door unlocking. Pairs with the haptic vibration from the hook.
  useEffect(() => {
    if (t.heartbeatFired && !shakeRanRef.current && scope.current) {
      shakeRanRef.current = true;
      animate(
        scope.current,
        { x: [0, -0.5, 0.5, -0.5, 0.5, -0.5, 0] },
        { duration: 0.1, ease: "linear" }
      );
    }
  }, [t.heartbeatFired, animate, scope]);

  return (
    // 300vh gives three screens of scroll distance — cinematic pace.
    <div ref={t.containerRef} className="relative" style={{ height: "300vh" }}>

      {/* Sticky viewport — 100dvh prevents mobile browser chrome from shifting layout */}
      <div ref={scope} className="sticky top-0 h-[100dvh] overflow-hidden">

        <PortalBackground
          storefrontScale={t.storefrontScale}
          storefrontOpacity={t.storefrontOpacity}
          storefrontPanXDesktop={t.storefrontPanXDesktop}
          storefrontPanXMobile={t.storefrontPanXMobile}
          insideClipPath={t.insideClipPath}
          insideOpacity={t.insideOpacity}
          insideFilter={t.insideFilter}
          showInside={t.showInside}
          onLetterTap={() => setLetterOpen(true)}
          letterHidden={letterOpen || t.showInside}
        />

        {/* Model Stage + all overlays/nav — owned by CollectionOverlay */}
        <CollectionOverlay opacity={t.navOpacity} onAddToCart={onAddToCart} allContent={allContent} productOverrides={productOverrides} modelProfiles={modelProfiles} isAdmin={isAdmin} />

        <SealedLetterOverlay open={letterOpen} onEnter={handleEnterFromLetter} />

      </div>
    </div>
  );
}
