"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowCounterClockwise,
  CheckCircle,
  MagnifyingGlass,
  Minus,
  Plus,
  Receipt,
  ShoppingCartSimple,
  Storefront,
  Truck,
  XCircle,
} from "@phosphor-icons/react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MedicineVisual } from "@/components/ui/medicine-visual";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import { useApp } from "@/context/app-context";
import type { Product, Sale } from "@/types/api";
import { formatCurrency, formatTimeAgo } from "@/lib/utils";

export default function PosPage() {
  const {
    user,
    isGlobalRole,
    allowedLocations,
    activeBranchId,
    setActiveBranchId,
    products,
    locations,
    networkStock,
    sales,
    dailyClosings,
    completePosSale,
    voidSaleInvoice,
    returnSaleItem,
    submitDailyClosing,
  } = useApp();

  const stockLocations = useMemo(() => locations.filter((l) => l.holds_stock), [locations]);
  const branchLocations = useMemo(
    () =>
      (isGlobalRole ? stockLocations : allowedLocations).filter(
        (l) => l.location_type === "branch"
      ),
    [isGlobalRole, stockLocations, allowedLocations]
  );
  const hubLocation = useMemo(
    () =>
      stockLocations.find((l) => l.code === "WH-01" || l.location_type === "central_warehouse"),
    [stockLocations]
  );

  const canWholesale =
    user && ["owner", "head_office_manager", "inventory_officer"].includes(user.role);
  const canVoid =
    user && ["owner", "head_office_manager", "branch_manager"].includes(user.role);

  const [tab, setTab] = useState("retail");
  const locationId =
    branchLocations.find((b) => b.id === activeBranchId)?.id ??
    branchLocations[0]?.id ??
    stockLocations[0]?.id ??
    3;
  const setLocationId = (id: number) => setActiveBranchId(id);
  const [query, setQuery] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Register closing state
  const [actualCash, setActualCash] = useState("0");
  const [actualNonCash, setActualNonCash] = useState("0");
  const [closingNotes, setClosingNotes] = useState("");

  // Void / Return modal state
  const [voidTarget, setVoidTarget] = useState<Sale | null>(null);
  const [voidReason, setVoidReason] = useState("Cashier entry correction");
  const [returnTarget, setReturnTarget] = useState<Sale | null>(null);
  const [returnReason, setReturnReason] = useState("Customer returned unopened pack");

  const activeLocationId = tab === "wholesale" && hubLocation ? hubLocation.id : locationId;
  const locMap = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);

  // Fast stock lookup per product at activeLocationId and at Uttara Hub
  const stockByProduct = useMemo(() => {
    const map = new Map<number, { local: number; hub: number; elsewhere: number }>();
    networkStock.forEach((item) => {
      const localLoc = item.locations.find((l) => l.location_id === activeLocationId);
      const hubLoc = item.locations.find(
        (l) => l.location_code === "WH-01" || l.location_type === "central_warehouse"
      );
      const local = localLoc?.available_quantity ?? 0;
      const hub = hubLoc?.available_quantity ?? 0;
      map.set(item.product_id, {
        local,
        hub,
        elsewhere: Math.max(0, item.total_available - local),
      });
    });
    return map;
  }, [networkStock, activeLocationId]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.generic_name?.toLowerCase().includes(q) ?? false) ||
        (p.barcode?.includes(q) ?? false)
    );
  }, [products, query]);

  const isWholesale = tab === "wholesale";

  const addToCart = (product: Product) => {
    const step = isWholesale ? 10 : 1;
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + step } : i
        );
      }
      return [...prev, { product, quantity: step }];
    });
  };

  const updateQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const unitPriceFor = (p: Product) => (isWholesale ? p.wholesale_price : p.retail_price);
  const total = cart.reduce((s, i) => s + Number(unitPriceFor(i.product)) * i.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    setStatusMsg(null);
    try {
      const sale = await completePosSale({
        locationId: activeLocationId,
        customerName,
        customerPhone,
        paymentMethod,
        saleMode: isWholesale ? "wholesale" : "retail",
        items: cart,
      });
      setStatusMsg({
        type: "ok",
        text: `Invoice ${sale.invoice_number} completed! Inventory reduced via FEFO and synced in real time.`,
      });
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
    } catch (err) {
      setStatusMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Sale could not be completed.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClosingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submitDailyClosing({
        locationId,
        actualCash: parseFloat(actualCash) || 0,
        actualNonCash: parseFloat(actualNonCash) || 0,
        notes: closingNotes,
      });
      setStatusMsg({ type: "ok", text: "Daily cash register closing submitted successfully." });
      setClosingNotes("");
    } catch (err) {
      setStatusMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Could not submit daily closing.",
      });
    }
  };

  const handleVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidTarget) return;
    try {
      await voidSaleInvoice(voidTarget.id, voidReason);
      setStatusMsg({
        type: "ok",
        text: `Invoice ${voidTarget.invoice_number} voided and stock restored to branch batches.`,
      });
      setVoidTarget(null);
    } catch (err) {
      setStatusMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Void failed.",
      });
    }
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnTarget || returnTarget.items.length === 0) return;
    const firstItem = returnTarget.items[0];
    try {
      await returnSaleItem(returnTarget.id, {
        saleItemId: firstItem.id,
        quantity: 1,
        reason: returnReason,
        refundMethod: "cash",
        condition: "unopened",
      });
      setStatusMsg({
        type: "ok",
        text: `Returned 1 unit of ${firstItem.product_name_snapshot} into QUARANTINED stock (never auto-resold).`,
      });
      setReturnTarget(null);
    } catch (err) {
      setStatusMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Return failed.",
      });
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="heading-5 text-[#1C1917]">Retail POS, Wholesale Desk & Register Closing</h1>
            <p className="body-6 text-[#57534E]">
              Every completed sale deducts earliest-expiry (FEFO) batches immediately and notifies staff across the network.
            </p>
          </div>

          <SlidingTabs
            layoutId="pos-mode-tabs"
            value={tab}
            onChange={(next) => {
              setTab(next);
              setCart([]);
              setStatusMsg(null);
            }}
            options={[
              { id: "retail", label: "Branch Retail POS" },
              ...(canWholesale ? [{ id: "wholesale", label: "Uttara Wholesale B2B" }] : []),
              { id: "closing", label: "Daily Closing", count: dailyClosings.length },
            ]}
          />
        </div>

        {statusMsg && (
          <div
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 caption-4 ${
              statusMsg.type === "ok"
                ? "border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]"
                : "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]"
            }`}
          >
            <span className="flex items-center gap-2">
              {statusMsg.type === "ok" ? (
                <CheckCircle size={16} weight="fill" />
              ) : (
                <XCircle size={16} weight="fill" />
              )}
              {statusMsg.text}
            </span>
            <button
              type="button"
              onClick={() => setStatusMsg(null)}
              className="font-semibold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {tab !== "closing" ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Product Picker */}
            <Card className="lg:col-span-7">
              <CardHeader className="flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <MagnifyingGlass
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#78716C]"
                  />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Scan barcode or search medicine / supply..."
                    className="pl-9"
                  />
                </div>

                {!isWholesale ? (
                  <div className="flex items-center gap-2">
                    <Storefront size={16} className="text-[#B91C1C]" />
                    <select
                      value={locationId}
                      onChange={(e) => {
                        setLocationId(Number(e.target.value));
                        setCart([]);
                      }}
                      className="h-9 rounded-lg border border-[#DDD2C2] bg-[#FFFFFF] px-3 body-6 text-[#1C1917]"
                    >
                      {branchLocations.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code} · {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <Badge variant="crimson">
                    <Truck size={13} weight="fill" />
                    Dispatching from Uttara Main Hub (WH-01) · Wholesale Tier
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {filteredProducts.map((p) => {
                  const st = stockByProduct.get(p.id);
                  const localAvail = st?.local ?? 0;
                  const outHere = st !== undefined && localAvail === 0;
                  return (
                    <div
                      key={p.id}
                      className={`flex flex-col justify-between gap-2 rounded-xl border p-3.5 transition-all ${
                        outHere
                          ? "border-[#FECACA] bg-[#FEF2F2]/40"
                          : "border-[#E7DDD0] bg-[#FAF6F0]/60 hover:border-[#B91C1C]/50 hover:bg-[#FFFDF9]"
                      }`}
                    >
                      <div>
                        <MedicineVisual
                          sku={p.sku}
                          name={p.name}
                          category={p.category}
                          dosageForm={p.dosage_form}
                          requiresPrescription={p.requires_prescription}
                          size="lg"
                          className="mb-2.5"
                        />
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono caption-5 font-semibold text-[#B91C1C]">
                            {p.sku}
                          </span>
                          <Badge variant={outHere ? "crimson" : localAvail < p.min_stock_level ? "amber" : "emerald"}>
                            {outHere ? "0 here" : `${localAvail} avail`}
                          </Badge>
                        </div>
                        <p className="mt-1 body-5 font-semibold text-[#1C1917]">{p.name}</p>
                        <p className="caption-5 text-[#57534E]">{p.generic_name}</p>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="font-mono title-4 text-[#1C1917]">
                          {formatCurrency(unitPriceFor(p))}
                          <span className="caption-5 text-[#78716C] font-normal">
                            /{p.base_unit}
                          </span>
                        </span>
                        {outHere ? (
                          <Button size="sm" variant="outline" asChild>
                            <Link href="/inventory">
                              Uttara Hub: {st?.hub ?? 0} →
                            </Link>
                          </Button>
                        ) : (
                          <Button size="sm" variant="primary" onClick={() => addToCart(p)}>
                            <Plus size={13} weight="bold" />
                            <span>{isWholesale ? "+10" : "Add"}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Checkout Cart */}
            <Card className="lg:col-span-5 flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCartSimple size={18} className="text-[#B91C1C]" />
                  {isWholesale ? "Wholesale Order Basket" : "Walk-In Customer Basket"}
                </CardTitle>
                <Badge variant="crimson">{cart.length} SKUs</Badge>
              </CardHeader>

              <CardContent className="flex flex-col gap-3">
                <div className="flex max-h-[240px] flex-col gap-2 overflow-y-auto">
                  {cart.length === 0 ? (
                    <p className="rounded-xl border border-[#EAE2D6] bg-[#FAF6F0] p-6 text-center caption-4 text-[#78716C]">
                      {isWholesale
                        ? "Add bulk medicines or supplies for clinic/hospital wholesale dispatch from Uttara Main Hub."
                        : "Select medicines from the left to dispense to a walk-in customer."}
                    </p>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-[#EAE2D6] bg-[#FAF6F0] px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate body-5 font-medium text-[#1C1917]">
                            {item.product.name}
                          </p>
                          <p className="font-mono caption-5 text-[#57534E]">
                            {formatCurrency(unitPriceFor(item.product))} × {item.quantity} ={" "}
                            <strong className="text-[#1C1917]">
                              {formatCurrency(Number(unitPriceFor(item.product)) * item.quantity)}
                            </strong>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateQty(item.product.id, isWholesale ? -10 : -1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#DDD2C2] bg-[#FFFDF9] cursor-pointer hover:border-[#B91C1C]"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-8 text-center font-mono caption-3 font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.product.id, isWholesale ? 10 : 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#DDD2C2] bg-[#FFFDF9] cursor-pointer hover:border-[#B91C1C]"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={isWholesale ? "Clinic / Pharmacy name" : "Customer name (optional)"}
                  />
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Phone (optional)"
                  />
                </div>

                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="h-9 rounded-lg border border-[#DDD2C2] bg-[#FFFFFF] px-3 body-6 text-[#1C1917]"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mobile_money">bKash / Nagad (Mobile Money)</option>
                  <option value="bank_transfer">Bank Transfer (Wholesale)</option>
                </select>

                <div className="flex items-center justify-between rounded-xl border border-[#FECACA] bg-[#FEF2F2]/70 p-3.5">
                  <span className="title-4 text-[#991B1B]">Total Payable</span>
                  <span className="font-mono heading-5 text-[#B91C1C]">{formatCurrency(total)}</span>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  disabled={cart.length === 0 || submitting}
                  onClick={() => void handleCheckout()}
                  className="w-full"
                >
                  <Receipt size={17} weight="bold" />
                  <span>
                    {submitting
                      ? "Deducting FEFO Stock..."
                      : isWholesale
                        ? "Dispatch Wholesale Order & Deduct Hub Stock"
                        : "Complete Sale & Reduce Branch Stock"}
                  </span>
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Daily Register Closing */
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-5">
              <CardHeader>
                <CardTitle>Submit End-of-Day Register Closing</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleClosingSubmit} className="flex flex-col gap-3">
                  <div>
                    <label className="caption-4 font-medium text-[#1C1917] block mb-1">Branch</label>
                    <select
                      value={locationId}
                      onChange={(e) => setLocationId(Number(e.target.value))}
                      className="h-9 w-full rounded-lg border border-[#DDD2C2] bg-[#FFFFFF] px-3 body-6 text-[#1C1917]"
                    >
                      {branchLocations.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code} · {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="caption-4 font-medium text-[#1C1917] block mb-1">
                        Counted Cash ($)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        required
                        value={actualCash}
                        onChange={(e) => setActualCash(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="caption-4 font-medium text-[#1C1917] block mb-1">
                        Card / Mobile Total ($)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        required
                        value={actualNonCash}
                        onChange={(e) => setActualNonCash(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="caption-4 font-medium text-[#1C1917] block mb-1">Shift Notes</label>
                    <Input
                      value={closingNotes}
                      onChange={(e) => setClosingNotes(e.target.value)}
                      placeholder="Cash drawer verified by shift lead"
                    />
                  </div>
                  <Button type="submit" variant="primary" className="mt-1">
                    Submit Daily Register Closing
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="lg:col-span-7">
              <CardHeader>
                <CardTitle>Recent Register Closings</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {dailyClosings.length === 0 ? (
                  <p className="py-8 text-center body-6 text-[#78716C]">
                    No daily closings submitted yet today.
                  </p>
                ) : (
                  dailyClosings.map((c) => {
                    const loc = locMap.get(c.location_id);
                    return (
                      <div
                        key={c.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#EAE2D6] bg-[#FAF6F0] p-3.5"
                      >
                        <div>
                          <p className="title-4 text-[#1C1917]">
                            {loc?.name ?? `Location #${c.location_id}`} · {c.closing_date}
                          </p>
                          <p className="caption-5 text-[#57534E]">
                            {c.transaction_count} invoices · Expected cash {formatCurrency(c.expected_cash)} · Actual{" "}
                            {formatCurrency(c.actual_cash)}
                          </p>
                        </div>
                        <Badge variant={Number(c.cash_discrepancy) === 0 ? "emerald" : "crimson"}>
                          Diff: {formatCurrency(c.cash_discrepancy)}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Invoices with Void & Customer Return */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent Retail & Wholesale Invoices</CardTitle>
              <p className="caption-5 text-[#57534E]">
                Managers can void invoices (restoring stock), and staff can process customer returns (quarantining returned packs).
              </p>
            </div>
            <Badge variant="neutral">{sales.length} invoices</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {sales.slice(0, 9).map((s) => {
                const loc = locMap.get(s.location_id);
                return (
                  <div
                    key={s.id}
                    className="flex flex-col justify-between gap-2.5 rounded-xl border border-[#E7DDD0] bg-[#FAF6F0]/70 p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono caption-3 font-semibold text-[#B91C1C]">
                          {s.invoice_number}
                        </p>
                        <p className="body-5 font-medium text-[#1C1917]">
                          {s.customer_name ?? "Walk-In Customer"}
                        </p>
                        <p className="caption-5 text-[#78716C]">
                          {loc?.code ?? `Loc #${s.location_id}`} · {formatTimeAgo(s.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono title-4 text-[#1C1917]">
                          {formatCurrency(s.total_amount)}
                        </p>
                        <Badge variant={s.status === "completed" ? "emerald" : "crimson"}>
                          {s.status}
                        </Badge>
                      </div>
                    </div>

                    {s.status === "completed" && (
                      <div className="flex items-center gap-2 pt-1 border-t border-[#EAE2D6]">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setReturnTarget(s)}
                        >
                          <ArrowCounterClockwise size={13} />
                          <span>Return</span>
                        </Button>
                        {canVoid && (
                          <Button
                            size="sm"
                            variant="danger"
                            className="flex-1"
                            onClick={() => setVoidTarget(s)}
                          >
                            <XCircle size={13} />
                            <span>Void</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Void Dialog */}
        <Dialog open={Boolean(voidTarget)} onOpenChange={(o) => !o && setVoidTarget(null)}>
          <DialogContent>
            <DialogTitle>Void Invoice {voidTarget?.invoice_number}</DialogTitle>
            <DialogDescription>
              Voiding restores all sold units back to their original FEFO batches and logs an immutable audit record.
            </DialogDescription>
            <form onSubmit={handleVoid} className="mt-4 flex flex-col gap-3">
              <Input
                required
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Reason for voiding invoice"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setVoidTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Confirm Void & Restore Stock
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Return Dialog */}
        <Dialog open={Boolean(returnTarget)} onOpenChange={(o) => !o && setReturnTarget(null)}>
          <DialogContent>
            <DialogTitle>Process Customer Return</DialogTitle>
            <DialogDescription>
              Returned medicine from {returnTarget?.invoice_number} is routed to QUARANTINED status so it is never accidentally resold without inspection.
            </DialogDescription>
            <form onSubmit={handleReturn} className="mt-4 flex flex-col gap-3">
              <Input
                required
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Return reason"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setReturnTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Process Return & Quarantine
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
