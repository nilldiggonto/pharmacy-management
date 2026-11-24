"use client";

import React, { useMemo, useState } from "react";
import { MagnifyingGlass, Package } from "@phosphor-icons/react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import { useApp } from "@/context/app-context";
import { daysUntil, formatCurrency, formatNumber, formatTimeAgo } from "@/lib/utils";

export default function InventoryPage() {
  const { batches, movements, products, locations } = useApp();
  const [tab, setTab] = useState("batches");
  const [query, setQuery] = useState("");
  const [locFilter, setLocFilter] = useState<string>("all");

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const locMap = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);

  const filteredBatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return batches.filter((b) => {
      const loc = locMap.get(b.location_id);
      const prod = productMap.get(b.product_id);
      if (locFilter !== "all" && loc?.code !== locFilter) return false;
      if (!q) return true;
      return (
        b.batch_number.toLowerCase().includes(q) ||
        (prod?.name.toLowerCase().includes(q) ?? false) ||
        (prod?.sku.toLowerCase().includes(q) ?? false)
      );
    });
  }, [batches, locFilter, locMap, productMap, query]);

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="heading-5 text-[#f5f5f4]">Batch Inventory & Stock Ledger</h1>
            <p className="body-6 text-[#a8a29e]">
              FEFO batch tracking across the central warehouse and all seven retail branches.
            </p>
          </div>
          <SlidingTabs
            layoutId="inventory-tabs"
            value={tab}
            onChange={setTab}
            options={[
              { id: "batches", label: "Active Batches", count: batches.length },
              { id: "movements", label: "Movement Ledger", count: movements.length },
            ]}
          />
        </div>

        <Card>
          <CardHeader className="flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <MagnifyingGlass
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#78716c]"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by batch number, product name, or SKU..."
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setLocFilter("all")}
                className={`rounded-lg border px-2.5 py-1 caption-4 cursor-pointer transition-colors duration-200 ${
                  locFilter === "all"
                    ? "border-[#10b981] bg-[#10b981]/15 text-[#34d399]"
                    : "border-[#313131] bg-[#1f1f1f] text-[#a8a29e] hover:text-[#f5f5f4]"
                }`}
              >
                All Locations
              </button>
              {locations
                .filter((l) => l.holds_stock)
                .map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLocFilter(l.code)}
                    className={`rounded-lg border px-2.5 py-1 font-mono caption-4 cursor-pointer transition-colors duration-200 ${
                      locFilter === l.code
                        ? "border-[#10b981] bg-[#10b981]/15 text-[#34d399]"
                        : "border-[#313131] bg-[#1f1f1f] text-[#a8a29e] hover:text-[#f5f5f4]"
                    }`}
                  >
                    {l.code}
                  </button>
                ))}
            </div>
          </CardHeader>

          <CardContent>
            {tab === "batches" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#272727] caption-4 text-[#78716c]">
                      <th className="py-2 pr-3">Location</th>
                      <th className="py-2 pr-3">Product</th>
                      <th className="py-2 pr-3">Batch</th>
                      <th className="py-2 pr-3">Expiry</th>
                      <th className="py-2 pr-3 text-right">Sellable</th>
                      <th className="py-2 pr-3 text-right">Unit Cost</th>
                      <th className="py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBatches.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center body-6 text-[#78716c]">
                          <Package size={24} className="mx-auto mb-2 text-[#44403c]" />
                          No batches match your current filter.
                        </td>
                      </tr>
                    ) : (
                      filteredBatches.map((b) => {
                        const loc = locMap.get(b.location_id);
                        const prod = productMap.get(b.product_id);
                        const days = daysUntil(b.expiry_date);
                        return (
                          <tr
                            key={b.id}
                            className="border-b border-[#272727]/60 hover:bg-[#1f1f1f]"
                          >
                            <td className="py-2.5 pr-3 font-mono caption-3 text-[#10b981]">
                              {loc?.code ?? b.location_id}
                            </td>
                            <td className="py-2.5 pr-3">
                              <p className="body-5 text-[#f5f5f4]">{prod?.name ?? `#${b.product_id}`}</p>
                              <p className="font-mono caption-5 text-[#78716c]">{prod?.sku}</p>
                            </td>
                            <td className="py-2.5 pr-3 font-mono caption-3 text-[#d6d3d1]">
                              {b.batch_number}
                            </td>
                            <td className="py-2.5 pr-3">
                              <p className="font-mono caption-4 text-[#f5f5f4]">{b.expiry_date}</p>
                              <p
                                className={`caption-5 ${
                                  days <= 0
                                    ? "text-[#fb7185]"
                                    : days <= 45
                                      ? "text-[#fbbf24]"
                                      : "text-[#78716c]"
                                }`}
                              >
                                {days <= 0 ? "Expired" : `${days} days left`}
                              </p>
                            </td>
                            <td className="py-2.5 pr-3 text-right font-mono body-5 text-[#f5f5f4]">
                              {formatNumber(b.sellable_quantity)} / {formatNumber(b.current_quantity)}
                            </td>
                            <td className="py-2.5 pr-3 text-right font-mono body-6 text-[#a8a29e]">
                              {formatCurrency(b.purchase_cost)}
                            </td>
                            <td className="py-2.5 text-right">
                              <Badge
                                variant={
                                  b.status === "available"
                                    ? "emerald"
                                    : b.status === "expired"
                                      ? "rose"
                                      : "amber"
                                }
                              >
                                {b.status}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#272727] caption-4 text-[#78716c]">
                      <th className="py-2 pr-3">Time</th>
                      <th className="py-2 pr-3">Location</th>
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">Product</th>
                      <th className="py-2 pr-3">Reference</th>
                      <th className="py-2 pr-3 text-right">Delta</th>
                      <th className="py-2 text-right">Balance After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => {
                      const loc = locMap.get(m.location_id);
                      const prod = productMap.get(m.product_id);
                      return (
                        <tr
                          key={m.id}
                          className="border-b border-[#272727]/60 hover:bg-[#1f1f1f]"
                        >
                          <td className="py-2.5 pr-3 font-mono caption-5 text-[#a8a29e]">
                            {formatTimeAgo(m.created_at)}
                          </td>
                          <td className="py-2.5 pr-3 font-mono caption-3 text-[#10b981]">
                            {loc?.code ?? m.location_id}
                          </td>
                          <td className="py-2.5 pr-3">
                            <Badge
                              variant={
                                m.quantity_change > 0 ? "cyan" : "neutral"
                              }
                            >
                              {m.movement_type.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="py-2.5 pr-3 body-5 text-[#f5f5f4]">
                            {prod?.name ?? `#${m.product_id}`}
                          </td>
                          <td className="py-2.5 pr-3 font-mono caption-5 text-[#a8a29e]">
                            {m.reference_id ?? "N/A"}
                          </td>
                          <td
                            className={`py-2.5 pr-3 text-right font-mono body-5 ${
                              m.quantity_change > 0 ? "text-[#10b981]" : "text-[#fb7185]"
                            }`}
                          >
                            {m.quantity_change > 0 ? "+" : ""}
                            {formatNumber(m.quantity_change)}
                          </td>
                          <td className="py-2.5 text-right font-mono body-6 text-[#f5f5f4]">
                            {formatNumber(m.balance_after)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

