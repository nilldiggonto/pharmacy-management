"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle, Package, Plus, Truck } from "@phosphor-icons/react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useApp } from "@/context/app-context";
import type { PurchaseOrder } from "@/types/api";
import { formatCurrency, formatShortDate } from "@/lib/utils";

export default function PurchasingPage() {
  const {
    user,
    purchaseOrders,
    suppliers,
    locations,
    products,
    createNewPurchaseOrder,
    approveOrder,
    receivePurchaseOrderGoods,
  } = useApp();

  const supplierMap = useMemo(() => new Map(suppliers.map((s) => [s.id, s])), [suppliers]);
  const locMap = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);
  const prodMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const hubLoc = useMemo(
    () => locations.find((l) => l.code === "WH-01") ?? locations.find((l) => l.holds_stock),
    [locations]
  );

  const canCreatePO =
    user && ["owner", "head_office_manager", "procurement_officer"].includes(user.role);
  const canApprovePO = user && ["owner", "head_office_manager"].includes(user.role);
  const canReceivePO =
    user &&
    [
      "owner",
      "head_office_manager",
      "inventory_officer",
      "stock_entry_operator",
      "branch_manager",
    ].includes(user.role);

  const [createOpen, setCreateOpen] = useState(false);
  const [supplierId, setSupplierId] = useState<number>(suppliers[0]?.id ?? 1);
  const [productId, setProductId] = useState<number>(products[0]?.id ?? 1);
  const [qty, setQty] = useState("200");
  const [notes, setNotes] = useState("Replenishment order for Uttara Main Hub");
  const [feedback, setFeedback] = useState<string | null>(null);

  // Goods Receipt modal
  const [grnTarget, setGrnTarget] = useState<PurchaseOrder | null>(null);
  const [invoiceNo, setInvoiceNo] = useState("SUP-INV-2026-99");
  const [batchNo, setBatchNo] = useState(`UTT-GRN-${Math.floor(1000 + Math.random() * 8999)}`);
  const [expiryDate, setExpiryDate] = useState("2027-08-30");
  const [damagedQty, setDamagedQty] = useState("0");

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = prodMap.get(productId);
    if (!hubLoc || !prod) return;
    try {
      await createNewPurchaseOrder({
        supplierId,
        destinationLocationId: hubLoc.id,
        notes,
        items: [
          {
            productId: prod.id,
            quantity: Math.max(1, Number(qty)),
            unitCost: Number(prod.purchase_cost),
          },
        ],
      });
      setCreateOpen(false);
      setFeedback("Purchase order created and sent for Head Office approval.");
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Failed to create purchase order.");
    }
  };

  const handleReceiveGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grnTarget) return;
    try {
      const pendingItems = grnTarget.items.filter(
        (it) => it.quantity_ordered - it.quantity_received > 0
      );
      await receivePurchaseOrderGoods(grnTarget.id, {
        supplierInvoiceNumber: invoiceNo,
        notes: "Received at Uttara Main Hub dock",
        items: pendingItems.map((it, idx) => ({
          poItemId: it.id,
          batchNumber: `${batchNo}-${idx + 1}`,
          expiryDate,
          quantityReceived: it.quantity_ordered - it.quantity_received,
          damagedQuantity: idx === 0 ? Math.max(0, Number(damagedQty)) : 0,
        })),
      });
      setGrnTarget(null);
      setFeedback(
        `Goods received for ${grnTarget.po_number}! New FEFO batches are now live in Uttara Main Hub.`
      );
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Goods receipt failed.");
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="heading-5 text-[#1C1917]">Supplier Purchasing & Goods Receiving</h1>
            <p className="body-6 text-[#57534E]">
              Purchase orders restock Uttara Main Hub. Stock only increases after verified Goods Receipt (GRN) with batch & expiry.
            </p>
          </div>

          {canCreatePO && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="primary">
                  <Plus size={16} weight="bold" />
                  <span>New Purchase Order</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>Create Supplier Purchase Order</DialogTitle>
                <DialogDescription>
                  Order stock from an approved pharmaceutical manufacturer into Uttara Main Hub (WH-01).
                </DialogDescription>
                <form onSubmit={handleCreatePO} className="mt-4 flex flex-col gap-3">
                  <div>
                    <label className="caption-4 font-medium text-[#1C1917] block mb-1">Supplier</label>
                    <select
                      value={supplierId}
                      onChange={(e) => setSupplierId(Number(e.target.value))}
                      className="h-9 w-full rounded-lg border border-[#DDD2C2] bg-[#FFFFFF] px-2.5 body-6 text-[#1C1917]"
                    >
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} · {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="caption-4 font-medium text-[#1C1917] block mb-1">Product</label>
                      <select
                        value={productId}
                        onChange={(e) => setProductId(Number(e.target.value))}
                        className="h-9 w-full rounded-lg border border-[#DDD2C2] bg-[#FFFFFF] px-2.5 body-6 text-[#1C1917]"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} · {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="caption-4 font-medium text-[#1C1917] block mb-1">Quantity</label>
                      <Input
                        type="number"
                        min={1}
                        required
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="caption-4 font-medium text-[#1C1917] block mb-1">Order Notes</label>
                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                  <div className="mt-2 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary">
                      Submit Purchase Order
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {feedback && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3 caption-4 text-[#047857]">
            <span>{feedback}</span>
            <button type="button" onClick={() => setFeedback(null)} className="font-semibold underline cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {purchaseOrders.map((po) => {
            const sup = supplierMap.get(po.supplier_id);
            const dest = locMap.get(po.destination_location_id);
            const isPending = po.status === "submitted" || po.status === "pending_approval" || po.status === "draft";
            const isReceivable = po.status === "approved" || po.status === "partially_received";
            return (
              <Card key={po.id} className="flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono caption-3 font-semibold text-[#B91C1C]">
                        {po.po_number}
                      </span>
                      <Badge
                        variant={
                          po.status === "received"
                            ? "emerald"
                            : po.status === "approved" || po.status === "partially_received"
                              ? "cyan"
                              : isPending
                                ? "amber"
                                : "crimson"
                        }
                      >
                        {po.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <CardTitle className="mt-1.5">{sup?.name ?? `Supplier #${po.supplier_id}`}</CardTitle>
                  </div>
                  <Truck size={20} className="text-[#B91C1C]" />
                </CardHeader>

                <CardContent className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#EAE2D6] bg-[#FAF6F0] p-3">
                    <div>
                      <p className="caption-5 text-[#78716C]">Destination</p>
                      <p className="font-mono caption-3 font-semibold text-[#1C1917]">
                        {dest?.code ?? "WH-01"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="caption-5 text-[#78716C]">Order Total</p>
                      <p className="font-mono caption-3 font-semibold text-[#047857]">
                        {formatCurrency(po.total_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="caption-5 text-[#78716C]">Expected Date</p>
                      <p className="caption-4 text-[#1C1917]">{formatShortDate(po.expected_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="caption-5 text-[#78716C]">Line Items</p>
                      <p className="font-mono caption-4 text-[#1C1917]">{po.items.length} SKUs</p>
                    </div>
                  </div>

                  {po.notes && <p className="caption-5 text-[#57534E]">{po.notes}</p>}

                  {isPending && canApprovePO && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        void approveOrder(po.id)
                          .then(() => setFeedback(`Purchase Order ${po.po_number} approved for receiving.`))
                          .catch((e) => setFeedback(e instanceof Error ? e.message : "Approval failed"))
                      }
                      className="w-full"
                    >
                      <CheckCircle size={15} weight="bold" />
                      <span>Approve Purchase Order</span>
                    </Button>
                  )}

                  {isReceivable && canReceivePO && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setBatchNo(`UTT-${po.id}-${Math.floor(100 + Math.random() * 899)}`);
                        setGrnTarget(po);
                      }}
                      className="w-full"
                    >
                      <Package size={15} weight="bold" />
                      <span>Receive Goods into Hub (GRN)</span>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Goods Receipt Dialog */}
        <Dialog open={Boolean(grnTarget)} onOpenChange={(o) => !o && setGrnTarget(null)}>
          <DialogContent>
            <DialogTitle>Receive Goods ({grnTarget?.po_number})</DialogTitle>
            <DialogDescription>
              Log supplier delivery into Uttara Main Hub. Valid units become immediately available for wholesale & branch transfers; damaged units are isolated.
            </DialogDescription>
            <form onSubmit={handleReceiveGRN} className="mt-4 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="caption-4 font-medium text-[#1C1917] block mb-1">
                    Supplier Invoice #
                  </label>
                  <Input
                    required
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="caption-4 font-medium text-[#1C1917] block mb-1">
                    Batch Prefix
                  </label>
                  <Input required value={batchNo} onChange={(e) => setBatchNo(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="caption-4 font-medium text-[#1C1917] block mb-1">
                    Expiry Date
                  </label>
                  <Input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="caption-4 font-medium text-[#1C1917] block mb-1">
                    Damaged Units (if any)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={damagedQty}
                    onChange={(e) => setDamagedQty(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setGrnTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Post Goods Receipt & Add Stock
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
