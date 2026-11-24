"use client";

import React, { useMemo, useState } from "react";
import { MagnifyingGlass, PencilSimple, Plus } from "@phosphor-icons/react";
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
import { MedicineVisual } from "@/components/ui/medicine-visual";
import { useApp } from "@/context/app-context";
import type { Product } from "@/types/api";
import { formatCurrency } from "@/lib/utils";

export default function ProductsPage() {
  const { user, products, addProduct, editProduct } = useApp();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [genericName, setGenericName] = useState("");
  const [category, setCategory] = useState("Medicine");
  const [purchaseCost, setPurchaseCost] = useState("4.00");
  const [wholesalePrice, setWholesalePrice] = useState("5.20");
  const [retailPrice, setRetailPrice] = useState("6.50");
  const [requiresRx, setRequiresRx] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [editing, setEditing] = useState<{
    id: number;
    sku: string;
    name: string;
    generic_name: string;
    category: string;
    purchase_cost: string;
    wholesale_price: string;
    retail_price: string;
    min_stock_level: string;
    requires_prescription: boolean;
  } | null>(null);

  const canEditCatalog =
    user &&
    [
      "owner",
      "head_office_manager",
      "procurement_officer",
      "inventory_officer",
      "stock_entry_operator",
    ].includes(user.role);

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
    try {
      await addProduct({
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        generic_name: genericName.trim() || null,
        category: category.trim() || "Medicine",
        purchase_cost: parseFloat(purchaseCost) || 0,
        wholesale_price: parseFloat(wholesalePrice) || 0,
        retail_price: parseFloat(retailPrice) || 0,
        requires_prescription: requiresRx,
      });
      setFeedback(`Added SKU ${sku.trim().toUpperCase()} (${name.trim()}) to catalogue.`);
      setSku("");
      setName("");
      setGenericName("");
      setOpen(false);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Could not add product.");
    }
  };

  const openEditModal = (p: Product) => {
    setEditing({
      id: p.id,
      sku: p.sku,
      name: p.name,
      generic_name: p.generic_name ?? "",
      category: p.category,
      purchase_cost: String(p.purchase_cost),
      wholesale_price: String(p.wholesale_price),
      retail_price: String(p.retail_price),
      min_stock_level: String(p.min_stock_level),
      requires_prescription: p.requires_prescription,
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      await editProduct(editing.id, {
        name: editing.name.trim(),
        generic_name: editing.generic_name.trim() || null,
        category: editing.category.trim() || "Medicine",
        purchase_cost: parseFloat(editing.purchase_cost) || 0,
        wholesale_price: parseFloat(editing.wholesale_price) || 0,
        retail_price: parseFloat(editing.retail_price) || 0,
        min_stock_level: Math.max(1, Number(editing.min_stock_level) || 10),
        requires_prescription: editing.requires_prescription,
      });
      setFeedback(`Updated ${editing.sku} (${editing.name.trim()}) successfully.`);
      setEditing(null);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Could not update product.");
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="heading-5 text-[#1C1917]">Central Medicine & Supply Catalogue</h1>
            <p className="body-6 text-[#57534E]">
              Add or edit SKUs, generic formulations, wholesale and retail pricing, and prescription controls across Uttara Hub and all branches.
            </p>
          </div>

          {canEditCatalog && (
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
                  Products added here become immediately available for stock entry, purchase orders, wholesale, and branch POS.
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
                      <label className="caption-4 font-medium text-[#1C1917] block mb-1">Category</label>
                      <Input
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="Antibiotic"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="caption-4 font-medium text-[#1C1917] block mb-1">Product Name</label>
                      <Input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Azithromycin 500mg Tablet"
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
                    <th className="py-2 pr-3 text-right">Control</th>
                    {canEditCatalog && <th className="py-2 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b border-[#EFE7DB] hover:bg-[#FAF6F0]">
                      <td className="py-2.5 pr-3 font-mono caption-3 font-semibold text-[#B91C1C]">
                        {p.sku}
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2.5">
                          <MedicineVisual
                            sku={p.sku}
                            name={p.name}
                            category={p.category}
                            dosageForm={p.dosage_form}
                            requiresPrescription={p.requires_prescription}
                            size="sm"
                          />
                          <div>
                            <p className="body-5 font-medium text-[#1C1917]">{p.name}</p>
                            <p className="caption-5 text-[#78716C]">
                              {p.generic_name ?? "General"} · {p.brand_name ?? p.manufacturer}
                            </p>
                          </div>
                        </div>
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
                      <td className="py-2.5 pr-3 text-right">
                        <Badge variant={p.requires_prescription ? "amber" : "emerald"}>
                          {p.requires_prescription ? "Rx Only" : "OTC"}
                        </Badge>
                      </td>
                      {canEditCatalog && (
                        <td className="py-2.5 text-right">
                          <Button size="sm" variant="outline" onClick={() => openEditModal(p)}>
                            <PencilSimple size={13} />
                            <span>Edit</span>
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Product Dialog */}
        <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent>
            <DialogTitle>Edit Medicine / Supply ({editing?.sku})</DialogTitle>
            <DialogDescription>
              Update product details, wholesale/retail pricing, or minimum stock threshold. All edits are audited.
            </DialogDescription>
            {editing && (
              <form onSubmit={handleUpdate} className="mt-4 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="caption-4 font-medium text-[#1C1917] block mb-1">Product Name</label>
                    <Input
                      required
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="caption-4 font-medium text-[#1C1917] block mb-1">Generic Name</label>
                    <Input
                      value={editing.generic_name}
                      onChange={(e) => setEditing({ ...editing, generic_name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="caption-4 font-medium text-[#1C1917] block mb-1">Category</label>
                    <Input
                      value={editing.category}
                      onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="caption-4 font-medium text-[#1C1917] block mb-1">Min Stock Alert</label>
                    <Input
                      type="number"
                      min={1}
                      value={editing.min_stock_level}
                      onChange={(e) => setEditing({ ...editing, min_stock_level: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="caption-4 font-medium text-[#1C1917] block mb-1">Cost ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editing.purchase_cost}
                      onChange={(e) => setEditing({ ...editing, purchase_cost: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="caption-4 font-medium text-[#1C1917] block mb-1">Wholesale ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editing.wholesale_price}
                      onChange={(e) => setEditing({ ...editing, wholesale_price: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="caption-4 font-medium text-[#1C1917] block mb-1">Retail ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editing.retail_price}
                      onChange={(e) => setEditing({ ...editing, retail_price: e.target.value })}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 caption-4 text-[#1C1917] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.requires_prescription}
                    onChange={(e) =>
                      setEditing({ ...editing, requires_prescription: e.target.checked })
                    }
                    className="accent-[#B91C1C]"
                  />
                  Requires Prescription (Rx Only)
                </label>
                <div className="mt-2 flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary">
                    Save Changes
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
