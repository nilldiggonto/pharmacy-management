import pytest
from httpx import AsyncClient

from tests.conftest import login_headers


@pytest.mark.asyncio
async def test_auth_lifecycle_and_revocation(client: AsyncClient, seed_base: dict) -> None:
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@pharmacy.com", "password": "OwnerPass123!"},
    )
    assert res.status_code == 200
    data = res.json()
    access = data["access_token"]
    refresh = data["refresh_token"]

    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access}"})
    assert me.status_code == 200
    assert me.json()["role"] == "owner"

    refreshed = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert refreshed.status_code == 200
    new_access = refreshed.json()["access_token"]

    # Old refresh token must now be revoked
    reused = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert reused.status_code == 401

    # Logout revokes access token
    out = await client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {new_access}"})
    assert out.status_code == 200

    blocked = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {new_access}"})
    assert blocked.status_code == 401


@pytest.mark.asyncio
async def test_location_scoped_access_and_rbac(client: AsyncClient, seed_base: dict) -> None:
    owner_headers = await login_headers(client, "owner@pharmacy.com", "OwnerPass123!")
    cashier_headers = await login_headers(client, "cashier.a@pharmacy.com", "CashierPass123!")

    # Owner sees all 3 locations
    res_owner = await client.get("/api/v1/locations", headers=owner_headers)
    assert res_owner.status_code == 200
    assert len(res_owner.json()) == 3

    # Cashier sees only assigned branch_a
    res_cashier = await client.get("/api/v1/locations", headers=cashier_headers)
    assert res_cashier.status_code == 200
    assert [loc["code"] for loc in res_cashier.json()] == ["BR-01"]

    # Cashier cannot view branch_b
    branch_b_id = seed_base["branch_b"].id
    denied = await client.get(f"/api/v1/locations/{branch_b_id}", headers=cashier_headers)
    assert denied.status_code == 403

    # Cashier cannot create a location
    create_denied = await client.post(
        "/api/v1/locations",
        headers=cashier_headers,
        json={"name": "Branch C", "code": "BR-03", "location_type": "branch"},
    )
    assert create_denied.status_code == 403

    # Owner can view audit logs
    audits = await client.get("/api/v1/audit-logs", headers=owner_headers)
    assert audits.status_code == 200
    assert any(a["action"] == "auth.login" for a in audits.json())
