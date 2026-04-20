"use client";

import { useState, useCallback } from "react";
import Portal from "@/components/Portal";
import CartDrawer, { type CartItem } from "@/components/CartDrawer";
import ProtocolGate from "@/components/ProtocolGate";
import type { LookbookContext } from "@/components/studio/studioTypes";
import type { AllPageContent } from "@/lib/contentTypes";

interface ClientPageProps {
  allContent: AllPageContent;
}

export default function ClientPage({ allContent }: ClientPageProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [protocolGateOpen, setProtocolGateOpen] = useState(false);

  const handleAddToCart = useCallback((item: LookbookContext, size: string) => {
    const newItem: CartItem = {
      id: `${item.name}-${Math.random().toString(36).slice(2, 9)}`,
      name: item.name,
      collection: item.collection,
      colorway: item.colorway,
      size,
      price: item.price,
    };
    setCartItems((prev) => [...prev, newItem]);
    setIsCartOpen(true);
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return (
    <main>
      <Portal onAddToCart={handleAddToCart} allContent={allContent} />
      <CartDrawer
        isOpen={isCartOpen}
        items={cartItems}
        onClose={() => setIsCartOpen(false)}
        onRemoveItem={handleRemoveItem}
        onApplePay={() => { setIsCartOpen(false); setProtocolGateOpen(true); }}
        onGooglePay={() => { setIsCartOpen(false); setProtocolGateOpen(true); }}
        onPayOtherWay={() => { setIsCartOpen(false); setProtocolGateOpen(true); }}
      />
      <ProtocolGate
        isOpen={protocolGateOpen}
        onClose={() => setProtocolGateOpen(false)}
        onViewProtocol={() => setProtocolGateOpen(false)}
        onRequestSmsSignup={() => setProtocolGateOpen(false)}
      />
    </main>
  );
}
