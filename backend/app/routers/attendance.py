from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from typing import Dict, List
from .. import schemas, models, database
from ..models import AttendanceMode
from datetime import datetime, timezone
from ..security import get_current_user, require_election_role
from ..observer import manager, compute_summary
from ..observer import observer_row
from ..utils import enforce_registration_window
import anyio
import io
import csv
import smtplib
from email.message import EmailMessage
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
except Exception:  # pragma: no cover - reportlab optional
    letter = None  # type: ignore
    canvas = None  # type: ignore

router = APIRouter(prefix="/elections/{election_id}/attendance", tags=["attendance"])

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _has_active_proxy(db: Session, election_id: int, shareholder_id: int) -> bool:
    return (
        db.query(models.ProxyAssignment)
        .join(models.Proxy)
        .filter(
            models.ProxyAssignment.shareholder_id == shareholder_id,
            models.Proxy.election_id == election_id,
            models.Proxy.status == models.ProxyStatus.VALID,
        )
        .first()
        is not None
    )


def _smtp_settings(db: Session) -> dict:
    return {s.key: s.value for s in db.query(models.Setting).all()}


def _build_pdf(election: models.Election, rows: List[tuple]) -> bytes:
    if canvas is None:
        lines = [f"Informe de asistencia - {election.name}"]
        lines.append(f"Fecha: {election.date.isoformat()}")
        lines.append("Código    Nombre    Modo")
        for attendance, shareholder in rows:
            lines.append(f"{shareholder.code}    {shareholder.name}    {attendance.mode.value}")
        content = "\n".join(lines)
        return content.encode("utf-8")
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    y = height - 50
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, y, f"Informe de asistencia - {election.name}")
    y -= 20
    c.setFont("Helvetica", 12)
    c.drawString(50, y, f"Fecha: {election.date.isoformat()}")
    y -= 40
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Código")
    c.drawString(150, y, "Nombre")
    c.drawString(400, y, "Modo")
    y -= 20
    c.setFont("Helvetica", 12)
    for attendance, shareholder in rows:
        if y < 50:
            c.showPage()
            y = height - 50
            c.setFont("Helvetica-Bold", 12)
            c.drawString(50, y, "Código")
            c.drawString(150, y, "Nombre")
            c.drawString(400, y, "Modo")
            y -= 20
            c.setFont("Helvetica", 12)
        c.drawString(50, y, shareholder.code)
        c.drawString(150, y, shareholder.name)
        c.drawString(400, y, attendance.mode.value)
        y -= 20
    c.save()
    pdf = buffer.getvalue()
    buffer.close()
    return pdf




