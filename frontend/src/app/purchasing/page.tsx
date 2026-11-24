"use client";

import React, { useMemo } from "react";
import { CheckCircle, Truck } from "@phosphor-icons/react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/context/app-context";
import { formatCurrency, formatShortDate } from "@/lib/utils";

export default function PurchasingPage() {
  const { purchaseOrders, suppliers, locations, approveOrder } = useApp();

  const supplierMap = useMemo(() => new Map(suppliers.map((s) => [s.id, s])), [suppliers]);
  const locMap = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="heading-5 text-[#f5f5f4]">Purchasing & Goods Receiving</h1>
          <p className="body-6 text-[#a8a29e]">
            Purchase orders require manager approval and only increase stock after verified goods receipt.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {purchaseOrders.map((po) => {
            const sup = supplierMap.get(po.supplier_id);
            const dest = locMap.get(po.destination_location_id);
            return (
              <Card key={po.id} className="flex flex-col justify-between">
                <CardHeader>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono caption-3 text-[#06b6d4]">{po.po_number}</span>
                      <Badge
                        variant={
                          po.status === "approved" || po.status === "received"
                            ? "emerald"
                            : po.status === "pending_approval"
                              ? "amber"
                              : "cyan"
                        }
                      >
                        {po.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <CardTitle className="mt-1">{sup?.name ?? `Supplier #${po.supplier_id}`}</CardTitle>
                  </div>
                  <Truck size={18} className="text-[#78716c]" />
                </CardHeader>

                <CardContent className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2 rounded-lg border border-[#272727] bg-[#1f1f1f] p-3">
                    <div>
                      <p className="caption-5 text-[#78716c]">Destination</p>
                      <p className="font-mono caption-3 text-[#f5f5f4]">{dest?.code ?? "CW-01"}</p>
                    </div>
                    <div className="text-right">
                      <p className="caption-5 text-[#78716c]">Order Total</p>
                      <p className="font-mono caption-3 text-[#10b981]">
                        {formatCurrency(po.total_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="caption-5 text-[#78716c]">Expected Delivery</p>
                      <p className="caption-4 text-[#d6d3d1]">{formatShortDate(po.expected_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="caption-5 text-[#78716c]">Line Items</p>
                      <p className="font-mono caption-4 text-[#d6d3d1]">{po.items.length} SKUs</p>
                    </div>
                  </div>

                  {po.notes && <p className="caption-5 text-[#a8a29e]">{po.notes}</p>}

                  {po.status === "pending_approval" && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => void approveOrder(po.id)}
                      className="w-full"
                    >
                      <CheckCircle size={15} weight="bold" />
                      <span>Approve Purchase Order</span>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

