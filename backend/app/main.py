from fastapi import FastAPI
from .routers import shareholders, attendance, proxies, auth, elections, audit, observer
from .database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="BVG Attendance API")

app.include_router(shareholders.router)
app.include_router(attendance.router)
app.include_router(proxies.router)
app.include_router(auth.router)
app.include_router(elections.router)
app.include_router(audit.router)
app.include_router(observer.router)

@app.get("/")
def read_root():
    return {"message": "BVG Attendance API"}


@app.get("/health", tags=["health"])
def health_check():
    """Simple healthcheck endpoint for monitoring."""
    return {"status": "ok"}
