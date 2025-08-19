from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import schemas, models, database
from ..security import get_current_user, require_role

router = APIRouter(prefix="/elections", tags=["elections"])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("", response_model=schemas.Election, dependencies=[require_role(["REGISTRADOR_BVG"])])
def create_election(election: schemas.ElectionCreate, db: Session = Depends(get_db)):
    db_election = models.Election(**election.model_dump())
    db.add(db_election)
    db.commit()
    db.refresh(db_election)
    return db_election


@router.get("", response_model=List[schemas.Election], dependencies=[Depends(get_current_user)])
def list_elections(db: Session = Depends(get_db)):
    return db.query(models.Election).all()


@router.patch(
    "/{election_id}",
    response_model=schemas.Election,
    dependencies=[require_role(["REGISTRADOR_BVG"])],
)
def update_election(
    election_id: int, payload: schemas.ElectionUpdate, db: Session = Depends(get_db)
):
    election = db.query(models.Election).filter_by(id=election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    if election.status != models.ElectionStatus.DRAFT:
        raise HTTPException(
            status_code=400, detail="Only draft elections can be edited"
        )
    if payload.name is not None:
        election.name = payload.name
    if payload.date is not None:
        election.date = payload.date
    db.commit()
    db.refresh(election)
    return election


@router.patch("/{election_id}/status", response_model=schemas.Election, dependencies=[require_role(["REGISTRADOR_BVG"])])
def update_status(election_id: int, payload: schemas.ElectionStatusUpdate, db: Session = Depends(get_db)):
    election = db.query(models.Election).filter_by(id=election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    current = election.status
    new_status = payload.status
    if current == models.ElectionStatus.DRAFT:
        if new_status != models.ElectionStatus.OPEN:
            raise HTTPException(
                status_code=400, detail="Draft elections can only transition to OPEN"
            )
    elif current == models.ElectionStatus.OPEN:
        if new_status != models.ElectionStatus.CLOSED:
            raise HTTPException(
                status_code=400, detail="Open elections can only transition to CLOSED"
            )
    else:  # CLOSED
        raise HTTPException(
            status_code=400, detail="Closed elections cannot change status"
        )
    election.status = new_status
    db.commit()
    db.refresh(election)
    return election
