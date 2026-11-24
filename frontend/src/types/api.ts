export type LocationType = "main_office" | "central_warehouse" | "warehouse" | "branch";

export type UserRole =
  | "owner"
  | "head_office_manager"
  | "branch_manager"
  | "pharmacist"
  | "cashier"
  | "inventory_officer"
  | "stock_entry_operator"
  | "procurement_officer"
  | "accountant";

export type StockStatus =
  | "available"
  | "reserved"
  | "in_transit"
  | "quarantined"
  | "damaged"
  | "expired"
  | "disposed"
  | "returned";

export type MovementType =
  | "purchase_receipt"
  | "retail_sale"
  | "goods_receipt"
  | "sale"
  | "sale_void"
  | "sale_return"
  | "transfer_dispatch"
  | "transfer_receipt"
  | "transfer_out"
  | "transfer_in"
  | "adjustment_in"
  | "adjustment_out"
  | "expiry_write_off"
  | "expiry_writeoff"
  | "damage_loss";

export type PurchaseOrderStatus =
  | "draft"
  | "submitted"
  | "pending_approval"
  | "approved"
  | "partially_received"
  | "received"
  | "cancelled"
  | "closed";

export type TransferStatus =
  | "submitted"
  | "requested"
  | "approved"
  | "dispatched"
  | "in_transit"
  | "partially_received"
  | "received"
  | "under_investigation"
  | "rejected"
  | "cancelled";

export type PaymentMethod = "cash" | "card" | "mobile_money" | "bank_transfer";

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  can_access_all_locations: boolean;
  location_ids: number[];
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface Location {
  id: number;
  name: string;
  code: string;
  location_type: LocationType;
  address: string | null;
  phone: string | null;
  email: string | null;
  holds_stock: boolean;
  is_active: boolean;
  manager_user_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  generic_name: string | null;
  brand_name: string | null;
  manufacturer: string | null;
  category: string;
  strength: string | null;
  dosage_form: string | null;
  pack_size: number;
  base_unit: string;
  purchase_unit: string;
  purchase_cost: number;
  retail_price: number;
  wholesale_price: number;
  min_stock_level: number;
  requires_prescription: boolean;
  storage_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: number;
  code: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  license_number: string | null;
  payment_terms_days: number;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: number;
  location_id: number;
  product_id: number;
  supplier_id: number | null;
  batch_number: string;
  expiry_date: string;
  received_date: string;
  purchase_cost: number;
  initial_quantity: number;
  current_quantity: number;
  reserved_quantity: number;
  sellable_quantity: number;
  status: StockStatus;
  notes: string | null;
  created_at: string;
}

export interface StockMovement {
  id: number;
  location_id: number;
  product_id: number;
  batch_id: number;
  movement_type: MovementType;
  quantity_change: number;
  balance_after: number;
  reference_type: string | null;
  reference_id: string | null;
  reason: string | null;
  performed_by_user_id: number | null;
  created_at: string;
}

export interface PurchaseOrderItem {
  id: number;
  product_id: number;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  destination_location_id: number;
  status: PurchaseOrderStatus;
  expected_date: string | null;
  total_amount: number;
  notes: string | null;
  created_by_user_id: number;
  approved_by_user_id: number | null;
  approved_at: string | null;
  items: PurchaseOrderItem[];
  created_at: string;
}

export interface TransferItem {
  id: number;
  product_id: number;
  requested_quantity: number;
  approved_quantity: number;
  dispatched_quantity: number;
  received_quantity: number;
  shortage_quantity: number;
}

export interface Transfer {
  id: number;
  transfer_number: string;
  from_location_id: number;
  to_location_id: number;
  status: TransferStatus;
  reason: string | null;
  discrepancy_notes: string | null;
  requested_by_user_id: number;
  approved_by_user_id: number | null;
  dispatched_by_user_id: number | null;
  received_by_user_id: number | null;
  dispatched_at: string | null;
  received_at: string | null;
  items: TransferItem[];
  created_at: string;
}

export interface SaleItem {
  id: number;
  product_id: number;
  batch_id: number;
  product_name_snapshot: string;
  batch_number_snapshot: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  line_total: number;
}

export interface Sale {
  id: number;
  invoice_number: string;
  location_id: number;
  cashier_user_id: number;
  customer_name: string | null;
  customer_phone: string | null;
  status: "completed" | "voided" | "partially_returned" | "returned";
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  items: SaleItem[];
  created_at: string;
}

export interface BranchPerformanceRow {
  location_id: number;
  location_code: string;
  location_name: string;
  sales_revenue: number;
  transaction_count: number;
  inventory_value: number;
}

export interface DashboardSummary {
  sales_today: number;
  transaction_count_today: number;
  sales_this_month: number;
  estimated_gross_profit_this_month: number;
  inventory_value: number;
  low_stock_alerts: number;
  near_expiry_batches: number;
  expired_or_quarantined_batches: number;
  pending_purchase_orders: number;
  pending_transfers: number;
  supplier_outstanding_balance: number;
  branch_performance: BranchPerformanceRow[];
}

export interface LowStockItem {
  location_id: number;
  location_code: string;
  location_name: string;
  product_id: number;
  sku: string;
  product_name: string;
  available_quantity: number;
  min_stock_level: number;
}

export interface ExpiryAlertItem {
  batch_id: number;
  location_id: number;
  location_code: string;
  product_id: number;
  sku: string;
  product_name: string;
  batch_number: string;
  expiry_date: string;
  days_remaining: number;
  current_quantity: number;
  status: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  location_id: number | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  reason: string | null;
  created_at: string;
}

export interface LiveFlowEvent {
  id: string;
  kind: "transfer" | "receipt" | "sale" | "alert";
  fromCode: string;
  toCode: string;
  productName: string;
  quantity: number;
  timestamp: string;
  note: string;
}

export interface NetworkStockLocation {
  location_id: number;
  location_code: string;
  location_name: string;
  location_type: string;
  available_quantity: number;
  batch_count: number;
  nearest_expiry: string | null;
}

export interface NetworkStockProduct {
  product_id: number;
  sku: string;
  name: string;
  generic_name: string | null;
  category: string;
  requires_prescription: boolean;
  retail_price: number;
  wholesale_price: number;
  min_stock_level: number;
  total_available: number;
  locations: NetworkStockLocation[];
}

export interface StockAdjustment {
  id: number;
  location_id: number;
  product_id: number;
  batch_id: number;
  quantity_change: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  requested_by_user_id: number;
  approved_by_user_id: number | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface DailyClosing {
  id: number;
  location_id: number;
  closing_date: string;
  transaction_count: number;
  total_sales_amount: number;
  expected_cash: number;
  expected_card: number;
  expected_mobile_money: number;
  expected_bank_transfer: number;
  actual_cash: number;
  actual_non_cash: number;
  cash_discrepancy: number;
  notes: string | null;
  submitted_by_user_id: number;
  created_at: string;
}

export interface LiveToast {
  id: string;
  title: string;
  detail: string;
  actor?: string | null;
  kind: "transfer" | "receipt" | "sale" | "system";
  timestamp: string;
}

