from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import csv
from io import StringIO
from openpyxl import load_workbook

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
    dependencies=[require_role(["FUNCIONAL_BVG", "ADMIN_BVG"])]
)
def import_attendees_excel(
    election_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    required = {"id", "accionista", "representante", "apoderado", "acciones"}
    results: List[models.Attendee] = []

    if file.filename and file.filename.lower().endswith(".xlsx"):
        wb = load_workbook(file.file)
        sheet = wb.active
        rows = list(sheet.values)
        headers = [str(h).strip() if h is not None else "" for h in rows[0]]
        if not required.issubset(headers):
            missing = required - set(headers)
            raise HTTPException(
                status_code=400,
                detail=f"Missing columns: {', '.join(sorted(missing))}",
            )
        for data_row in rows[1:]:
            row = dict(zip(headers, data_row))
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
    else:
        content = file.file.read().decode("utf-8")
        reader = csv.DictReader(StringIO(content))
        if not required.issubset(reader.fieldnames or []):
            missing = required - set(reader.fieldnames or [])
            raise HTTPException(
                status_code=400, detail=f"Missing columns: {', '.join(sorted(missing))}"
            )
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
    dependencies=[require_role(["FUNCIONAL_BVG", "ADMIN_BVG"])]
)
def list_attendees(election_id: int, db: Session = Depends(get_db)):
    return db.query(models.Attendee).filter_by(election_id=election_id).all()


@router.get(
    "/{attendee_id}",
    response_model=schemas.Attendee,
    dependencies=[require_role(["FUNCIONAL_BVG", "ADMIN_BVG"])]
)
def get_attendee(
    election_id: int,
    attendee_id: int,
    db: Session = Depends(get_db),
):
    attendee = db.query(models.Attendee).filter_by(id=attendee_id, election_id=election_id).first()
    if not attendee:
        raise HTTPException(status_code=404, detail="attendee not found")
    return attendee


@router.put(
    "/{attendee_id}",
    response_model=schemas.Attendee,
    dependencies=[require_role(["FUNCIONAL_BVG", "ADMIN_BVG"])]
)
def update_attendee(
    election_id: int,
    attendee_id: int,
    payload: schemas.AttendeeUpdate,
    db: Session = Depends(get_db),
):
    attendee = db.query(models.Attendee).filter_by(id=attendee_id, election_id=election_id).first()
    if not attendee:
        raise HTTPException(status_code=404, detail="attendee not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(attendee, field, value)
    db.commit()
    db.refresh(attendee)
    return attendee


@router.delete(
    "/{attendee_id}",
    status_code=204,
    dependencies=[require_role(["FUNCIONAL_BVG", "ADMIN_BVG"])]
)
def delete_attendee(
    election_id: int,
    attendee_id: int,
    db: Session = Depends(get_db),
):
    attendee = db.query(models.Attendee).filter_by(id=attendee_id, election_id=election_id).first()
    if not attendee:
        raise HTTPException(status_code=404, detail="attendee not found")
    db.delete(attendee)
    db.commit()

