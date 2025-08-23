from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List
import jwt
from .. import models, schemas, database
from ..security import SECRET_KEY, ALGORITHM, require_role, require_election_role
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
        role = payload.get("role")
        username = payload.get("sub")
        if role not in ("ADMIN_BVG", "FUNCIONAL_BVG"):
            await websocket.close(code=1008)
            return
    except jwt.PyJWTError:
        await websocket.close(code=1008)
        return
    db = database.SessionLocal()
    try:
        if role != "ADMIN_BVG":
            user = db.query(models.User).filter_by(username=username).first()
            allowed = (
                db.query(models.ElectionUserRole)
                .filter(
                    models.ElectionUserRole.election_id == election_id,
                    models.ElectionUserRole.user_id == user.id,
                    models.ElectionUserRole.role.in_(
                        [
                            models.ElectionRole.ATTENDANCE,
                            models.ElectionRole.VOTE,
                            models.ElectionRole.OBSERVER,
                        ]
                    ),
                )
                .first()
            )
            if not allowed:
                await websocket.close(code=1008)
                return
        await manager.connect(websocket)
        await websocket.send_json({"summary": compute_summary(db, election_id)})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    finally:
        db.close()


@router.get(
    "",
    response_model=List[schemas.ObserverRow],
    dependencies=[
        require_role(["ADMIN_BVG", "FUNCIONAL_BVG"]),
        require_election_role([
            models.ElectionRole.ATTENDANCE,
            models.ElectionRole.VOTE,
            models.ElectionRole.OBSERVER,
        ]),
    ],
)
def observer_table(election_id: int, db: Session = Depends(get_db)):
    rows: List[schemas.ObserverRow] = []
    shareholders = db.query(models.Shareholder.id).all()
    for (sh_id,) in shareholders:
        row = observer_row(db, election_id, sh_id)
        rows.append(schemas.ObserverRow(**row))
    return rows
