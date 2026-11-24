"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  FirstAid,
  Lightning,
  MagnifyingGlass,
  MapPin,
  Pill,
  ShieldCheck,
  Snowflake,
  Sparkle,
  Truck,
} from "@phosphor-icons/react";
import { PublicHeader } from "@/components/public/public-header";
import { HeroCapsuleScene } from "@/components/public/hero-capsule-scene";
import { BangladeshDhakaMap3D } from "@/components/public/bangladesh-dhaka-map-3d";
import { ProductCard } from "@/components/public/product-card";
import { usePublicCart } from "@/context/public-cart-context";
import {
  DHAKA_BRANCHES,
  PUBLIC_PRODUCTS,
  type PublicBranch,
  type PublicProduct,
} from "@/lib/public-catalog";
import { WEIGHTED_EASE } from "@/lib/utils";

const CATEGORIES = [
  { id: "all", label: "All Trending", icon: Sparkle },
  { id: "otc", label: "Buy Online (OTC)", icon: Lightning },
  { id: "Pain & Fever", label: "Pain & Fever", icon: FirstAid },
  { id: "Vitamins & Care", label: "Vitamins & Care", icon: Pill },
  { id: "Digestive", label: "Digestive", icon: ShieldCheck },
  { id: "rx", label: "Prescription (Branch Only)", icon: Snowflake },
] as const;

