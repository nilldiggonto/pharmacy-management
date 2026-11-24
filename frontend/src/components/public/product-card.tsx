"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { LockSimple, MapPin, Plus, Star } from "@phosphor-icons/react";
import { ProductThumbnail } from "@/components/public/product-thumbnail";
import type { PublicProduct } from "@/lib/public-catalog";
import { formatCurrency, WEIGHTED_EASE } from "@/lib/utils";

interface ProductCardProps {
  product: PublicProduct;
  index?: number;
  onAdd: (product: PublicProduct) => void;
}

export function ProductCard({ product, index = 0, onAdd }: ProductCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ delay: Math.min(index * 0.05, 0.25), duration: 0.5, ease: WEIGHTED_EASE }}
      className="group flex flex-col justify-between rounded-2xl border border-[#e5e5e5] bg-[#ffffff] p-3.5 transition-[border-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[#ff1f7a]/60 hover:-translate-y-0.5"
    >
      <div>
        <div className="relative">
          <ProductThumbnail
            type={product.thumbnailType}
            brand={product.brand}
            strength={product.strength}
            isRx={!product.purchasableOnline}
          />
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
            {product.purchasableOnline ? (
              <span className="rounded-full bg-[#ffffff]/95 border border-[#ff1f7a]/25 px-2.5 py-0.5 font-mono caption-5 text-[#be125c] backdrop-blur-sm">
                OTC · Max {product.maxOrderQty}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#0a0a0a] px-2.5 py-0.5 caption-5 text-[#ffffff]">
                <LockSimple size={11} weight="fill" />
                Rx Only
              </span>
            )}
          </div>
          {product.compareAtPrice && (
            <span className="absolute right-2.5 top-2.5 rounded-full bg-[#ff1f7a] px-2 py-0.5 font-mono caption-5 text-[#ffffff]">
              Save {Math.round((1 - product.price / product.compareAtPrice) * 100)}%
            </span>
          )}
        </div>

        <div className="mt-3.5 px-1">
          <div className="flex items-center justify-between gap-2">
            <span className="caption-5 text-[#ff1f7a] font-medium">{product.category}</span>
            <span className="inline-flex items-center gap-1 caption-5 text-[#525252]">
              <Star size={12} weight="fill" className="text-[#ff1f7a]" />
              <span className="font-mono text-[#0a0a0a]">{product.rating.toFixed(1)}</span>
              <span className="text-[#a3a3a3]">({product.reviewCount})</span>
            </span>
          </div>

          <h3 className="mt-1.5 title-4 text-[#0a0a0a] line-clamp-1">{product.name}</h3>
          <p className="mt-0.5 caption-5 text-[#737373]">
            {product.genericName} · {product.packLabel}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#f2f2f2] px-1 pt-3">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono title-3 text-[#0a0a0a]">
              {formatCurrency(product.price)}
            </span>
            {product.compareAtPrice && (
              <span className="font-mono caption-5 text-[#a3a3a3] line-through">
                {formatCurrency(product.compareAtPrice)}
              </span>
            )}
          </div>
          <p className="caption-5 text-[#737373] truncate max-w-[140px]">
            {product.availabilityLabel}
          </p>
        </div>

        {product.purchasableOnline ? (
          <button
            type="button"
            onClick={() => onAdd(product)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#ff1f7a] px-3 py-2 button-xsm text-[#ffffff] transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#e11d74] active:scale-[0.97] cursor-pointer"
          >
            <Plus size={14} weight="bold" />
            <span>Add</span>
          </button>
        ) : (
          <Link
            href="/branches"
            className="inline-flex items-center gap-1 rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-2.5 py-2 button-xsm text-[#0a0a0a] hover:border-[#ff1f7a] transition-colors duration-300"
          >
            <MapPin size={13} className="text-[#ff1f7a]" />
            <span>Branch</span>
          </Link>
        )}
      </div>
    </motion.article>
  );
}
