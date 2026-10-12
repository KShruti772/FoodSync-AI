"""FoodSync AI FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.auth import router as auth_router
from app.api.v1.donations import router as donations_router
from app.api.v1.impact import router as impact_router
from app.api.v1.matches import router as matches_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.recipients import router as recipients_router
from app.core.config import settings
from app.core.database import init_db

init_db()

app = FastAPI(
    title="FoodSync AI API",
    version="1.0.0",
    description="Real-Time Food Waste Redistribution Platform REST API",
)

allowed_origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS if origin.strip()]
if settings.CLIENT_URL and settings.CLIENT_URL not in allowed_origins:
    allowed_origins.append(settings.CLIENT_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "FoodSync AI API"}


app.include_router(auth_router, prefix="/api/v1")
app.include_router(donations_router, prefix="/api/v1")
app.include_router(recipients_router, prefix="/api/v1")
app.include_router(matches_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(impact_router, prefix="/api/v1")
