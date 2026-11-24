"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  api,
  clearStoredTokens,
  getEventsStreamUrl,
  getStoredToken,
  setStoredTokens,
} from "@/lib/api";
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
  DailyClosing,
  DashboardSummary,
  ExpiryAlertItem,
  LiveFlowEvent,
  LiveToast,
  Location,
  LowStockItem,
  NetworkStockProduct,
  Product,
  PurchaseOrder,
  Sale,
  StockAdjustment,
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
  sseConnected: boolean;
  liveToast: LiveToast | null;
  dismissToast: () => void;
  user: User | null;
  locations: Location[];
  products: Product[];
  suppliers: Supplier[];
  batches: Batch[];
  networkStock: NetworkStockProduct[];
  adjustments: StockAdjustment[];
  dailyClosings: DailyClosing[];
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
  requestRestockTransfer: (payload: {
    fromLocationId: number;
    toLocationId: number;
    reason: string;
    items: { productId: number; quantity: number }[];
  }) => Promise<void>;
  approveTransferRequest: (transferId: number) => Promise<void>;
  triggerTransferDispatch: (transferId: number) => Promise<void>;
  receiveTransferShipment: (
    transferId: number,
    payload: {
      discrepancyNotes?: string;
      items: { transferItemId: number; receivedQuantity: number }[];
    }
  ) => Promise<void>;
  createNewPurchaseOrder: (payload: {
    supplierId: number;
    destinationLocationId: number;
    expectedDate?: string;
    notes?: string;
    items: { productId: number; quantity: number; unitCost: number }[];
  }) => Promise<void>;
  approveOrder: (poId: number) => Promise<void>;
  receivePurchaseOrderGoods: (
    poId: number,
    payload: {
      supplierInvoiceNumber?: string;
      notes?: string;
      items: {
        poItemId: number;
        batchNumber: string;
        expiryDate: string;
        quantityReceived: number;
        damagedQuantity: number;
      }[];
    }
  ) => Promise<void>;
  changeBatchStatus: (batchId: number, status: string, reason: string) => Promise<void>;
  requestStockAdjustment: (payload: {
    batchId: number;
    quantityChange: number;
    reason: string;
    notes?: string;
  }) => Promise<void>;
  approveStockAdjustment: (id: number) => Promise<void>;
  rejectStockAdjustment: (id: number) => Promise<void>;
  completePosSale: (payload: {
    locationId: number;
    customerName: string;
    customerPhone?: string;
    paymentMethod: string;
    saleMode?: "retail" | "wholesale";
    items: { product: Product; quantity: number }[];
  }) => Promise<Sale>;
  voidSaleInvoice: (saleId: number, reason: string) => Promise<void>;
  returnSaleItem: (
    saleId: number,
    payload: {
      saleItemId: number;
      quantity: number;
      reason: string;
      refundMethod: string;
      condition: string;
    }
  ) => Promise<void>;
  submitDailyClosing: (payload: {
    locationId: number;
    actualCash: number;
    actualNonCash: number;
    notes?: string;
  }) => Promise<void>;
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
        ? [3, 4]
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
  const [sseConnected, setSseConnected] = useState(false);
  const [liveToast, setLiveToast] = useState<LiveToast | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [locations, setLocations] = useState<Location[]>(DEMO_LOCATIONS);
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [suppliers, setSuppliers] = useState<Supplier[]>(DEMO_SUPPLIERS);
  const [batches, setBatches] = useState<Batch[]>(DEMO_BATCHES);
  const [networkStock, setNetworkStock] = useState<NetworkStockProduct[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [dailyClosings, setDailyClosings] = useState<DailyClosing[]>([]);
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
  const [selectedLocationCode, setSelectedLocationCode] = useState<string | null>("WH-01");

  const isAuthenticated = user !== null && mode !== "unauthenticated";

  const showToast = useCallback((toast: LiveToast) => {
    setLiveToast(toast);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setLiveToast(null);
    }, 6000);
  }, []);

  const dismissToast = useCallback(() => {
    setLiveToast(null);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const loadLiveData = useCallback(async () => {
    const [
      me,
      dash,
      locs,
      prods,
      sups,
      btchs,
      netAvail,
      adjs,
      closings,
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
      api.getNetworkAvailability().catch(() => []),
      api.getAdjustments().catch(() => []),
      api.getDailyClosings().catch(() => []),
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
    setNetworkStock(netAvail);
    setAdjustments(adjs);
    setDailyClosings(closings);
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

  // Real-time Server-Sent Events (SSE) subscription when connected to live FastAPI
  useEffect(() => {
    if (mode !== "live_api" || !isAuthenticated) {
      setSseConnected(false);
      return;
    }
    const url = getEventsStreamUrl();
    if (!url || typeof EventSource === "undefined") return;

    const es = new EventSource(url);
    es.onopen = () => setSseConnected(true);
    es.onerror = () => setSseConnected(false);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event_type === "connected") {
          setSseConnected(true);
          return;
        }
        showToast({
          id: data.id || `evt-${Date.now()}`,
          title: data.title || "Live update",
          detail: data.detail || "Inventory state updated",
          actor: data.actor,
          kind: data.kind || "system",
          timestamp: data.timestamp || new Date().toISOString(),
        });
        if (data.from_code && data.to_code) {
          setLiveFlows((prev) => [
            {
              id: data.id || `sse-${Date.now()}`,
              kind: data.kind === "receipt" || data.kind === "sale" ? data.kind : "transfer",
              fromCode: data.from_code,
              toCode: data.to_code,
              productName: data.product_name || data.title || "Live Stock Event",
              quantity: data.quantity || 1,
              timestamp: data.timestamp || new Date().toISOString(),
              note: data.detail || "",
            },
            ...prev,
          ].slice(0, 30));
        }
        void loadLiveData();
      } catch {
        // ignore malformed heartbeat
      }
    };

    return () => {
      es.close();
      setSseConnected(false);
    };
  }, [mode, isAuthenticated, loadLiveData, showToast]);

  // Ambient flow ticker in role_preview mode
  useEffect(() => {
    if (!simulationRunning || !isAuthenticated || mode !== "role_preview") return;
    const interval = setInterval(() => {
      const ev = createSimulatedFlowEvent();
      setLiveFlows((prev) => [ev, ...prev].slice(0, 24));
    }, 4500);
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

  const requestRestockTransfer = async (payload: {
    fromLocationId: number;
    toLocationId: number;
    reason: string;
    items: { productId: number; quantity: number }[];
  }) => {
    if (mode === "live_api") {
      await api.createTransfer({
        from_location_id: payload.fromLocationId,
        to_location_id: payload.toLocationId,
        reason: payload.reason,
        items: payload.items.map((i) => ({
          product_id: i.productId,
          requested_quantity: i.quantity,
        })),
      });
      await loadLiveData();
      return;
    }
    showToast({
      id: `demo-trf-${Date.now()}`,
      title: "Restock request created",
      detail: payload.reason,
      kind: "transfer",
      timestamp: new Date().toISOString(),
    });
  };

  const approveTransferRequest = async (transferId: number) => {
    if (mode === "live_api") {
      await api.approveTransfer(transferId);
      await loadLiveData();
      return;
    }
    setTransfers((prev) =>
      prev.map((t) => (t.id === transferId ? { ...t, status: "approved" } : t))
    );
  };

  const triggerTransferDispatch = async (transferId: number) => {
    if (mode === "live_api") {
      await api.dispatchTransfer(transferId);
      await loadLiveData();
      return;
    }
    setTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId
          ? { ...t, status: "dispatched", dispatched_at: new Date().toISOString() }
          : t
      )
    );
  };

  const receiveTransferShipment = async (
    transferId: number,
    payload: {
      discrepancyNotes?: string;
      items: { transferItemId: number; receivedQuantity: number }[];
    }
  ) => {
    if (mode === "live_api") {
      await api.receiveTransfer(transferId, {
        discrepancy_notes: payload.discrepancyNotes || null,
        items: payload.items.map((i) => ({
          transfer_item_id: i.transferItemId,
          received_quantity: i.receivedQuantity,
        })),
      });
      await loadLiveData();
      return;
    }
    setTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId
          ? { ...t, status: "received", received_at: new Date().toISOString() }
          : t
      )
    );
  };

  const createNewPurchaseOrder = async (payload: {
    supplierId: number;
    destinationLocationId: number;
    expectedDate?: string;
    notes?: string;
    items: { productId: number; quantity: number; unitCost: number }[];
  }) => {
    if (mode === "live_api") {
      await api.createPurchaseOrder({
        supplier_id: payload.supplierId,
        destination_location_id: payload.destinationLocationId,
        expected_date: payload.expectedDate || null,
        notes: payload.notes || null,
        items: payload.items.map((i) => ({
          product_id: i.productId,
          quantity_ordered: i.quantity,
          unit_cost: i.unitCost,
        })),
      });
      await loadLiveData();
    }
  };

  const approveOrder = async (poId: number) => {
    if (mode === "live_api") {
      await api.approvePurchaseOrder(poId);
      await loadLiveData();
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

  const receivePurchaseOrderGoods = async (
    poId: number,
    payload: {
      supplierInvoiceNumber?: string;
      notes?: string;
      items: {
        poItemId: number;
        batchNumber: string;
        expiryDate: string;
        quantityReceived: number;
        damagedQuantity: number;
      }[];
    }
  ) => {
    if (mode === "live_api") {
      await api.receivePurchaseOrder(poId, {
        supplier_invoice_number: payload.supplierInvoiceNumber || null,
        notes: payload.notes || null,
        items: payload.items.map((i) => ({
          po_item_id: i.poItemId,
          batch_number: i.batchNumber,
          expiry_date: i.expiryDate,
          quantity_received: i.quantityReceived,
          damaged_quantity: i.damagedQuantity,
        })),
      });
      await loadLiveData();
    }
  };

  const changeBatchStatus = async (batchId: number, status: string, reason: string) => {
    if (mode === "live_api") {
      await api.updateBatchStatus(batchId, status, reason);
      await loadLiveData();
    }
  };

  const requestStockAdjustment = async (payload: {
    batchId: number;
    quantityChange: number;
    reason: string;
    notes?: string;
  }) => {
    if (mode === "live_api") {
      await api.requestAdjustment({
        batch_id: payload.batchId,
        quantity_change: payload.quantityChange,
        reason: payload.reason,
        notes: payload.notes,
      });
      await loadLiveData();
    }
  };

  const approveStockAdjustment = async (id: number) => {
    if (mode === "live_api") {
      await api.approveAdjustment(id);
      await loadLiveData();
    }
  };

  const rejectStockAdjustment = async (id: number) => {
    if (mode === "live_api") {
      await api.rejectAdjustment(id);
      await loadLiveData();
    }
  };

  const completePosSale = async (payload: {
    locationId: number;
    customerName: string;
    customerPhone?: string;
    paymentMethod: string;
    saleMode?: "retail" | "wholesale";
    items: { product: Product; quantity: number }[];
  }): Promise<Sale> => {
    const isWholesale = payload.saleMode === "wholesale";
    const subtotal = payload.items.reduce(
      (sum, item) =>
        sum +
        Number(isWholesale ? item.product.wholesale_price : item.product.retail_price) *
          item.quantity,
      0
    );
    const total = Number(subtotal.toFixed(2));

    if (mode === "live_api") {
      const created = await api.createSale({
        location_id: payload.locationId,
        customer_name:
          payload.customerName ||
          (isWholesale ? "Wholesale Clinic Order" : "Walk-In Customer"),
        customer_phone: payload.customerPhone || null,
        items: payload.items.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
          unit_price: Number(
            isWholesale ? i.product.wholesale_price : i.product.retail_price
          ),
        })),
        payments: [{ payment_method: payload.paymentMethod, amount: total }],
      });
      await loadLiveData();
      return created;
    }

    const loc = locations.find((l) => l.id === payload.locationId);
    const created: Sale = {
      id: Date.now(),
      invoice_number: `INV-${loc?.code ?? "BR01"}-${Math.floor(1000 + Math.random() * 8999)}`,
      location_id: payload.locationId,
      cashier_user_id: user?.id ?? 1,
      customer_name: payload.customerName || "Walk In Customer",
      customer_phone: payload.customerPhone || null,
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
        unit_price: isWholesale ? i.product.wholesale_price : i.product.retail_price,
        unit_cost: i.product.purchase_cost,
        line_total: Number(
          ((isWholesale ? i.product.wholesale_price : i.product.retail_price) * i.quantity).toFixed(2)
        ),
      })),
      created_at: new Date().toISOString(),
    };
    setSales((prev) => [created, ...prev]);
    return created;
  };

  const voidSaleInvoice = async (saleId: number, reason: string) => {
    if (mode === "live_api") {
      await api.voidSale(saleId, reason);
      await loadLiveData();
    }
  };

  const returnSaleItem = async (
    saleId: number,
    payload: {
      saleItemId: number;
      quantity: number;
      reason: string;
      refundMethod: string;
      condition: string;
    }
  ) => {
    if (mode === "live_api") {
      await api.returnSale(saleId, {
        reason: payload.reason,
        refund_method: payload.refundMethod,
        items: [
          {
            sale_item_id: payload.saleItemId,
            quantity: payload.quantity,
            condition: payload.condition,
          },
        ],
      });
      await loadLiveData();
    }
  };

  const submitDailyClosing = async (payload: {
    locationId: number;
    actualCash: number;
    actualNonCash: number;
    notes?: string;
  }) => {
    if (mode === "live_api") {
      await api.createDailyClosing({
        location_id: payload.locationId,
        actual_cash: payload.actualCash,
        actual_non_cash: payload.actualNonCash,
        notes: payload.notes || null,
      });
      await loadLiveData();
    }
  };

  const addProduct = async (
    payload: Partial<Product> & { sku: string; name: string }
  ) => {
    if (mode === "live_api") {
      await api.createProduct(payload);
      await loadLiveData();
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
        sseConnected,
        liveToast,
        dismissToast,
        user,
        locations,
        products,
        suppliers,
        batches,
        networkStock,
        adjustments,
        dailyClosings,
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
        requestRestockTransfer,
        approveTransferRequest,
        triggerTransferDispatch,
        receiveTransferShipment,
        createNewPurchaseOrder,
        approveOrder,
        receivePurchaseOrderGoods,
        changeBatchStatus,
        requestStockAdjustment,
        approveStockAdjustment,
        rejectStockAdjustment,
        completePosSale,
        voidSaleInvoice,
        returnSaleItem,
        submitDailyClosing,
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
