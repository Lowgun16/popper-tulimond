// src/components/Portal.tsx
"use client";

import { useEffect, useRef } from "react";
import { useAnimate } from "framer-motion";
import { usePortalTransforms } from "@/hooks/usePortalTransforms";
import PortalBackground from "@/components/PortalBackground";
import AtelierNav from "@/components/AtelierNav";
import CollectionOverlay from "@/components/CollectionOverlay";

export default function Portal() {
  const t = usePortalTransforms();
  const [scope, animate] = useAnimate();
  const shakeRanRef = useRef(false);

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
        />

        {/* Model Stage — staggered silhouettes with pulse dots, reveals after walk-in */}
        <CollectionOverlay opacity={t.navOpacity} />

        {/* Editorial nav — ghost overlay, reveals only once inside */}
        <AtelierNav opacity={t.navOpacity} />

      </div>
    </div>
  );
}
