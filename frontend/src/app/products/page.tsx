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
  const [retailPrice, setRetailPrice] = useState("6.50");
  const [purchaseCost, setPurchaseCost] = useState("4.00");

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
      retail_price: parseFloat(retailPrice) || 0,
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
            <h1 className="heading-5 text-[#f5f5f4]">Central Product Catalogue</h1>
            <p className="body-6 text-[#a8a29e]">
              Unified SKU, generic formulation, pricing, and prescription controls across all branches.
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
              <DialogTitle>Register new catalogue SKU</DialogTitle>
              <DialogDescription>
                Products added here become immediately available for purchase orders and branch stock.
              </DialogDescription>
              <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="caption-4 text-[#d6d3d1] block mb-1">SKU Code</label>
                    <Input
                      required
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="MED-AZM-500"
                    />
                  </div>
                  <div>
                    <label className="caption-4 text-[#d6d3d1] block mb-1">Generic Name</label>
                    <Input
                      value={genericName}
                      onChange={(e) => setGenericName(e.target.value)}
                      placeholder="Azithromycin"
                    />
                  </div>
                </div>
                <div>
                  <label className="caption-4 text-[#d6d3d1] block mb-1">Product Name</label>
                  <Input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Azithromycin 500mg Film Coated Tablet"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="caption-4 text-[#d6d3d1] block mb-1">Purchase Cost ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={purchaseCost}
                      onChange={(e) => setPurchaseCost(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="caption-4 text-[#d6d3d1] block mb-1">Retail Price ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={retailPrice}
                      onChange={(e) => setRetailPrice(e.target.value)}
                    />
                  </div>
                </div>
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
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#78716c]"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search SKU, barcode, brand, or generic name..."
                className="pl-9"
              />
            </div>
            <Badge variant="neutral">{filtered.length} SKUs</Badge>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#272727] caption-4 text-[#78716c]">
                    <th className="py-2 pr-3">SKU</th>
                    <th className="py-2 pr-3">Product & Generic</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3 text-right">Cost</th>
                    <th className="py-2 pr-3 text-right">Retail</th>
                    <th className="py-2 pr-3 text-right">Min Floor</th>
                    <th className="py-2 text-right">Control</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b border-[#272727]/60 hover:bg-[#1f1f1f]">
                      <td className="py-2.5 pr-3 font-mono caption-3 text-[#10b981]">{p.sku}</td>
                      <td className="py-2.5 pr-3">
                        <p className="body-5 text-[#f5f5f4]">{p.name}</p>
                        <p className="caption-5 text-[#78716c]">
                          {p.generic_name ?? "General"} · {p.brand_name ?? p.manufacturer}
                        </p>
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge variant={p.category === "Cold Chain" ? "cyan" : "neutral"}>
                          {p.category}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono body-6 text-[#a8a29e]">
                        {formatCurrency(p.purchase_cost)}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono body-5 text-[#f5f5f4]">
                        {formatCurrency(p.retail_price)}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono body-6 text-[#a8a29e]">
                        {p.min_stock_level} {p.base_unit}
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

