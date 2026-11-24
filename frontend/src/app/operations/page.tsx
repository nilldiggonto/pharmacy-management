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
            <h1 className="heading-5 text-[#f5f5f4]">Network Directory & Audit Trail</h1>
            <p className="body-6 text-[#a8a29e]">
              Manage locations, supplier credit balances, and immutable operational audit logs.
            </p>
          </div>
          <SlidingTabs
            layoutId="ops-tabs"
            value={tab}
            onChange={setTab}
            options={[
              { id: "locations", label: "Locations", count: locations.length },
              { id: "suppliers", label: "Suppliers", count: suppliers.length },
              { id: "audit", label: "Audit Log", count: auditLogs.length },
            ]}
          />
        </div>

        {tab === "locations" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {locations.map((loc) => (
              <Card key={loc.id} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono caption-3 text-[#10b981]">{loc.code}</span>
                  <Badge variant={loc.location_type === "warehouse" ? "cyan" : "neutral"}>
                    {loc.location_type.replace("_", " ")}
                  </Badge>
                </div>
                <h2 className="mt-2 title-3 text-[#f5f5f4]">{loc.name}</h2>
                <p className="mt-1 caption-5 text-[#a8a29e]">{loc.address ?? "Address pending"}</p>
                <p className="mt-2 font-mono caption-5 text-[#78716c]">{loc.phone ?? loc.email}</p>
              </Card>
            ))}
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
                  <tr className="border-b border-[#272727] caption-4 text-[#78716c]">
                    <th className="py-2 pr-3">Code</th>
                    <th className="py-2 pr-3">Supplier</th>
                    <th className="py-2 pr-3">Contact</th>
                    <th className="py-2 pr-3">Terms</th>
                    <th className="py-2 text-right">Current Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((sup) => (
                    <tr key={sup.id} className="border-b border-[#272727]/60 hover:bg-[#1f1f1f]">
                      <td className="py-2.5 pr-3 font-mono caption-3 text-[#06b6d4]">{sup.code}</td>
                      <td className="py-2.5 pr-3 body-5 text-[#f5f5f4]">{sup.name}</td>
                      <td className="py-2.5 pr-3 body-6 text-[#a8a29e]">{sup.contact_person}</td>
                      <td className="py-2.5 pr-3 font-mono caption-4 text-[#d6d3d1]">
                        Net {sup.payment_terms_days}d
                      </td>
                      <td className="py-2.5 text-right font-mono body-5 text-[#fbbf24]">
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
              <CardTitle>Immutable Audit Ledger</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#272727] bg-[#1f1f1f] px-4 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="violet">{log.action}</Badge>
                      <span className="font-mono caption-4 text-[#f5f5f4]">
                        {log.entity_type} #{log.entity_id}
                      </span>
                    </div>
                    <p className="mt-1 body-6 text-[#a8a29e]">{log.reason ?? "Recorded system event"}</p>
                  </div>
                  <span className="font-mono caption-5 text-[#78716c]">
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

