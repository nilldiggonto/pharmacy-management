"use client";

import React, { useMemo, useState } from "react";
import { MagnifyingGlass, ShieldCheck } from "@phosphor-icons/react";
import { PublicHeader } from "@/components/public/public-header";
import { ProductCard } from "@/components/public/product-card";
import { usePublicCart } from "@/context/public-cart-context";
import { PUBLIC_PRODUCTS, type PublicProduct } from "@/lib/public-catalog";

export default function PublicShopPage() {
  const { addItem, setDrawerOpen } = usePublicCart();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "otc" | "rx">("all");
  const [feedback, setFeedback] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PUBLIC_PRODUCTS.filter((p) => {
      if (filter === "otc" && !p.purchasableOnline) return false;
      if (filter === "rx" && p.purchasableOnline) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.genericName.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [query, filter]);

  const handleAdd = (product: PublicProduct) => {
    const res = addItem(product);
    if (res.ok) {
      setFeedback(`Added ${product.name} to your bag.`);
      setDrawerOpen(true);
    } else if (res.message) {
      setFeedback(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#0a0a0a]">
      <PublicHeader />

      <main id="main-content" className="mx-auto max-w-[1140px] px-4 py-12 sm:px-6">
        <div className="max-w-[680px]">
          <p className="caption-3 uppercase tracking-widest text-[#ff1f7a]">
            Public Pharmacy Store
          </p>
          <h1 className="mt-2 heading-3 text-[#0a0a0a]">
            Verified medicines and everyday health care
          </h1>
          <p className="mt-3 body-5 text-[#525252]">
            Approved non prescription essentials can be reserved online with per order household limits. Prescription medicines require in branch pharmacist review and cannot be purchased online.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-4">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <MagnifyingGlass
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#ff1f7a]"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search medicine name, generic, or brand..."
              className="h-10 w-full rounded-lg border border-[#d4d4d4] bg-[#ffffff] pl-9 pr-3 body-6 text-[#0a0a0a] focus:border-[#ff1f7a] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "all", label: "All Products" },
                { id: "otc", label: "Buy Online (OTC)" },
                { id: "rx", label: "Prescription Only (Rx)" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilter(opt.id)}
                className={`rounded-full border px-3.5 py-1.5 caption-4 transition-colors duration-300 cursor-pointer ${
                  filter === opt.id
                    ? "border-[#ff1f7a] bg-[#ff1f7a] text-[#ffffff]"
                    : "border-[#e5e5e5] bg-[#ffffff] text-[#525252] hover:text-[#0a0a0a]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {feedback && (
          <div className="mt-4 rounded-xl border border-[#ff1f7a]/30 bg-[#fff0f6] px-4 py-2.5 caption-4 text-[#be125c]">
            {feedback}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product, idx) => (
            <ProductCard
              key={product.id}
              product={product}
              index={idx}
              onAdd={handleAdd}
            />
          ))}
        </div>

        <div className="mt-10 flex items-center gap-3 rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-5">
          <ShieldCheck size={22} weight="duotone" className="shrink-0 text-[#ff1f7a]" />
          <p className="caption-4 text-[#525252]">
            In accordance with pharmacy regulations, exact internal warehouse quantities are not published online and prescription medicines are dispensed only after pharmacist review at a Dhaka branch.
          </p>
        </div>
      </main>
    </div>
  );
}
