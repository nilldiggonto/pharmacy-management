"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  CaretDown,
  CheckCircle,
  Clock,
  FirstAidKit,
  List,
  MapPin,
  Package,
  ShieldCheck,
  Snowflake,
  Truck,
  X,
} from "@phosphor-icons/react";
import { useApp } from "@/context/app-context";
import { getDefaultRouteForRole } from "@/lib/rbac";
import { WEIGHTED_EASE } from "@/lib/utils";

const PUBLIC_BRANCHES = [
  { name: "Dhanmondi Care Branch", address: "Road 27, Dhanmondi, Dhaka", hours: "08:00 AM to 11:00 PM", phone: "+880 1711 100201" },
  { name: "Banani North Branch", address: "Road 11, Banani, Dhaka", hours: "08:00 AM to 11:00 PM", phone: "+880 1711 100202" },
  { name: "Uttara Sector 7 Branch", address: "Lake Drive Road, Uttara", hours: "08:00 AM to 10:30 PM", phone: "+880 1711 100203" },
  { name: "Mirpur 10 Plaza Branch", address: "Begum Rokeya Sarani, Mirpur", hours: "08:00 AM to 11:00 PM", phone: "+880 1711 100204" },
  { name: "Bashundhara Gate Branch", address: "Block C, Bashundhara R/A", hours: "08:00 AM to 11:00 PM", phone: "+880 1711 100205" },
  { name: "Motijheel Commercial Branch", address: "Dilkusha Commercial Area", hours: "08:30 AM to 10:00 PM", phone: "+880 1711 100206" },
  { name: "Chittagong Agrabad Branch", address: "Sk. Mujib Road, Agrabad", hours: "08:00 AM to 10:30 PM", phone: "+880 1711 100207" },
];

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: "Verified manufacturer sourcing",
    detail: "Every medicine batch is procured directly from licensed pharmaceutical manufacturers and logged at central goods receipt.",
  },
  {
    icon: Snowflake,
    title: "Continuous cold chain control",
    detail: "Insulin, biologics, and temperature sensitive therapies travel from our central chiller to every branch under monitored storage.",
  },
  {
    icon: Clock,
    title: "Strict expiry protection",
    detail: "Automated batch sequencing prevents near expiry or recalled stock from ever reaching a retail counter or wholesale pallet.",
  },
  {
    icon: Truck,
    title: "Dependable pharmacy wholesale",
    detail: "Approved partner pharmacies receive transparent contract pricing, batch invoices, and scheduled replenishment deliveries.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Central warehouse intake",
    detail: "Every shipment is inspected on arrival with batch numbers, expiry dates, and manufacturer invoices verified before storage.",
  },
  {
    step: "02",
    title: "Controlled branch dispatch",
    detail: "Seven retail branches replenish from central stock using tracked transfers so essential medicines stay available every day.",
  },
  {
    step: "03",
    title: "Licensed pharmacist dispensing",
    detail: "Patients and wholesale pharmacy partners receive accurate, authentic medicines backed by complete batch traceability.",
  },
];

const FAQS = [
  {
    q: "How do I verify that medicines from MedGrid are authentic?",
    a: "Every unit dispensed across our seven branches is received from licensed pharmaceutical manufacturers into our central warehouse with recorded batch numbers and expiry dates.",
  },
  {
    q: "Can independent pharmacies apply for wholesale supply?",
    a: "Yes. Licensed retail pharmacies can submit a wholesale enquiry with their drug license and business registration for head office verification.",
  },
  {
    q: "Are cold chain products like insulin available at all seven branches?",
    a: "Yes. All seven retail locations maintain dedicated medical refrigeration units replenished from our central cold chain bay.",
  },
  {
    q: "Do you dispense prescription only medicines without a valid prescription?",
    a: "No. Prescription medicines require a valid prescription verified by a licensed pharmacist at the dispensing counter.",
  },
  {
    q: "How do staff members access the internal operations portal?",
    a: "Authorized staff sign in through the Staff Portal button using their role credentials. Access is restricted by role and assigned branch.",
  },
  {
    q: "What are the daily operating hours across branches?",
    a: "Most branches operate from 08:00 AM to 11:00 PM seven days a week. Exact branch timings are listed in the branch directory above.",
  },
];

