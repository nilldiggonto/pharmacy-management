"use client";

import React, { useMemo } from "react";
import { ArrowsLeftRight, PaperPlaneTilt, Warning } from "@phosphor-icons/react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/context/app-context";
import { formatTimeAgo } from "@/lib/utils";

export default function TransfersPage() {
  const { transfers, locations, products, triggerTransferDispatch } = useApp();

  const locMap = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);
  const prodMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="heading-5 text-[#f5f5f4]">Inter Location Stock Transfers</h1>
          <p className="body-6 text-[#a8a29e]">
            Dispatching a transfer deducts FEFO source batches into in transit stock and animates on the 3D isometric map.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {transfers.map((trf) => {
            const from = locMap.get(trf.from_location_id);
            const to = locMap.get(trf.to_location_id);
            return (
              <Card key={trf.id} className="flex flex-col justify-between">
                <CardHeader>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono caption-3 text-[#10b981]">{trf.transfer_number}</span>
                      <Badge
                        variant={
                          trf.status === "in_transit"
                            ? "cyan"
                            : trf.status === "under_investigation"
                              ? "rose"
                              : trf.status === "approved"
                                ? "amber"
                                : "emerald"
                        }
                        pulse={trf.status === "in_transit"}
                      >
                        {trf.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <CardTitle className="mt-1 flex items-center gap-2">
                      <span className="font-mono">{from?.code ?? "CW-01"}</span>
                      <ArrowsLeftRight size={14} className="text-[#78716c]" />
                      <span className="font-mono">{to?.code ?? "BR-01"}</span>
                    </CardTitle>
                  </div>
                  <span className="caption-5 text-[#78716c]">{formatTimeAgo(trf.created_at)}</span>
                </CardHeader>

                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    {trf.items.map((item) => {
                      const prod = prodMap.get(item.product_id);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-lg border border-[#272727] bg-[#1f1f1f] px-3 py-2"
                        >
                          <span className="body-6 text-[#f5f5f4]">
                            {prod?.name ?? `Product #${item.product_id}`}
                          </span>
                          <span className="font-mono caption-3 text-[#10b981]">
                            {item.requested_quantity} units
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {trf.discrepancy_notes && (
                    <div className="flex items-start gap-2 rounded-lg border border-[#f43f5e]/40 bg-[#f43f5e]/10 p-2.5 caption-4 text-[#fb7185]">
                      <Warning size={15} weight="fill" className="shrink-0 mt-0.5" />
                      <span>{trf.discrepancy_notes}</span>
                    </div>
                  )}

                  {trf.status === "approved" && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => void triggerTransferDispatch(trf.id)}
                      className="w-full"
                    >
                      <PaperPlaneTilt size={15} weight="bold" />
                      <span>Dispatch Stock via FEFO</span>
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

