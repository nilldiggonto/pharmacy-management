from fastapi import APIRouter

from app.api.v1 import (
    audit,
    auth,
    inventory,
    locations,
    products,
    purchasing,
    sales,
    suppliers,
    transfers,
    users,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(locations.router)
api_router.include_router(users.router)
api_router.include_router(products.router)
api_router.include_router(suppliers.router)
api_router.include_router(inventory.router)
api_router.include_router(purchasing.router)
api_router.include_router(transfers.router)
api_router.include_router(sales.router)
api_router.include_router(audit.router)
