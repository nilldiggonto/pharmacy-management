"""Idempotent seed script for initial organization setup:
- 1 Main Office
- 1 Central Warehouse
- 7 Pharmacy Branches
- 1 Owner account
"""
import asyncio

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.location import Location, LocationType
from app.models.user import User, UserRole


DEFAULT_LOCATIONS = [
    ("Main Office", "HQ-01", LocationType.MAIN_OFFICE, False),
    ("Central Warehouse", "WH-01", LocationType.CENTRAL_WAREHOUSE, True),
    ("Pharmacy Branch 1", "BR-01", LocationType.BRANCH, True),
    ("Pharmacy Branch 2", "BR-02", LocationType.BRANCH, True),
    ("Pharmacy Branch 3", "BR-03", LocationType.BRANCH, True),
    ("Pharmacy Branch 4", "BR-04", LocationType.BRANCH, True),
    ("Pharmacy Branch 5", "BR-05", LocationType.BRANCH, True),
    ("Pharmacy Branch 6", "BR-06", LocationType.BRANCH, True),
    ("Pharmacy Branch 7", "BR-07", LocationType.BRANCH, True),
]


async def run_seed() -> None:
    async with AsyncSessionLocal() as db:
        for name, code, loc_type, holds_stock in DEFAULT_LOCATIONS:
            exists = (
                await db.execute(select(Location).where(Location.code == code))
            ).scalar_one_or_none()
            if exists is None:
                db.add(
                    Location(
                        name=name,
                        code=code,
                        location_type=loc_type,
                        holds_stock=holds_stock,
                    )
                )

        owner_email = "owner@pharmacy.com"
        owner = (
            await db.execute(select(User).where(User.email == owner_email))
        ).scalar_one_or_none()
        if owner is None:
            db.add(
                User(
                    email=owner_email,
                    full_name="System Owner",
                    password_hash=hash_password("OwnerPass123!"),
                    role=UserRole.OWNER,
                    can_access_all_locations=True,
                )
            )

        await db.commit()
        print("Seed completed: 1 main office, 1 central warehouse, 7 branches, and owner account.")


if __name__ == "__main__":
    asyncio.run(run_seed())

