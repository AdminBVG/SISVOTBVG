from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
import csv
from io import StringIO
from datetime import datetime, timezone
from .. import schemas, models, database
from ..security import get_current_user, require_role

router = APIRouter(prefix="/elections/{election_id}/shareholders", tags=["shareholders"])

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _enforce_window(db: Session, election_id: int, user):
    election = db.query(models.Election).filter_by(id=election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="election not found")
    now = datetime.now(timezone.utc)
    start = election.registration_start
    end = election.registration_end
    if start and start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    if end and end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    if start and now < start:
        if user["role"] != "ADMIN_BVG":
            raise HTTPException(status_code=403, detail="registration not started")
    if end and now > end:
        if user["role"] != "ADMIN_BVG":
            raise HTTPException(status_code=403, detail="registration closed")
    return election


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

@router.post("/import", response_model=List[schemas.Shareholder], dependencies=[require_role(["REGISTRADOR_BVG", "ADMIN_BVG"])])
def import_shareholders(
    election_id: int,
    shareholders: List[schemas.ShareholderCreate],
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    result = []
    _enforce_window(db, election_id, current_user)
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
    _log(db, election_id, current_user, "SHAREHOLDER_IMPORT", request, {"count": len(result)})
    db.commit()
    for sh in result:
        db.refresh(sh)
    return result


@router.post(
    "/import-file",
    dependencies=[require_role(["REGISTRADOR_BVG", "ADMIN_BVG"])]
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
    _enforce_window(db, election_id, current_user)
    result = []
    for sh in valid:
        existing = db.query(models.Shareholder).filter_by(code=sh.code).first()
        if existing:
            for field, value in sh.model_dump().items():
                setattr(existing, field, value)
            result.append(existing)
        else:
            new_sh = models.Shareholder(**sh.model_dump())
            db.add(new_sh)
            result.append(new_sh)
    _log(db, election_id, current_user, "SHAREHOLDER_IMPORT", request, {"count": len(result)})
    db.commit()
    for sh in result:
        db.refresh(sh)
    return [schemas.Shareholder.model_validate(r).model_dump() for r in result]

@router.get(
    "",
    response_model=List[schemas.Shareholder],
    dependencies=[require_role(["REGISTRADOR_BVG", "ADMIN_BVG", "OBSERVADOR_BVG"])]
)
def list_shareholders(
    election_id: int,
    q: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Shareholder)
    if q:
        q_like = f"%{q}%"
        query = query.filter(
            or_(
                models.Shareholder.name.ilike(q_like),
                models.Shareholder.code.ilike(q_like),
            )
        )
    return query.all()
