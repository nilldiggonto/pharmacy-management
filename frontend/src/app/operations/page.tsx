"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import { useApp } from "@/context/app-context";
import { formatCurrency, formatTimeAgo } from "@/lib/utils";

export default function OperationsPage() {
  const { locations, suppliers, auditLogs } = useApp();
  const [tab, setTab] = useState("locations");

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="heading-5 text-[#1C1917]">Dhaka Branch Directory, Suppliers & Audit Trail</h1>
            <p className="body-6 text-[#57534E]">
              Overview of Uttara Main Hub, all 7 Dhaka retail branches, supplier credit balances, and immutable staff audit logs.
            </p>
          </div>
          <SlidingTabs
            layoutId="ops-tabs"
            value={tab}
            onChange={setTab}
            options={[
              { id: "locations", label: "Branches & Hub", count: locations.length },
              { id: "suppliers", label: "Suppliers", count: suppliers.length },
              { id: "audit", label: "Audit Trail", count: auditLogs.length },
            ]}
          />
        </div>

        {tab === "locations" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {locations.map((loc) => {
              const isHub = loc.code === "WH-01" || loc.location_type === "central_warehouse";
              return (
                <Card
                  key={loc.id}
                  className={`p-4 ${isHub ? "border-[#FECACA] bg-[#FEF2F2]/50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono caption-3 font-semibold text-[#B91C1C]">
                      {loc.code}
                    </span>
                    <Badge variant={isHub ? "crimson" : "neutral"}>
                      {loc.location_type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <h2 className="mt-2 title-3 text-[#1C1917]">{loc.name}</h2>
                  <p className="mt-1 caption-5 text-[#57534E]">{loc.address ?? "Dhaka, Bangladesh"}</p>
                  <p className="mt-2 font-mono caption-5 text-[#78716C]">{loc.phone ?? loc.email}</p>
                </Card>
              );
            })}
          </div>
        )}

        {tab === "suppliers" && (
          <Card>
            <CardHeader>
              <CardTitle>Approved Pharmaceutical Suppliers</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E7DDD0] caption-4 text-[#78716C]">
                    <th className="py-2 pr-3">Code</th>
                    <th className="py-2 pr-3">Supplier</th>
                    <th className="py-2 pr-3">Contact</th>
                    <th className="py-2 pr-3">Terms</th>
                    <th className="py-2 text-right">Current Payable</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((sup) => (
                    <tr key={sup.id} className="border-b border-[#EFE7DB] hover:bg-[#FAF6F0]">
                      <td className="py-2.5 pr-3 font-mono caption-3 font-semibold text-[#B91C1C]">
                        {sup.code}
                      </td>
                      <td className="py-2.5 pr-3 body-5 font-medium text-[#1C1917]">{sup.name}</td>
                      <td className="py-2.5 pr-3 body-6 text-[#57534E]">{sup.contact_person}</td>
                      <td className="py-2.5 pr-3 font-mono caption-4 text-[#1C1917]">
                        Net {sup.payment_terms_days}d
                      </td>
                      <td className="py-2.5 text-right font-mono body-5 font-semibold text-[#B45309]">
                        {formatCurrency(sup.current_balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {tab === "audit" && (
          <Card>
            <CardHeader>
              <CardTitle>Immutable Staff Audit Trail</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#EAE2D6] bg-[#FAF6F0] px-4 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="crimson">{log.action}</Badge>
                      <span className="font-mono caption-4 text-[#1C1917]">
                        {log.entity_type} #{log.entity_id}
                      </span>
                    </div>
                    <p className="mt-1 body-6 text-[#57534E]">
                      {log.reason ?? "Recorded operational event"}
                    </p>
                  </div>
                  <span className="font-mono caption-5 text-[#78716C]">
                    {formatTimeAgo(log.created_at)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
