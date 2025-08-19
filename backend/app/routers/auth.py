from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
import hashlib
import os
from datetime import datetime, timedelta

import jwt

from ..database import SessionLocal
from ..models import User

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = os.getenv("JWT_SECRET", "changeme")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(username=req.username).first()
    if not user or hash_password(req.password) != user.hashed_password:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    token_data = {"sub": user.username, "role": user.role}
    expire = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = jwt.encode(
        {**token_data, "exp": datetime.utcnow() + expire}, SECRET_KEY, algorithm=ALGORITHM
    )
    return {"access_token": access_token, "role": user.role, "username": user.username}
