from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from typing import List
from .. import schemas, models, database
from ..security import get_current_user, require_role

router = APIRouter(prefix="/elections/{election_id}/proxies", tags=["proxies"])

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("", response_model=schemas.Proxy, dependencies=[require_role(["REGISTRADOR_BVG"])])
def create_proxy(election_id: int, proxy: schemas.ProxyCreate, db: Session = Depends(get_db)):
    if proxy.fecha_vigencia and proxy.fecha_vigencia < date.today():
        raise HTTPException(status_code=400, detail="proxy expired")
    db_proxy = models.Proxy(**proxy.model_dump(exclude={"assignments"}))
    db.add(db_proxy)
    db.commit()
    db.refresh(db_proxy)
    assignments = []
    for assignment in proxy.assignments or []:
        db_assignment = models.ProxyAssignment(
            proxy_id=db_proxy.id, **assignment.model_dump()
        )
        db.add(db_assignment)
        assignments.append(db_assignment)
    db.commit()
    db_proxy.assignments = assignments
    return db_proxy

@router.get("", response_model=List[schemas.Proxy], dependencies=[Depends(get_current_user)])
def list_proxies(election_id: int, db: Session = Depends(get_db)):
    return db.query(models.Proxy).filter_by(election_id=election_id).all()
