from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
def login(req: LoginRequest):
    if req.username == "AdminBVG" and req.password == "BVG2025":
        return {"access_token": "fake-token", "role": "REGISTRADOR_BVG", "username": "AdminBVG"}
    raise HTTPException(status_code=401, detail="Credenciales inválidas")
