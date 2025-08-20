from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import date, datetime, timezone
from typing import List
from pathlib import Path
from .. import schemas, models, database
from ..models import AttendanceMode
from ..security import get_current_user, require_role
from ..observer import manager, compute_summary
from ..observer import observer_row
from ..utils import enforce_registration_window
import anyio

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


MAX_PDF_SIZE = 2 * 1024 * 1024


@router.post(
    "",
    response_model=schemas.Proxy,
    dependencies=[require_role(["REGISTRADOR_BVG", "ADMIN_BVG"])]
)
async def create_proxy(
    election_id: int,
    request: Request,
    data: str = Form(...),
    pdf: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    proxy_data = schemas.ProxyCreate.model_validate_json(data)
    if pdf.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="invalid file type")
    content = await pdf.read()
    if len(content) > MAX_PDF_SIZE:
        raise HTTPException(status_code=400, detail="file too large")

    election = db.query(models.Election).filter_by(id=election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="election not found")
    if proxy_data.fecha_otorg > election.date:
        raise HTTPException(status_code=400, detail="proxy not yet valid")
    if proxy_data.fecha_vigencia and election.date > proxy_data.fecha_vigencia:
        raise HTTPException(status_code=400, detail="proxy expired for election date")

    enforce_registration_window(db, election_id, current_user)

    existing = (
        db.query(models.Proxy)
        .filter_by(election_id=election_id, num_doc=proxy_data.num_doc)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="proxy already exists")
    db_proxy = models.Proxy(
        pdf_url="",
        election_id=election_id,
        proxy_person_id=proxy_data.proxy_person_id,
        tipo_doc=proxy_data.tipo_doc,
        num_doc=proxy_data.num_doc,
        fecha_otorg=proxy_data.fecha_otorg,
        fecha_vigencia=proxy_data.fecha_vigencia,
        status=proxy_data.status,
        mode=proxy_data.mode,
        present=proxy_data.present,
        marked_by=proxy_data.marked_by,
        marked_at=proxy_data.marked_at,
    )
    db.add(db_proxy)
    db.commit()
    db.refresh(db_proxy)

    storage_dir = Path("storage") / str(election_id)
    storage_dir.mkdir(parents=True, exist_ok=True)
    file_path = storage_dir / f"{db_proxy.id}.pdf"
    with open(file_path, "wb") as f:
        f.write(content)

    db_proxy.pdf_url = str(file_path)
    assignments = []
    seen = set()
    for assignment in proxy_data.assignments or []:
        if assignment.shareholder_id in seen:
            raise HTTPException(status_code=400, detail="duplicate assignment")
        seen.add(assignment.shareholder_id)
        db_assignment = models.ProxyAssignment(
            proxy_id=db_proxy.id, **assignment.model_dump()
        )
        db.add(db_assignment)
        assignments.append(db_assignment)

    _log(db, election_id, current_user, "PROXY_CREATE", request, {"proxy_id": db_proxy.id})
    db.commit()
    db.refresh(db_proxy)
    db_proxy.assignments = assignments
    return db_proxy


@router.get(
    "",
    response_model=List[schemas.Proxy],
    dependencies=[require_role(["REGISTRADOR_BVG", "ADMIN_BVG", "OBSERVADOR_BVG"])]
)
def list_proxies(election_id: int, db: Session = Depends(get_db)):
    proxies = db.query(models.Proxy).filter_by(election_id=election_id).all()
    for prx in proxies:
        _refresh_status(db, prx)
    return proxies


