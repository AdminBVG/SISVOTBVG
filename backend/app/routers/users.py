from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas, database
from ..routers.auth import hash_password
from ..security import require_role

router = APIRouter(prefix="/users", tags=["users"])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=List[schemas.User], dependencies=[require_role(["ADMIN_BVG"])] )
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()


@router.post("", response_model=schemas.User, dependencies=[require_role(["ADMIN_BVG"])] )
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter_by(username=user.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    db_user = models.User(
        username=user.username,
        hashed_password=hash_password(user.password),
        role=user.role,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.put("/{user_id}", response_model=schemas.User, dependencies=[require_role(["ADMIN_BVG"])] )
def update_user(user_id: int, user: schemas.UserUpdate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).get(user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role is not None:
        db_user.role = user.role
    if user.password is not None:
        db_user.hashed_password = hash_password(user.password)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.delete("/{user_id}", status_code=204, dependencies=[require_role(["ADMIN_BVG"])] )
def delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).get(user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(db_user)
    db.commit()
