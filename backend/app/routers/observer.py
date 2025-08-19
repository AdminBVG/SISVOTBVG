from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session
from typing import List
import jwt
from .. import models, schemas, database
from ..security import SECRET_KEY, ALGORITHM, require_role
from ..observer import manager, compute_summary

router = APIRouter(prefix="/elections/{election_id}/observer", tags=["observer"])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.websocket("/ws")
async def observer_ws(websocket: WebSocket, election_id: int):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("role") not in ("OBSERVADOR_BVG", "ADMIN_BVG"):
            await websocket.close(code=1008)
            return
    except jwt.PyJWTError:
        await websocket.close(code=1008)
        return
    await manager.connect(websocket)
    db = database.SessionLocal()
    try:
        await websocket.send_json({"summary": compute_summary(db, election_id)})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    finally:
        db.close()


@router.get("", response_model=List[schemas.ObserverRow], dependencies=[require_role(["OBSERVADOR_BVG", "ADMIN_BVG", "REGISTRADOR_BVG"])])
def observer_table(election_id: int, db: Session = Depends(get_db)):
    rows: List[schemas.ObserverRow] = []
    shareholders = db.query(models.Shareholder).all()
    for sh in shareholders:
        attendance = (
            db.query(models.Attendance)
            .filter_by(election_id=election_id, shareholder_id=sh.id)
            .first()
        )
        mode = attendance.mode if attendance else models.AttendanceMode.AUSENTE
        proxy_assignment = (
            db.query(models.ProxyAssignment)
            .join(models.Proxy)
            .filter(
                models.ProxyAssignment.shareholder_id == sh.id,
                models.Proxy.election_id == election_id,
                models.Proxy.status == models.ProxyStatus.VALID,
                models.Proxy.present.is_(True),
            )
            .first()
        )
        apoderado = None
        cuenta = 0.0
        if proxy_assignment:
            proxy = db.query(models.Proxy).filter_by(id=proxy_assignment.proxy_id).first()
            person = db.query(models.Person).filter_by(id=proxy.proxy_person_id).first()
            apoderado = person.name if person else None
            cuenta = float(sh.actions)
        if attendance and attendance.present:
            cuenta = float(sh.actions)
        rows.append(
            schemas.ObserverRow(
                code=sh.code,
                name=sh.name,
                estado=mode,
                apoderado=apoderado,
                acciones_propias=float(sh.actions),
                acciones_representadas=0.0,
                total_quorum=cuenta,
            )
        )
    return rows
