import os

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional dependency
    def load_dotenv(*args, **kwargs):
        return None

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import (
    shareholders,
    attendance,
    proxies,
    auth,
    elections,
    audit,
    observer,
    assistants,
    users,
    voting,
    election_users,
    settings,
)
from .database import Base, engine

load_dotenv()

CORS_ORIGINS_ENV = os.getenv("CORS_ORIGINS", "")
if CORS_ORIGINS_ENV:
    CORS_ORIGINS = [o.strip() for o in CORS_ORIGINS_ENV.split(",") if o.strip()]
else:
    CORS_ORIGINS = ["http://localhost:5173"]

Base.metadata.create_all(bind=engine)

app = FastAPI(title="BVG Attendance API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(shareholders.router)
app.include_router(attendance.router)
app.include_router(proxies.router)
app.include_router(auth.router)
app.include_router(elections.router)
app.include_router(audit.router)
app.include_router(observer.router)
app.include_router(assistants.router)
app.include_router(users.router)
app.include_router(voting.router)
app.include_router(election_users.router)
app.include_router(settings.router)

@app.get("/")
def read_root():
    return {"message": "BVG Attendance API"}


@app.get("/health", tags=["health"])
def health_check():
    """Simple healthcheck endpoint for monitoring."""
    return {"status": "ok"}
