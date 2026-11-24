"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowsLeftRight,
  Buildings,
  Cube,
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
  { href: "/dashboard", label: "Isometric View", icon: Cube },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/products", label: "Catalogue", icon: Pill },
  { href: "/purchasing", label: "Purchasing", icon: Truck },
  { href: "/transfers", label: "Transfers", icon: ArrowsLeftRight },
  { href: "/pos", label: "POS & Closing", icon: ShoppingCartSimple },
  { href: "/operations", label: "Network & Audit", icon: Buildings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, mode, isAuthenticated, authChecked, signOut } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [authChecked, isAuthenticated, pathname, router]);

  if (!authChecked || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#000000] p-6">
        <div className="mx-auto max-w-[1600px] flex flex-col gap-4">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <Skeleton className="h-[480px] w-full rounded-2xl" />
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
    <div className="min-h-screen bg-[#000000] text-[#f5f5f4]">
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 rounded-2xl border border-[#272727] bg-[#181818]/90 px-3 py-2 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Link
              href={getDefaultRouteForRole(user.role)}
              className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors duration-300 hover:bg-[#272727]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#10b981]/40 bg-[#10b981]/15 text-[#10b981]">
                <Cube size={16} weight="duotone" />
              </span>
              <span className="title-4 text-[#f5f5f4] tracking-tight">MedGrid</span>
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
              {mode === "live_api" ? "Live API" : "Role Preview"}
            </Badge>

            <div className="hidden md:flex items-center gap-2 rounded-lg border border-[#272727] bg-[#1f1f1f] px-2.5 py-1">
              <span className="h-2 w-2 rounded-full bg-[#10b981]" />
              <span className="caption-4 text-[#f5f5f4]">{user.full_name}</span>
              <span className="caption-5 text-[#10b981] uppercase">
                {roleMeta?.label ?? user.role}
              </span>
            </div>

            <Button size="sm" variant="ghost" onClick={() => void handleSignOut()}>
              <SignOut size={15} />
              <span className="hidden sm:inline">Sign out</span>
            </Button>

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
              {allowedNav.map((item, idx) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
        {routeAllowed ? (
          children
        ) : (
          <div className="mx-auto my-16 max-w-md rounded-2xl border border-[#272727] bg-[#181818] p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[#f43f5e]/40 bg-[#f43f5e]/10 text-[#fb7185]">
              <LockSimple size={22} weight="duotone" />
            </div>
            <h1 className="mt-4 heading-6 text-[#f5f5f4]">Access restricted for your role</h1>
            <p className="mt-2 body-6 text-[#a8a29e]">
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
