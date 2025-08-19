from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, List
from .. import schemas, models, database
from ..models import AttendanceMode
from datetime import datetime
from ..security import get_current_user, require_role

router = APIRouter(prefix="/elections/{election_id}/attendance", tags=["attendance"])

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/{code}/mark", response_model=schemas.Attendance, dependencies=[require_role(["REGISTRADOR_BVG"])])
def mark_attendance(election_id: int, code: str, payload: Dict, db: Session = Depends(get_db)):
    mode = AttendanceMode(payload.get("mode"))
    evidence = payload.get("evidence")
    shareholder = db.query(models.Shareholder).filter_by(code=code).first()
    if not shareholder:
        raise HTTPException(status_code=404, detail="shareholder not found")
    attendance = db.query(models.Attendance).filter_by(election_id=election_id, shareholder_id=shareholder.id).first()
    if not attendance:
        attendance = models.Attendance(
            election_id=election_id,
            shareholder_id=shareholder.id,
            mode=AttendanceMode.AUSENTE,
            present=False,
        )
        db.add(attendance)
    history = models.AttendanceHistory(
        attendance=attendance,
        from_mode=attendance.mode,
        to_mode=mode,
        from_present=attendance.present,
        to_present=mode != AttendanceMode.AUSENTE,
        changed_by="system",
        changed_at=datetime.utcnow(),
        reason=payload.get("reason")
    )
    attendance.mode = mode
    attendance.present = mode != AttendanceMode.AUSENTE
    attendance.marked_by = "system"
    attendance.marked_at = datetime.utcnow()
    attendance.evidence_json = evidence
    db.add(history)
    db.commit()
    db.refresh(attendance)
    return attendance

@router.get("/history", response_model=List[schemas.AttendanceHistory], dependencies=[Depends(get_current_user)])
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

@router.get("/summary", dependencies=[Depends(get_current_user)])
def summary_attendance(election_id: int, db: Session = Depends(get_db)):
    total = db.query(models.Attendance).filter_by(election_id=election_id).count()
    presencial = db.query(models.Attendance).filter_by(election_id=election_id, mode=AttendanceMode.PRESENCIAL).count()
    virtual = db.query(models.Attendance).filter_by(election_id=election_id, mode=AttendanceMode.VIRTUAL).count()
    ausente = db.query(models.Attendance).filter_by(election_id=election_id, mode=AttendanceMode.AUSENTE).count()
    return {"total": total, "presencial": presencial, "virtual": virtual, "ausente": ausente}
