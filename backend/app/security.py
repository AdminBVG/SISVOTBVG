from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import jwt
from .database import SessionLocal
from . import models

SECRET_KEY = os.getenv("JWT_SECRET", "changeme")
ALGORITHM = "HS256"

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None or role is None:
            raise HTTPException(status_code=401, detail="Token inválido")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token inválido")
    return {"username": username, "role": role}


def require_role(roles):
    def role_dependency(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="No autorizado")
    return Depends(role_dependency)


def require_election_role(roles):
    if not isinstance(roles, (list, set, tuple)):
        roles_list = [roles]
    else:
        roles_list = list(roles)

    def role_dependency(
        election_id: int,
        user=Depends(get_current_user),
    ):
        if user["role"] in ["ADMIN_BVG", "OBSERVADOR_BVG"]:
            return
        db = SessionLocal()
        try:
            db_user = (
                db.query(models.User)
                .filter_by(username=user["username"])
                .first()
            )
            if not db_user:
                raise HTTPException(status_code=401, detail="User not found")
            exists = (
                db.query(models.ElectionUserRole)
                .filter(
                    models.ElectionUserRole.election_id == election_id,
                    models.ElectionUserRole.user_id == db_user.id,
                    models.ElectionUserRole.role.in_(roles_list),
                )
                .first()
            )
            if not exists:
                raise HTTPException(status_code=403, detail="No autorizado")
        finally:
            db.close()

    return Depends(role_dependency)