export default function PublicLandingPage() {
  const { addItem, setDrawerOpen } = usePublicCart();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<PublicBranch>(DHAKA_BRANCHES[3]); // Gulshan
  const [toast, setToast] = useState<string | null>(null);
  const [enquirySubmitted, setEnquirySubmitted] = useState(false);
  const [pharmacyName, setPharmacyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PUBLIC_PRODUCTS.filter((p) => {
      if (activeCategory === "otc" && !p.purchasableOnline) return false;
      if (activeCategory === "rx" && p.purchasableOnline) return false;
      if (
        activeCategory !== "all" &&
        activeCategory !== "otc" &&
        activeCategory !== "rx" &&
        p.category !== activeCategory
      ) {
        return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.genericName.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [search, activeCategory]);

  const handleAdd = (product: PublicProduct) => {
    const res = addItem(product);
    if (res.ok) {
      setToast(`${product.name} added to your OTC bag.`);
      setDrawerOpen(true);
    } else if (res.message) {
      setToast(res.message);
    }
  };

  const handleEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacyName.trim() || !contactEmail.includes("@")) return;
    setEnquirySubmitted(true);
    setPharmacyName("");
    setContactEmail("");
  };

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#0a0a0a]">
      {/* Top Commerce Announcement Strip */}
      <div className="bg-[#0a0a0a] text-[#ffffff] px-4 py-2 text-center caption-5">
        <span className="inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ff1f7a]" />
            Express Dhaka Pickup across 8 Branches
          </span>
          <span className="text-[#737373]">|</span>
          <span>100% Manufacturer Batch Verified</span>
          <span className="text-[#737373]">|</span>
          <span className="text-[#ff7bb3]">2°C to 8°C Cold Chain Guaranteed</span>
        </span>
      </div>

      <PublicHeader />

      <main id="main-content">
        {/* E-Commerce Storefront Hero Banner */}
        <section className="relative overflow-hidden border-b border-[#ececec] bg-[#fafafa]">
          {/* Subtle architectural dot pattern background */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full opacity-50"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="hero-dots" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="#ff1f7a" fillOpacity="0.16" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-dots)" />
          </svg>

          <div className="relative z-10 mx-auto max-w-[1140px] px-4 py-10 sm:px-6 sm:py-14">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: WEIGHTED_EASE }}
                className="lg:col-span-6"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-[#ff1f7a]/25 bg-[#ffffff] px-3 py-1 caption-4 text-[#be125c]">
                  <Sparkle size={14} weight="fill" className="text-[#ff1f7a]" />
                  <span>Dhaka Online Pharmacy Storefront</span>
                </div>

                <h1 className="mt-4 max-w-[680px] heading-2 sm:heading-1 bg-gradient-to-r from-[#000000] to-[#666666] bg-clip-text text-transparent">
                  Everyday medicines
                  <br />
                  delivered right.
                </h1>

                <p className="mt-4 max-w-[560px] body-3 text-[#525252]">
                  Order verified over the counter essentials with safe household limits for fast pickup or dispatch from any of our eight Dhaka branches.
                </p>

                {/* Storefront Search Bar right in Hero */}
                <div className="mt-6 flex items-center gap-2 rounded-2xl border border-[#e5e5e5] bg-[#ffffff] p-2 shadow-sm">
                  <div className="relative flex-1">
                    <MagnifyingGlass
                      size={17}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#ff1f7a]"
                    />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search Paracetamol, Vitamin D3, Omeprazole..."
                      className="h-10 w-full rounded-xl bg-transparent pl-10 pr-3 body-6 text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none"
                    />
                  </div>
                  <a
                    href="#storefront"
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#ff1f7a] px-4 button-sm text-[#ffffff] transition-colors duration-300 hover:bg-[#e11d74]"
                  >
                    <span>Shop Now</span>
                    <ArrowRight size={15} weight="bold" />
                  </a>
                </div>

                {/* Quick Commerce Trust Strip */}
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: "8 Dhaka Hubs", sub: "Express pickup", accent: false },
                    { label: "Up to 17% Off", sub: "Daily OTC packs", accent: true },
                    { label: "2°C to 8°C", sub: "Cold chain safe", accent: false },
                  ].map((tile) => (
                    <div
                      key={tile.label}
                      className="rounded-xl border border-[#e5e5e5] bg-[#ffffff] p-3"
                    >
                      <p
                        className={`font-mono title-4 ${
                          tile.accent ? "text-[#ff1f7a]" : "text-[#0a0a0a]"
                        }`}
                      >
                        {tile.label}
                      </p>
                      <p className="caption-5 text-[#737373]">{tile.sub}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Right: Interactive 3D Floating Capsule Showcase */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.65, ease: WEIGHTED_EASE }}
                className="lg:col-span-6"
              >
                <HeroCapsuleScene />
              </motion.div>
            </div>
          </div>
        </section>

        {/* E-Commerce Storefront Shelf with Interactive Categories & Studio Thumbnails */}
        <section id="storefront" className="mx-auto max-w-[1140px] px-4 py-14 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="caption-3 uppercase tracking-widest text-[#ff1f7a]">
                Featured Storefront
              </p>
              <h2 className="mt-1 heading-4 text-[#0a0a0a]">
                Shop verified medicines & daily care
              </h2>
            </div>
            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-3.5 py-2 button-sm text-[#0a0a0a] hover:border-[#ff1f7a] transition-colors duration-300"
            >
              <span>View All Products</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          {/* Interactive Category Filter Pills */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 caption-4 transition-colors duration-300 cursor-pointer ${
                    active
                      ? "border-[#ff1f7a] bg-[#ff1f7a] text-[#ffffff]"
                      : "border-[#e5e5e5] bg-[#ffffff] text-[#525252] hover:border-[#ff1f7a]/50 hover:text-[#0a0a0a]"
                  }`}
                >
                  <Icon size={15} weight={active ? "fill" : "duotone"} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {toast && (
            <div className="mt-4 rounded-xl border border-[#ff1f7a]/30 bg-[#fff0f6] px-4 py-2.5 caption-4 text-[#be125c]">
              {toast}
            </div>
          )}

          {/* Product Grid */}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                index={idx}
                onAdd={handleAdd}
              />
            ))}
          </div>
        </section>

        {/* High-Contrast E-Commerce Promo Bento Banners */}
        <section className="mx-auto max-w-[1140px] px-4 py-6 sm:px-6">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Dark Obsidian Cold-Chain Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-[#262626] bg-[#0a0a0a] p-8 text-[#ffffff]">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ff1f7a]/40 bg-[#ff1f7a]/15 px-3 py-1 caption-4 text-[#ff7bb3]">
                  <Snowflake size={14} weight="fill" />
                  Cold Chain Specialists
                </span>
                <h3 className="mt-4 heading-5 text-[#ffffff]">
                  Need Insulin or prescription biologics?
                </h3>
                <p className="mt-2 body-6 text-[#a3a3a3]">
                  Prescription medicines cannot be sold online without review. Reserve an in branch pharmacist check at any of our eight refrigerated Dhaka pharmacies.
                </p>
              </div>
              <div className="mt-6">
                <Link
                  href="/branches"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#ff1f7a] px-4 py-2.5 button-sm text-[#ffffff] hover:bg-[#e11d74] transition-colors duration-300"
                >
                  <span>Locate Cold Chain Branch</span>
                  <ArrowRight size={15} weight="bold" />
                </Link>
              </div>
            </div>

            {/* Hot Pink Blush Wholesale Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-[#ff1f7a]/25 bg-[#fff0f6] p-8 text-[#0a0a0a]">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ff1f7a]/30 bg-[#ffffff] px-3 py-1 caption-4 text-[#be125c]">
                  <Truck size={14} weight="fill" />
                  B2B Pharmacy Supply
                </span>
                <h3 className="mt-4 heading-5 text-[#0a0a0a]">
                  Run an independent pharmacy in Bangladesh?
                </h3>
                <p className="mt-2 body-6 text-[#525252]">
                  Apply for verified wholesale account access to unlock contract pricing, central Tejgaon dispatch, and full FEFO batch invoices.
                </p>
              </div>
              <div className="mt-6">
                <a
                  href="#wholesale"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0a0a0a] px-4 py-2.5 button-sm text-[#ffffff] hover:bg-[#262626] transition-colors duration-300"
                >
                  <span>Apply for Wholesale</span>
                  <ArrowRight size={15} weight="bold" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive 3D Bangladesh & Dhaka 8-Branch Map Section */}
        <section className="mx-auto max-w-[1140px] px-4 py-14 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div className="max-w-[680px]">
              <p className="caption-3 uppercase tracking-widest text-[#ff1f7a]">
                Dhaka 3D Branch Locator
              </p>
              <h2 className="mt-1 heading-4 text-[#0a0a0a]">
                Pick up at any of our 8 Dhaka branches
              </h2>
            </div>
            <Link
              href="/branches"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e5e5] bg-[#ffffff] px-3.5 py-2 button-sm text-[#0a0a0a] hover:border-[#ff1f7a] transition-colors duration-300"
            >
              <span>Full Branch Map</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <BangladeshDhakaMap3D
                selectedBranchId={selectedBranch.id}
                onSelectBranch={(b) => setSelectedBranch(b)}
              />
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-[#e5e5e5] bg-[#ffffff] p-6 lg:col-span-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono caption-3 text-[#ff1f7a]">{selectedBranch.code}</span>
                  <span className="rounded-full bg-[#fff0f6] px-2.5 py-0.5 caption-5 text-[#be125c]">
                    Open Today
                  </span>
                </div>
                <h3 className="mt-2 heading-6 text-[#0a0a0a]">{selectedBranch.name}</h3>
                <p className="mt-1.5 flex items-start gap-1.5 body-6 text-[#525252]">
                  <MapPin size={16} weight="fill" className="shrink-0 mt-0.5 text-[#ff1f7a]" />
                  <span>{selectedBranch.address}</span>
                </p>

                <div className="mt-4 rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-3.5 flex flex-col gap-1.5">
                  <div className="flex justify-between caption-4">
                    <span className="flex items-center gap-1 text-[#737373]">
                      <Clock size={13} /> Hours
                    </span>
                    <span className="text-[#0a0a0a]">{selectedBranch.hours}</span>
                  </div>
                  <div className="flex justify-between caption-4">
                    <span className="text-[#737373]">Phone</span>
                    <span className="font-mono text-[#0a0a0a]">{selectedBranch.phone}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-1.5 border-t border-[#f0f0f0] pt-4">
                {DHAKA_BRANCHES.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBranch(b)}
                    className={`rounded-lg border px-2.5 py-1.5 caption-4 text-left transition-colors duration-200 cursor-pointer ${
                      b.id === selectedBranch.id
                        ? "border-[#ff1f7a] bg-[#fff0f6] text-[#be125c]"
                        : "border-[#e5e5e5] bg-[#fafafa] text-[#525252] hover:text-[#0a0a0a]"
                    }`}
                  >
                    {b.area}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Wholesale Onboarding Form */}
        <section id="wholesale" className="mx-auto max-w-[1140px] px-4 py-12 sm:px-6">
          <div className="grid grid-cols-1 gap-8 rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-8 sm:p-12 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <p className="caption-3 uppercase tracking-widest text-[#ff1f7a]">
                Wholesale Registration
              </p>
              <h2 className="mt-2 heading-4 text-[#0a0a0a]">
                Partner with our Tejgaon central warehouse
              </h2>
              <p className="mt-3 body-5 text-[#525252]">
                Submit your pharmacy business details for head office verification, customer specific pricing, and scheduled wholesale deliveries.
              </p>
            </div>

            <div className="lg:col-span-6">
              {enquirySubmitted ? (
                <div className="flex h-full flex-col justify-center rounded-xl border border-[#ff1f7a]/30 bg-[#fff0f6] p-6">
                  <CheckCircle size={28} weight="fill" className="text-[#ff1f7a]" />
                  <h3 className="mt-3 title-2 text-[#0a0a0a]">Wholesale enquiry recorded</h3>
                  <p className="mt-1 body-6 text-[#525252]">
                    Our head office wholesale desk will reach out with license verification steps.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleEnquiry}
                  className="flex flex-col gap-3 rounded-xl border border-[#e5e5e5] bg-[#ffffff] p-6"
                >
                  <div>
                    <label htmlFor="pharmacy-name" className="caption-4 text-[#0a0a0a] block mb-1">
                      Pharmacy business name
                    </label>
                    <input
                      id="pharmacy-name"
                      type="text"
                      required
                      value={pharmacyName}
                      onChange={(e) => setPharmacyName(e.target.value)}
                      placeholder="Greenleaf Medical Hall"
                      className="h-10 w-full rounded-lg border border-[#d4d4d4] bg-[#ffffff] px-3 body-6 text-[#0a0a0a] focus:border-[#ff1f7a] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="caption-4 text-[#0a0a0a] block mb-1">
                      Work email
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="purchasing@greenleafpharmacy.com"
                      className="h-10 w-full rounded-lg border border-[#d4d4d4] bg-[#ffffff] px-3 body-6 text-[#0a0a0a] focus:border-[#ff1f7a] focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff1f7a] px-4 py-2.5 button-sm text-[#ffffff] transition-colors duration-300 hover:bg-[#e11d74] cursor-pointer"
                  >
                    <span>Request wholesale onboarding</span>
                    <ArrowRight size={15} weight="bold" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e5e5e5] bg-[#ffffff] py-8">
        <div className="mx-auto flex max-w-[1140px] flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
          <span className="caption-4 text-[#737373]">
            © 2026 MedGrid Pharmacy Network · Dhaka, Bangladesh
          </span>
          <div className="flex items-center gap-6 caption-4 text-[#737373]">
            <Link href="/shop" className="hover:text-[#0a0a0a]">Medicines</Link>
            <Link href="/branches" className="hover:text-[#0a0a0a]">Dhaka Branches</Link>
            <Link href="/login" className="text-[#ff1f7a] hover:underline">Staff Portal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
