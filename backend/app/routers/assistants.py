from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import csv
from io import StringIO

from .. import models, schemas, database
from ..security import get_current_user, require_role

router = APIRouter(prefix="/elections/{election_id}/assistants", tags=["assistants"])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post(
    "/import-excel",
    response_model=List[schemas.Attendee],
    dependencies=[require_role(["REGISTRADOR_BVG", "ADMIN_BVG"])]
)
def import_attendees_excel(
    election_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(StringIO(content))
    required = {"id", "accionista", "representante", "apoderado", "acciones"}
    if not required.issubset(reader.fieldnames or []):
        missing = required - set(reader.fieldnames or [])
        raise HTTPException(status_code=400, detail=f"Missing columns: {', '.join(sorted(missing))}")

    results: List[models.Attendee] = []
    for row in reader:
        attendee = models.Attendee(
            election_id=election_id,
            identifier=str(row.get("id", "")),
            accionista=row.get("accionista", ""),
            representante=row.get("representante"),
            apoderado=row.get("apoderado"),
            acciones=float(row.get("acciones") or 0),
        )
        db.add(attendee)
        results.append(attendee)
    db.commit()
    for att in results:
        db.refresh(att)
    return results


@router.get(
    "",
    response_model=List[schemas.Attendee],
    dependencies=[require_role(["REGISTRADOR_BVG", "ADMIN_BVG", "OBSERVADOR_BVG"])]
)
def list_attendees(election_id: int, db: Session = Depends(get_db)):
    return db.query(models.Attendee).filter_by(election_id=election_id).all()
