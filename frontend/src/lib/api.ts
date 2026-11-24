import type {
  AuditLog,
  Batch,
  DashboardSummary,
  ExpiryAlertItem,
  Location,
  LowStockItem,
  Product,
  PurchaseOrder,
  Sale,
  StockMovement,
  Supplier,
  TokenResponse,
  Transfer,
  User,
} from "@/types/api";

const API_BASE =
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

  getPurchaseOrders: () => request<PurchaseOrder[]>("/purchasing/orders"),
  approvePurchaseOrder: (id: number) =>
    request<PurchaseOrder>(`/purchasing/orders/${id}/approve`, {
      method: "POST",
    }),

  getTransfers: () => request<Transfer[]>("/transfers"),
  approveTransfer: (id: number) =>
    request<Transfer>(`/transfers/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  dispatchTransfer: (id: number) =>
    request<Transfer>(`/transfers/${id}/dispatch`, {
      method: "POST",
    }),

  getSales: () => request<Sale[]>("/sales"),
  createSale: (payload: Record<string, unknown>) =>
    request<Sale>("/sales", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getAuditLogs: () => request<AuditLog[]>("/audit-logs"),
};

