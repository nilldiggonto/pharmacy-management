"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, clearStoredTokens, getStoredToken, setStoredTokens } from "@/lib/api";
import {
  createSimulatedFlowEvent,
  DEMO_AUDIT_LOGS,
  DEMO_BATCHES,
  DEMO_DASHBOARD,
  DEMO_EXPIRY,
  DEMO_LOCATIONS,
  DEMO_LOW_STOCK,
  DEMO_MOVEMENTS,
  DEMO_PRODUCTS,
  DEMO_PURCHASE_ORDERS,
  DEMO_SALES,
  DEMO_SUPPLIERS,
  DEMO_TRANSFERS,
  INITIAL_LIVE_FLOWS,
} from "@/lib/mock-telemetry";
import { ROLE_DIRECTORY } from "@/lib/rbac";
import type {
  AuditLog,
  Batch,
  DashboardSummary,
  ExpiryAlertItem,
  LiveFlowEvent,
  Location,
  LowStockItem,
  Product,
  PurchaseOrder,
  Sale,
  StockMovement,
  Supplier,
  Transfer,
  User,
  UserRole,
} from "@/types/api";

const DEMO_ROLE_KEY = "pm_demo_role";

interface AppContextValue {
  mode: "live_api" | "role_preview" | "unauthenticated";
  isAuthenticated: boolean;
  authChecked: boolean;
  loading: boolean;
  user: User | null;
  locations: Location[];
  products: Product[];
  suppliers: Supplier[];
  batches: Batch[];
  movements: StockMovement[];
  purchaseOrders: PurchaseOrder[];
  transfers: Transfer[];
  sales: Sale[];
  dashboard: DashboardSummary;
  lowStock: LowStockItem[];
  expiryAlerts: ExpiryAlertItem[];
  auditLogs: AuditLog[];
  liveFlows: LiveFlowEvent[];
  simulationRunning: boolean;
  setSimulationRunning: (running: boolean) => void;
  selectedLocationCode: string | null;
  setSelectedLocationCode: (code: string | null) => void;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; user?: User; error?: string }>;
  signInAsRolePreview: (role: UserRole) => User;
  signOut: () => Promise<void>;
  refreshData: () => Promise<void>;
  triggerTransferDispatch: (transferId: number) => Promise<void>;
  approveOrder: (poId: number) => Promise<void>;
  completePosSale: (payload: {
    locationId: number;
    customerName: string;
    paymentMethod: string;
    items: { product: Product; quantity: number }[];
  }) => Promise<Sale>;
  addProduct: (payload: Partial<Product> & { sku: string; name: string }) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function buildPreviewUser(role: UserRole): User {
  const meta = ROLE_DIRECTORY[role];
  return {
    id: 100,
    email: meta.demoEmail,
    full_name: meta.demoFullName,
    phone: "+880 1711 402918",
    role,
    is_active: true,
    can_access_all_locations:
      role === "owner" ||
      role === "head_office_manager" ||
      role === "inventory_officer" ||
      role === "procurement_officer" ||
      role === "accountant",
    location_ids:
      role === "branch_manager" || role === "pharmacist" || role === "cashier"
        ? [3]
        : [1, 2, 3, 4, 5, 6, 7, 8, 9],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<"live_api" | "role_preview" | "unauthenticated">(
    "unauthenticated"
  );
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [locations, setLocations] = useState<Location[]>(DEMO_LOCATIONS);
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [suppliers, setSuppliers] = useState<Supplier[]>(DEMO_SUPPLIERS);
  const [batches, setBatches] = useState<Batch[]>(DEMO_BATCHES);
  const [movements, setMovements] = useState<StockMovement[]>(DEMO_MOVEMENTS);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(DEMO_PURCHASE_ORDERS);
  const [transfers, setTransfers] = useState<Transfer[]>(DEMO_TRANSFERS);
  const [sales, setSales] = useState<Sale[]>(DEMO_SALES);
  const [dashboard, setDashboard] = useState<DashboardSummary>(DEMO_DASHBOARD);
  const [lowStock, setLowStock] = useState<LowStockItem[]>(DEMO_LOW_STOCK);
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlertItem[]>(DEMO_EXPIRY);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(DEMO_AUDIT_LOGS);
  const [liveFlows, setLiveFlows] = useState<LiveFlowEvent[]>(INITIAL_LIVE_FLOWS);
  const [simulationRunning, setSimulationRunning] = useState(true);
  const [selectedLocationCode, setSelectedLocationCode] = useState<string | null>("CW-01");

  const isAuthenticated = user !== null && mode !== "unauthenticated";

  const loadLiveData = useCallback(async () => {
    const [
      me,
      dash,
      locs,
      prods,
      sups,
      btchs,
      movs,
      pos,
      trfs,
      sls,
      low,
      exp,
      aud,
    ] = await Promise.all([
      api.me(),
      api.getDashboard().catch(() => DEMO_DASHBOARD),
      api.getLocations().catch(() => []),
      api.getProducts().catch(() => []),
      api.getSuppliers().catch(() => []),
      api.getBatches().catch(() => []),
      api.getMovements().catch(() => []),
      api.getPurchaseOrders().catch(() => []),
      api.getTransfers().catch(() => []),
      api.getSales().catch(() => []),
      api.getLowStock().catch(() => []),
      api.getExpiryAlerts(90).catch(() => []),
      api.getAuditLogs().catch(() => []),
    ]);

    setUser(me);
    setDashboard(dash);
    if (locs.length > 0) setLocations(locs);
    if (prods.length > 0) setProducts(prods);
    setSuppliers(sups);
    setBatches(btchs);
    setMovements(movs);
    setPurchaseOrders(pos);
    setTransfers(trfs);
    setSales(sls);
    setLowStock(low);
    setExpiryAlerts(exp);
    setAuditLogs(aud);
    setMode("live_api");
    return me;
  }, []);

  const refreshData = useCallback(async () => {
    const token = getStoredToken();
    if (token) {
      try {
        await loadLiveData();
        setAuthChecked(true);
        setLoading(false);
        return;
      } catch {
        clearStoredTokens();
      }
    }

    const storedDemoRole =
      typeof window !== "undefined"
        ? (sessionStorage.getItem(DEMO_ROLE_KEY) as UserRole | null)
        : null;
    if (storedDemoRole && ROLE_DIRECTORY[storedDemoRole]) {
      setUser(buildPreviewUser(storedDemoRole));
      setMode("role_preview");
    } else {
      setUser(null);
      setMode("unauthenticated");
    }
    setAuthChecked(true);
    setLoading(false);
  }, [loadLiveData]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  // Real time telemetry stream for isometric visualization (only when signed in)
  useEffect(() => {
    if (!simulationRunning || !isAuthenticated) return;
    const interval = setInterval(() => {
      const ev = createSimulatedFlowEvent();
      setLiveFlows((prev) => [ev, ...prev].slice(0, 24));

      if (mode === "role_preview" && ev.kind === "sale") {
        setDashboard((prev) => ({
          ...prev,
          sales_today: Number((prev.sales_today + ev.quantity * 6.45).toFixed(2)),
          transaction_count_today: prev.transaction_count_today + 1,
          branch_performance: prev.branch_performance.map((b) =>
            b.location_code === ev.fromCode
              ? {
                  ...b,
                  sales_revenue: Number((b.sales_revenue + ev.quantity * 6.45).toFixed(2)),
                  transaction_count: b.transaction_count + 1,
                }
              : b
          ),
        }));
      }
    }, 3600);

    return () => clearInterval(interval);
  }, [simulationRunning, isAuthenticated, mode]);

  const signIn = async (email: string, password: string) => {
    try {
      const res = await api.login(email, password);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(DEMO_ROLE_KEY);
      }
      setStoredTokens(res.access_token, res.refresh_token);
      setUser(res.user);
      setMode("live_api");
      await loadLiveData();
      return { ok: true, user: res.user };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Authentication failed",
      };
    }
  };

  const signInAsRolePreview = (role: UserRole): User => {
    clearStoredTokens();
    if (typeof window !== "undefined") {
      sessionStorage.setItem(DEMO_ROLE_KEY, role);
    }
    const preview = buildPreviewUser(role);
    setUser(preview);
    setMode("role_preview");
    setAuthChecked(true);
    return preview;
  };

  const signOut = async () => {
    if (mode === "live_api") {
      try {
        await api.logout();
      } catch {
        // ignore if offline
      }
    }
    clearStoredTokens();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(DEMO_ROLE_KEY);
    }
    setUser(null);
    setMode("unauthenticated");
  };

  const triggerTransferDispatch = async (transferId: number) => {
    if (mode === "live_api") {
      await api.dispatchTransfer(transferId);
      await refreshData();
      return;
    }
    setTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId
          ? { ...t, status: "in_transit", dispatched_at: new Date().toISOString() }
          : t
      )
    );
    const target = transfers.find((t) => t.id === transferId);
    if (target) {
      const fromLoc = locations.find((l) => l.id === target.from_location_id);
      const toLoc = locations.find((l) => l.id === target.to_location_id);
      const firstItem = target.items[0];
      const prod = products.find((p) => p.id === firstItem?.product_id);
      setLiveFlows((prev) => [
        {
          id: `dispatch-${Date.now()}`,
          kind: "transfer",
          fromCode: fromLoc?.code ?? "CW-01",
          toCode: toLoc?.code ?? "BR-01",
          productName: prod?.name ?? "Stock Transfer",
          quantity: firstItem?.requested_quantity ?? 50,
          timestamp: new Date().toISOString(),
          note: `Dispatched ${target.transfer_number} via FEFO`,
        },
        ...prev,
      ]);
    }
  };

  const approveOrder = async (poId: number) => {
    if (mode === "live_api") {
      await api.approvePurchaseOrder(poId);
      await refreshData();
      return;
    }
    setPurchaseOrders((prev) =>
      prev.map((po) =>
        po.id === poId
          ? { ...po, status: "approved", approved_at: new Date().toISOString() }
          : po
      )
    );
  };

  const completePosSale = async (payload: {
    locationId: number;
    customerName: string;
    paymentMethod: string;
    items: { product: Product; quantity: number }[];
  }): Promise<Sale> => {
    const subtotal = payload.items.reduce(
      (sum, item) => sum + item.product.retail_price * item.quantity,
      0
    );
    const total = Number(subtotal.toFixed(2));

    if (mode === "live_api") {
      const created = await api.createSale({
        location_id: payload.locationId,
        customer_name: payload.customerName || null,
        items: payload.items.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
        payments: [{ payment_method: payload.paymentMethod, amount: total }],
      });
      await refreshData();
      return created;
    }

    const loc = locations.find((l) => l.id === payload.locationId);
    const created: Sale = {
      id: Date.now(),
      invoice_number: `INV-${loc?.code ?? "BR01"}-${Math.floor(1000 + Math.random() * 8999)}`,
      location_id: payload.locationId,
      cashier_user_id: user?.id ?? 1,
      customer_name: payload.customerName || "Walk In Customer",
      customer_phone: null,
      status: "completed",
      subtotal: total,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: total,
      items: payload.items.map((i, idx) => ({
        id: idx + 1,
        product_id: i.product.id,
        batch_id: 1001,
        product_name_snapshot: i.product.name,
        batch_number_snapshot: "FEFO-AUTO",
        quantity: i.quantity,
        unit_price: i.product.retail_price,
        unit_cost: i.product.purchase_cost,
        line_total: Number((i.product.retail_price * i.quantity).toFixed(2)),
      })),
      created_at: new Date().toISOString(),
    };
    setSales((prev) => [created, ...prev]);
    setDashboard((prev) => ({
      ...prev,
      sales_today: Number((prev.sales_today + total).toFixed(2)),
      transaction_count_today: prev.transaction_count_today + 1,
    }));
    setLiveFlows((prev) => [
      {
        id: `sale-${Date.now()}`,
        kind: "sale",
        fromCode: loc?.code ?? "BR-01",
        toCode: "POS",
        productName: payload.items[0]?.product.name ?? "Retail Sale",
        quantity: payload.items.reduce((s, i) => s + i.quantity, 0),
        timestamp: new Date().toISOString(),
        note: `Invoice ${created.invoice_number} settled via ${payload.paymentMethod}`,
      },
      ...prev,
    ]);
    return created;
  };

  const addProduct = async (
    payload: Partial<Product> & { sku: string; name: string }
  ) => {
    if (mode === "live_api") {
      await api.createProduct(payload);
      await refreshData();
      return;
    }
    const created: Product = {
      id: Date.now(),
      sku: payload.sku,
      barcode: payload.barcode ?? null,
      name: payload.name,
      generic_name: payload.generic_name ?? null,
      brand_name: payload.brand_name ?? null,
      manufacturer: payload.manufacturer ?? "MedGrid Partner",
      category: payload.category ?? "Medicine",
      strength: payload.strength ?? null,
      dosage_form: payload.dosage_form ?? "Tablet",
      pack_size: payload.pack_size ?? 10,
      base_unit: payload.base_unit ?? "strip",
      purchase_unit: payload.purchase_unit ?? "box",
      purchase_cost: Number(payload.purchase_cost ?? 2.5),
      retail_price: Number(payload.retail_price ?? 4.25),
      wholesale_price: Number(payload.wholesale_price ?? 3.4),
      min_stock_level: Number(payload.min_stock_level ?? 100),
      requires_prescription: Boolean(payload.requires_prescription),
      storage_notes: payload.storage_notes ?? "Room temperature",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setProducts((prev) => [created, ...prev]);
  };

  return (
    <AppContext.Provider
      value={{
        mode,
        isAuthenticated,
        authChecked,
        loading,
        user,
        locations,
        products,
        suppliers,
        batches,
        movements,
        purchaseOrders,
        transfers,
        sales,
        dashboard,
        lowStock,
        expiryAlerts,
        auditLogs,
        liveFlows,
        simulationRunning,
        setSimulationRunning,
        selectedLocationCode,
        setSelectedLocationCode,
        signIn,
        signInAsRolePreview,
        signOut,
        refreshData,
        triggerTransferDispatch,
        approveOrder,
        completePosSale,
        addProduct,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
