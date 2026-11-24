"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  CaretDown,
  CheckCircle,
  Clock,
  LockSimple,
  MapPin,
  Plus,
  ShieldCheck,
  Snowflake,
  Truck,
} from "@phosphor-icons/react";
import { PublicHeader } from "@/components/public/public-header";
import { HeroCapsuleScene } from "@/components/public/hero-capsule-scene";
import { BangladeshDhakaMap3D } from "@/components/public/bangladesh-dhaka-map-3d";
import { usePublicCart } from "@/context/public-cart-context";
import { DHAKA_BRANCHES, PUBLIC_PRODUCTS, type PublicBranch } from "@/lib/public-catalog";
import { formatCurrency, WEIGHTED_EASE } from "@/lib/utils";

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: "Verified manufacturer sourcing",
    detail: "Every medicine batch is procured directly from licensed pharmaceutical manufacturers and logged at central goods receipt.",
  },
  {
    icon: Snowflake,
    title: "Continuous cold chain control",
    detail: "Insulin and biologics travel from our central Tejgaon chiller to all eight Dhaka branches under continuous thermal logging.",
  },
  {
    icon: Clock,
    title: "Strict expiry protection",
    detail: "Automated FEFO sequencing ensures near expiry or quarantined stock never reaches a patient counter.",
  },
  {
    icon: Truck,
    title: "Licensed pharmacy wholesale",
    detail: "Approved partner pharmacies receive verified contract pricing, batch invoices, and scheduled replenishment.",
  },
];

const FAQS = [
  {
    q: "Which medicines can I buy online?",
    a: "Approved over the counter essentials like paracetamol, oral rehydration salts, allergy relief, and daily vitamins can be reserved online with per order safety limits. Prescription medicines require in person pharmacist verification.",
  },
  {
    q: "Where are your Dhaka branches located?",
    a: "We operate eight retail branches across Dhaka: Uttara, Mirpur, Bashundhara, Gulshan, Banani, Mohammadpur, Dhanmondi, and Motijheel.",
  },
  {
    q: "Do you show live warehouse stock quantities publicly?",
    a: "No. To protect supply integrity, public pages show general branch availability while exact batch counts remain inside the staff portal.",
  },
  {
    q: "How can an external pharmacy apply for wholesale supply?",
    a: "Submit your pharmacy name and work email in the wholesale enquiry form below. Our head office reviews drug licenses before activating wholesale access.",
  },
];

const TAGLINE_WORDS =
  "Every medicine batch verified from licensed manufacturer to patient counter across eight Dhaka branches with zero guesswork.".split(
    " "
  );

function TaglineRevealSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setRevealedCount(TAGLINE_WORDS.length);
      return;
    }

    let rafId = 0;
    const updateReveal = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const progress = Math.max(0, Math.min(1, (vh * 0.85 - rect.top) / (vh * 0.55)));
      setRevealedCount(Math.round(progress * TAGLINE_WORDS.length));
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateReveal);
    };

    updateReveal();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="Core promise"
      className="mx-auto max-w-[1140px] px-4 py-16 sm:px-6"
    >
      <div className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-8 sm:p-14">
        <p className="caption-3 uppercase tracking-widest text-[#ff1f7a]">
          Traceable Care
        </p>
        <h2 className="mt-4 max-w-[680px] heading-4 sm:heading-3">
          {TAGLINE_WORDS.map((word, idx) => {
            const active = idx < revealedCount;
            return (
              <span
                key={`${word}-${idx}`}
                className="inline-block mr-2.5 transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ color: active ? "#0a0a0a" : "rgba(10, 10, 10, 0.24)" }}
              >
                {word}
              </span>
            );
          })}
        </h2>
      </div>
    </section>
  );
}

