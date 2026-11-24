from datetime import date, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory import InventoryBatch, StockStatus
from app.models.product import Product
from tests.conftest import login_headers


@pytest.mark.asyncio
async def test_pos_fefo_expired_block_return_quarantine_and_closing(
    client: AsyncClient, db_session: AsyncSession, seed_base: dict
) -> None:
    owner_h = await login_headers(client, "owner@pharmacy.com", "OwnerPass123!")
    cashier_h = await login_headers(client, "cashier.a@pharmacy.com", "CashierPass123!")
    manager_h = await login_headers(client, "manager.a@pharmacy.com", "ManagerPass123!")
    branch_a_id = seed_base["branch_a"].id

    # Seed product and 3 batches: 1 expired, 1 expiring soon (FEFO first), 1 expiring later
    product = Product(
        sku="AMOX-500",
        name="Amoxicillin 500mg",
        purchase_cost=Decimal("20.00"),
        retail_price=Decimal("30.00"),
        wholesale_price=Decimal("24.00"),
    )
    db_session.add(product)
    await db_session.flush()

    expired_batch = InventoryBatch(
        location_id=branch_a_id,
        product_id=product.id,
        batch_number="LOT-EXPIRED",
        expiry_date=date.today() - timedelta(days=2),
        received_date=date.today() - timedelta(days=100),
        purchase_cost=Decimal("20.00"),
        initial_quantity=50,
        current_quantity=50,
        status=StockStatus.AVAILABLE,
    )
    soon_batch = InventoryBatch(
        location_id=branch_a_id,
        product_id=product.id,
        batch_number="LOT-SOON",
        expiry_date=date.today() + timedelta(days=30),
        received_date=date.today() - timedelta(days=10),
        purchase_cost=Decimal("20.00"),
        initial_quantity=5,
        current_quantity=5,
        status=StockStatus.AVAILABLE,
    )
    later_batch = InventoryBatch(
        location_id=branch_a_id,
        product_id=product.id,
        batch_number="LOT-LATER",
        expiry_date=date.today() + timedelta(days=180),
        received_date=date.today() - timedelta(days=5),
        purchase_cost=Decimal("20.00"),
        initial_quantity=10,
        current_quantity=10,
        status=StockStatus.AVAILABLE,
    )
    db_session.add_all([expired_batch, soon_batch, later_batch])
    await db_session.commit()

    # Selling 20 must fail (only 15 non-expired units available, expired 50 must be ignored)
    fail_res = await client.post(
        "/api/v1/sales",
        headers=cashier_h,
        json={
            "location_id": branch_a_id,
            "items": [{"product_id": product.id, "quantity": 20}],
            "payments": [{"payment_method": "cash", "amount": "600.00"}],
        },
    )
    assert fail_res.status_code == 400

    # Sell 7 units -> must take 5 from LOT-SOON and 2 from LOT-LATER (FEFO)
    sale_res = await client.post(
        "/api/v1/sales",
        headers=cashier_h,
        json={
            "location_id": branch_a_id,
            "items": [{"product_id": product.id, "quantity": 7}],
            "payments": [{"payment_method": "cash", "amount": "210.00"}],
        },
    )
    assert sale_res.status_code == 201, sale_res.text
    sale = sale_res.json()
    assert len(sale["items"]) == 2
    assert sale["items"][0]["batch_number_snapshot"] == "LOT-SOON"
    assert sale["items"][0]["quantity"] == 5
    assert sale["items"][1]["batch_number_snapshot"] == "LOT-LATER"
    assert sale["items"][1]["quantity"] == 2

    # Update product price -> historical invoice must remain unchanged
    assert (
        await client.patch(
            f"/api/v1/products/{product.id}",
            headers=owner_h,
            json={"retail_price": "45.00"},
        )
    ).status_code == 200
    hist_sale = (await client.get(f"/api/v1/sales/{sale['id']}", headers=cashier_h)).json()
    assert Decimal(hist_sale["items"][0]["unit_price"]) == Decimal("30.00")

    # Return 2 units -> must enter QUARANTINED stock, not AVAILABLE
    ret_res = await client.post(
        f"/api/v1/sales/{sale['id']}/returns",
        headers=cashier_h,
        json={
            "reason": "Customer bought wrong strength",
            "refund_method": "cash",
            "items": [{"sale_item_id": sale["items"][1]["id"], "quantity": 2}],
        },
    )
    assert ret_res.status_code == 201, ret_res.text
    quarantined = (
        await client.get(
            f"/api/v1/inventory/batches?location_id={branch_a_id}&batch_status=quarantined",
            headers=manager_h,
        )
    ).json()
    assert len(quarantined) == 1
    assert quarantined[0]["current_quantity"] == 2
    assert quarantined[0]["sellable_quantity"] == 0

    # Cashier cannot void sale; manager can
    void_denied = await client.post(
        f"/api/v1/sales/{sale['id']}/void",
        headers=cashier_h,
        json={"reason": "Mistake"},
    )
    assert void_denied.status_code == 403

    # Daily closing reconciles expected cash (210.00) vs actual cash (205.00) -> -5.00 discrepancy
    closing_res = await client.post(
        "/api/v1/sales/closings",
        headers=manager_h,
        json={
            "location_id": branch_a_id,
            "actual_cash": "205.00",
            "notes": "5.00 short in register",
        },
    )
    assert closing_res.status_code == 201, closing_res.text
    closing = closing_res.json()
    assert Decimal(closing["expected_cash"]) == Decimal("210.00")
    assert Decimal(closing["cash_discrepancy"]) == Decimal("-5.00")

