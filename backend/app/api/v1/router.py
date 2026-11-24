from fastapi import APIRouter

from app.api.v1 import audit, auth, locations, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(locations.router)
api_router.include_router(users.router)
api_router.include_router(audit.router)
