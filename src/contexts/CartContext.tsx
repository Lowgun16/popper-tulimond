"use client";

import { createContext, useContext, useEffect, useReducer, useCallback, useState } from "react";

const STORAGE_KEY = "pt_cart";

export interface CartItem {
  id: string;           // unique instance: itemId + size + random suffix
  itemId: string;       // OutfitItem.id
  name: string;
  collection: string;
  colorway: string;
  size: string;
  initiationPriceCents: number;
  memberPriceCents: number;
  productImage?: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

type CartAction =
  | { type: "ADD"; item: CartItem }
  | { type: "REMOVE"; id: string }
  | { type: "CLEAR" }
  | { type: "OPEN" }
  | { type: "CLOSE" }
  | { type: "HYDRATE"; items: CartItem[] };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "HYDRATE": return { ...state, items: action.items };
    case "ADD":     return { ...state, items: [...state.items, action.item] };
    case "REMOVE":  return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    case "CLEAR":   return { ...state, items: [] };
    case "OPEN":    return { ...state, isOpen: true };
    case "CLOSE":   return { ...state, isOpen: false };
  }
}

interface CartContextValue extends CartState {
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  justAdded: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], isOpen: false });
  const [hydrated, setHydrated] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) dispatch({ type: "HYDRATE", items: JSON.parse(stored) });
    } catch { /* ignore parse errors */ }
    setHydrated(true);
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  }, [state.items, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, "id">) => {
    dispatch({ type: "ADD", item: { ...item, id: `${item.itemId}-${item.size}-${Math.random().toString(36).slice(2, 7)}` } });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  }, []);

  const removeItem = useCallback((id: string) => dispatch({ type: "REMOVE", id }), []);
  const clearCart  = useCallback(() => dispatch({ type: "CLEAR" }), []);
  const openCart   = useCallback(() => dispatch({ type: "OPEN" }), []);
  const closeCart  = useCallback(() => dispatch({ type: "CLOSE" }), []);

  return (
    <CartContext.Provider value={{ ...state, addItem, removeItem, clearCart, openCart, closeCart, justAdded }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
