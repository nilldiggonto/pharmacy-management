from datetime import date, timedelta

import pytest
from httpx import AsyncClient

from tests.conftest import login_headers


@pytest.mark.asyncio
async def test_purchasing_partial_receipt_and_transfer_in_transit(
    client: AsyncClient, seed_base: dict
) -> None:
    owner_h = await login_headers(client, "owner@pharmacy.com", "OwnerPass123!")
    manager_a_h = await login_headers(client, "manager.a@pharmacy.com", "ManagerPass123!")
    warehouse_id = seed_base["warehouse"].id
    branch_a_id = seed_base["branch_a"].id

    # Create product and supplier
    prod = (
        await client.post(
            "/api/v1/products",
            headers=owner_h,
            json={
                "sku": "PARA-500",
                "barcode": "8901234567890",
                "name": "Paracetamol 500mg",
                "generic_name": "Paracetamol",
                "purchase_cost": "10.00",
                "retail_price": "15.00",
                "wholesale_price": "12.00",
            },
        )
    ).json()
    sup = (
        await client.post(
            "/api/v1/suppliers",
            headers=owner_h,
            json={"code": "SUP-01", "name": "Square Pharma"},
        )
    ).json()

    # Create PO for 100 units -> must NOT increase stock
    po = (
        await client.post(
            "/api/v1/purchasing/orders",
            headers=owner_h,
            json={
                "supplier_id": sup["id"],
                "destination_location_id": warehouse_id,
                "items": [{"product_id": prod["id"], "quantity_ordered": 100, "unit_cost": "10.00"}],
            },
        )
    ).json()
    assert po["status"] == "submitted"

    batches_before = (
        await client.get(f"/api/v1/inventory/batches?location_id={warehouse_id}", headers=owner_h)
    ).json()
    assert batches_before == []

    # Approve PO
    approved_po = (
        await client.post(f"/api/v1/purchasing/orders/{po['id']}/approve", headers=owner_h)
    ).json()
    assert approved_po["status"] == "approved"

    # Partial receipt of 60 units
    po_item_id = po["items"][0]["id"]
    expiry = (date.today() + timedelta(days=180)).isoformat()
    grn = await client.post(
        f"/api/v1/purchasing/orders/{po['id']}/receive",
        headers=owner_h,
        json={
            "supplier_invoice_number": "INV-1001",
            "items": [
                {
                    "po_item_id": po_item_id,
                    "batch_number": "LOT-A1",
                    "expiry_date": expiry,
                    "quantity_received": 60,
                }
            ],
        },
    )
    assert grn.status_code == 201, grn.text

    po_after = (await client.get(f"/api/v1/purchasing/orders/{po['id']}", headers=owner_h)).json()
    assert po_after["status"] == "partially_received"
    assert po_after["items"][0]["quantity_received"] == 60

    wh_batches = (
        await client.get(f"/api/v1/inventory/batches?location_id={warehouse_id}", headers=owner_h)
    ).json()
    assert len(wh_batches) == 1
    assert wh_batches[0]["current_quantity"] == 60

    # Branch A requests transfer of 25 units from warehouse
    trf = (
        await client.post(
            "/api/v1/transfers",
            headers=manager_a_h,
            json={
                "from_location_id": warehouse_id,
                "to_location_id": branch_a_id,
                "reason": "Weekly replenishment",
                "items": [{"product_id": prod["id"], "requested_quantity": 25}],
            },
        )
    ).json()
    assert trf["status"] == "submitted"

    # Approve and dispatch
    assert (await client.post(f"/api/v1/transfers/{trf['id']}/approve", headers=owner_h)).status_code == 200
    disp = await client.post(f"/api/v1/transfers/{trf['id']}/dispatch", headers=owner_h)
    assert disp.status_code == 200
    assert disp.json()["status"] == "dispatched"

    # Warehouse stock reduced to 35, Branch A still has 0 (in transit!)
    wh_after_disp = (
        await client.get(f"/api/v1/inventory/batches?location_id={warehouse_id}", headers=owner_h)
    ).json()
    assert wh_after_disp[0]["current_quantity"] == 35
    br_before_recv = (
        await client.get(f"/api/v1/inventory/batches?location_id={branch_a_id}", headers=manager_a_h)
    ).json()
    assert br_before_recv == []

    # Branch A receives 23 units (2 units short -> under_investigation)
    trf_item_id = trf["items"][0]["id"]
    recv = await client.post(
        f"/api/v1/transfers/{trf['id']}/receive",
        headers=manager_a_h,
        json={
            "items": [{"transfer_item_id": trf_item_id, "received_quantity": 23}],
            "discrepancy_notes": "2 units missing from box",
        },
    )
    assert recv.status_code == 200, recv.text
    assert recv.json()["status"] == "under_investigation"
    assert recv.json()["items"][0]["shortage_quantity"] == 2

    br_after_recv = (
        await client.get(f"/api/v1/inventory/batches?location_id={branch_a_id}", headers=manager_a_h)
    ).json()
    assert len(br_after_recv) == 1
    assert br_after_recv[0]["current_quantity"] == 23

