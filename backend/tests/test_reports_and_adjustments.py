from datetime import date, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory import InventoryBatch, StockStatus
from app.models.product import Product
from tests.conftest import login_headers


@pytest.mark.asyncio
async def test_dashboard_reports_and_adjustment_separation_of_duties(
    client: AsyncClient, db_session: AsyncSession, seed_base: dict
) -> None:
    owner_h = await login_headers(client, "owner@pharmacy.com", "OwnerPass123!")
    manager_h = await login_headers(client, "manager.a@pharmacy.com", "ManagerPass123!")
    branch_a_id = seed_base["branch_a"].id

    product = Product(
        sku="OMEP-20",
        name="Omeprazole 20mg",
        purchase_cost=Decimal("5.00"),
        retail_price=Decimal("8.00"),
        min_stock_level=15,
    )
    db_session.add(product)
    await db_session.flush()

    batch = InventoryBatch(
        location_id=branch_a_id,
        product_id=product.id,
        batch_number="LOT-OM-1",
        expiry_date=date.today() + timedelta(days=20),
        received_date=date.today(),
        purchase_cost=Decimal("5.00"),
        initial_quantity=10,
        current_quantity=10,
        status=StockStatus.AVAILABLE,
    )
    db_session.add(batch)
    await db_session.commit()

    # Manager requests adjustment (-2)
    adj_res = await client.post(
        "/api/v1/inventory/adjustments",
        headers=manager_h,
        json={
            "batch_id": batch.id,
            "quantity_change": -2,
            "reason": "Broken strips found during count",
        },
    )
    assert adj_res.status_code == 201, adj_res.text
    adj_id = adj_res.json()["id"]

    # Manager cannot approve own adjustment (separation of duties)
    self_approve = await client.post(
        f"/api/v1/inventory/adjustments/{adj_id}/approve",
        headers=manager_h,
    )
    assert self_approve.status_code == 403

    # Owner approves adjustment -> stock drops from 10 to 8
    approved = await client.post(
        f"/api/v1/inventory/adjustments/{adj_id}/approve",
        headers=owner_h,
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"

    # Dashboard shows inventory value (8 * 5.00 = 40.00), near-expiry batch (1), low stock alerts
    dash_res = await client.get("/api/v1/reports/dashboard", headers=owner_h)
    assert dash_res.status_code == 200, dash_res.text
    dash = dash_res.json()
    assert Decimal(dash["inventory_value"]) == Decimal("40.00")
    assert dash["near_expiry_batches"] == 1
    assert dash["low_stock_alerts"] >= 1

    low_stock = (
        await client.get(f"/api/v1/reports/low-stock?location_id={branch_a_id}", headers=manager_h)
    ).json()
    assert len(low_stock) == 1
    assert low_stock[0]["available_quantity"] == 8

    expiry = (
        await client.get(f"/api/v1/reports/expiry?location_id={branch_a_id}&days=30", headers=manager_h)
    ).json()
    assert len(expiry) == 1
    assert expiry[0]["batch_number"] == "LOT-OM-1"
