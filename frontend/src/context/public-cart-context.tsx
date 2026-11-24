"use client";

import React, { createContext, useContext, useState } from "react";
import { DHAKA_BRANCHES, type PublicProduct } from "@/lib/public-catalog";

export interface CartEntry {
  product: PublicProduct;
  quantity: number;
}

interface PublicCartContextValue {
  items: CartEntry[];
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  addItem: (product: PublicProduct) => { ok: boolean; message?: string };
  updateQuantity: (productId: string, delta: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const PublicCartContext = createContext<PublicCartContextValue | null>(null);

export function PublicCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartEntry[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState(DHAKA_BRANCHES[3].id); // Gulshan default

  const addItem = (product: PublicProduct): { ok: boolean; message?: string } => {
    if (!product.purchasableOnline || product.maxOrderQty <= 0) {
      return {
        ok: false,
        message: "Prescription medicine cannot be purchased online. Visit a Dhaka branch with your prescription.",
      };
    }

    let limitHit = false;
    setItems((prev) => {
      const existing = prev.find((e) => e.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.maxOrderQty) {
          limitHit = true;
          return prev;
        }
        return prev.map((e) =>
          e.product.id === product.id ? { ...e, quantity: e.quantity + 1 } : e
        );
      }
      return [...prev, { product, quantity: 1 }];
    });

    if (limitHit) {
      return {
        ok: false,
        message: `Maximum ${product.maxOrderQty} packs per online order for patient safety.`,
      };
    }
    return { ok: true };
  };

  const updateQuantity = (productId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((e) => {
          if (e.product.id !== productId) return e;
          const next = Math.min(e.product.maxOrderQty, e.quantity + delta);
          return { ...e, quantity: next };
        })
        .filter((e) => e.quantity > 0)
    );
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((e) => e.product.id !== productId));
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((s, e) => s + e.quantity, 0);
  const subtotal = items.reduce((s, e) => s + e.product.price * e.quantity, 0);

  return (
    <PublicCartContext.Provider
      value={{
        items,
        drawerOpen,
        setDrawerOpen,
        selectedBranchId,
        setSelectedBranchId,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        totalItems,
        subtotal,
      }}
    >
      {children}
    </PublicCartContext.Provider>
  );
}

export function usePublicCart() {
  const ctx = useContext(PublicCartContext);
  if (!ctx) throw new Error("usePublicCart must be used within PublicCartProvider");
  return ctx;
}
