"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowsLeftRight,
  BellRinging,
  Buildings,
  Cube,
  FirstAidKit,
  List,
  LockSimple,
  Package,
  Pill,
  ShoppingCartSimple,
  SignOut,
  Truck,
  X,
} from "@phosphor-icons/react";
import { useApp } from "@/context/app-context";
import { canAccessRoute, getDefaultRouteForRole, ROLE_DIRECTORY, type AppRoute } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, WEIGHTED_EASE } from "@/lib/utils";

const NAV_ITEMS: { href: AppRoute; label: string; icon: React.ElementType }[] = [
  { href: "/dashboard", label: "Command Center", icon: Cube },
  { href: "/inventory", label: "Stock & Finder", icon: Package },
  { href: "/transfers", label: "Hub Transfers", icon: ArrowsLeftRight },
  { href: "/pos", label: "POS & Wholesale", icon: ShoppingCartSimple },
  { href: "/purchasing", label: "Purchasing", icon: Truck },
  { href: "/products", label: "Catalogue", icon: Pill },
  { href: "/operations", label: "Branches & Audit", icon: Buildings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, mode, sseConnected, liveToast, dismissToast, isAuthenticated, authChecked, signOut } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [authChecked, isAuthenticated, pathname, router]);

  if (!authChecked || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] p-6">
        <div className="mx-auto max-w-[1600px] flex flex-col gap-4">
          <Skeleton className="h-14 w-full rounded-2xl bg-[#EFE7DB]" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Skeleton className="h-24 rounded-2xl bg-[#EFE7DB]" />
            <Skeleton className="h-24 rounded-2xl bg-[#EFE7DB]" />
            <Skeleton className="h-24 rounded-2xl bg-[#EFE7DB]" />
            <Skeleton className="h-24 rounded-2xl bg-[#EFE7DB]" />
          </div>
          <Skeleton className="h-[480px] w-full rounded-2xl bg-[#EFE7DB]" />
        </div>
      </div>
    );
  }

  const allowedNav = NAV_ITEMS.filter((item) => canAccessRoute(user.role, item.href));
  const routeAllowed = canAccessRoute(user.role, pathname);
  const roleMeta = ROLE_DIRECTORY[user.role];

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#1C1917]">
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 rounded-2xl border border-[#E7DDD0] bg-[#FFFDF9]/95 px-3 py-2 shadow-[0_2px_10px_rgba(28,25,23,0.05)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Link
              href={getDefaultRouteForRole(user.role)}
              className="flex items-center gap-2 rounded-xl px-2 py-1 transition-colors duration-200 hover:bg-[#FAF6F0]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#B91C1C] text-[#FFFDF9] shadow-xs">
                <FirstAidKit size={18} weight="fill" />
              </span>
              <div className="leading-tight">
                <span className="title-4 text-[#1C1917] tracking-tight block">MedGrid</span>
                <span className="caption-5 text-[#991B1B] block">Uttara Hub Network</span>
              </div>
            </Link>

            <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-1">
              {allowedNav.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 title-5 transition-colors duration-200",
                      active
                        ? "text-[#991B1B]"
                        : "text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5EFE6]"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="active-nav-pill"
                        transition={{ duration: 0.35, ease: WEIGHTED_EASE }}
                        className="absolute inset-0 rounded-lg border border-[#FECACA] bg-[#FEF2F2]"
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
              variant={mode === "live_api" ? (sseConnected ? "emerald" : "amber") : "crimson"}
              pulse={mode === "live_api"}
              className="hidden sm:inline-flex"
            >
              {mode === "live_api"
                ? sseConnected
                  ? "Real-Time Live"
                  : "Live API"
                : "Role Preview"}
            </Badge>

            <div className="hidden md:flex items-center gap-2 rounded-xl border border-[#E7DDD0] bg-[#FAF6F0] px-2.5 py-1">
              <span className="h-2 w-2 rounded-full bg-[#B91C1C]" />
              <span className="caption-4 font-medium text-[#1C1917]">{user.full_name}</span>
              <span className="rounded-md bg-[#FEF2F2] px-1.5 py-0.5 caption-5 font-semibold text-[#991B1B] uppercase">
                {roleMeta?.label ?? user.role}
              </span>
            </div>

            <Button size="sm" variant="outline" onClick={() => void handleSignOut()}>
              <SignOut size={15} />
              <span className="hidden sm:inline">Sign out</span>
            </Button>

            <button
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E7DDD0] bg-[#F5EFE6] text-[#1C1917] lg:hidden cursor-pointer"
            >
              {mobileOpen ? <X size={18} /> : <List size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Real-time live event toast */}
      <AnimatePresence>
        {liveToast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="fixed right-4 top-20 z-50 max-w-sm rounded-2xl border border-[#FECACA] bg-[#FFFDF9] p-3.5 shadow-lg"
          >
            <div className="flex items-start gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FEF2F2] text-[#B91C1C]">
                <BellRinging size={17} weight="fill" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="title-5 text-[#1C1917]">{liveToast.title}</p>
                <p className="mt-0.5 caption-4 text-[#57534E]">{liveToast.detail}</p>
                {liveToast.actor && (
                  <p className="mt-1 caption-5 text-[#991B1B]">By {liveToast.actor}</p>
                )}
              </div>
              <button
                type="button"
                onClick={dismissToast}
                className="rounded-md p-1 text-[#78716C] hover:bg-[#F5EFE6] hover:text-[#1C1917] cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: WEIGHTED_EASE }}
            className="fixed inset-0 z-50 flex flex-col bg-[#FAF6F0]/98 p-6 backdrop-blur-xl lg:hidden"
          >
            <div className="flex items-center justify-between">
              <span className="title-2 text-[#1C1917]">MedGrid Staff Menu</span>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E7DDD0] bg-[#FFFDF9]"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="mt-6 flex flex-col gap-2.5">
              {allowedNav.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-4 py-3 title-3",
                      active
                        ? "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]"
                        : "border-[#E7DDD0] bg-[#FFFDF9] text-[#1C1917]"
                    )}
                  >
                    <Icon size={20} weight={active ? "fill" : "regular"} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main id="main-content" className="mx-auto max-w-[1600px] px-3 py-5 sm:px-4">
        {routeAllowed ? (
          children
        ) : (
          <div className="mx-auto my-16 max-w-md rounded-2xl border border-[#E7DDD0] bg-[#FFFDF9] p-8 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]">
              <LockSimple size={22} weight="duotone" />
            </div>
            <h1 className="mt-4 heading-6 text-[#1C1917]">Access restricted for your role</h1>
            <p className="mt-2 body-6 text-[#57534E]">
              Your account ({roleMeta?.label ?? user.role}) does not have permission to view this module.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="primary" asChild>
                <Link href={getDefaultRouteForRole(user.role)}>Go to my workspace</Link>
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
