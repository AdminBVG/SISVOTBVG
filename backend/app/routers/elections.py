from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import schemas, models, database
from ..security import require_role

router = APIRouter(prefix="/elections", tags=["elections"])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("", response_model=schemas.Election, dependencies=[require_role(["ADMIN_BVG"])])
def create_election(election: schemas.ElectionCreate, db: Session = Depends(get_db)):
    db_election = models.Election(**election.model_dump())
    db.add(db_election)
    db.commit()
    db.refresh(db_election)
    return db_election


@router.get(
    "",
    response_model=List[schemas.Election],
    dependencies=[require_role(["ADMIN_BVG", "REGISTRADOR_BVG", "OBSERVADOR_BVG"])]
)
def list_elections(db: Session = Depends(get_db)):
    return db.query(models.Election).all()


@router.get(
    "/{election_id}",
    response_model=schemas.Election,
    dependencies=[require_role(["ADMIN_BVG", "REGISTRADOR_BVG", "OBSERVADOR_BVG"])]
)
def get_election(election_id: int, db: Session = Depends(get_db)):
    election = db.query(models.Election).filter_by(id=election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    return election


@router.patch(
    "/{election_id}",
    response_model=schemas.Election,
    dependencies=[require_role(["ADMIN_BVG"])]
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
    if payload.registration_start is not None:
        election.registration_start = payload.registration_start
    if payload.registration_end is not None:
        election.registration_end = payload.registration_end
    db.commit()
    db.refresh(election)
    return election


@router.patch(
    "/{election_id}/status",
    response_model=schemas.Election,
    dependencies=[require_role(["ADMIN_BVG"])]
)
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


@router.delete(
    "/{election_id}",
    status_code=204,
    dependencies=[require_role(["ADMIN_BVG"])]
)
def delete_election(election_id: int, db: Session = Depends(get_db)):
    election = db.query(models.Election).filter_by(id=election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    if election.status != models.ElectionStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only draft elections can be deleted")
    db.delete(election)
    db.commit()
    return None