@router.put(
    "/{proxy_id}",
    response_model=schemas.Proxy,
    dependencies=[require_role(["REGISTRADOR_BVG", "ADMIN_BVG"])]
)
async def update_proxy(
    election_id: int,
    proxy_id: int,
    request: Request,
    data: str = Form(...),
    pdf: UploadFile | None = File(None),
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

    proxy_data = schemas.ProxyCreate.model_validate_json(data)

    enforce_registration_window(db, election_id, current_user)

    if pdf is not None:
        if pdf.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="invalid file type")
        content = await pdf.read()
        if len(content) > MAX_PDF_SIZE:
            raise HTTPException(status_code=400, detail="file too large")
        storage_dir = Path("storage") / str(election_id)
        storage_dir.mkdir(parents=True, exist_ok=True)
        file_path = storage_dir / f"{proxy.id}.pdf"
        with open(file_path, "wb") as f:
            f.write(content)
        proxy.pdf_url = str(file_path)

    if proxy_data.num_doc != proxy.num_doc:
        existing = (
            db.query(models.Proxy)
            .filter_by(election_id=election_id, num_doc=proxy_data.num_doc)
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="proxy already exists")
    proxy.proxy_person_id = proxy_data.proxy_person_id
    proxy.tipo_doc = proxy_data.tipo_doc
    proxy.num_doc = proxy_data.num_doc
    proxy.fecha_otorg = proxy_data.fecha_otorg
    proxy.fecha_vigencia = proxy_data.fecha_vigencia
    proxy.status = proxy_data.status
    proxy.mode = proxy_data.mode
    proxy.present = proxy_data.present
    proxy.marked_by = proxy_data.marked_by
    proxy.marked_at = proxy_data.marked_at

    db.query(models.ProxyAssignment).filter_by(proxy_id=proxy.id).delete()
    assignments = []
    seen = set()
    for assignment in proxy_data.assignments or []:
        if assignment.shareholder_id in seen:
            raise HTTPException(status_code=400, detail="duplicate assignment")
        seen.add(assignment.shareholder_id)
        db_assignment = models.ProxyAssignment(proxy_id=proxy.id, **assignment.model_dump())
        db.add(db_assignment)
        assignments.append(db_assignment)

    _log(db, election_id, current_user, "PROXY_UPDATE", request, {"proxy_id": proxy.id})
    db.commit()
    db.refresh(proxy)
    proxy.assignments = assignments
    return proxy


@router.delete(
    "/{proxy_id}",
    status_code=204,
    dependencies=[require_role(["REGISTRADOR_BVG", "ADMIN_BVG"])]
)
def delete_proxy(
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

    enforce_registration_window(db, election_id, current_user)

    file_path = Path(proxy.pdf_url)
    if file_path.exists():
        file_path.unlink()

    db.query(models.ProxyAssignment).filter_by(proxy_id=proxy.id).delete()
    db.delete(proxy)

    _log(db, election_id, current_user, "PROXY_DELETE", request, {"proxy_id": proxy.id})
    db.commit()


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

    enforce_registration_window(db, election_id, current_user)
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
    summary = compute_summary(db, election_id)
    for assignment in proxy.assignments:
        row = observer_row(db, election_id, assignment.shareholder_id)
        anyio.from_thread.run(manager.broadcast, {"summary": summary, "row": row})
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

    enforce_registration_window(db, election_id, current_user)
    proxy.status = models.ProxyStatus.INVALID
    proxy.present = False

    _log(db, election_id, current_user, "PROXY_INVALIDATE", request, {"proxy_id": proxy.id})
    db.commit()
    db.refresh(proxy)
    summary = compute_summary(db, election_id)
    for assignment in proxy.assignments:
        row = observer_row(db, election_id, assignment.shareholder_id)
        anyio.from_thread.run(manager.broadcast, {"summary": summary, "row": row})
    return proxy


@router.get(
    "/{proxy_id}/pdf",
    dependencies=[require_role(["REGISTRADOR_BVG", "ADMIN_BVG", "OBSERVADOR_BVG"])]
)
def download_proxy_pdf(election_id: int, proxy_id: int, db: Session = Depends(get_db)):
    proxy = (
        db.query(models.Proxy)
        .filter_by(id=proxy_id, election_id=election_id)
        .first()
    )
    if not proxy:
        raise HTTPException(status_code=404, detail="proxy not found")
    return FileResponse(proxy.pdf_url, media_type="application/pdf", filename=f"{proxy_id}.pdf")

