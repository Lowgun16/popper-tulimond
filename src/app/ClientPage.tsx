"use client";

import { useCallback } from "react";
import Portal from "@/components/Portal";
import CartDrawer from "@/components/CartDrawer";
import CartIcon from "@/components/CartIcon";
import ProtocolGate from "@/components/ProtocolGate";
import { useCart } from "@/contexts/CartContext";
import type { LookbookContext } from "@/components/studio/studioTypes";
import type { AllPageContent } from "@/lib/contentTypes";
import type { ProductOverride } from "@/lib/productOverrides";

interface ClientPageProps {
  allContent: AllPageContent;
  productOverrides: ProductOverride[];
}

export default function ClientPage({ allContent, productOverrides }: ClientPageProps) {
  const { addItem } = useCart();

  const handleAddToCart = useCallback((item: LookbookContext & { id?: string; productImage?: string }, size: string) => {
    addItem({
      itemId: item.id ?? `item-${Math.random().toString(36).slice(2, 9)}`,
      name: item.name,
      collection: item.collection,
      colorway: item.colorway,
      size,
      initiationPriceCents: item.initiationPriceCents,
      memberPriceCents: item.memberPriceCents,
      productImage: item.productImage,
    });
  }, [addItem]);

  return (
    <main>
      <Portal onAddToCart={handleAddToCart} allContent={allContent} productOverrides={productOverrides} />
      <CartIcon />
      <CartDrawer
        onCheckout={() => { /* Stripe wired in Tasks 15-16 */ }}
      />
      <ProtocolGate
        isOpen={false}
        onClose={() => {}}
        onViewProtocol={() => {}}
        onRequestSmsSignup={() => {}}
      />
    </main>
  );
}
