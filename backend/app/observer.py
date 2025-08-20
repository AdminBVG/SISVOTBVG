import asyncio
from typing import List
from fastapi import WebSocket
from sqlalchemy.orm import Session
from sqlalchemy import func
from . import models, schemas

class ObserverManager:
    def __init__(self):
        self.connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.connections:
            self.connections.remove(websocket)

    async def broadcast(self, message: dict):
        for ws in list(self.connections):
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(ws)

manager = ObserverManager()

def compute_summary(db: Session, election_id: int) -> dict:
    total = db.query(models.Attendance).filter_by(election_id=election_id).count()
    presencial = db.query(models.Attendance).filter_by(election_id=election_id, mode=models.AttendanceMode.PRESENCIAL).count()
    virtual = db.query(models.Attendance).filter_by(election_id=election_id, mode=models.AttendanceMode.VIRTUAL).count()
    ausente = db.query(models.Attendance).filter_by(election_id=election_id, mode=models.AttendanceMode.AUSENTE).count()
    representado = (
        db.query(func.count(models.ProxyAssignment.id))
        .join(models.Proxy)
        .filter(
            models.Proxy.election_id == election_id,
            models.Proxy.present.is_(True),
            models.Proxy.status == models.ProxyStatus.VALID,
        )
        .scalar()
        or 0
    )
    suscrito = db.query(func.coalesce(func.sum(models.Shareholder.actions), 0)).scalar() or 0
    directo = (
        db.query(func.coalesce(func.sum(models.Shareholder.actions), 0))
        .join(
            models.Attendance,
            (models.Attendance.shareholder_id == models.Shareholder.id)
            & (models.Attendance.election_id == election_id),
        )
        .filter(models.Attendance.present.is_(True))
        .scalar()
        or 0
    )
    representado_cap = (
        db.query(func.coalesce(func.sum(models.ProxyAssignment.weight_actions_snapshot), 0))
        .join(models.Proxy)
        .filter(
            models.Proxy.election_id == election_id,
            models.Proxy.present.is_(True),
            models.Proxy.status == models.ProxyStatus.VALID,
        )
        .scalar()
        or 0
    )
    porcentaje = (directo + representado_cap) / suscrito if suscrito else 0
    return {
        "total": total,
        "presencial": presencial,
        "virtual": virtual,
        "ausente": ausente,
        "representado": representado,
        "capital_suscrito": float(suscrito),
        "capital_presente_directo": float(directo),
        "capital_presente_representado": float(representado_cap),
        "porcentaje_quorum": float(porcentaje),
    }


def observer_row(db: Session, election_id: int, shareholder_id: int) -> dict:
    sh = db.query(models.Shareholder).filter_by(id=shareholder_id).first()
    if not sh:
        return {}
    attendance = (
        db.query(models.Attendance)
        .filter_by(election_id=election_id, shareholder_id=sh.id)
        .first()
    )
    person = (
        db.query(models.Person)
        .join(models.Proxy, models.Proxy.proxy_person_id == models.Person.id)
        .join(models.ProxyAssignment, models.ProxyAssignment.proxy_id == models.Proxy.id)
        .filter(
            models.ProxyAssignment.shareholder_id == sh.id,
            models.Proxy.election_id == election_id,
            models.Proxy.status == models.ProxyStatus.VALID,
            models.Proxy.present.is_(True),
        )
        .first()
    )
    apoderado = person.name if person else None
    acciones_propias = (
        float(sh.actions) if attendance and attendance.present else 0.0
    )
    acciones_rep = float(sh.actions) if apoderado and not acciones_propias else 0.0
    total = acciones_propias + acciones_rep
    row = schemas.ObserverRow(
        code=sh.code,
        name=sh.name,
        estado=attendance.mode if attendance else models.AttendanceMode.AUSENTE,
        apoderado=apoderado,
        acciones_propias=acciones_propias,
        acciones_representadas=acciones_rep,
        total_quorum=total,
    )
    return row.model_dump()