export default function PublicLandingPage() {
  const { addItem, setDrawerOpen } = usePublicCart();
  const [selectedBranch, setSelectedBranch] = useState<PublicBranch>(DHAKA_BRANCHES[3]); // Gulshan
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [toast, setToast] = useState<string | null>(null);
  const [enquirySubmitted, setEnquirySubmitted] = useState(false);
  const [pharmacyName, setPharmacyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const featuredProducts = PUBLIC_PRODUCTS.slice(0, 6);

  const handleQuickAdd = (product: (typeof PUBLIC_PRODUCTS)[number]) => {
    const res = addItem(product);
    if (res.ok) {
      setToast(`${product.name} added to bag.`);
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
      <PublicHeader />

      <main id="main-content">
        {/* Hero Section with Interactive 3D Capsule Scene */}
        <section className="mx-auto max-w-[1140px] px-4 pt-10 pb-14 sm:px-6 sm:pt-16">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: WEIGHTED_EASE }}
              className="lg:col-span-6"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ff1f7a]/25 bg-[#fff0f6] px-3 py-1 caption-4 text-[#be125c]">
                <span className="h-2 w-2 rounded-full bg-[#ff1f7a]" />
                <span>Dhaka 8 branch network & verified OTC shop</span>
              </div>

              <h1 className="mt-5 max-w-[680px] heading-2 sm:heading-1 bg-gradient-to-r from-[#000000] to-[#666666] bg-clip-text text-transparent">
                Clinical pharmacy
                <br />
                engineered for Dhaka.
              </h1>

              <p className="mt-5 max-w-[680px] body-3 text-[#525252]">
                Reserve approved everyday medicines online with safe household limits, or visit any of our eight licensed Dhaka branches backed by one temperature controlled central warehouse.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#ff1f7a] px-4 py-2.5 button-md text-[#ffffff] transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#e11d74] active:scale-[0.98]"
                >
                  <span>Shop OTC Medicines</span>
                  <ArrowRight size={17} weight="bold" />
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-6 border-t border-[#e5e5e5] pt-6">
                <div>
                  <p className="font-mono heading-5 text-[#0a0a0a]">8</p>
                  <p className="caption-4 text-[#737373]">Dhaka branches</p>
                </div>
                <div>
                  <p className="font-mono heading-5 text-[#ff1f7a]">100%</p>
                  <p className="caption-4 text-[#737373]">Batch verified</p>
                </div>
                <div>
                  <p className="font-mono heading-5 text-[#0a0a0a]">2°C to 8°C</p>
                  <p className="caption-4 text-[#737373]">Cold chain hub</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7, ease: WEIGHTED_EASE }}
              className="lg:col-span-6"
            >
              <HeroCapsuleScene />
            </motion.div>
          </div>
        </section>

        {/* Mandatory Tagline Reveal Section (B11) */}
        <TaglineRevealSection />

        {/* Public Limited OTC Medicine Shop Preview */}
        <section className="mx-auto max-w-[1140px] px-4 py-14 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-[680px]">
              <p className="caption-3 uppercase tracking-widest text-[#ff1f7a]">
                Public Medicine Store
              </p>
              <h2 className="mt-2 heading-4 text-[#0a0a0a]">
                Approved everyday essentials you can reserve online
              </h2>
              <p className="mt-2 body-6 text-[#525252]">
                Non prescription items carry household quantity caps for patient safety. Prescription medicines remain in branch only.
              </p>
            </div>
            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e5e5] bg-[#ffffff] px-3.5 py-2 button-sm text-[#0a0a0a] hover:border-[#ff1f7a] transition-colors duration-300"
            >
              <span>Full Catalogue</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          {toast && (
            <div className="mt-4 rounded-xl border border-[#ff1f7a]/30 bg-[#fff0f6] px-4 py-2.5 caption-4 text-[#be125c]">
              {toast}
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.map((product, idx) => (
              <motion.article
                key={product.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: idx * 0.05, duration: 0.55, ease: WEIGHTED_EASE }}
                className="flex flex-col justify-between rounded-2xl border border-[#e5e5e5] bg-[#ffffff] p-5 transition-[border-color] duration-300 hover:border-[#ff1f7a]/50"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full border border-[#e5e5e5] bg-[#fafafa] px-2.5 py-0.5 caption-5 text-[#525252]">
                      {product.category}
                    </span>
                    <span className="font-mono caption-5 text-[#ff1f7a]">
                      Max {product.maxOrderQty} / order
                    </span>
                  </div>
                  <h3 className="mt-3 title-3 text-[#0a0a0a]">{product.name}</h3>
                  <p className="mt-0.5 caption-4 text-[#737373]">
                    {product.genericName} · {product.packLabel}
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
                      onClick={() => handleQuickAdd(product)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#ff1f7a] px-3 py-2 button-xsm text-[#ffffff] transition-colors duration-300 hover:bg-[#e11d74] cursor-pointer"
                    >
                      <Plus size={14} weight="bold" />
                      <span>Add</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-2.5 py-1.5 caption-5 text-[#525252]">
                      <LockSimple size={13} />
                      Rx Only
                    </span>
                  )}
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        {/* Interactive 3D Bangladesh & Dhaka 8-Branch Map Showcase */}
        <section className="mx-auto max-w-[1140px] px-4 py-14 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div className="max-w-[680px]">
              <p className="caption-3 uppercase tracking-widest text-[#ff1f7a]">
                Interactive 3D Network Map
              </p>
              <h2 className="mt-2 heading-4 text-[#0a0a0a]">
                Eight branches across Dhaka connected in real time
              </h2>
            </div>
            <Link
              href="/branches"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0a0a0a] px-3.5 py-2 button-sm text-[#ffffff] hover:bg-[#262626] transition-colors duration-300"
            >
              <span>Explore Full Branch Map</span>
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
                    Dhaka Sector
                  </span>
                </div>
                <h3 className="mt-2 heading-6 text-[#0a0a0a]">{selectedBranch.name}</h3>
                <p className="mt-1.5 flex items-start gap-1.5 body-6 text-[#525252]">
                  <MapPin size={16} weight="fill" className="shrink-0 mt-0.5 text-[#ff1f7a]" />
                  <span>{selectedBranch.address}</span>
                </p>

                <div className="mt-4 rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-3.5 flex flex-col gap-1.5">
                  <div className="flex justify-between caption-4">
                    <span className="text-[#737373]">Hours</span>
                    <span className="text-[#0a0a0a]">{selectedBranch.hours}</span>
                  </div>
                  <div className="flex justify-between caption-4">
                    <span className="text-[#737373]">Direct Line</span>
                    <span className="font-mono text-[#0a0a0a]">{selectedBranch.phone}</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {selectedBranch.services.map((svc) => (
                    <span
                      key={svc}
                      className="rounded-full border border-[#e5e5e5] bg-[#ffffff] px-2.5 py-1 caption-5 text-[#525252]"
                    >
                      {svc}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-1.5 border-t border-[#f0f0f0] pt-4">
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

        {/* Quality Benefits */}
        <section className="mx-auto max-w-[1140px] px-4 py-14 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {BENEFITS.map((b, idx) => {
              const Icon = b.icon;
              return (
                <motion.div
                  key={b.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: idx * 0.06, duration: 0.6, ease: WEIGHTED_EASE }}
                  className="rounded-2xl border border-[#e5e5e5] bg-[#ffffff] p-6"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#fff0f6] text-[#ff1f7a]">
                    <Icon size={20} weight="duotone" />
                  </span>
                  <h3 className="mt-4 title-2 text-[#0a0a0a]">{b.title}</h3>
                  <p className="mt-2 body-6 text-[#525252]">{b.detail}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Wholesale Partner Enquiry */}
        <section id="wholesale" className="mx-auto max-w-[1140px] px-4 py-14 sm:px-6">
          <div className="grid grid-cols-1 gap-8 rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-8 sm:p-12 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <p className="caption-3 uppercase tracking-widest text-[#ff1f7a]">
                Wholesale Distribution
              </p>
              <h2 className="mt-2 heading-4 text-[#0a0a0a]">
                Apply for licensed pharmacy wholesale supply
              </h2>
              <p className="mt-3 body-5 text-[#525252]">
                Approved partner pharmacies receive dedicated contract pricing, central warehouse batch allocation, and verified invoice history.
              </p>
            </div>

            <div className="lg:col-span-6">
              {enquirySubmitted ? (
                <div className="flex h-full flex-col justify-center rounded-xl border border-[#ff1f7a]/30 bg-[#fff0f6] p-6">
                  <CheckCircle size={28} weight="fill" className="text-[#ff1f7a]" />
                  <h3 className="mt-3 title-2 text-[#0a0a0a]">Wholesale enquiry recorded</h3>
                  <p className="mt-1 body-6 text-[#525252]">
                    Our head office wholesale desk will contact you with license verification instructions.
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

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-[900px] px-4 py-14 sm:px-6">
          <p className="caption-3 uppercase tracking-widest text-[#ff1f7a]">FAQ</p>
          <h2 className="mt-2 heading-4 text-[#0a0a0a]">Common questions</h2>

          <div className="mt-6 flex flex-col gap-3">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={item.q}
                  className="rounded-xl border border-[#e5e5e5] bg-[#ffffff] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer"
                  >
                    <span className="title-4 text-[#0a0a0a]">{item.q}</span>
                    <CaretDown
                      size={16}
                      className={`shrink-0 text-[#ff1f7a] transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25, ease: WEIGHTED_EASE }}
                        className="px-5 pb-4 body-6 text-[#525252]"
                      >
                        {item.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
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
