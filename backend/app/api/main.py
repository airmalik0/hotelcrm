from fastapi import APIRouter

from app.api.routes import (
    analytics,
    audit,
    booking_guests,
    bookings,
    campaigns,
    sms_webhook,
    customer_inquiries,
    customers,
    expenses,
    files,
    geo,
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
api_router.include_router(booking_guests.router, prefix="/bookings", tags=["booking_guests"])
api_router.include_router(campaigns.router, prefix="/campaigns", tags=["campaigns"])
api_router.include_router(sms_webhook.router, prefix="/sms-webhook", tags=["sms-webhook"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["expenses"])
api_router.include_router(geo.router, prefix="/geo", tags=["geo"])
api_router.include_router(customer_inquiries.router, prefix="/inquiries", tags=["inquiries"])


