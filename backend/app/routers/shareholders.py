from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import schemas, models, database
from ..security import get_current_user, require_role

router = APIRouter(prefix="/elections/{election_id}/shareholders", tags=["shareholders"])

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/import", response_model=List[schemas.Shareholder], dependencies=[require_role(["REGISTRADOR_BVG"])])
def import_shareholders(election_id: int, shareholders: List[schemas.ShareholderCreate], db: Session = Depends(get_db)):
    result = []
    for sh in shareholders:
        existing = db.query(models.Shareholder).filter_by(code=sh.code).first()
        if existing:
            for field, value in sh.model_dump().items():
                setattr(existing, field, value)
            result.append(existing)
        else:
            new_sh = models.Shareholder(**sh.model_dump())
            db.add(new_sh)
            result.append(new_sh)
    db.commit()
    for sh in result:
        db.refresh(sh)
    return result

@router.get("", response_model=List[schemas.Shareholder], dependencies=[Depends(get_current_user)])
def list_shareholders(election_id: int, db: Session = Depends(get_db)):
    return db.query(models.Shareholder).all()
