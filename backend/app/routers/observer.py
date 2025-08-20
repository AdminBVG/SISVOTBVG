from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List
import jwt
from .. import models, schemas, database
from ..security import SECRET_KEY, ALGORITHM, require_role
from ..observer import manager, compute_summary, observer_row

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
    shareholders = db.query(models.Shareholder.id).all()
    for (sh_id,) in shareholders:
        row = observer_row(db, election_id, sh_id)
        rows.append(schemas.ObserverRow(**row))
    return rows
