"""Idempotent seed script for initial organization setup:
- 1 Main Office
- 1 Central Warehouse
- 7 Pharmacy Branches
- Multi role staff accounts (Owner, Head Office Manager, Branch Manager,
  Pharmacist, Cashier, Inventory Officer, Procurement Officer, Accountant)
"""
import asyncio

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.location import Location, LocationType
from app.models.user import User, UserLocationAccess, UserRole


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

DEFAULT_USERS = [
    ("owner@pharmacy.com", "System Owner", "OwnerPass123!", UserRole.OWNER, True, []),
    ("manager@pharmacy.com", "Nadia Karim", "StaffPass123!", UserRole.HEAD_OFFICE_MANAGER, True, []),
    ("branch.manager@pharmacy.com", "Rafiqul Islam", "StaffPass123!", UserRole.BRANCH_MANAGER, False, ["BR-01"]),
    ("pharmacist@pharmacy.com", "Dr. Samira Haque", "StaffPass123!", UserRole.PHARMACIST, False, ["BR-01"]),
    ("cashier@pharmacy.com", "Tanvir Ahmed", "StaffPass123!", UserRole.CASHIER, False, ["BR-01"]),
    ("inventory@pharmacy.com", "Farzana Yasmin", "StaffPass123!", UserRole.INVENTORY_OFFICER, True, ["WH-01"]),
    ("procurement@pharmacy.com", "Imran Hossain", "StaffPass123!", UserRole.PROCUREMENT_OFFICER, True, ["WH-01"]),
    ("accountant@pharmacy.com", "Shabnam Chowdhury", "StaffPass123!", UserRole.ACCOUNTANT, True, []),
]


async def run_seed() -> None:
    async with AsyncSessionLocal() as db:
        location_by_code: dict[str, Location] = {}
        for name, code, loc_type, holds_stock in DEFAULT_LOCATIONS:
            loc = (
                await db.execute(select(Location).where(Location.code == code))
            ).scalar_one_or_none()
            if loc is None:
                loc = Location(
                    name=name,
                    code=code,
                    location_type=loc_type,
                    holds_stock=holds_stock,
                )
                db.add(loc)
                await db.flush()
            location_by_code[code] = loc

        for email, full_name, password, role, all_locs, assigned_codes in DEFAULT_USERS:
            user = (
                await db.execute(select(User).where(User.email == email))
            ).scalar_one_or_none()
            if user is None:
                user = User(
                    email=email,
                    full_name=full_name,
                    password_hash=hash_password(password),
                    role=role,
                    can_access_all_locations=all_locs,
                )
                db.add(user)
                await db.flush()
                for code in assigned_codes:
                    target_loc = location_by_code.get(code)
                    if target_loc is not None:
                        db.add(UserLocationAccess(user_id=user.id, location_id=target_loc.id))

        await db.commit()
        print("Seed completed: 1 main office, 1 central warehouse, 7 branches, and 8 role accounts.")


if __name__ == "__main__":
    asyncio.run(run_seed())