@router.post(
    "/{code}/mark",
    response_model=schemas.Attendance,
    dependencies=[require_election_role([models.ElectionRole.ATTENDANCE])]
)
def mark_attendance(
    election_id: int,
    code: str,
    payload: Dict,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    mode_value = payload.get("mode")
    try:
        mode = AttendanceMode(mode_value)
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid attendance mode")
    evidence = payload.get("evidence")
    shareholder = db.query(models.Shareholder).filter_by(code=code).first()
    if not shareholder:
        raise HTTPException(status_code=404, detail="shareholder not found")
    if mode == AttendanceMode.AUSENTE and _has_active_proxy(db, election_id, shareholder.id):
        raise HTTPException(status_code=400, detail="shareholder has active proxy")
    enforce_registration_window(db, election_id, current_user)

    attendance = db.query(models.Attendance).filter_by(election_id=election_id, shareholder_id=shareholder.id).first()
    if not attendance:
        attendance = models.Attendance(
            election_id=election_id,
            shareholder_id=shareholder.id,
            mode=AttendanceMode.AUSENTE,
            present=False,
        )
        db.add(attendance)
    elif attendance.mode == mode and attendance.present == (mode != AttendanceMode.AUSENTE):
        raise HTTPException(status_code=400, detail="attendance already marked")
    history = models.AttendanceHistory(
        attendance=attendance,
        from_mode=attendance.mode,
        to_mode=mode,
        from_present=attendance.present,
        to_present=mode != AttendanceMode.AUSENTE,
        changed_by=current_user["username"],
        changed_at=datetime.now(timezone.utc),
        reason=payload.get("reason"),
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    attendance.mode = mode
    attendance.present = mode != AttendanceMode.AUSENTE
    attendance.marked_by = current_user["username"]
    attendance.marked_at = datetime.now(timezone.utc)
    attendance.evidence_json = evidence
    db.add(history)
    db.commit()
    db.refresh(attendance)
    row = observer_row(db, election_id, shareholder.id)
    summary = compute_summary(db, election_id)
    anyio.from_thread.run(manager.broadcast, {"summary": summary, "row": row})
    return attendance


@router.post(
    "/bulk_mark",
    response_model=schemas.AttendanceBulkMarkResponse,
    dependencies=[require_election_role([models.ElectionRole.ATTENDANCE])]
)
def bulk_mark_attendance(
    election_id: int,
    payload: schemas.AttendanceBulkMark,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    updated: List[models.Attendance] = []
    failed: List[str] = []
    enforce_registration_window(db, election_id, current_user)
    for code in payload.codes:
        shareholder = db.query(models.Shareholder).filter_by(code=code).first()
        if not shareholder:
            failed.append(code)
            continue
        if payload.mode == AttendanceMode.AUSENTE and _has_active_proxy(db, election_id, shareholder.id):
            failed.append(code)
            continue
        attendance = (
            db.query(models.Attendance)
            .filter_by(election_id=election_id, shareholder_id=shareholder.id)
            .first()
        )
        if not attendance:
            attendance = models.Attendance(
                election_id=election_id,
                shareholder_id=shareholder.id,
                mode=AttendanceMode.AUSENTE,
                present=False,
            )
            db.add(attendance)
        elif attendance.mode == payload.mode and attendance.present == (payload.mode != AttendanceMode.AUSENTE):
            failed.append(code)
            continue
        history = models.AttendanceHistory(
            attendance=attendance,
            from_mode=attendance.mode,
            to_mode=payload.mode,
            from_present=attendance.present,
            to_present=payload.mode != AttendanceMode.AUSENTE,
            changed_by=current_user["username"],
            changed_at=datetime.now(timezone.utc),
            reason=payload.reason,
            ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        attendance.mode = payload.mode
        attendance.present = payload.mode != AttendanceMode.AUSENTE
        attendance.marked_by = current_user["username"]
        attendance.marked_at = datetime.now(timezone.utc)
        attendance.evidence_json = payload.evidence
        db.add(history)
        updated.append(attendance)
    db.commit()
    summary = compute_summary(db, election_id)
    rows = []
    for att in updated:
        db.refresh(att)
        row = observer_row(db, election_id, att.shareholder_id)
        rows.append(row)
    for row in rows:
        anyio.from_thread.run(manager.broadcast, {"summary": summary, "row": row})
    return {"updated": updated, "failed": failed}


@router.get(
    "/history",
    response_model=List[schemas.AttendanceHistory],
    dependencies=[require_election_role([models.ElectionRole.ATTENDANCE])]
)
def attendance_history(election_id: int, code: str, db: Session = Depends(get_db)):
    shareholder = db.query(models.Shareholder).filter_by(code=code).first()
    if not shareholder:
        raise HTTPException(status_code=404, detail="shareholder not found")
    attendance = db.query(models.Attendance).filter_by(
        election_id=election_id, shareholder_id=shareholder.id
    ).first()
    if not attendance:
        return []
    return (
        db.query(models.AttendanceHistory)
        .filter_by(attendance_id=attendance.id)
        .order_by(models.AttendanceHistory.id)
        .all()
    )


@router.get(
    "/summary",
    dependencies=[require_election_role([models.ElectionRole.ATTENDANCE])]
)
def summary_attendance(election_id: int, db: Session = Depends(get_db)):
    return compute_summary(db, election_id)


@router.get(
    "/export",
    dependencies=[require_election_role([models.ElectionRole.ATTENDANCE])]
)
def export_attendance(election_id: int, db: Session = Depends(get_db)):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["code", "name", "mode", "present", "marked_at"])
    rows = (
        db.query(models.Attendance, models.Shareholder)
        .join(models.Shareholder, models.Shareholder.id == models.Attendance.shareholder_id)
        .filter(models.Attendance.election_id == election_id)
        .all()
    )
    for attendance, shareholder in rows:
        writer.writerow([
            shareholder.code,
            shareholder.name,
            attendance.mode.value,
            str(attendance.present),
            attendance.marked_at.isoformat() if attendance.marked_at else "",
        ])
    return Response(content=output.getvalue(), media_type="text/csv")


@router.post(
    "/report",
    dependencies=[require_election_role([models.ElectionRole.ATTENDANCE])],
)
def send_attendance_report(
    election_id: int,
    payload: schemas.AttendanceReportRequest,
    db: Session = Depends(get_db),
):
    election = db.query(models.Election).filter_by(id=election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="election not found")
    rows = (
        db.query(models.Attendance, models.Shareholder)
        .join(models.Shareholder, models.Shareholder.id == models.Attendance.shareholder_id)
        .filter(models.Attendance.election_id == election_id)
        .all()
    )
    pdf_bytes = _build_pdf(election, rows)
    settings = _smtp_settings(db)
    host = settings.get("smtp_host")
    if host:
        msg = EmailMessage()
        msg["Subject"] = f"Informe de asistencia - {election.name}"
        msg["From"] = settings.get("smtp_from", "")
        msg["To"] = ", ".join(payload.recipients)
        msg.set_content("Adjunto informe de asistencia")
        msg.add_attachment(pdf_bytes, maintype="application", subtype="pdf", filename="attendance.pdf")
        try:
            with smtplib.SMTP(host, int(settings.get("smtp_port", 25))) as smtp:
                if settings.get("smtp_user"):
                    smtp.login(settings.get("smtp_user"), settings.get("smtp_password"))
                smtp.send_message(msg)
        except Exception:
            raise HTTPException(status_code=500, detail="failed to send email")
    return {"status": "sent"}