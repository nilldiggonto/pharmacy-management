"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  LockSimple,
  MagnifyingGlass,
  MapPin,
  Plus,
  ShieldCheck,
} from "@phosphor-icons/react";
import { PublicHeader } from "@/components/public/public-header";
import { usePublicCart } from "@/context/public-cart-context";
import { PUBLIC_PRODUCTS, type PublicProduct } from "@/lib/public-catalog";
import { formatCurrency, WEIGHTED_EASE } from "@/lib/utils";

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
            Public Product Catalogue
          </p>
          <h1 className="mt-2 heading-3 text-[#0a0a0a]">
            Verified medicines and everyday pharmacy care
          </h1>
          <p className="mt-3 body-5 text-[#525252]">
            Approved non prescription essentials can be reserved online with per order household limits. Prescription medicines require in branch pharmacist review and cannot be purchased online.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-4">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <MagnifyingGlass
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search medicine name, generic, or brand..."
              className="h-10 w-full rounded-lg border border-[#d4d4d4] bg-[#ffffff] pl-9 pr-3 body-6 text-[#0a0a0a] focus:border-[#ff1f7a] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
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
                className={`rounded-lg border px-3 py-1.5 caption-4 transition-colors duration-300 cursor-pointer ${
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

        {/* Product Grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product, idx) => (
            <motion.article
              key={product.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.45, ease: WEIGHTED_EASE }}
              className="flex flex-col justify-between rounded-2xl border border-[#e5e5e5] bg-[#ffffff] p-5 transition-[border-color] duration-300 hover:border-[#ff1f7a]/50"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full border border-[#e5e5e5] bg-[#fafafa] px-2.5 py-0.5 caption-5 text-[#525252]">
                    {product.category}
                  </span>
                  {product.purchasableOnline ? (
                    <span className="font-mono caption-5 text-[#ff1f7a]">
                      Limit {product.maxOrderQty} / order
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#fff0f6] px-2.5 py-0.5 caption-5 text-[#be125c]">
                      <LockSimple size={12} weight="fill" />
                      Rx Required
                    </span>
                  )}
                </div>

                <h2 className="mt-3 title-3 text-[#0a0a0a]">{product.name}</h2>
                <p className="mt-0.5 caption-4 text-[#737373]">
                  {product.genericName} · {product.brand}
                </p>
                <p className="mt-2 body-6 text-[#525252]">{product.summary}</p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-[#f0f0f0] pt-4">
                <div>
                  <p className="font-mono title-2 text-[#0a0a0a]">
                    {formatCurrency(product.price)}
                  </p>
                  <p className="caption-5 text-[#737373]">{product.availabilityLabel}</p>
                </div>

                {product.purchasableOnline ? (
                  <button
                    type="button"
                    onClick={() => handleAdd(product)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#ff1f7a] px-3 py-2 button-xsm text-[#ffffff] transition-colors duration-300 hover:bg-[#e11d74] cursor-pointer"
                  >
                    <Plus size={14} weight="bold" />
                    <span>Add to Bag</span>
                  </button>
                ) : (
                  <Link
                    href="/branches"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 button-xsm text-[#0a0a0a] hover:border-[#ff1f7a] transition-colors duration-300"
                  >
                    <MapPin size={14} className="text-[#ff1f7a]" />
                    <span>Find Branch</span>
                  </Link>
                )}
              </div>
            </motion.article>
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
