"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowsLeftRight,
  CheckCircle,
  MagnifyingGlass,
  Package,
  Plus,
  SlidersHorizontal,
  Warning,
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
import { daysUntil, formatCurrency, formatNumber, formatTimeAgo } from "@/lib/utils";

export default function InventoryPage() {
  const {
    user,
    isGlobalRole,
    allowedLocations,
    batches,
    networkStock,
    adjustments,
    movements,
    products,
    suppliers,
    locations,
    requestRestockTransfer,
    changeBatchStatus,
    addDirectStock,
    requestStockAdjustment,
    approveStockAdjustment,
    rejectStockAdjustment,
  } = useApp();

  const allowedLocationIds = useMemo(
    () => new Set(allowedLocations.map((l) => l.id)),
    [allowedLocations]
  );

  const [tab, setTab] = useState("finder");
  const [query, setQuery] = useState("");
  const [locFilter, setLocFilter] = useState<string>("all");
  const [feedback, setFeedback] = useState<string | null>(null);

  // Restock modal state
  const [restockModal, setRestockModal] = useState<{
    productId: number;
    productName: string;
    toLocationId: number;
    toLocationName: string;
    fromLocationId: number;
  } | null>(null);
  const [restockQty, setRestockQty] = useState("50");
  const [restockReason, setRestockReason] = useState("Branch restock requested from Uttara Main Hub");

  // Adjustment modal state
  const [adjModal, setAdjModal] = useState<{
    batchId: number;
    batchNumber: string;
    productName: string;
    currentQty: number;
  } | null>(null);
  const [adjDelta, setAdjDelta] = useState("-2");
  const [adjReason, setAdjReason] = useState("Physical cycle count variance");

  // Direct Stock Entry (Stock-In) modal state
  const [stockInOpen, setStockInOpen] = useState(false);
  const [stockInLocId, setStockInLocId] = useState<number>(2);
  const [stockInProductId, setStockInProductId] = useState<number>(1);
  const [stockInBatchNo, setStockInBatchNo] = useState("UTT-IN-2026");
  const [stockInExpiry, setStockInExpiry] = useState("2027-09-30");
  const [stockInQty, setStockInQty] = useState("150");
  const [stockInNotes, setStockInNotes] = useState("Direct restock entry at Uttara Main Hub");

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const locMap = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);
  const hubLocation = useMemo(
    () =>
      locations.find((l) => l.code === "WH-01" || l.location_type === "central_warehouse") ??
      locations[0],
    [locations]
  );

  const canStockIn =
    user &&
    ["owner", "head_office_manager", "inventory_officer", "stock_entry_operator"].includes(
      user.role
    );
  const stockInLocations = useMemo(() => {
    const stockLocs = locations.filter((l) => l.holds_stock);
    if (isGlobalRole) return stockLocs;
    return allowedLocations;
  }, [locations, isGlobalRole, allowedLocations]);

  React.useEffect(() => {
    if (stockInLocations.length > 0 && !stockInLocations.some((l) => l.id === stockInLocId)) {
      const pref = stockInLocations.find((l) => l.code === "WH-01") ?? stockInLocations[0];
      setStockInLocId(pref.id);
    }
  }, [stockInLocations, stockInLocId]);

  React.useEffect(() => {
    if (products.length > 0 && !products.some((p) => p.id === stockInProductId)) {
      setStockInProductId(products[0].id);
    }
  }, [products, stockInProductId]);

  const canManageBatch =
    user &&
    ["owner", "head_office_manager", "branch_manager", "inventory_officer"].includes(user.role);
  const canRequestTransfer =
    user &&
    ["owner", "head_office_manager", "branch_manager", "pharmacist", "inventory_officer"].includes(
      user.role
    );
  const canApproveAdjustment =
    user && ["owner", "head_office_manager", "branch_manager"].includes(user.role);

  const filteredNetwork = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return networkStock;
    return networkStock.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        (item.generic_name?.toLowerCase().includes(q) ?? false) ||
        item.category.toLowerCase().includes(q)
    );
  }, [networkStock, query]);

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

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockModal) return;
    try {
      await requestRestockTransfer({
        fromLocationId: restockModal.fromLocationId,
        toLocationId: restockModal.toLocationId,
        reason: restockReason,
        items: [{ productId: restockModal.productId, quantity: Math.max(1, Number(restockQty)) }],
      });
      setFeedback(
        `Restock request sent to Uttara Main Hub for ${restockQty} units of ${restockModal.productName} (${restockModal.toLocationName}).`
      );
      setRestockModal(null);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Could not submit restock request.");
    }
  };

  const handleAdjSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjModal) return;
    try {
      await requestStockAdjustment({
        batchId: adjModal.batchId,
        quantityChange: Number(adjDelta),
        reason: adjReason,
      });
      setFeedback(`Adjustment submitted for batch ${adjModal.batchNumber} (awaiting approval).`);
      setAdjModal(null);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Could not submit adjustment.");
    }
  };

  const handleStockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = productMap.get(stockInProductId);
    try {
      await addDirectStock({
        locationId: stockInLocId,
        productId: stockInProductId,
        batchNumber: stockInBatchNo.trim(),
        expiryDate: stockInExpiry,
        quantity: Math.max(1, Number(stockInQty)),
        purchaseCost: prod ? Number(prod.purchase_cost) : undefined,
        supplierId: suppliers[0]?.id ?? null,
        notes: stockInNotes,
      });
      setStockInOpen(false);
      setFeedback(
        `Added +${stockInQty} units of ${prod?.name ?? "product"} (Batch ${stockInBatchNo}) into ${locMap.get(stockInLocId)?.name ?? "Uttara Main Hub"}!`
      );
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Could not add stock.");
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="heading-5 text-[#1C1917]">Network Stock Finder & Batch Inventory</h1>
            <p className="body-6 text-[#57534E]">
              Check where any medicine or supply is available across Uttara Main Hub and all 7 Dhaka branches, or enter new hub stock.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canStockIn && (
              <Button
                variant="primary"
                onClick={() => {
                  setStockInBatchNo(`UTT-IN-${Math.floor(1000 + Math.random() * 8999)}`);
                  setStockInOpen(true);
                }}
              >
                <Plus size={16} weight="bold" />
                <span>Add / Restock Hub Stock</span>
              </Button>
            )}
            <SlidingTabs
              layoutId="inventory-tabs"
              value={tab}
              onChange={setTab}
              options={[
                { id: "finder", label: "Network Stock Finder", count: networkStock.length },
                { id: "batches", label: "FEFO Batches", count: batches.length },
                { id: "adjustments", label: "Adjustments", count: adjustments.length },
                { id: "movements", label: "Stock Ledger", count: movements.length },
              ]}
            />
          </div>
        </div>

        {feedback && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3 caption-4 text-[#047857]">
            <span>{feedback}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="font-semibold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <Card>
          <CardHeader className="flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <MagnifyingGlass
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#78716C]"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search medicine name, generic, SKU, or batch..."
                className="pl-9"
              />
            </div>

            {tab === "batches" && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setLocFilter("all")}
                  className={`rounded-lg border px-2.5 py-1 caption-4 cursor-pointer transition-colors ${
                    locFilter === "all"
                      ? "border-[#B91C1C] bg-[#FEF2F2] text-[#991B1B] font-semibold"
                      : "border-[#E7DDD0] bg-[#FAF6F0] text-[#57534E] hover:text-[#1C1917]"
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
                      className={`rounded-lg border px-2.5 py-1 font-mono caption-4 cursor-pointer transition-colors ${
                        locFilter === l.code
                          ? "border-[#B91C1C] bg-[#FEF2F2] text-[#991B1B] font-semibold"
                          : "border-[#E7DDD0] bg-[#FAF6F0] text-[#57534E] hover:text-[#1C1917]"
                      }`}
                    >
                      {l.code}
                    </button>
                  ))}
              </div>
            )}
          </CardHeader>

          <CardContent>
            {tab === "finder" && (
              <div className="flex flex-col gap-3">
                {filteredNetwork.length === 0 ? (
                  <div className="py-12 text-center body-6 text-[#78716C]">
                    <Package size={28} className="mx-auto mb-2 text-[#B91C1C]/40" />
                    No matching medicines found in the network.
                  </div>
                ) : (
                  filteredNetwork.map((item) => {
                    const hubEntry = item.locations.find(
                      (l) => l.location_code === "WH-01" || l.location_type === "central_warehouse"
                    );
                    return (
                      <div
                        key={item.product_id}
                        className="rounded-2xl border border-[#E7DDD0] bg-[#FAF6F0]/60 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[#EAE2D6]">
                          <div className="flex items-start gap-3">
                            <MedicineVisual
                              sku={item.sku}
                              name={item.name}
                              category={item.category}
                              requiresPrescription={item.requires_prescription}
                              size="md"
                            />
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono caption-3 font-semibold text-[#B91C1C]">
                                  {item.sku}
                                </span>
                                <Badge variant={item.requires_prescription ? "amber" : "emerald"}>
                                  {item.requires_prescription ? "Rx Only" : "OTC"}
                                </Badge>
                                <Badge variant="neutral">{item.category}</Badge>
                              </div>
                              <h3 className="mt-1 title-3 text-[#1C1917]">{item.name}</h3>
                              <p className="caption-5 text-[#57534E]">
                                {item.generic_name} · Retail {formatCurrency(item.retail_price)} · Wholesale{" "}
                                {formatCurrency(item.wholesale_price)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="caption-5 text-[#78716C]">Total Network Stock</p>
                            <p className="font-mono heading-6 text-[#1C1917]">
                              {formatNumber(item.total_available)} units
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          {item.locations.map((loc) => {
                            const isHub = loc.location_code === "WH-01" || loc.location_type === "central_warehouse";
                            const isOut = loc.available_quantity === 0;
                            const isLow = loc.available_quantity > 0 && loc.available_quantity < item.min_stock_level;
                            const canActOnBranch = isGlobalRole || allowedLocationIds.has(loc.location_id);
                            return (
                              <div
                                key={loc.location_id}
                                className={`flex flex-col justify-between gap-2 rounded-xl border p-3 ${
                                  isHub
                                    ? "border-[#FECACA] bg-[#FEF2F2]/60"
                                    : isOut
                                      ? "border-[#FECACA] bg-[#FFFDF9]"
                                      : "border-[#E7DDD0] bg-[#FFFDF9]"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <span className="font-mono caption-5 font-semibold text-[#991B1B]">
                                      {loc.location_code}{" "}
                                      {isHub ? "(MAIN HUB)" : !isGlobalRole && canActOnBranch ? "(MY BRANCH)" : ""}
                                    </span>
                                    <p className="truncate caption-4 font-medium text-[#1C1917]">
                                      {loc.location_name}
                                    </p>
                                  </div>
                                  <Badge
                                    variant={isOut ? "crimson" : isLow ? "amber" : "emerald"}
                                  >
                                    {isOut ? "Out" : `${loc.available_quantity}`}
                                  </Badge>
                                </div>

                                {!isHub && (isOut || isLow) && canRequestTransfer && canActOnBranch && hubLocation && (hubEntry?.available_quantity ?? 0) > 0 && (
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    className="w-full mt-1"
                                    onClick={() => {
                                      setRestockQty(String(Math.max(20, item.min_stock_level)));
                                      setRestockReason(
                                        `${loc.location_name} ${isOut ? "out of stock" : "low stock"} on ${item.name}; requesting from Uttara Main Hub`
                                      );
                                      setRestockModal({
                                        productId: item.product_id,
                                        productName: item.name,
                                        toLocationId: loc.location_id,
                                        toLocationName: loc.location_name,
                                        fromLocationId: hubLocation.id,
                                      });
                                    }}
                                  >
                                    <ArrowsLeftRight size={13} weight="bold" />
                                    <span>Request for {loc.location_code}</span>
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {tab === "batches" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E7DDD0] caption-4 text-[#78716C]">
                      <th className="py-2 pr-3">Location</th>
                      <th className="py-2 pr-3">Product</th>
                      <th className="py-2 pr-3">Batch</th>
                      <th className="py-2 pr-3">Expiry</th>
                      <th className="py-2 pr-3 text-right">Sellable / Total</th>
                      <th className="py-2 pr-3 text-right">Status</th>
                      {canManageBatch && <th className="py-2 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBatches.map((b) => {
                      const loc = locMap.get(b.location_id);
                      const prod = productMap.get(b.product_id);
                      const days = daysUntil(b.expiry_date);
                      return (
                        <tr key={b.id} className="border-b border-[#EFE7DB] hover:bg-[#FAF6F0]">
                          <td className="py-2.5 pr-3 font-mono caption-3 font-semibold text-[#B91C1C]">
                            {loc?.code ?? b.location_id}
                          </td>
                          <td className="py-2.5 pr-3">
                            <p className="body-5 font-medium text-[#1C1917]">{prod?.name ?? `#${b.product_id}`}</p>
                            <p className="font-mono caption-5 text-[#78716C]">{prod?.sku}</p>
                          </td>
                          <td className="py-2.5 pr-3 font-mono caption-3 text-[#44403C]">
                            {b.batch_number}
                          </td>
                          <td className="py-2.5 pr-3">
                            <p className="font-mono caption-4 text-[#1C1917]">{b.expiry_date}</p>
                            <p
                              className={`caption-5 ${
                                days <= 0
                                  ? "text-[#B91C1C] font-semibold"
                                  : days <= 45
                                    ? "text-[#B45309] font-medium"
                                    : "text-[#78716C]"
                              }`}
                            >
                              {days <= 0 ? "Expired (Blocked)" : `${days} days left`}
                            </p>
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono body-5 text-[#1C1917]">
                            {formatNumber(b.sellable_quantity)} / {formatNumber(b.current_quantity)}
                          </td>
                          <td className="py-2.5 pr-3 text-right">
                            <Badge
                              variant={
                                b.status === "available"
                                  ? "emerald"
                                  : b.status === "expired" || b.status === "damaged"
                                    ? "crimson"
                                    : "amber"
                              }
                            >
                              {b.status}
                            </Badge>
                          </td>
                          {canManageBatch && (
                            <td className="py-2.5 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setAdjModal({
                                      batchId: b.id,
                                      batchNumber: b.batch_number,
                                      productName: prod?.name ?? `#${b.product_id}`,
                                      currentQty: b.current_quantity,
                                    })
                                  }
                                >
                                  <SlidersHorizontal size={13} />
                                  <span>Adjust</span>
                                </Button>
                                {b.status === "available" && (
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() =>
                                      void changeBatchStatus(
                                        b.id,
                                        "quarantined",
                                        "Quarantined by staff for quality inspection"
                                      ).then(() =>
                                        setFeedback(`Batch ${b.batch_number} moved to quarantine.`)
                                      )
                                    }
                                  >
                                    <Warning size={13} />
                                    <span>Quarantine</span>
                                  </Button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "adjustments" && (
              <div className="flex flex-col gap-2.5">
                {adjustments.length === 0 ? (
                  <p className="py-10 text-center body-6 text-[#78716C]">No stock adjustments recorded yet.</p>
                ) : (
                  adjustments.map((adj) => {
                    const loc = locMap.get(adj.location_id);
                    const prod = productMap.get(adj.product_id);
                    return (
                      <div
                        key={adj.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E7DDD0] bg-[#FAF6F0]/70 p-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono caption-3 font-semibold text-[#B91C1C]">
                              {loc?.code ?? `Loc #${adj.location_id}`}
                            </span>
                            <Badge
                              variant={
                                adj.status === "approved"
                                  ? "emerald"
                                  : adj.status === "rejected"
                                    ? "crimson"
                                    : "amber"
                              }
                            >
                              {adj.status}
                            </Badge>
                            <span className="font-mono caption-3 font-semibold text-[#1C1917]">
                              {adj.quantity_change > 0 ? "+" : ""}
                              {adj.quantity_change} units
                            </span>
                          </div>
                          <p className="mt-1 body-5 font-medium text-[#1C1917]">
                            {prod?.name ?? `Product #${adj.product_id}`}
                          </p>
                          <p className="caption-5 text-[#57534E]">{adj.reason}</p>
                        </div>

                        {adj.status === "pending" && canApproveAdjustment && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() =>
                                void approveStockAdjustment(adj.id)
                                  .then(() => setFeedback(`Adjustment #${adj.id} approved and ledger updated.`))
                                  .catch((e) => setFeedback(e instanceof Error ? e.message : "Approval failed"))
                              }
                            >
                              <CheckCircle size={14} weight="bold" />
                              <span>Approve</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() =>
                                void rejectStockAdjustment(adj.id).then(() =>
                                  setFeedback(`Adjustment #${adj.id} rejected.`)
                                )
                              }
                            >
                              <XCircle size={14} />
                              <span>Reject</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {tab === "movements" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E7DDD0] caption-4 text-[#78716C]">
                      <th className="py-2 pr-3">Time</th>
                      <th className="py-2 pr-3">Location</th>
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">Product</th>
                      <th className="py-2 pr-3">Reason</th>
                      <th className="py-2 pr-3 text-right">Change</th>
                      <th className="py-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => {
                      const loc = locMap.get(m.location_id);
                      const prod = productMap.get(m.product_id);
                      return (
                        <tr key={m.id} className="border-b border-[#EFE7DB] hover:bg-[#FAF6F0]">
                          <td className="py-2.5 pr-3 font-mono caption-5 text-[#78716C]">
                            {formatTimeAgo(m.created_at)}
                          </td>
                          <td className="py-2.5 pr-3 font-mono caption-3 font-semibold text-[#B91C1C]">
                            {loc?.code ?? m.location_id}
                          </td>
                          <td className="py-2.5 pr-3">
                            <Badge variant={m.quantity_change > 0 ? "emerald" : "crimson"}>
                              {m.movement_type.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="py-2.5 pr-3 body-5 text-[#1C1917]">
                            {prod?.name ?? `#${m.product_id}`}
                          </td>
                          <td className="py-2.5 pr-3 caption-5 text-[#57534E] max-w-xs truncate">
                            {m.reason ?? m.reference_id ?? "System entry"}
                          </td>
                          <td
                            className={`py-2.5 pr-3 text-right font-mono body-5 font-semibold ${
                              m.quantity_change > 0 ? "text-[#047857]" : "text-[#B91C1C]"
                            }`}
                          >
                            {m.quantity_change > 0 ? "+" : ""}
                            {formatNumber(m.quantity_change)}
                          </td>
                          <td className="py-2.5 text-right font-mono body-6 text-[#1C1917]">
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

        {/* Quick Restock from Uttara Hub Dialog */}
        <Dialog open={Boolean(restockModal)} onOpenChange={(o) => !o && setRestockModal(null)}>
          <DialogContent>
            <DialogTitle>Request Stock from Uttara Main Hub</DialogTitle>
            <DialogDescription>
              Submit a real-time restock transfer for {restockModal?.productName} to {restockModal?.toLocationName}.
            </DialogDescription>
            <form onSubmit={handleRestockSubmit} className="mt-4 flex flex-col gap-3">
              <div>
                <label className="caption-4 font-medium text-[#1C1917] block mb-1">
                  Quantity to Request
                </label>
                <Input
                  type="number"
                  min={1}
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                />
              </div>
              <div>
                <label className="caption-4 font-medium text-[#1C1917] block mb-1">Reason / Note</label>
                <Input
                  required
                  value={restockReason}
                  onChange={(e) => setRestockReason(e.target.value)}
                />
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setRestockModal(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Submit Restock Request
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Direct Stock Entry / Restock Dialog */}
        <Dialog open={stockInOpen} onOpenChange={setStockInOpen}>
          <DialogContent>
            <DialogTitle>Add / Restock Stock into Database</DialogTitle>
            <DialogDescription>
              Check current Uttara Main Hub stock and enter incoming medicine or supply batches directly into live inventory.
            </DialogDescription>
            <form onSubmit={handleStockInSubmit} className="mt-4 flex flex-col gap-3">
              <div>
                <label className="caption-4 font-medium text-[#1C1917] block mb-1">
                  Target Location {!isGlobalRole ? "(Assigned Hub)" : ""}
                </label>
                <select
                  value={stockInLocId}
                  onChange={(e) => setStockInLocId(Number(e.target.value))}
                  className="h-9 w-full rounded-lg border border-[#DDD2C2] bg-[#FFFFFF] px-2.5 body-6 text-[#1C1917]"
                >
                  {stockInLocations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.code} · {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="caption-4 font-medium text-[#1C1917] block mb-1">
                  Medicine / Supply
                </label>
                <select
                  value={stockInProductId}
                  onChange={(e) => setStockInProductId(Number(e.target.value))}
                  className="h-9 w-full rounded-lg border border-[#DDD2C2] bg-[#FFFFFF] px-2.5 body-6 text-[#1C1917]"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} · {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="caption-4 font-medium text-[#1C1917] block mb-1">
                    Batch #
                  </label>
                  <Input
                    required
                    value={stockInBatchNo}
                    onChange={(e) => setStockInBatchNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="caption-4 font-medium text-[#1C1917] block mb-1">
                    Expiry Date
                  </label>
                  <Input
                    type="date"
                    required
                    value={stockInExpiry}
                    onChange={(e) => setStockInExpiry(e.target.value)}
                  />
                </div>
                <div>
                  <label className="caption-4 font-medium text-[#1C1917] block mb-1">
                    Quantity
                  </label>
                  <Input
                    type="number"
                    min={1}
                    required
                    value={stockInQty}
                    onChange={(e) => setStockInQty(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="caption-4 font-medium text-[#1C1917] block mb-1">
                  Entry Note / Reference
                </label>
                <Input
                  value={stockInNotes}
                  onChange={(e) => setStockInNotes(e.target.value)}
                  placeholder="Supplier delivery or warehouse restock"
                />
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setStockInOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save Stock to Database
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Stock Adjustment Dialog */}
        <Dialog open={Boolean(adjModal)} onOpenChange={(o) => !o && setAdjModal(null)}>
          <DialogContent>
            <DialogTitle>Request Stock Adjustment</DialogTitle>
            <DialogDescription>
              Batch {adjModal?.batchNumber} ({adjModal?.productName}) currently has {adjModal?.currentQty} units.
            </DialogDescription>
            <form onSubmit={handleAdjSubmit} className="mt-4 flex flex-col gap-3">
              <div>
                <label className="caption-4 font-medium text-[#1C1917] block mb-1">
                  Quantity Delta (negative to deduct, positive to add)
                </label>
                <Input
                  type="number"
                  required
                  value={adjDelta}
                  onChange={(e) => setAdjDelta(e.target.value)}
                />
              </div>
              <div>
                <label className="caption-4 font-medium text-[#1C1917] block mb-1">Audit Reason</label>
                <Input
                  required
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                />
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setAdjModal(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Submit for Approval
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
