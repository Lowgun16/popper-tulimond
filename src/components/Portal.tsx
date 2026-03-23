// src/components/Portal.tsx
"use client";

import { usePortalTransforms } from "@/hooks/usePortalTransforms";
import PortalBackground from "@/components/PortalBackground";
import PortalFlyingText from "@/components/PortalFlyingText";
import CollectionSection from "@/components/CollectionSection";

export default function Portal() {
  const t = usePortalTransforms();

  return (
    // 300vh container — gives three screens of scroll distance
    <div ref={t.containerRef} className="relative" style={{ height: "300vh" }}>

      {/* Sticky viewport — fixed on screen while container scrolls beneath */}
      <div className="sticky top-0 h-screen overflow-hidden bg-obsidian">

        {/* Background: storefront zoom + inside store clip-path + vignette */}
        <PortalBackground
          storefrontScale={t.storefrontScale}
          storefrontOpacity={t.storefrontOpacity}
          insideClipPath={t.insideClipPath}
          vignetteOpacity={t.vignetteOpacity}
        />

        {/* PT monogram — swells toward camera, environmental atmosphere */}
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <PortalFlyingText
            text="PT"
            scale={t.ptScale}
            opacity={t.ptOpacity}
            className="type-display text-gold/20"
            style={{ fontSize: "10rem", fontStyle: "italic" }}
          />
        </div>

        {/* "Dressed in Power." — drifts upward past the camera */}
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <PortalFlyingText
            text="Dressed in Power."
            y={t.dressingY}
            opacity={t.dressingOpacity}
            className="type-display text-gold-gradient text-center"
            style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}
          />
        </div>

        {/* Collection section — crossfades in as portal resolves */}
        <CollectionSection
          opacity={t.collectionOpacity}
          y={t.collectionY}
        />

      </div>
    </div>
  );
}
