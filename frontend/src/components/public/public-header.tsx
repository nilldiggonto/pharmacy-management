"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  CheckCircle,
  FirstAidKit,
  List,
  Minus,
  Plus,
  ShoppingBag,
  Trash,
  X,
} from "@phosphor-icons/react";
import { useApp } from "@/context/app-context";
import { usePublicCart } from "@/context/public-cart-context";
import { DHAKA_BRANCHES } from "@/lib/public-catalog";
import { getDefaultRouteForRole } from "@/lib/rbac";
import { formatCurrency, WEIGHTED_EASE } from "@/lib/utils";

const PUBLIC_NAV = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Medicines" },
  { href: "/branches", label: "Dhaka Branches" },
];

export function PublicHeader() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useApp();
  const {
    items,
    drawerOpen,
    setDrawerOpen,
    selectedBranchId,
    setSelectedBranchId,
    updateQuantity,
    removeItem,
    clearCart,
    totalItems,
    subtotal,
  } = usePublicCart();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderRef, setOrderRef] = useState<string | null>(null);

  const portalHref =
    isAuthenticated && user ? getDefaultRouteForRole(user.role) : "/login";

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || customerPhone.trim().length < 6) return;
    setOrderRef(`MG-DHK-${Math.floor(10000 + Math.random() * 89999)}`);
    clearCart();
    setCustomerPhone("");
  };

  return (
    <>
      <header className="sticky top-0 z-40 px-4 pt-4">
        <div className="mx-auto flex max-w-[1140px] items-center justify-between gap-4 rounded-2xl border border-[#e5e5e5] bg-[#ffffff]/88 px-4 py-2.5 backdrop-blur-md">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff1f7a] text-[#ffffff]">
              <FirstAidKit size={18} weight="fill" />
            </span>
            <span className="title-3 text-[#0a0a0a] tracking-tight">MedGrid</span>
          </Link>

          <nav aria-label="Public navigation" className="hidden md:flex items-center gap-1">
            {PUBLIC_NAV.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative rounded-lg px-3.5 py-1.5 title-4 transition-colors duration-300 ${
                    active ? "text-[#0a0a0a]" : "text-[#525252] hover:text-[#0a0a0a]"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="public-nav-pill"
                      transition={{ duration: 0.45, ease: WEIGHTED_EASE }}
                      className="absolute inset-0 rounded-lg border border-[#ff1f7a]/25 bg-[#fff0f6]"
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setOrderRef(null);
                setDrawerOpen(true);
              }}
              aria-label="Open medicine cart"
              className="relative inline-flex h-9 items-center gap-2 rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-3 button-xsm text-[#0a0a0a] transition-colors duration-300 hover:border-[#ff1f7a] cursor-pointer"
            >
              <ShoppingBag size={16} weight="duotone" className="text-[#ff1f7a]" />
              <span className="hidden sm:inline">Cart</span>
              {totalItems > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff1f7a] px-1 font-mono caption-5 text-[#ffffff]">
                  {totalItems}
                </span>
              )}
            </button>

            <Link
              href={portalHref}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#ff1f7a] px-3 py-2 button-sm text-[#ffffff] transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#e11d74] active:scale-[0.98]"
            >
              <span>{isAuthenticated ? "Portal" : "Staff Login"}</span>
              <ArrowRight size={14} weight="bold" />
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

      {/* Mobile full height menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: WEIGHTED_EASE }}
            className="fixed inset-0 z-50 flex flex-col bg-[#ffffff]/96 p-6 backdrop-blur-xl md:hidden"
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
              {PUBLIC_NAV.map((item, idx) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.45, ease: WEIGHTED_EASE }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-4 py-3 title-3 text-[#0a0a0a]"
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide over OTC Medicine Cart Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-50 bg-[#0a0a0a]/35 backdrop-blur-xs"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.45, ease: WEIGHTED_EASE }}
              className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-md flex-col border-l border-[#e5e5e5] bg-[#ffffff] p-6 text-[#0a0a0a] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-4">
                <div>
                  <h2 className="title-2 text-[#0a0a0a]">OTC Medicine Bag</h2>
                  <p className="caption-5 text-[#737373]">
                    Limited to non prescription essentials with per order safety caps
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close cart"
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5e5e5] hover:border-[#ff1f7a] cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 flex-1 overflow-y-auto">
                {orderRef ? (
                  <div className="rounded-2xl border border-[#ff1f7a]/30 bg-[#fff0f6] p-6 text-center">
                    <CheckCircle size={32} weight="fill" className="mx-auto text-[#ff1f7a]" />
                    <h3 className="mt-3 title-2 text-[#0a0a0a]">Order reserved</h3>
                    <p className="mt-1 font-mono caption-3 text-[#be125c]">{orderRef}</p>
                    <p className="mt-2 body-6 text-[#525252]">
                      Your selected Dhaka branch will prepare your batch verified OTC order and confirm by phone.
                    </p>
                  </div>
                ) : items.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center p-6">
                    <ShoppingBag size={32} className="text-[#d4d4d4]" />
                    <p className="mt-3 title-4 text-[#0a0a0a]">Your bag is empty</p>
                    <p className="mt-1 caption-4 text-[#737373]">
                      Browse approved non prescription medicines with strict household safety limits.
                    </p>
                    <Link
                      href="/shop"
                      onClick={() => setDrawerOpen(false)}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#ff1f7a] px-4 py-2 button-sm text-[#ffffff]"
                    >
                      <span>Browse Medicines</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {items.map((entry) => (
                      <div
                        key={entry.product.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-3.5"
                      >
                        <div className="min-w-0">
                          <p className="body-5 text-[#0a0a0a]">{entry.product.name}</p>
                          <p className="caption-5 text-[#737373]">
                            {entry.product.packLabel} · Max {entry.product.maxOrderQty}
                          </p>
                          <p className="mt-1 font-mono caption-3 text-[#ff1f7a]">
                            {formatCurrency(entry.product.price * entry.quantity)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(entry.product.id, -1)}
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-[#e5e5e5] bg-[#ffffff] cursor-pointer"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-6 text-center font-mono caption-3">
                            {entry.quantity}
                          </span>
                          <button
                            type="button"
                            disabled={entry.quantity >= entry.product.maxOrderQty}
                            onClick={() => updateQuantity(entry.product.id, 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-[#e5e5e5] bg-[#ffffff] disabled:opacity-40 cursor-pointer"
                          >
                            <Plus size={12} />
                          </button>
                          <button
                            type="button"
                            aria-label="Remove item"
                            onClick={() => removeItem(entry.product.id)}
                            className="ml-1 flex h-7 w-7 items-center justify-center rounded-md text-[#737373] hover:text-[#ff1f7a] cursor-pointer"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {items.length > 0 && !orderRef && (
                <form
                  onSubmit={handlePlaceOrder}
                  className="mt-4 flex flex-col gap-3 border-t border-[#e5e5e5] pt-4"
                >
                  <div>
                    <label className="caption-4 text-[#525252] block mb-1">
                      Pickup or dispatch branch (Dhaka)
                    </label>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="h-9 w-full rounded-lg border border-[#d4d4d4] bg-[#ffffff] px-3 body-6 text-[#0a0a0a]"
                    >
                      {DHAKA_BRANCHES.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.area} · {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="caption-4 text-[#525252] block mb-1">
                      Mobile number for confirmation
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+880 17XX XXXXXX"
                      className="h-9 w-full rounded-lg border border-[#d4d4d4] bg-[#ffffff] px-3 body-6 text-[#0a0a0a] focus:border-[#ff1f7a] focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="title-4 text-[#525252]">Estimated Total</span>
                    <span className="font-mono heading-6 text-[#0a0a0a]">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <button
                    type="submit"
                    className="h-10 w-full rounded-lg bg-[#ff1f7a] button-sm text-[#ffffff] transition-colors duration-300 hover:bg-[#e11d74] cursor-pointer"
                  >
                    Reserve OTC Order
                  </button>
                </form>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

