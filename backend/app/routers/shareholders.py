from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
import csv
from io import StringIO
from .. import schemas, models, database
from ..security import get_current_user, require_role, require_election_role
from ..utils import enforce_registration_window

router = APIRouter(prefix="/elections/{election_id}/shareholders", tags=["shareholders"])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()




def _log(db: Session, election_id: int, user, action: str, request: Request, details: dict | None = None):
    log = models.AuditLog(
        election_id=election_id,
        username=user["username"],
        action=action,
        details=details,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(log)


def _ensure_attendance(db: Session, election_id: int, shareholder_id: int):
    exists = (
        db.query(models.Attendance)
        .filter_by(election_id=election_id, shareholder_id=shareholder_id)
        .first()
    )
    if not exists:
        db.add(
            models.Attendance(
                election_id=election_id,
                shareholder_id=shareholder_id,
                mode=models.AttendanceMode.AUSENTE,
                present=False,
            )
        )


@router.post(
    "/import",
    response_model=List[schemas.Shareholder],
    dependencies=[require_role(["FUNCIONAL_BVG", "ADMIN_BVG"])]
)
def import_shareholders(
    election_id: int,
    shareholders: List[schemas.ShareholderCreate],
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    result = []
    enforce_registration_window(db, election_id, current_user)
    for sh in shareholders:
        existing = db.query(models.Shareholder).filter_by(code=sh.code).first()
        if existing:
            for field, value in sh.model_dump().items():
                setattr(existing, field, value)
            db.flush()
            _ensure_attendance(db, election_id, existing.id)
            result.append(existing)
        else:
            new_sh = models.Shareholder(**sh.model_dump())
            db.add(new_sh)
            db.flush()
            _ensure_attendance(db, election_id, new_sh.id)
            result.append(new_sh)
    _log(db, election_id, current_user, "SHAREHOLDER_IMPORT", request, {"count": len(result)})
    db.commit()
    for sh in result:
        db.refresh(sh)
    return result


@router.post(
    "/import-file",
    dependencies=[require_role(["FUNCIONAL_BVG", "ADMIN_BVG"])]
)
def import_shareholders_file(
    election_id: int,
    request: Request,
    file: UploadFile = File(...),
    preview: bool = True,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(StringIO(content))
    required = {"code", "name", "document", "actions"}
    if not required.issubset(reader.fieldnames or []):
        missing = required - set(reader.fieldnames or [])
        raise HTTPException(status_code=400, detail=f"Missing columns: {', '.join(missing)}")

    valid: List[schemas.ShareholderCreate] = []
    errors = []
    seen_codes = set()
    for idx, row in enumerate(reader, start=2):
        row_errors = []
        code = (row.get("code") or "").strip()
        if not code:
            row_errors.append("code required")
        elif code in seen_codes:
            row_errors.append("duplicate code in file")
        else:
            seen_codes.add(code)
        name = (row.get("name") or "").strip()
        if not name:
            row_errors.append("name required")
        document = (row.get("document") or "").strip()
        if not document:
            row_errors.append("document required")
        email = (row.get("email") or "").strip() or None
        actions_raw = row.get("actions")
        try:
            actions = float(actions_raw)
            if actions < 0:
                row_errors.append("actions must be >= 0")
        except (TypeError, ValueError):
            row_errors.append("actions must be a number")
            actions = 0
        if row_errors:
            errors.append({"row": idx, "errors": row_errors})
            continue
        valid.append(
            schemas.ShareholderCreate(
                code=code, name=name, document=document, email=email, actions=actions
            )
        )

    if preview:
        return {"valid": [v.model_dump() for v in valid], "invalid": errors}
    if errors:
        raise HTTPException(status_code=400, detail=errors)

    enforce_registration_window(db, election_id, current_user)
    result = []
    for sh in valid:
        existing = db.query(models.Shareholder).filter_by(code=sh.code).first()
        if existing:
            for field, value in sh.model_dump().items():
                setattr(existing, field, value)
            db.flush()
            _ensure_attendance(db, election_id, existing.id)
            result.append(existing)
        else:
            new_sh = models.Shareholder(**sh.model_dump())
            db.add(new_sh)
            db.flush()
            _ensure_attendance(db, election_id, new_sh.id)
            result.append(new_sh)

    _log(db, election_id, current_user, "SHAREHOLDER_IMPORT", request, {"count": len(result)})
    db.commit()
    for sh in result:
        db.refresh(sh)
    return [schemas.Shareholder.model_validate(r).model_dump() for r in result]


@router.get(
    "",
    response_model=List[schemas.ShareholderWithAttendance],
    dependencies=[require_election_role([models.ElectionRole.ATTENDANCE])]
)
def list_shareholders(
    election_id: int,
    q: str | None = None,
    db: Session = Depends(get_db),
):
    query = (
        db.query(models.Shareholder, models.Attendance.mode)
        .join(
            models.Attendance,
            (models.Shareholder.id == models.Attendance.shareholder_id)
            & (models.Attendance.election_id == election_id),
        )
        .filter(models.Attendance.election_id == election_id)
    )
    if q:
        q_like = f"%{q}%"
        query = query.filter(
            or_(
                models.Shareholder.name.ilike(q_like),
                models.Shareholder.code.ilike(q_like),
            )
        )
    rows = query.all()
    result: List[schemas.ShareholderWithAttendance] = []
    for sh, mode in rows:
        data = schemas.Shareholder.model_validate(sh).model_dump()
        result.append(
            schemas.ShareholderWithAttendance(**data, attendance_mode=mode)
        )
    return result


@router.get(
    "/{shareholder_id}",
    response_model=schemas.ShareholderWithAttendance,
    dependencies=[require_election_role([models.ElectionRole.ATTENDANCE])]
)
def get_shareholder(
    election_id: int,
    shareholder_id: int,
    db: Session = Depends(get_db),
):
    row = (
        db.query(models.Shareholder, models.Attendance.mode)
        .join(
            models.Attendance,
            (models.Shareholder.id == models.Attendance.shareholder_id)
            & (models.Attendance.election_id == election_id),
        )
        .filter(models.Shareholder.id == shareholder_id, models.Attendance.election_id == election_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="shareholder not found")
    sh, mode = row
    data = schemas.Shareholder.model_validate(sh).model_dump()
    return schemas.ShareholderWithAttendance(**data, attendance_mode=mode)


@router.put(
    "/{shareholder_id}",
    response_model=schemas.Shareholder,
    dependencies=[require_role(["FUNCIONAL_BVG", "ADMIN_BVG"])]
)
def update_shareholder(
    election_id: int,
    shareholder_id: int,
    payload: schemas.ShareholderUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    shareholder = db.get(models.Shareholder, shareholder_id)
    if not shareholder:
        raise HTTPException(status_code=404, detail="shareholder not found")
    enforce_registration_window(db, election_id, current_user)
    data = payload.model_dump(exclude_unset=True)
    if "code" in data and data["code"] != shareholder.code:
        if db.query(models.Shareholder).filter_by(code=data["code"]).first():
            raise HTTPException(status_code=400, detail="code already exists")
    for field, value in data.items():
        setattr(shareholder, field, value)
    _log(db, election_id, current_user, "SHAREHOLDER_UPDATE", request, {"shareholder_id": shareholder.id})
    db.commit()
    db.refresh(shareholder)
    return shareholder


@router.delete(
    "/{shareholder_id}",
    status_code=204,
    dependencies=[require_role(["FUNCIONAL_BVG", "ADMIN_BVG"])]
)
def delete_shareholder(
    election_id: int,
    shareholder_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    shareholder = db.get(models.Shareholder, shareholder_id)
    if not shareholder:
        raise HTTPException(status_code=404, detail="shareholder not found")
    enforce_registration_window(db, election_id, current_user)
    db.query(models.Attendance).filter_by(
        election_id=election_id, shareholder_id=shareholder.id
    ).delete()
    db.delete(shareholder)
    _log(db, election_id, current_user, "SHAREHOLDER_DELETE", request, {"shareholder_id": shareholder.id})
    db.commit()

