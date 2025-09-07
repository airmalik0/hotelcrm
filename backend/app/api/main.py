from fastapi import APIRouter

from app.api.routes import bookings, customers, login, private, rooms, users, utils
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(rooms.router, prefix="/rooms", tags=["rooms"])
api_router.include_router(customers.router, prefix="/customers", tags=["customers"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["bookings"])


if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
