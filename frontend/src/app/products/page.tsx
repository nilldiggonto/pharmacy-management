"use client";

import React, { useMemo, useState } from "react";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useApp } from "@/context/app-context";
import { formatCurrency } from "@/lib/utils";

export default function ProductsPage() {
  const { products, addProduct } = useApp();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [genericName, setGenericName] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("4.00");
  const [wholesalePrice, setWholesalePrice] = useState("5.20");
  const [retailPrice, setRetailPrice] = useState("6.50");
  const [requiresRx, setRequiresRx] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.generic_name?.toLowerCase().includes(q) ?? false) ||
        (p.brand_name?.toLowerCase().includes(q) ?? false) ||
        (p.barcode?.includes(q) ?? false)
    );
  }, [products, query]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim()) return;
    await addProduct({
      sku: sku.trim().toUpperCase(),
      name: name.trim(),
      generic_name: genericName.trim() || null,
      purchase_cost: parseFloat(purchaseCost) || 0,
      wholesale_price: parseFloat(wholesalePrice) || 0,
      retail_price: parseFloat(retailPrice) || 0,
      requires_prescription: requiresRx,
    });
    setSku("");
    setName("");
    setGenericName("");
    setOpen(false);
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="heading-5 text-[#1C1917]">Central Medicine & Supply Catalogue</h1>
            <p className="body-6 text-[#57534E]">
              Unified SKU, generic formulation, wholesale and retail pricing, and prescription controls across Uttara Hub and all branches.
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="primary">
                <Plus size={16} weight="bold" />
                <span>Add Product</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Register New Catalogue SKU</DialogTitle>
              <DialogDescription>
                Products added here become immediately available for purchase orders, wholesale, and branch POS.
              </DialogDescription>
              <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="caption-4 font-medium text-[#1C1917] block mb-1">SKU Code</label>
                    <Input
                      required
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="MED-AZM-500"
                    />
                  </div>
                  <div>
                    <label className="caption-4 font-medium text-[#1C1917] block mb-1">Generic Name</label>
                    <Input
                      value={genericName}
                      onChange={(e) => setGenericName(e.target.value)}
                      placeholder="Azithromycin"
                    />
                  </div>
                </div>
                <div>
                  <label className="caption-4 font-medium text-[#1C1917] block mb-1">Product Name</label>
                  <Input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Azithromycin 500mg Tablet"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="caption-4 font-medium text-[#1C1917] block mb-1">Cost ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={purchaseCost}
                      onChange={(e) => setPurchaseCost(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="caption-4 font-medium text-[#1C1917] block mb-1">Wholesale ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={wholesalePrice}
                      onChange={(e) => setWholesalePrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="caption-4 font-medium text-[#1C1917] block mb-1">Retail ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={retailPrice}
                      onChange={(e) => setRetailPrice(e.target.value)}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 caption-4 text-[#1C1917] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresRx}
                    onChange={(e) => setRequiresRx(e.target.checked)}
                    className="accent-[#B91C1C]"
                  />
                  Requires Prescription (Rx Only)
                </label>
                <div className="mt-2 flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary">
                    Save SKU
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlass
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#78716C]"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search SKU, barcode, brand, or generic name..."
                className="pl-9"
              />
            </div>
            <Badge variant="crimson">{filtered.length} SKUs</Badge>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E7DDD0] caption-4 text-[#78716C]">
                    <th className="py-2 pr-3">SKU</th>
                    <th className="py-2 pr-3">Product & Generic</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3 text-right">Cost</th>
                    <th className="py-2 pr-3 text-right">Wholesale</th>
                    <th className="py-2 pr-3 text-right">Retail</th>
                    <th className="py-2 text-right">Control</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b border-[#EFE7DB] hover:bg-[#FAF6F0]">
                      <td className="py-2.5 pr-3 font-mono caption-3 font-semibold text-[#B91C1C]">
                        {p.sku}
                      </td>
                      <td className="py-2.5 pr-3">
                        <p className="body-5 font-medium text-[#1C1917]">{p.name}</p>
                        <p className="caption-5 text-[#78716C]">
                          {p.generic_name ?? "General"} · {p.brand_name ?? p.manufacturer}
                        </p>
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge variant={p.category === "Cold Chain" ? "cyan" : "neutral"}>
                          {p.category}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono body-6 text-[#57534E]">
                        {formatCurrency(p.purchase_cost)}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono body-6 text-[#991B1B] font-medium">
                        {formatCurrency(p.wholesale_price)}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono body-5 font-semibold text-[#1C1917]">
                        {formatCurrency(p.retail_price)}
                      </td>
                      <td className="py-2.5 text-right">
                        <Badge variant={p.requires_prescription ? "amber" : "emerald"}>
                          {p.requires_prescription ? "Rx Only" : "OTC"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
