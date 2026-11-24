from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class BranchPerformanceRow(BaseModel):
    location_id: int
    location_code: str
    location_name: str
    sales_revenue: Decimal
    transaction_count: int
    inventory_value: Decimal


class DashboardSummary(BaseModel):
    sales_today: Decimal
    transaction_count_today: int
    sales_this_month: Decimal
    estimated_gross_profit_this_month: Decimal
    inventory_value: Decimal
    low_stock_alerts: int
    near_expiry_batches: int
    expired_or_quarantined_batches: int
    pending_purchase_orders: int
    pending_transfers: int
    supplier_outstanding_balance: Decimal
    branch_performance: list[BranchPerformanceRow]


class LowStockItem(BaseModel):
    location_id: int
    location_code: str
    location_name: str
    product_id: int
    sku: str
    product_name: str
    available_quantity: int
    min_stock_level: int


class ExpiryAlertItem(BaseModel):
    batch_id: int
    location_id: int
    location_code: str
    product_id: int
    sku: str
    product_name: str
    batch_number: str
    expiry_date: date
    days_remaining: int
    current_quantity: int
    status: str

