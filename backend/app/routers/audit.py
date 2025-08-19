from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, database
from ..security import get_current_user

router = APIRouter(prefix="/elections/{election_id}/audit", tags=["audit"])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=List[schemas.AuditLog], dependencies=[Depends(get_current_user)])
def list_audit_logs(election_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.AuditLog)
        .filter_by(election_id=election_id)
        .order_by(models.AuditLog.id)
        .all()
    )
