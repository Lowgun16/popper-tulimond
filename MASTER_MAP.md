# 🗺️ Project Master Map: FashionBrand 3D

## 📂 Core Directory Structure
- `/` (Root): Configuration, Design System, and Project Bibles.
- `/src/components`: UI Layer. Where the "Spatial Cards" and "Lookbook" live.
- `/src/studio`: The 3D Engine. Logic for characters, dots, and the bar environment.
- `/src/types`: TypeScript definitions. The "Source of Truth" for data structures.
- `/public/videos`: 4K assets for the Product Deep Dive.

## 📍 Key Files & Responsibilities
- `src/components/SpatialCard.tsx`: Handles the "Orbiting" logic and "Body-Out" math.
- `src/components/LookbookOverlay.tsx`: The "Frosted Glass" modal and video slider.
- `src/studio/StudioInspector.tsx`: Manages character positioning and dot interaction.
- `src/types/studioTypes.ts`: Defines the `ModelSlot` and `Inventory` interfaces.

## ⚡ Developer Protocol
1. Before modifying UI, check `DESIGN_SYSTEM.md` for spacing and color constants.
2. When adding new products, update the inventory array in `src/components/SpatialCard.tsx`.
3. Prioritize mobile-first responsiveness (Edge Clamping & Altitude Stacking).