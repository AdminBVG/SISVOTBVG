from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
import os
from datetime import datetime, timedelta, timezone
import hashlib, hmac, secrets

import jwt

from ..database import SessionLocal
from ..models import User
from ..security import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = os.getenv("JWT_SECRET", "changeme")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_MINUTES = 60 * 24

# track failed login attempts per username
FAILED_LOGINS: dict[str, int] = {}
MAX_FAILED_ATTEMPTS = 5


def hash_password(password: str, salt: bytes | None = None) -> str:
    if salt is None:
        salt = os.urandom(16)
    pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000)
    return f"{salt.hex()}:{pwd_hash.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    salt_hex, pwd_hex = hashed.split(":")
    salt = bytes.fromhex(salt_hex)
    new_hash = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000)
    return hmac.compare_digest(new_hash.hex(), pwd_hex)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class LoginRequest(BaseModel):
    username: str
    password: str


def create_token(data: dict, expires_delta: timedelta, token_type: str) -> str:
    to_encode = data.copy()
    to_encode.update({"exp": datetime.now(timezone.utc) + expires_delta, "type": token_type})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str = "REGISTRADOR_BVG"


class VerifyRequest(BaseModel):
    username: str
    token: str


class ResetRequest(BaseModel):
    username: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(username=req.username).first()
    if FAILED_LOGINS.get(req.username, 0) >= MAX_FAILED_ATTEMPTS:
        if not user or not verify_password(req.password, user.hashed_password):
            raise HTTPException(status_code=429, detail="Too many failed attempts")
    if not user or not verify_password(req.password, user.hashed_password):
        FAILED_LOGINS[req.username] = FAILED_LOGINS.get(req.username, 0) + 1
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    if not user.is_verified:
        raise HTTPException(status_code=401, detail="Usuario no verificado")
    FAILED_LOGINS.pop(req.username, None)
    token_data = {"sub": user.username, "role": user.role}
    access_token = create_token(
        token_data, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES), "access"
    )
    refresh_token = create_token(
        token_data, timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES), "refresh"
    )
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "role": user.role,
        "username": user.username,
    }


@router.post("/refresh")
def refresh(req: RefreshRequest):
    try:
        payload = jwt.decode(req.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token inválido")
        username = payload.get("sub")
        role = payload.get("role")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token inválido")
    access_token = create_token(
        {"sub": username, "role": role},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "access",
    )
    return {"access_token": access_token}


@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user = db.query(User).filter_by(username=current_user["username"]).first()
    if not user or not verify_password(req.old_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    user.hashed_password = hash_password(req.new_password)
    db.commit()
    return {"status": "password_changed"}


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter_by(username=req.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    token = secrets.token_hex(16)
    user = User(
        username=req.username,
        hashed_password=hash_password(req.password),
        role=req.role,
        is_verified=False,
        verification_token=token,
    )
    db.add(user)
    db.commit()
    return {"verification_token": token}


@router.post("/verify")
def verify(req: VerifyRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(username=req.username).first()
    if not user or user.verification_token != req.token:
        raise HTTPException(status_code=400, detail="Token inválido")
    user.is_verified = True
    user.verification_token = None
    db.commit()
    return {"status": "verified"}


@router.post("/request-reset")
def request_reset(req: ResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(username=req.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    token = secrets.token_hex(16)
    user.reset_token = token
    user.reset_token_expires = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=1)
    db.commit()
    return {"reset_token": token}


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(reset_token=req.token).first()
    if (
        not user
        or user.reset_token_expires is None
        or user.reset_token_expires < datetime.now(timezone.utc).replace(tzinfo=None)
    ):
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
    user.hashed_password = hash_password(req.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    return {"status": "password_reset"}