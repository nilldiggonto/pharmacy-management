"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowsLeftRight,
  Buildings,
  Cube,
  List,
  Package,
  Pill,
  ShoppingCartSimple,
  SignIn,
  SignOut,
  Truck,
  X,
} from "@phosphor-icons/react";
import { useApp } from "@/context/app-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, WEIGHTED_EASE } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Isometric View", icon: Cube },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/products", label: "Catalogue", icon: Pill },
  { href: "/purchasing", label: "Purchasing", icon: Truck },
  { href: "/transfers", label: "Transfers", icon: ArrowsLeftRight },
  { href: "/pos", label: "POS & Closing", icon: ShoppingCartSimple },
  { href: "/operations", label: "Network & Audit", icon: Buildings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, mode, signOut } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#000000] text-[#f5f5f4]">
      {/* Floating compact top bar (B7 navigation) */}
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 rounded-2xl border border-[#272727] bg-[#181818]/90 px-3 py-2 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors duration-300 hover:bg-[#272727]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#10b981]/40 bg-[#10b981]/15 text-[#10b981]">
                <Cube size={16} weight="duotone" />
              </span>
              <span className="title-4 text-[#f5f5f4] tracking-tight">
                MedGrid
              </span>
            </Link>

            <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 title-5 transition-colors duration-300",
                      active
                        ? "text-[#f5f5f4]"
                        : "text-[#a8a29e] hover:text-[#f5f5f4] hover:bg-[#1f1f1f]"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="active-nav-pill"
                        transition={{ duration: 0.45, ease: WEIGHTED_EASE }}
                        className="absolute inset-0 rounded-lg border border-[#313131] bg-[#272727]"
                      />
                    )}
                    <Icon size={15} weight={active ? "fill" : "regular"} className="relative z-10" />
                    <span className="relative z-10">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={mode === "live_api" ? "emerald" : "cyan"}
              pulse
              className="hidden sm:inline-flex"
            >
              {mode === "live_api" ? "Live API" : "Telemetry Demo"}
            </Badge>

            <div className="hidden md:flex items-center gap-2 rounded-lg border border-[#272727] bg-[#1f1f1f] px-2.5 py-1">
              <span className="h-2 w-2 rounded-full bg-[#10b981]" />
              <span className="caption-4 text-[#f5f5f4]">{user.full_name}</span>
              <span className="caption-5 text-[#78716c] uppercase">{user.role}</span>
            </div>

            {mode === "live_api" ? (
              <Button size="sm" variant="ghost" onClick={() => void signOut()}>
                <SignOut size={15} />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            ) : (
              <Button size="sm" variant="outline" asChild>
                <Link href="/login">
                  <SignIn size={15} />
                  <span>Connect API</span>
                </Link>
              </Button>
            )}

            <button
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#313131] bg-[#1f1f1f] text-[#f5f5f4] lg:hidden cursor-pointer"
            >
              {mobileOpen ? <X size={18} /> : <List size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Full height mobile menu (B7) */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: WEIGHTED_EASE }}
            className="fixed inset-0 z-50 flex flex-col bg-[#000000]/95 p-6 backdrop-blur-xl lg:hidden"
          >
            <div className="flex items-center justify-between">
              <span className="title-2 text-[#f5f5f4]">MedGrid Navigation</span>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#313131] bg-[#181818]"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="mt-8 flex flex-col gap-3">
              {NAV_ITEMS.map((item, idx) => {
                const Icon = item.icon;
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: Math.min(idx * 0.06, 0.36),
                      duration: 0.45,
                      ease: WEIGHTED_EASE,
                    }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border px-4 py-3 title-3",
                        active
                          ? "border-[#10b981]/50 bg-[#181818] text-[#10b981]"
                          : "border-[#272727] bg-[#181818] text-[#f5f5f4]"
                      )}
                    >
                      <Icon size={20} weight={active ? "fill" : "regular"} />
                      <span>{item.label}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main id="main-content" className="mx-auto max-w-[1600px] px-3 py-4 sm:px-4">
        {children}
      </main>
    </div>
  );
}

