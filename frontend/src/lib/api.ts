import type {
  AuditLog,
  Batch,
  DailyClosing,
  DashboardSummary,
  ExpiryAlertItem,
  Location,
  LowStockItem,
  NetworkStockProduct,
  Product,
  PurchaseOrder,
  Sale,
  StockAdjustment,
  StockMovement,
  Supplier,
  TokenResponse,
  Transfer,
  User,
} from "@/types/api";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const ACCESS_TOKEN_KEY = "pm_access_token";
const REFRESH_TOKEN_KEY = "pm_refresh_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setStoredTokens(access: string, refresh: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearStoredTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getEventsStreamUrl(): string | null {
  const token = getStoredToken();
  if (!token) return null;
  return `${API_BASE}/events/stream?token=${encodeURIComponent(token)}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    let detail = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) {
        detail =
          typeof body.detail === "string"
            ? body.detail
            : JSON.stringify(body.detail);
      }
    } catch {
      // ignore json parse failure
    }
    throw new Error(detail);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<User>("/auth/me"),
  logout: () =>
    request<void>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({
        refresh_token:
          typeof window !== "undefined"
            ? localStorage.getItem(REFRESH_TOKEN_KEY)
            : null,
      }),
    }),

  getDashboard: () => request<DashboardSummary>("/reports/dashboard"),
  getLowStock: () => request<LowStockItem[]>("/reports/low-stock"),
  getExpiryAlerts: (days = 90) =>
    request<ExpiryAlertItem[]>(`/reports/expiry?days=${days}`),

  getLocations: () => request<Location[]>("/locations"),
  getProducts: (q?: string) =>
    request<Product[]>(q ? `/products?q=${encodeURIComponent(q)}` : "/products"),
  createProduct: (payload: Record<string, unknown>) =>
    request<Product>("/products", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getSuppliers: () => request<Supplier[]>("/suppliers"),
  getNetworkAvailability: (q?: string) =>
    request<NetworkStockProduct[]>(
      q ? `/inventory/availability?q=${encodeURIComponent(q)}` : "/inventory/availability"
    ),
  getBatches: (locationId?: number) =>
    request<Batch[]>(
      locationId
        ? `/inventory/batches?location_id=${locationId}`
        : "/inventory/batches"
    ),
  getMovements: (locationId?: number) =>
    request<StockMovement[]>(
      locationId
        ? `/inventory/movements?location_id=${locationId}`
        : "/inventory/movements"
    ),
  updateBatchStatus: (batchId: number, status: string, reason: string) =>
    request<Batch>(`/inventory/batches/${batchId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason }),
    }),
  getAdjustments: () => request<StockAdjustment[]>("/inventory/adjustments"),
  requestAdjustment: (payload: {
    batch_id: number;
    quantity_change: number;
    reason: string;
    notes?: string;
  }) =>
    request<StockAdjustment>("/inventory/adjustments", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  approveAdjustment: (id: number, notes?: string) =>
    request<StockAdjustment>(`/inventory/adjustments/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ notes: notes || null }),
    }),
  rejectAdjustment: (id: number, notes?: string) =>
    request<StockAdjustment>(`/inventory/adjustments/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ notes: notes || null }),
    }),

  getPurchaseOrders: () => request<PurchaseOrder[]>("/purchasing/orders"),
  createPurchaseOrder: (payload: {
    supplier_id: number;
    destination_location_id: number;
    expected_date?: string | null;
    notes?: string | null;
    items: { product_id: number; quantity_ordered: number; unit_cost: number }[];
  }) =>
    request<PurchaseOrder>("/purchasing/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  approvePurchaseOrder: (id: number) =>
    request<PurchaseOrder>(`/purchasing/orders/${id}/approve`, {
      method: "POST",
    }),
  receivePurchaseOrder: (
    poId: number,
    payload: {
      supplier_invoice_number?: string | null;
      notes?: string | null;
      items: {
        po_item_id: number;
        batch_number: string;
        expiry_date: string;
        quantity_received: number;
        damaged_quantity: number;
      }[];
    }
  ) =>
    request<unknown>(`/purchasing/orders/${poId}/receive`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getTransfers: () => request<Transfer[]>("/transfers"),
  createTransfer: (payload: {
    from_location_id: number;
    to_location_id: number;
    reason?: string | null;
    items: { product_id: number; requested_quantity: number }[];
  }) =>
    request<Transfer>("/transfers", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  approveTransfer: (id: number) =>
    request<Transfer>(`/transfers/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  dispatchTransfer: (id: number) =>
    request<Transfer>(`/transfers/${id}/dispatch`, {
      method: "POST",
    }),
  receiveTransfer: (
    id: number,
    payload: {
      discrepancy_notes?: string | null;
      items: { transfer_item_id: number; received_quantity: number }[];
    }
  ) =>
    request<Transfer>(`/transfers/${id}/receive`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getSales: () => request<Sale[]>("/sales"),
  createSale: (payload: Record<string, unknown>) =>
    request<Sale>("/sales", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  voidSale: (saleId: number, reason: string) =>
    request<Sale>(`/sales/${saleId}/void`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  returnSale: (
    saleId: number,
    payload: {
      reason: string;
      refund_method: string;
      items: { sale_item_id: number; quantity: number; condition: string }[];
    }
  ) =>
    request<unknown>(`/sales/${saleId}/returns`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getDailyClosings: () => request<DailyClosing[]>("/sales/closings"),
  createDailyClosing: (payload: {
    location_id: number;
    actual_cash: number;
    actual_non_cash: number;
    notes?: string | null;
  }) =>
    request<DailyClosing>("/sales/closings", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getAuditLogs: () => request<AuditLog[]>("/audit-logs"),
};
