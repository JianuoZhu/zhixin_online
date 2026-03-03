import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.database import Base, engine
from app.routers import announcements, auth, calendar, checkins, events, export, mentors, qa, rooms, users

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("zhixin")

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Zhixin Online System API")

origins = [origin.strip() for origin in settings.allowed_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled error on %s %s: %s", request.method, request.url, exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(rooms.router, prefix="/api/rooms", tags=["rooms"])
app.include_router(announcements.router, prefix="/api/announcements", tags=["announcements"])
app.include_router(qa.router, prefix="/api/qa", tags=["qa"])
app.include_router(mentors.router, prefix="/api/mentors", tags=["mentors"])
app.include_router(calendar.router, prefix="/api/calendar", tags=["calendar"])
app.include_router(checkins.router, prefix="/api/checkins", tags=["checkins"])
app.include_router(export.router, prefix="/api/export", tags=["export"])

uploads_dir = Path(__file__).resolve().parents[1] / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/api/health")
def health_check() -> dict:
    return {"status": "ok"}
