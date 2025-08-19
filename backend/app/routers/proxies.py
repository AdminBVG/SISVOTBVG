from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import date, datetime, timezone
from typing import List
from .. import schemas, models, database
from ..models import AttendanceMode
from ..security import get_current_user, require_role

router = APIRouter(prefix="/elections/{election_id}/proxies", tags=["proxies"])

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _refresh_status(db: Session, proxy: models.Proxy):
    if (
        proxy.status == models.ProxyStatus.VALID
        and proxy.fecha_vigencia
        and date.today() > proxy.fecha_vigencia
    ):
        proxy.status = models.ProxyStatus.EXPIRED
        proxy.present = False
        db.commit()
        db.refresh(proxy)


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


@router.post(
    "",
    response_model=schemas.Proxy,
    dependencies=[require_role(["REGISTRADOR_BVG", "ADMIN_BVG"])]
)
def create_proxy(
    election_id: int,
    proxy: schemas.ProxyCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    election = db.query(models.Election).filter_by(id=election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="election not found")
    if proxy.fecha_otorg > election.date:
        raise HTTPException(status_code=400, detail="proxy not yet valid")
    if proxy.fecha_vigencia and election.date > proxy.fecha_vigencia:
        raise HTTPException(status_code=400, detail="proxy expired for election date")
    _enforce_window(db, election_id, current_user)
    db_proxy = models.Proxy(**proxy.model_dump(exclude={"assignments"}))
    db.add(db_proxy)
    _log(db, election_id, current_user, "PROXY_CREATE", request, {"proxy_id": db_proxy.id})
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
    proxies = db.query(models.Proxy).filter_by(election_id=election_id).all()
    for prx in proxies:
        _refresh_status(db, prx)
    return proxies


@router.post(
    "/{proxy_id}/mark",
    response_model=schemas.Proxy,
    dependencies=[require_role(["REGISTRADOR_BVG", "ADMIN_BVG"])]
)
def mark_proxy(
    election_id: int,
    proxy_id: int,
    payload: schemas.ProxyMark,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    proxy = (
        db.query(models.Proxy)
        .filter_by(id=proxy_id, election_id=election_id)
        .first()
    )
    if not proxy:
        raise HTTPException(status_code=404, detail="proxy not found")
    _enforce_window(db, election_id, current_user)
    _refresh_status(db, proxy)
    if proxy.status != models.ProxyStatus.VALID:
        raise HTTPException(status_code=400, detail="proxy not valid")
    proxy.mode = payload.mode
    proxy.present = payload.mode != AttendanceMode.AUSENTE
    proxy.marked_by = current_user["username"]
    proxy.marked_at = datetime.now(timezone.utc)
    _log(db, election_id, current_user, "PROXY_MARK", request, {"proxy_id": proxy.id, "mode": payload.mode.value})
    db.commit()
    db.refresh(proxy)
    return proxy


@router.post(
    "/{proxy_id}/invalidate",
    response_model=schemas.Proxy,
    dependencies=[require_role(["REGISTRADOR_BVG", "ADMIN_BVG"])]
)
def invalidate_proxy(
    election_id: int,
    proxy_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    proxy = (
        db.query(models.Proxy)
        .filter_by(id=proxy_id, election_id=election_id)
        .first()
    )
    if not proxy:
        raise HTTPException(status_code=404, detail="proxy not found")
    _enforce_window(db, election_id, current_user)
    proxy.status = models.ProxyStatus.INVALID
    proxy.present = False
    _log(db, election_id, current_user, "PROXY_INVALIDATE", request, {"proxy_id": proxy.id})
    db.commit()
    db.refresh(proxy)
    return proxy
