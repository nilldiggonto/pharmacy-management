"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  ArrowsLeftRight,
  ClockCountdown,
  CurrencyDollar,
  MagnifyingGlass,
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
import { canAccessRoute, ROLE_DIRECTORY } from "@/lib/rbac";
import { formatCurrency, formatNumber, formatTimeAgo, WEIGHTED_EASE } from "@/lib/utils";

export default function DashboardPage() {
  const {
    user,
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

  const roleMeta = user ? ROLE_DIRECTORY[user.role] : null;

  const kpis = [
    {
      label: "Sales Today",
      value: dashboard.sales_today,
      format: (v: number) => formatCurrency(v),
      sub: `${formatNumber(dashboard.transaction_count_today)} retail & wholesale invoices`,
      icon: CurrencyDollar,
      tone: "text-[#B91C1C] bg-[#FEF2F2] border-[#FECACA]",
    },
    {
      label: "Network Stock Value",
      value: dashboard.inventory_value,
      format: (v: number) => formatCurrency(v),
      sub: `Uttara Main Hub + ${locations.filter((l) => l.location_type === "branch").length} Dhaka branches`,
      icon: Package,
      tone: "text-[#047857] bg-[#ECFDF5] border-[#A7F3D0]",
    },
    {
      label: "Low Stock Alerts",
      value: dashboard.low_stock_alerts,
      format: (v: number) => `${Math.round(v)}`,
      sub: `${dashboard.pending_transfers} active hub transfers`,
      icon: Warning,
      tone: "text-[#B45309] bg-[#FFFBEB] border-[#FDE68A]",
    },
    {
      label: "Near Expiry Batches",
      value: dashboard.near_expiry_batches,
      format: (v: number) => `${Math.round(v)}`,
      sub: `${dashboard.expired_or_quarantined_batches} expired or quarantined`,
      icon: ClockCountdown,
      tone: "text-[#991B1B] bg-[#FEF2F2] border-[#FECACA]",
    },
  ];

  return (
    <AppShell>
      <div className="flex flex-col gap-5">
        {/* Welcome & Quick Action Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E7DDD0] bg-[#FFFDF9] px-5 py-4 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="crimson">{roleMeta?.label ?? "Staff"}</Badge>
              <span className="caption-4 text-[#78716C]">Uttara Main Hub & Dhaka Retail Network</span>
            </div>
            <h1 className="mt-1 heading-5 text-[#1C1917]">
              Welcome back, {user?.full_name ?? "Operations"}
            </h1>
            <p className="body-6 text-[#57534E]">
              Monitor real-time stock across Uttara Main Hub and all 7 Dhaka branches, dispatch restocks, and process retail or wholesale orders.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user && canAccessRoute(user.role, "/inventory") && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/inventory">
                  <MagnifyingGlass size={15} />
                  <span>Find Medicine Across Branches</span>
                </Link>
              </Button>
            )}
            {user && canAccessRoute(user.role, "/pos") && (
              <Button variant="primary" size="sm" asChild>
                <Link href="/pos">
                  <ShoppingCartSimple size={15} weight="bold" />
                  <span>Open POS & Wholesale Desk</span>
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <section aria-label="Key network metrics" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.35, ease: WEIGHTED_EASE }}
              >
                <Card className="p-4 transition-[border-color,box-shadow] duration-200 hover:border-[#FECACA] hover:shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="caption-4 font-medium text-[#57534E]">{kpi.label}</p>
                      <div className="mt-1 font-mono heading-5 text-[#1C1917]">
                        <AnimatedCounter value={kpi.value} format={kpi.format} />
                      </div>
                    </div>
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${kpi.tone}`}>
                      <Icon size={18} weight="duotone" />
                    </span>
                  </div>
                  <p className="mt-2 caption-5 text-[#78716C]">{kpi.sub}</p>
                </Card>
              </motion.div>
            );
          })}
        </section>

        {/* 3D Network Twin + Inspector + Live Feed */}
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

          <div className="flex flex-col gap-4 xl:col-span-4">
            <Card>
              <CardHeader className="pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono caption-3 font-semibold text-[#B91C1C]">
                      {selectedLocation?.code}
                    </span>
                    <Badge variant="neutral">
                      {selectedLocation?.location_type.replace("_", " ")}
                    </Badge>
                  </div>
                  <CardTitle className="mt-1">{selectedLocation?.name}</CardTitle>
                </div>
                {user && canAccessRoute(user.role, "/inventory") && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/inventory">
                      <span>Stock</span>
                      <ArrowRight size={13} />
                    </Link>
                  </Button>
                )}
              </CardHeader>

              <CardContent className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-[#EAE2D6] bg-[#FAF6F0] p-3">
                    <p className="caption-5 text-[#57534E]">Inventory Value</p>
                    <p className="mt-0.5 font-mono title-3 text-[#1C1917]">
                      {formatCurrency(selectedPerf?.inventory_value ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#EAE2D6] bg-[#FAF6F0] p-3">
                    <p className="caption-5 text-[#57534E]">Sales Revenue</p>
                    <p className="mt-0.5 font-mono title-3 text-[#047857]">
                      {formatCurrency(selectedPerf?.sales_revenue ?? 0)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="caption-4 font-medium text-[#57534E] mb-2">
                    Active Batches ({selectedBatches.length})
                  </p>
                  <div className="flex max-h-[150px] flex-col gap-1.5 overflow-y-auto pr-1">
                    {selectedBatches.length === 0 ? (
                      <p className="rounded-xl border border-[#EAE2D6] bg-[#FAF6F0] p-3 caption-5 text-[#78716C]">
                        Administrative office node. No physical medicine batches held here.
                      </p>
                    ) : (
                      selectedBatches.slice(0, 8).map((b) => {
                        const prod = productMap.get(b.product_id);
                        return (
                          <div
                            key={b.id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-[#EAE2D6] bg-[#FAF6F0]/70 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate body-5 font-medium text-[#1C1917]">
                                {prod?.name ?? `Product #${b.product_id}`}
                              </p>
                              <p className="font-mono caption-5 text-[#78716C]">
                                {b.batch_number} · Exp {b.expiry_date}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono caption-3 font-semibold text-[#1C1917]">
                                {formatNumber(b.current_quantity)}
                              </p>
                              <Badge
                                variant={
                                  b.status === "available"
                                    ? "emerald"
                                    : b.status === "expired"
                                      ? "crimson"
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

            <Card className="flex-1">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Pulse size={16} weight="bold" className="text-[#B91C1C]" />
                  <CardTitle>Live Real-Time Activity</CardTitle>
                </div>
                <Badge variant="emerald" pulse>
                  {liveFlows.length} events
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="flex max-h-[210px] flex-col gap-2 overflow-y-auto pr-1">
                  {liveFlows.slice(0, 8).map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-start justify-between gap-2 rounded-xl border border-[#EAE2D6] bg-[#FAF6F0]/70 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={
                              ev.kind === "transfer"
                                ? "cyan"
                                : ev.kind === "receipt"
                                  ? "emerald"
                                  : "crimson"
                            }
                          >
                            {ev.fromCode} → {ev.toCode}
                          </Badge>
                          <span className="font-mono caption-5 text-[#78716C]">
                            {formatTimeAgo(ev.timestamp)}
                          </span>
                        </div>
                        <p className="mt-1 truncate body-6 font-medium text-[#1C1917]">
                          {ev.productName}
                        </p>
                        <p className="truncate caption-5 text-[#57534E]">{ev.note}</p>
                      </div>
                      <span className="font-mono caption-3 font-semibold text-[#B91C1C] whitespace-nowrap">
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

        {/* Branch Performance + Shortage Action Shortcuts */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-8">
            <CardHeader>
              <div>
                <CardTitle>Uttara Hub & Branch Performance</CardTitle>
                <p className="caption-5 text-[#57534E]">Click any location to inspect its live stock</p>
              </div>
              <Badge variant="neutral">{dashboard.branch_performance.length} locations</Badge>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E7DDD0] caption-4 text-[#78716C]">
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
                          className={`border-b border-[#EFE7DB] transition-colors cursor-pointer ${
                            active ? "bg-[#FEF2F2]/70" : "hover:bg-[#FAF6F0]"
                          }`}
                        >
                          <td className="py-2.5 pr-3 font-mono caption-3 font-semibold text-[#B91C1C]">
                            {row.location_code}
                          </td>
                          <td className="py-2.5 pr-3 body-5 font-medium text-[#1C1917]">
                            {row.location_name}
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono body-6 text-[#57534E]">
                            {formatNumber(row.transaction_count)}
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono body-5 font-semibold text-[#047857]">
                            {formatCurrency(row.sales_revenue)}
                          </td>
                          <td className="py-2.5 text-right font-mono body-6 text-[#1C1917]">
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
              <CardTitle>Priority Actions & Low Stock</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              {user && canAccessRoute(user.role, "/pos") && (
                <Button variant="primary" className="w-full justify-between" asChild>
                  <Link href="/pos">
                    <span className="flex items-center gap-2">
                      <ShoppingCartSimple size={16} weight="bold" />
                      Retail POS & Wholesale Orders
                    </span>
                    <ArrowRight size={15} />
                  </Link>
                </Button>
              )}
              {user && canAccessRoute(user.role, "/transfers") && (
                <Button variant="secondary" className="w-full justify-between" asChild>
                  <Link href="/transfers">
                    <span className="flex items-center gap-2">
                      <ArrowsLeftRight size={16} />
                      Uttara Hub Transfers ({dashboard.pending_transfers})
                    </span>
                    <ArrowRight size={15} />
                  </Link>
                </Button>
              )}
              {user && canAccessRoute(user.role, "/purchasing") && (
                <Button variant="secondary" className="w-full justify-between" asChild>
                  <Link href="/purchasing">
                    <span className="flex items-center gap-2">
                      <Truck size={16} />
                      Supplier Purchase Orders ({dashboard.pending_purchase_orders})
                    </span>
                    <ArrowRight size={15} />
                  </Link>
                </Button>
              )}

              {lowStock.length > 0 && (
                <div className="mt-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2]/70 p-3">
                  <p className="caption-4 font-semibold text-[#991B1B] mb-2">
                    Branch Shortages Requiring Uttara Restock
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {lowStock.slice(0, 4).map((item) => (
                      <div
                        key={`${item.location_id}-${item.product_id}`}
                        className="flex items-center justify-between gap-2 rounded-lg bg-[#FFFDF9] px-2.5 py-1.5 border border-[#FECACA]/60"
                      >
                        <div className="min-w-0">
                          <p className="truncate caption-4 font-medium text-[#1C1917]">
                            {item.product_name}
                          </p>
                          <p className="caption-5 text-[#78716C]">{item.location_name}</p>
                        </div>
                        <Badge variant="crimson">{item.available_quantity} left</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-1 rounded-xl border border-[#EAE2D6] bg-[#FAF6F0] p-3">
                <p className="caption-4 text-[#57534E]">Monthly Gross Profit (Est.)</p>
                <p className="mt-0.5 font-mono heading-6 text-[#047857]">
                  {formatCurrency(dashboard.estimated_gross_profit_this_month)}
                </p>
                <p className="mt-0.5 caption-5 text-[#78716C]">
                  On {formatCurrency(dashboard.sales_this_month)} monthly revenue
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
