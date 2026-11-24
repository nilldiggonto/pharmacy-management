from collections.abc import AsyncGenerator

import fakeredis.aioredis
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db
from app.core.redis import set_redis_client
from app.core.security import hash_password
from app.main import app
from app.models.base import Base
from app.models.location import Location, LocationType
from app.models.user import User, UserLocationAccess, UserRole


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    fake_redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
    set_redis_client(fake_redis)

    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
    await fake_redis.aclose()


@pytest_asyncio.fixture
async def seed_base(db_session: AsyncSession) -> dict:
    warehouse = Location(
        name="Central Warehouse",
        code="WH-01",
        location_type=LocationType.CENTRAL_WAREHOUSE,
        holds_stock=True,
    )
    branch_a = Location(
        name="Branch Alpha",
        code="BR-01",
        location_type=LocationType.BRANCH,
        holds_stock=True,
    )
    branch_b = Location(
        name="Branch Beta",
        code="BR-02",
        location_type=LocationType.BRANCH,
        holds_stock=True,
    )
    db_session.add_all([warehouse, branch_a, branch_b])
    await db_session.flush()

    owner = User(
        email="owner@pharmacy.com",
        full_name="Business Owner",
        password_hash=hash_password("OwnerPass123!"),
        role=UserRole.OWNER,
        can_access_all_locations=True,
    )
    cashier_a = User(
        email="cashier.a@pharmacy.com",
        full_name="Cashier Alpha",
        password_hash=hash_password("CashierPass123!"),
        role=UserRole.CASHIER,
        can_access_all_locations=False,
    )
    manager_a = User(
        email="manager.a@pharmacy.com",
        full_name="Manager Alpha",
        password_hash=hash_password("ManagerPass123!"),
        role=UserRole.BRANCH_MANAGER,
        can_access_all_locations=False,
    )
    db_session.add_all([owner, cashier_a, manager_a])
    await db_session.flush()

    db_session.add_all(
        [
            UserLocationAccess(user_id=cashier_a.id, location_id=branch_a.id),
            UserLocationAccess(user_id=manager_a.id, location_id=branch_a.id),
        ]
    )
    await db_session.commit()
    return {
        "warehouse": warehouse,
        "branch_a": branch_a,
        "branch_b": branch_b,
        "owner": owner,
        "cashier_a": cashier_a,
        "manager_a": manager_a,
    }


async def login_headers(client: AsyncClient, email: str, password: str) -> dict[str, str]:
    res = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
