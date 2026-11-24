"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowsLeftRight,
  CheckCircle,
  Package,
  PaperPlaneTilt,
  Plus,
  Warning,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useApp } from "@/context/app-context";
import type { Transfer } from "@/types/api";
import { formatTimeAgo } from "@/lib/utils";

export default function TransfersPage() {
  const {
    user,
    transfers,
    locations,
    products,
    requestRestockTransfer,
    approveTransferRequest,
    triggerTransferDispatch,
    receiveTransferShipment,
  } = useApp();

  const stockLocations = useMemo(() => locations.filter((l) => l.holds_stock), [locations]);
  const hubLoc = useMemo(
    () => stockLocations.find((l) => l.code === "WH-01") ?? stockLocations[0],
    [stockLocations]
  );
  const firstBranch = useMemo(
    () => stockLocations.find((l) => l.location_type === "branch") ?? stockLocations[1],
    [stockLocations]
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [fromId, setFromId] = useState<number>(hubLoc?.id ?? 2);
  const [toId, setToId] = useState<number>(firstBranch?.id ?? 3);
  const [productId, setProductId] = useState<number>(products[0]?.id ?? 1);
  const [qty, setQty] = useState("40");
  const [reason, setReason] = useState("Branch replenishment from Uttara Main Hub");

  const [receiveTarget, setReceiveTarget] = useState<Transfer | null>(null);
  const [receivedMap, setReceivedMap] = useState<Record<number, string>>({});
  const [discrepancyNotes, setDiscrepancyNotes] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const locMap = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);
  const prodMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const canApprove = user && ["owner", "head_office_manager"].includes(user.role);
  const canDispatchOrReceive =
    user &&
    ["owner", "head_office_manager", "inventory_officer", "branch_manager", "pharmacist"].includes(
      user.role
    );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await requestRestockTransfer({
        fromLocationId: fromId,
        toLocationId: toId,
        reason,
        items: [{ productId, quantity: Math.max(1, Number(qty)) }],
      });
      setCreateOpen(false);
      setFeedback("New transfer request submitted and broadcast in real time.");
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Failed to create transfer");
    }
  };

  const openReceiveModal = (trf: Transfer) => {
    const init: Record<number, string> = {};
    trf.items.forEach((it) => {
      init[it.id] = String(it.dispatched_quantity || it.requested_quantity);
    });
    setReceivedMap(init);
    setDiscrepancyNotes("");
    setReceiveTarget(trf);
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveTarget) return;
    try {
      await receiveTransferShipment(receiveTarget.id, {
        discrepancyNotes: discrepancyNotes.trim() || undefined,
        items: receiveTarget.items.map((it) => ({
          transferItemId: it.id,
          receivedQuantity: Math.max(0, Number(receivedMap[it.id] ?? 0)),
        })),
      });
      setReceiveTarget(null);
      setFeedback(`Shipment ${receiveTarget.transfer_number} receipt confirmed and branch stock updated.`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Failed to receive transfer");
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="heading-5 text-[#1C1917]">Uttara Main Hub & Branch Stock Transfers</h1>
            <p className="body-6 text-[#57534E]">
              1. Branch requests stock → 2. Head Office approves → 3. Uttara Hub dispatches via FEFO → 4. Branch confirms receipt in real time.
            </p>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="primary">
                <Plus size={16} weight="bold" />
                <span>Request Stock Transfer</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Request Stock from Uttara Main Hub</DialogTitle>
              <DialogDescription>
                Create a live transfer request from Uttara Main Hub (or another branch with surplus) to a branch.
              </DialogDescription>
              <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="caption-4 font-medium text-[#1C1917] block mb-1">From Source</label>
                    <select
                      value={fromId}
                      onChange={(e) => setFromId(Number(e.target.value))}
                      className="h-9 w-full rounded-lg border border-[#DDD2C2] bg-[#FFFFFF] px-2.5 body-6 text-[#1C1917]"
                    >
                      {stockLocations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.code} · {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="caption-4 font-medium text-[#1C1917] block mb-1">To Destination</label>
                    <select
                      value={toId}
                      onChange={(e) => setToId(Number(e.target.value))}
                      className="h-9 w-full rounded-lg border border-[#DDD2C2] bg-[#FFFFFF] px-2.5 body-6 text-[#1C1917]"
                    >
                      {stockLocations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.code} · {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="caption-4 font-medium text-[#1C1917] block mb-1">Medicine / Supply</label>
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
                  <label className="caption-4 font-medium text-[#1C1917] block mb-1">Reason</label>
                  <Input required value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>
                <div className="mt-2 flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary">
                    Submit Request
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
          {transfers.map((trf) => {
            const from = locMap.get(trf.from_location_id);
            const to = locMap.get(trf.to_location_id);
            const isSubmitted = trf.status === "submitted" || trf.status === "requested";
            const isApproved = trf.status === "approved";
            const isDispatched = trf.status === "dispatched" || trf.status === "in_transit";
            return (
              <Card key={trf.id} className="flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono caption-3 font-semibold text-[#B91C1C]">
                        {trf.transfer_number}
                      </span>
                      <Badge
                        variant={
                          isDispatched
                            ? "cyan"
                            : trf.status === "under_investigation"
                              ? "crimson"
                              : isSubmitted || isApproved
                                ? "amber"
                                : "emerald"
                        }
                        pulse={isDispatched}
                      >
                        {trf.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <CardTitle className="mt-1.5 flex items-center gap-2 text-base">
                      <span>{from?.code ?? "WH-01"}</span>
                      <ArrowsLeftRight size={14} className="text-[#B91C1C]" />
                      <span>{to?.code ?? "BR-01"}</span>
                    </CardTitle>
                    <p className="caption-5 text-[#57534E]">
                      {from?.name ?? "Uttara Hub"} → {to?.name ?? "Branch"}
                    </p>
                  </div>
                  <span className="caption-5 text-[#78716C] shrink-0">{formatTimeAgo(trf.created_at)}</span>
                </CardHeader>

                <CardContent className="flex flex-col gap-3">
                  {trf.reason && <p className="caption-4 text-[#57534E]">{trf.reason}</p>}

                  <div className="flex flex-col gap-1.5">
                    {trf.items.map((item) => {
                      const prod = prodMap.get(item.product_id);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-xl border border-[#EAE2D6] bg-[#FAF6F0] px-3 py-2"
                        >
                          <span className="body-6 font-medium text-[#1C1917]">
                            {prod?.name ?? `Product #${item.product_id}`}
                          </span>
                          <div className="text-right font-mono caption-4">
                            <span className="text-[#1C1917] font-semibold">
                              {item.dispatched_quantity || item.requested_quantity} units
                            </span>
                            {item.shortage_quantity > 0 && (
                              <span className="block text-[#B91C1C]">
                                -{item.shortage_quantity} short
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {trf.discrepancy_notes && (
                    <div className="flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-2.5 caption-4 text-[#991B1B]">
                      <Warning size={15} weight="fill" className="shrink-0 mt-0.5" />
                      <span>{trf.discrepancy_notes}</span>
                    </div>
                  )}

                  {isSubmitted && canApprove && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        void approveTransferRequest(trf.id)
                          .then(() => setFeedback(`Approved transfer ${trf.transfer_number}.`))
                          .catch((e) => setFeedback(e instanceof Error ? e.message : "Approval failed"))
                      }
                    >
                      <CheckCircle size={15} weight="bold" />
                      <span>Approve Restock Request</span>
                    </Button>
                  )}

                  {isApproved && canDispatchOrReceive && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        void triggerTransferDispatch(trf.id)
                          .then(() =>
                            setFeedback(
                              `Dispatched ${trf.transfer_number} via FEFO. Destination branch can now confirm receipt.`
                            )
                          )
                          .catch((e) => setFeedback(e instanceof Error ? e.message : "Dispatch failed"))
                      }
                    >
                      <PaperPlaneTilt size={15} weight="bold" />
                      <span>Dispatch from Source (FEFO)</span>
                    </Button>
                  )}

                  {isDispatched && canDispatchOrReceive && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={() => openReceiveModal(trf)}
                    >
                      <Package size={15} weight="bold" />
                      <span>Confirm Branch Receipt</span>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Confirm Receipt Dialog */}
        <Dialog open={Boolean(receiveTarget)} onOpenChange={(o) => !o && setReceiveTarget(null)}>
          <DialogContent>
            <DialogTitle>Confirm Transfer Receipt</DialogTitle>
            <DialogDescription>
              Verify actual quantities received for {receiveTarget?.transfer_number}. Entering less than dispatched automatically flags a shortage investigation.
            </DialogDescription>
            <form onSubmit={handleReceive} className="mt-4 flex flex-col gap-3">
              {receiveTarget?.items.map((item) => {
                const prod = prodMap.get(item.product_id);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#E7DDD0] bg-[#FAF6F0] p-3"
                  >
                    <div>
                      <p className="body-5 font-medium text-[#1C1917]">
                        {prod?.name ?? `Product #${item.product_id}`}
                      </p>
                      <p className="caption-5 text-[#57534E]">
                        Dispatched: {item.dispatched_quantity} units
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      max={item.dispatched_quantity}
                      value={receivedMap[item.id] ?? ""}
                      onChange={(e) =>
                        setReceivedMap((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      className="w-24 text-right font-mono"
                    />
                  </div>
                );
              })}

              <div>
                <label className="caption-4 font-medium text-[#1C1917] block mb-1">
                  Discrepancy / Damage Notes (optional)
                </label>
                <Input
                  value={discrepancyNotes}
                  onChange={(e) => setDiscrepancyNotes(e.target.value)}
                  placeholder="Leave blank if all units arrived intact"
                />
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setReceiveTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Confirm & Add to Branch Stock
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
