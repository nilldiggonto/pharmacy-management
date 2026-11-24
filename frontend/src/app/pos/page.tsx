"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle, MagnifyingGlass, Minus, Plus, ShoppingCartSimple } from "@phosphor-icons/react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useApp } from "@/context/app-context";
import type { Product } from "@/types/api";
import { formatCurrency, formatTimeAgo } from "@/lib/utils";

export default function PosPage() {
  const { products, locations, sales, completePosSale } = useApp();
  const branchLocations = useMemo(
    () => locations.filter((l) => l.location_type === "branch"),
    [locations]
  );

  const [locationId, setLocationId] = useState<number>(branchLocations[0]?.id ?? 3);
  const [query, setQuery] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [lastInvoice, setLastInvoice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode?.includes(q) ?? false)
    );
  }, [products, query]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
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

  const total = cart.reduce((s, i) => s + i.product.retail_price * i.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const sale = await completePosSale({
        locationId,
        customerName,
        paymentMethod,
        items: cart,
      });
      setLastInvoice(sale.invoice_number);
      setCart([]);
      setCustomerName("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="heading-5 text-[#f5f5f4]">Retail POS & Daily Register</h1>
            <p className="body-6 text-[#a8a29e]">
              Atomic FEFO stock deduction with locked batch selection and blocked expired stock.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="caption-4 text-[#a8a29e]">Active Branch:</span>
            <select
              value={locationId}
              onChange={(e) => setLocationId(Number(e.target.value))}
              className="rounded-lg border border-[#313131] bg-[#181818] px-3 py-1.5 body-5 text-[#f5f5f4]"
            >
              {branchLocations.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} · {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Product Picker */}
          <Card className="lg:col-span-7">
            <CardHeader>
              <div className="relative flex-1">
                <MagnifyingGlass
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#78716c]"
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Scan barcode or search medicine..."
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToCart(p)}
                  className="flex flex-col items-start justify-between gap-2 rounded-xl border border-[#272727] bg-[#1f1f1f] p-3 text-left transition-[border-color,background-color] duration-200 hover:border-[#10b981]/60 hover:bg-[#272727] cursor-pointer"
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="font-mono caption-5 text-[#10b981]">{p.sku}</span>
                    <Badge variant={p.requires_prescription ? "amber" : "neutral"}>
                      {p.requires_prescription ? "Rx" : "OTC"}
                    </Badge>
                  </div>
                  <p className="body-4 text-[#f5f5f4]">{p.name}</p>
                  <div className="flex w-full items-center justify-between">
                    <span className="caption-5 text-[#78716c]">{p.generic_name}</span>
                    <span className="font-mono title-4 text-[#f5f5f4]">
                      {formatCurrency(p.retail_price)}
                    </span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Checkout Cart */}
          <Card className="lg:col-span-5 flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCartSimple size={18} className="text-[#10b981]" />
                Current Basket
              </CardTitle>
              <Badge variant="emerald">{cart.length} items</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {lastInvoice && (
                <div className="flex items-center gap-2 rounded-lg border border-[#10b981]/40 bg-[#10b981]/10 p-3 caption-4 text-[#34d399]">
                  <CheckCircle size={16} weight="fill" />
                  <span>Invoice {lastInvoice} completed and synced.</span>
                </div>
              )}

              <div className="flex max-h-[220px] flex-col gap-2 overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="rounded-lg border border-[#272727] bg-[#1f1f1f] p-6 text-center caption-4 text-[#78716c]">
                    Select medicines from the catalogue to start a retail checkout.
                  </p>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-[#272727] bg-[#1f1f1f] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate body-5 text-[#f5f5f4]">{item.product.name}</p>
                        <p className="font-mono caption-5 text-[#a8a29e]">
                          {formatCurrency(item.product.retail_price)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateQty(item.product.id, -1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-[#313131] bg-[#272727] cursor-pointer"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-6 text-center font-mono caption-3">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.product.id, 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-[#313131] bg-[#272727] cursor-pointer"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name (optional)"
                />
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="rounded-lg border border-[#313131] bg-[#1f1f1f] px-3 py-2 body-6 text-[#f5f5f4]"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[#272727] bg-[#1f1f1f] p-3">
                <span className="title-4 text-[#a8a29e]">Total Due</span>
                <span className="font-mono heading-5 text-[#10b981]">{formatCurrency(total)}</span>
              </div>

              <Button
                variant="primary"
                disabled={cart.length === 0 || submitting}
                onClick={() => void handleCheckout()}
                className="w-full"
              >
                {submitting ? "Processing FEFO..." : "Complete Sale & Deduct Stock"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Branch Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {sales.slice(0, 6).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-[#272727] bg-[#1f1f1f] p-3"
                >
                  <div>
                    <p className="font-mono caption-3 text-[#10b981]">{s.invoice_number}</p>
                    <p className="body-6 text-[#f5f5f4]">{s.customer_name ?? "Walk In Customer"}</p>
                    <p className="caption-5 text-[#78716c]">{formatTimeAgo(s.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono title-4 text-[#f5f5f4]">{formatCurrency(s.total_amount)}</p>
                    <Badge variant="emerald">{s.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

