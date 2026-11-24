"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, MapPin, Phone, Snowflake } from "@phosphor-icons/react";
import { PublicHeader } from "@/components/public/public-header";
import { BangladeshDhakaMap3D } from "@/components/public/bangladesh-dhaka-map-3d";
import { usePublicCart } from "@/context/public-cart-context";
import { DHAKA_BRANCHES, type PublicBranch } from "@/lib/public-catalog";

export default function PublicBranchesPage() {
  const { setSelectedBranchId } = usePublicCart();
  const [selected, setSelected] = useState<PublicBranch>(DHAKA_BRANCHES[3]); // Gulshan

  const handleSelect = (branch: PublicBranch) => {
    setSelected(branch);
    setSelectedBranchId(branch.id);
  };

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#0a0a0a]">
      <PublicHeader />

      <main id="main-content" className="mx-auto max-w-[1140px] px-4 py-12 sm:px-6">
        <div className="max-w-[680px]">
          <p className="caption-3 uppercase tracking-widest text-[#ff1f7a]">
            Bangladesh · Dhaka Sector
          </p>
          <h1 className="mt-2 heading-3 text-[#0a0a0a]">
            Eight licensed pharmacy branches across Dhaka
          </h1>
          <p className="mt-3 body-5 text-[#525252]">
            Explore our 3D Bangladesh and Dhaka sector map. Click any branch pin to inspect hours, cold chain services, and direct pharmacist phone lines.
          </p>
        </div>

        {/* Interactive 3D Map + Live Inspector */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <BangladeshDhakaMap3D
              selectedBranchId={selected.id}
              onSelectBranch={handleSelect}
            />
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-[#e5e5e5] bg-[#ffffff] p-6 lg:col-span-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono caption-3 text-[#ff1f7a]">{selected.code}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#fff0f6] px-2.5 py-0.5 caption-5 text-[#be125c]">
                  <Snowflake size={12} weight="fill" />
                  Cold Chain Ready
                </span>
              </div>

              <h2 className="mt-3 heading-6 text-[#0a0a0a]">{selected.name}</h2>
              <p className="mt-2 flex items-start gap-2 body-6 text-[#525252]">
                <MapPin size={16} weight="fill" className="shrink-0 mt-0.5 text-[#ff1f7a]" />
                <span>{selected.address}</span>
              </p>

              <div className="mt-5 flex flex-col gap-2.5 rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4">
                <div className="flex items-center justify-between caption-4">
                  <span className="flex items-center gap-1.5 text-[#737373]">
                    <Clock size={14} />
                    Daily Hours
                  </span>
                  <span className="text-[#0a0a0a]">{selected.hours}</span>
                </div>
                <div className="flex items-center justify-between caption-4">
                  <span className="flex items-center gap-1.5 text-[#737373]">
                    <Phone size={14} />
                    Branch Desk
                  </span>
                  <span className="font-mono text-[#0a0a0a]">{selected.phone}</span>
                </div>
              </div>

              <div className="mt-4">
                <p className="caption-4 text-[#737373] mb-2">Available Services</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.services.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-[#e5e5e5] bg-[#ffffff] px-2.5 py-1 caption-5 text-[#0a0a0a]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <Link
              href="/shop"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#ff1f7a] px-4 py-2.5 button-sm text-[#ffffff] transition-colors duration-300 hover:bg-[#e11d74]"
            >
              <span>Shop OTC Pickup at {selected.area}</span>
              <ArrowRight size={15} weight="bold" />
            </Link>
          </div>
        </div>

        {/* All 8 Dhaka Branches Grid */}
        <section className="mt-10">
          <h2 className="title-1 text-[#0a0a0a]">All 8 Dhaka Sector Branches</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DHAKA_BRANCHES.map((b) => {
              const active = b.id === selected.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelect(b)}
                  className={`flex flex-col items-start rounded-2xl border p-4 text-left transition-colors duration-300 cursor-pointer ${
                    active
                      ? "border-[#ff1f7a] bg-[#fff0f6]"
                      : "border-[#e5e5e5] bg-[#ffffff] hover:border-[#ff1f7a]/50"
                  }`}
                >
                  <span className="font-mono caption-5 text-[#ff1f7a]">{b.code}</span>
                  <p className="mt-1 title-4 text-[#0a0a0a]">{b.area}</p>
                  <p className="mt-1 caption-5 text-[#525252]">{b.address}</p>
                  <p className="mt-3 font-mono caption-5 text-[#737373]">{b.phone}</p>
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

