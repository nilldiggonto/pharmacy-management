"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  ArrowsLeftRight,
  ClockCountdown,
  CurrencyDollar,
  Package,
  Pulse,
  ShoppingCartSimple,
  Truck,
  Warning,
} from "@phosphor-icons/react";
import { AppShell } from "@/components/layout/app-shell";
import { IsometricInventoryScene } from "@/components/isometric/isometric-inventory-scene";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/context/app-context";
import { formatCurrency, formatNumber, formatTimeAgo, WEIGHTED_EASE } from "@/lib/utils";

export default function DashboardPage() {
  const {
    dashboard,
    locations,
    batches,
    products,
    lowStock,
    expiryAlerts,
    liveFlows,
    selectedLocationCode,
    setSelectedLocationCode,
    simulationRunning,
    setSimulationRunning,
  } = useApp();

  const selectedLocation = useMemo(
    () => locations.find((l) => l.code === selectedLocationCode) ?? locations[1] ?? locations[0],
    [locations, selectedLocationCode]
  );

  const selectedPerf = useMemo(
    () =>
      dashboard.branch_performance.find(
        (b) => b.location_code === selectedLocation?.code
      ),
    [dashboard.branch_performance, selectedLocation]
  );

  const selectedBatches = useMemo(() => {
    if (!selectedLocation) return [];
    return batches.filter((b) => b.location_id === selectedLocation.id);
  }, [batches, selectedLocation]);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const kpis = [
    {
      label: "Sales Today",
      value: dashboard.sales_today,
      format: (v: number) => formatCurrency(v),
      sub: `${formatNumber(dashboard.transaction_count_today)} invoices settled`,
      icon: CurrencyDollar,
      tone: "emerald" as const,
    },
    {
      label: "Network Inventory Value",
      value: dashboard.inventory_value,
      format: (v: number) => formatCurrency(v),
      sub: `${locations.filter((l) => l.holds_stock).length} stock holding locations`,
      icon: Package,
      tone: "cyan" as const,
    },
    {
      label: "Low Stock Alerts",
      value: dashboard.low_stock_alerts,
      format: (v: number) => `${Math.round(v)}`,
      sub: `${dashboard.pending_transfers} active transfers`,
      icon: Warning,
      tone: "amber" as const,
    },
    {
      label: "Near Expiry Batches",
      value: dashboard.near_expiry_batches,
      format: (v: number) => `${Math.round(v)}`,
      sub: `${dashboard.expired_or_quarantined_batches} expired or quarantined`,
      icon: ClockCountdown,
      tone: "rose" as const,
    },
  ];

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        {/* Top KPI Ticker Strip */}
        <section aria-label="Key network metrics" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.45, ease: WEIGHTED_EASE }}
              >
                <Card className="p-4 transition-[border-color] duration-300 hover:border-[#313131]">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="caption-4 text-[#a8a29e]">{kpi.label}</p>
                      <div className="mt-1 font-mono heading-5 text-[#f5f5f4]">
                        <AnimatedCounter value={kpi.value} format={kpi.format} />
                      </div>
                    </div>
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#313131] bg-[#1f1f1f] text-[#10b981]">
                      <Icon size={18} weight="duotone" />
                    </span>
                  </div>
                  <p className="mt-2 caption-5 text-[#78716c]">{kpi.sub}</p>
                </Card>
              </motion.div>
            );
          })}
        </section>

        {/* Main 3D Isometric Command Viewport + Side Inspector */}
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <IsometricInventoryScene
              locations={locations}
              branchPerformance={dashboard.branch_performance}
              lowStock={lowStock}
              expiryAlerts={expiryAlerts}
              liveFlows={liveFlows}
              selectedCode={selectedLocation?.code ?? null}
              onSelectCode={(code) => setSelectedLocationCode(code)}
              simulationRunning={simulationRunning}
              onToggleSimulation={() => setSimulationRunning(!simulationRunning)}
            />
          </div>

          {/* Right Column: Selected Building Inspector + Live Movement Feed */}
          <div className="flex flex-col gap-4 xl:col-span-4">
            <Card>
              <CardHeader className="pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono caption-3 text-[#10b981]">
                      {selectedLocation?.code}
                    </span>
                    <Badge variant="neutral">
                      {selectedLocation?.location_type.replace("_", " ")}
                    </Badge>
                  </div>
                  <CardTitle className="mt-1">{selectedLocation?.name}</CardTitle>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/inventory">
                    <span>Inspect</span>
                    <ArrowRight size={13} />
                  </Link>
                </Button>
              </CardHeader>

              <CardContent className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-[#272727] bg-[#1f1f1f] p-3">
                    <p className="caption-5 text-[#a8a29e]">Inventory Value</p>
                    <p className="mt-0.5 font-mono title-3 text-[#f5f5f4]">
                      {formatCurrency(selectedPerf?.inventory_value ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#272727] bg-[#1f1f1f] p-3">
                    <p className="caption-5 text-[#a8a29e]">Sales Revenue</p>
                    <p className="mt-0.5 font-mono title-3 text-[#10b981]">
                      {formatCurrency(selectedPerf?.sales_revenue ?? 0)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="caption-4 text-[#a8a29e] mb-2">
                    Active Batches ({selectedBatches.length})
                  </p>
                  <div className="flex max-h-[140px] flex-col gap-1.5 overflow-y-auto pr-1">
                    {selectedBatches.length === 0 ? (
                      <p className="rounded-lg border border-[#272727] bg-[#1f1f1f] p-3 caption-5 text-[#78716c]">
                        Administrative node. No physical stock held at this location.
                      </p>
                    ) : (
                      selectedBatches.map((b) => {
                        const prod = productMap.get(b.product_id);
                        return (
                          <div
                            key={b.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-[#272727] bg-[#1f1f1f] px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate body-5 text-[#f5f5f4]">
                                {prod?.name ?? `Product #${b.product_id}`}
                              </p>
                              <p className="font-mono caption-5 text-[#78716c]">
                                {b.batch_number} · Exp {b.expiry_date}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono caption-3 text-[#f5f5f4]">
                                {formatNumber(b.current_quantity)}
                              </p>
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
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Live Stock Movement Telemetry Feed */}
            <Card className="flex-1">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Pulse size={16} weight="bold" className="text-[#10b981]" />
                  <CardTitle>Live Stock Flow</CardTitle>
                </div>
                <Badge variant="emerald" pulse>
                  {liveFlows.length} events
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="flex max-h-[220px] flex-col gap-2 overflow-y-auto pr-1">
                  {liveFlows.slice(0, 8).map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-start justify-between gap-2 rounded-lg border border-[#272727] bg-[#1f1f1f] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={
                              ev.kind === "transfer"
                                ? "emerald"
                                : ev.kind === "receipt"
                                  ? "cyan"
                                  : "violet"
                            }
                          >
                            {ev.fromCode} → {ev.toCode}
                          </Badge>
                          <span className="font-mono caption-5 text-[#78716c]">
                            {formatTimeAgo(ev.timestamp)}
                          </span>
                        </div>
                        <p className="mt-1 truncate body-6 text-[#f5f5f4]">
                          {ev.productName}
                        </p>
                        <p className="truncate caption-5 text-[#a8a29e]">{ev.note}</p>
                      </div>
                      <span className="font-mono caption-3 text-[#10b981] whitespace-nowrap">
                        {ev.kind === "sale" ? "-" : "+"}
                        {ev.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Branch Performance Comparison + Quick Actions */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-8">
            <CardHeader>
              <CardTitle>Branch Performance Matrix</CardTitle>
              <span className="caption-5 text-[#a8a29e]">
                Click any row to focus in 3D view
              </span>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#272727] caption-4 text-[#78716c]">
                      <th className="py-2 pr-3">Code</th>
                      <th className="py-2 pr-3">Location</th>
                      <th className="py-2 pr-3 text-right">Invoices</th>
                      <th className="py-2 pr-3 text-right">Sales Today</th>
                      <th className="py-2 text-right">Inventory Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.branch_performance.map((row) => {
                      const active = row.location_code === selectedLocation?.code;
                      return (
                        <tr
                          key={row.location_id}
                          onClick={() => setSelectedLocationCode(row.location_code)}
                          className={`border-b border-[#272727]/60 transition-colors duration-200 cursor-pointer ${
                            active ? "bg-[#272727]/70" : "hover:bg-[#1f1f1f]"
                          }`}
                        >
                          <td className="py-2.5 pr-3 font-mono caption-3 text-[#10b981]">
                            {row.location_code}
                          </td>
                          <td className="py-2.5 pr-3 body-5 text-[#f5f5f4]">
                            {row.location_name}
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono body-6 text-[#d6d3d1]">
                            {formatNumber(row.transaction_count)}
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono body-5 text-[#10b981]">
                            {formatCurrency(row.sales_revenue)}
                          </td>
                          <td className="py-2.5 text-right font-mono body-6 text-[#f5f5f4]">
                            {formatCurrency(row.inventory_value)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Priority Operational Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              <Button variant="primary" className="w-full justify-between" asChild>
                <Link href="/pos">
                  <span className="flex items-center gap-2">
                    <ShoppingCartSimple size={16} weight="bold" />
                    Open Branch POS Terminal
                  </span>
                  <ArrowRight size={15} />
                </Link>
              </Button>
              <Button variant="secondary" className="w-full justify-between" asChild>
                <Link href="/transfers">
                  <span className="flex items-center gap-2">
                    <ArrowsLeftRight size={16} />
                    Dispatch Pending Transfers ({dashboard.pending_transfers})
                  </span>
                  <ArrowRight size={15} />
                </Link>
              </Button>
              <Button variant="secondary" className="w-full justify-between" asChild>
                <Link href="/purchasing">
                  <span className="flex items-center gap-2">
                    <Truck size={16} />
                    Review Purchase Orders ({dashboard.pending_purchase_orders})
                  </span>
                  <ArrowRight size={15} />
                </Link>
              </Button>

              <div className="mt-2 rounded-xl border border-[#272727] bg-[#1f1f1f] p-3">
                <p className="caption-4 text-[#a8a29e]">Monthly Gross Margin</p>
                <p className="mt-1 font-mono heading-6 text-[#10b981]">
                  {formatCurrency(dashboard.estimated_gross_profit_this_month)}
                </p>
                <p className="mt-0.5 caption-5 text-[#78716c]">
                  On {formatCurrency(dashboard.sales_this_month)} monthly sales
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}

