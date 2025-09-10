from fastapi import APIRouter

from app.api.routes import (
    audit,
    bookings,
    customers,
    login,
    rooms,
    users,
    utils,
)

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(rooms.router, prefix="/rooms", tags=["rooms"])
api_router.include_router(customers.router, prefix="/customers", tags=["customers"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["bookings"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])