const TAGLINE_WORDS =
  "Every medicine batch tracked from licensed manufacturer to patient counter across seven branches with zero guesswork.".split(
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
      const progress = Math.max(
        0,
        Math.min(1, (vh * 0.85 - rect.top) / (vh * 0.55))
      );
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
      className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6"
    >
      <div className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-8 sm:p-16">
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
  const { isAuthenticated, user } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [enquirySubmitted, setEnquirySubmitted] = useState(false);
  const [pharmacyName, setPharmacyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const portalHref =
    isAuthenticated && user ? getDefaultRouteForRole(user.role) : "/login";

  const handleEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacyName.trim() || !contactEmail.includes("@")) return;
    setEnquirySubmitted(true);
    setPharmacyName("");
    setContactEmail("");
  };

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#0a0a0a]">
      {/* Floating compact top navigation (B7) */}
      <header className="sticky top-0 z-40 px-4 pt-4">
        <div className="mx-auto flex max-w-[1040px] items-center justify-between gap-4 rounded-2xl border border-[#e5e5e5] bg-[#ffffff]/85 px-4 py-2.5 backdrop-blur-md">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff1f7a] text-[#ffffff]">
              <FirstAidKit size={18} weight="fill" />
            </span>
            <span className="title-3 text-[#0a0a0a] tracking-tight">
              MedGrid Pharmacy
            </span>
          </Link>

          <nav aria-label="Public navigation" className="hidden md:flex items-center gap-6">
            <a href="#benefits" className="title-4 text-[#525252] hover:text-[#0a0a0a] transition-colors duration-300">
              Standards
            </a>
            <a href="#branches" className="title-4 text-[#525252] hover:text-[#0a0a0a] transition-colors duration-300">
              Branches
            </a>
            <a href="#wholesale" className="title-4 text-[#525252] hover:text-[#0a0a0a] transition-colors duration-300">
              Wholesale
            </a>
            <a href="#faq" className="title-4 text-[#525252] hover:text-[#0a0a0a] transition-colors duration-300">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href={portalHref}
              className="inline-flex items-center gap-2 rounded-lg bg-[#ff1f7a] px-3 py-2 button-sm text-[#ffffff] transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#e11d74] active:scale-[0.98]"
            >
              <span>{isAuthenticated ? "Open Portal" : "Staff Login"}</span>
              <ArrowRight size={15} weight="bold" />
            </Link>

            <button
              type="button"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e5e5] bg-[#fafafa] text-[#0a0a0a] md:hidden cursor-pointer"
            >
              {mobileMenuOpen ? <X size={18} /> : <List size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Full height mobile drawer (B7) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: WEIGHTED_EASE }}
            className="fixed inset-0 z-50 flex flex-col bg-[#ffffff]/95 p-6 backdrop-blur-xl md:hidden"
          >
            <div className="flex items-center justify-between">
              <span className="title-2 text-[#0a0a0a]">MedGrid Pharmacy</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e5e5]"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="mt-8 flex flex-col gap-3">
              {[
                { href: "#benefits", label: "Quality Standards" },
                { href: "#branches", label: "Seven Branches" },
                { href: "#wholesale", label: "Wholesale Supply" },
                { href: "#faq", label: "Common Questions" },
              ].map((item, idx) => (
                <motion.a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.45, ease: WEIGHTED_EASE }}
                  className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-4 py-3 title-3 text-[#0a0a0a]"
                >
                  {item.label}
                </motion.a>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main id="main-content">
        {/* Hero Section */}
        <section className="mx-auto max-w-[1200px] px-4 pt-12 pb-16 sm:px-6 sm:pt-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: WEIGHTED_EASE }}
              className="lg:col-span-7"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ff1f7a]/25 bg-[#fff0f6] px-3 py-1 caption-4 text-[#be125c]">
                <span className="h-2 w-2 rounded-full bg-[#ff1f7a]" />
                <span>Seven retail branches and central cold chain distribution</span>
              </div>

              <h1 className="mt-6 max-w-[680px] heading-2 sm:heading-1 bg-gradient-to-r from-[#000000] to-[#666666] bg-clip-text text-transparent">
                Authentic medicines
                <br />
                delivered with clinical precision.
              </h1>

              <p className="mt-5 max-w-[680px] body-3 text-[#525252]">
                MedGrid connects one temperature controlled central warehouse with seven neighborhood pharmacy branches and licensed wholesale partners. Every dispensed pack is batch verified and expiry protected.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href={portalHref}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#ff1f7a] px-4 py-2.5 button-md text-[#ffffff] transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#e11d74] active:scale-[0.98]"
                >
                  <span>{isAuthenticated ? "Enter Operations Workspace" : "Sign in to Staff Portal"}</span>
                  <ArrowRight size={17} weight="bold" />
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-6 border-t border-[#e5e5e5] pt-6">
                <div>
                  <p className="font-mono heading-5 text-[#0a0a0a]">7</p>
                  <p className="caption-4 text-[#737373]">Retail branches</p>
                </div>
                <div>
                  <p className="font-mono heading-5 text-[#0a0a0a]">2°C to 8°C</p>
                  <p className="caption-4 text-[#737373]">Monitored cold chain</p>
                </div>
                <div>
                  <p className="font-mono heading-5 text-[#ff1f7a]">100%</p>
                  <p className="caption-4 text-[#737373]">Batch verified stock</p>
                </div>
              </div>
            </motion.div>

            {/* Minimalist animated public network preview card */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.7, ease: WEIGHTED_EASE }}
              className="lg:col-span-5"
            >
              <div className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-6">
                <div className="flex items-center justify-between">
                  <span className="caption-3 uppercase tracking-wider text-[#737373]">
                    Supply Chain Assurance
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ff1f7a]/30 bg-[#fff0f6] px-2.5 py-0.5 caption-4 text-[#be125c]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#ff1f7a]" />
                    Active Network
                  </span>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  {[
                    {
                      icon: Package,
                      label: "Central Distribution Hub",
                      meta: "Tejgaon Industrial Zone, Dhaka",
                      tag: "Verified",
                    },
                    {
                      icon: Snowflake,
                      label: "Cold Chain Biologics Bay",
                      meta: "Continuous thermal logging",
                      tag: "4.1°C",
                    },
                    {
                      icon: MapPin,
                      label: "Seven Neighborhood Pharmacies",
                      meta: "Dhaka & Chittagong daily care",
                      tag: "Open",
                    },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.25 + i * 0.1,
                          duration: 0.5,
                          ease: WEIGHTED_EASE,
                        }}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[#e5e5e5] bg-[#ffffff] p-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#fff0f6] text-[#ff1f7a]">
                            <Icon size={20} weight="duotone" />
                          </span>
                          <div>
                            <p className="title-4 text-[#0a0a0a]">{item.label}</p>
                            <p className="caption-5 text-[#737373]">{item.meta}</p>
                          </div>
                        </div>
                        <span className="font-mono caption-4 text-[#ff1f7a]">
                          {item.tag}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Mandatory Tagline Reveal Section (B11) */}
        <TaglineRevealSection />

        {/* Benefits Section */}
        <section id="benefits" className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
          <div className="max-w-[680px]">
            <p className="caption-3 uppercase tracking-widest text-[#ff1f7a]">
              Quality Standards
            </p>
            <h2 className="mt-2 heading-4 text-[#0a0a0a]">
              Built for safety at every dispensing counter
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {BENEFITS.map((b, idx) => {
              const Icon = b.icon;
              return (
                <motion.div
                  key={b.title}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: idx * 0.08, duration: 0.65, ease: WEIGHTED_EASE }}
                  className="rounded-2xl border border-[#e5e5e5] bg-[#ffffff] p-6 transition-[border-color] duration-300 hover:border-[#ff1f7a]/50"
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

        {/* How It Works */}
        <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
          <div className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-8 sm:p-12">
            <p className="caption-3 uppercase tracking-widest text-[#ff1f7a]">
              How Our Supply Works
            </p>
            <h2 className="mt-2 heading-4 text-[#0a0a0a]">
              Three verified stages from manufacturer to patient
            </h2>

            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {STEPS.map((s, idx) => (
                <motion.div
                  key={s.step}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: idx * 0.1, duration: 0.65, ease: WEIGHTED_EASE }}
                  className="rounded-xl border border-[#e5e5e5] bg-[#ffffff] p-6"
                >
                  <span className="font-mono heading-5 text-[#ff1f7a]">{s.step}</span>
                  <h3 className="mt-3 title-2 text-[#0a0a0a]">{s.title}</h3>
                  <p className="mt-2 body-6 text-[#525252]">{s.detail}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Public 7 Branch Directory */}
        <section id="branches" className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
          <div className="max-w-[680px]">
            <p className="caption-3 uppercase tracking-widest text-[#ff1f7a]">
              Branch Directory
            </p>
            <h2 className="mt-2 heading-4 text-[#0a0a0a]">
              Visit any of our seven licensed pharmacy branches
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PUBLIC_BRANCHES.map((branch, idx) => (
              <motion.article
                key={branch.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: Math.min(idx * 0.05, 0.3), duration: 0.6, ease: WEIGHTED_EASE }}
                className="rounded-2xl border border-[#e5e5e5] bg-[#ffffff] p-5"
              >
                <div className="flex items-center gap-2 text-[#ff1f7a]">
                  <MapPin size={16} weight="fill" />
                  <span className="caption-4">Retail Branch</span>
                </div>
                <h3 className="mt-2 title-3 text-[#0a0a0a]">{branch.name}</h3>
                <p className="mt-1 body-6 text-[#525252]">{branch.address}</p>
                <div className="mt-4 border-t border-[#f0f0f0] pt-3 flex items-center justify-between caption-5 text-[#737373]">
                  <span>{branch.hours}</span>
                  <span className="font-mono">{branch.phone}</span>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        {/* Wholesale Partner Enquiry */}
        <section id="wholesale" className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
          <div className="grid grid-cols-1 gap-8 rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-8 sm:p-12 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <p className="caption-3 uppercase tracking-widest text-[#ff1f7a]">
                Wholesale Distribution
              </p>
              <h2 className="mt-2 heading-4 text-[#0a0a0a]">
                Partner with our central warehouse for reliable pharmacy supply
              </h2>
              <p className="mt-3 body-5 text-[#525252]">
                External pharmacies receive verified wholesale pricing, controlled batch allocation, and full invoice history after license review by our head office team.
              </p>
            </div>

            <div className="lg:col-span-6">
              {enquirySubmitted ? (
                <div className="flex h-full flex-col justify-center rounded-xl border border-[#ff1f7a]/30 bg-[#fff0f6] p-6">
                  <CheckCircle size={28} weight="fill" className="text-[#ff1f7a]" />
                  <h3 className="mt-3 title-2 text-[#0a0a0a]">Wholesale enquiry recorded</h3>
                  <p className="mt-1 body-6 text-[#525252]">
                    Our head office wholesale desk will contact you with registration and license verification instructions.
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
                      className="h-10 w-full rounded-lg border border-[#d4d4d4] bg-[#ffffff] px-3 body-6 text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:border-[#ff1f7a] focus:outline-none"
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
                      className="h-10 w-full rounded-lg border border-[#d4d4d4] bg-[#ffffff] px-3 body-6 text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:border-[#ff1f7a] focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff1f7a] px-4 py-2.5 button-sm text-[#ffffff] transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#e11d74] active:scale-[0.98] cursor-pointer"
                  >
                    <span>Request wholesale onboarding</span>
                    <ArrowRight size={15} weight="bold" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="mx-auto max-w-[900px] px-4 py-16 sm:px-6">
          <p className="caption-3 uppercase tracking-widest text-[#ff1f7a]">
            Questions & Answers
          </p>
          <h2 className="mt-2 heading-4 text-[#0a0a0a]">
            Common questions about our pharmacy network
          </h2>

          <div className="mt-8 flex flex-col gap-3">
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

        {/* Final CTA */}
        <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
          <div className="rounded-2xl border border-[#ff1f7a]/25 bg-[#fff0f6] p-8 sm:p-14 text-center">
            <h2 className="mx-auto max-w-[680px] heading-4 text-[#0a0a0a]">
              Authorized pharmacy staff and branch managers
            </h2>
            <p className="mx-auto mt-3 max-w-[540px] body-5 text-[#525252]">
              Sign in with your assigned role to access the 3D isometric inventory twin, batch ledger, transfers, and retail POS.
            </p>
            <div className="mt-6">
              <Link
                href={portalHref}
                className="inline-flex items-center gap-2 rounded-lg bg-[#ff1f7a] px-4 py-2.5 button-md text-[#ffffff] transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#e11d74] active:scale-[0.98]"
              >
                <span>{isAuthenticated ? "Enter Operations Workspace" : "Sign in to Staff Portal"}</span>
                <ArrowRight size={17} weight="bold" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e5e5e5] bg-[#ffffff] py-8">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
          <span className="caption-4 text-[#737373]">
            © 2026 MedGrid Pharmacy Network. All rights reserved.
          </span>
          <div className="flex items-center gap-6 caption-4 text-[#737373]">
            <a href="#faq" className="hover:text-[#0a0a0a]">Privacy Policy</a>
            <a href="#faq" className="hover:text-[#0a0a0a]">Terms of Service</a>
            <Link href={portalHref} className="text-[#ff1f7a] hover:underline">
              Staff Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
