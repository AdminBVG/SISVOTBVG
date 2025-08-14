from fastapi import FastAPI
from .routers import shareholders, attendance, proxies
from .database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="BVG Attendance API")

app.include_router(shareholders.router)
app.include_router(attendance.router)
app.include_router(proxies.router)

@app.get("/")
def read_root():
    return {"message": "BVG Attendance API"}
