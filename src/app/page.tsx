"use client";

import { useState, useCallback } from "react";
import Portal from "@/components/Portal";
import CartDrawer, { type CartItem } from "@/components/CartDrawer";
import type { LookbookContext } from "@/components/studio/studioTypes";

export default function Home() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

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
      <Portal onAddToCart={handleAddToCart} />
      <CartDrawer
        isOpen={isCartOpen}
        items={cartItems}
        onClose={() => setIsCartOpen(false)}
        onRemoveItem={handleRemoveItem}
        onApplePay={() => console.log("TODO: connect Stripe")}
        onGooglePay={() => console.log("TODO: connect Stripe")}
        onPayOtherWay={() => console.log("TODO: connect Stripe")}
      />
    </main>
  );
}
