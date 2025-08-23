from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
from .. import schemas, models, database
from ..security import require_role, get_current_user
from ..observer import compute_summary

router = APIRouter(prefix="/elections", tags=["elections"])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("", response_model=schemas.Election, dependencies=[require_role(["ADMIN_BVG"])])
def create_election(election: schemas.ElectionCreate, db: Session = Depends(get_db)):
    data = election.model_dump(
        exclude={"attendance_registrars", "vote_registrars", "observers", "questions"}
    )
    db_election = models.Election(**data)
    db.add(db_election)
    db.commit()
    db.refresh(db_election)
    for uid in election.attendance_registrars:
        db.add(
            models.ElectionUserRole(
                election_id=db_election.id,
                user_id=uid,
                role=models.ElectionRole.ATTENDANCE,
            )
        )
    for uid in election.vote_registrars:
        db.add(
            models.ElectionUserRole(
                election_id=db_election.id,
                user_id=uid,
                role=models.ElectionRole.VOTE,
            )
        )
    for uid in election.observers:
        db.add(
            models.ElectionUserRole(
                election_id=db_election.id,
                user_id=uid,
                role=models.ElectionRole.OBSERVER,
            )
        )
    for idx, q in enumerate(election.questions):
        question = models.Question(
            election_id=db_election.id,
            text=q.text,
            type=q.type,
            required=q.required,
            order=q.order if q.order is not None else idx,
        )
        db.add(question)
        db.flush()
        for opt in q.options:
            db.add(
                models.QuestionOption(
                    question_id=question.id, text=opt.text, value=opt.value
                )
            )
    db.commit()
    return db_election


@router.get("", response_model=List[schemas.Election])
def list_elections(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    query = db.query(models.Election)
    # Administrators can view all elections without filtering
    if current_user["role"] == "ADMIN_BVG":
        elections = query.all()
        return [
            schemas.Election(
                id=e.id,
                name=e.name,
                description=e.description,
                date=e.date,
                status=e.status,
                registration_start=e.registration_start,
                registration_end=e.registration_end,
                min_quorum=e.min_quorum,
                created_at=e.created_at,
                closed_at=e.closed_at,
            )
            for e in elections
        ]

    # Non-admin users only see elections where they have an assigned role
    user = (
        db.query(models.User)
        .filter_by(username=current_user["username"])
        .first()
    )
    query = (
        query.join(models.ElectionUserRole)
        .filter(models.ElectionUserRole.user_id == user.id)
    )
    elections = query.all()
    roles = (
        db.query(models.ElectionUserRole)
        .filter_by(user_id=user.id)
        .all()
    )
    role_map: dict[int, list[models.ElectionRole]] = {}
    for r in roles:
        role_map.setdefault(r.election_id, []).append(r.role)
    result: List[schemas.Election] = []
    for e in elections:
        perms = role_map.get(e.id, [])
        result.append(
            schemas.Election(
                id=e.id,
                name=e.name,
                description=e.description,
                date=e.date,
                status=e.status,
                registration_start=e.registration_start,
                registration_end=e.registration_end,
                min_quorum=e.min_quorum,
                created_at=e.created_at,
                closed_at=e.closed_at,
                can_manage_attendance=models.ElectionRole.ATTENDANCE in perms,
                can_manage_votes=models.ElectionRole.VOTE in perms,
                can_observe=models.ElectionRole.OBSERVER in perms,
            )
        )
    return result


@router.post(
    "/{election_id}/close",
    response_model=schemas.Election,
)
def close_election(
    election_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    election = db.query(models.Election).filter_by(id=election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    if election.status == models.ElectionStatus.CLOSED:
        return election
    if current_user["role"] != "ADMIN_BVG":
        user = (
            db.query(models.User)
            .filter_by(username=current_user["username"])
            .first()
        )
        allowed = (
            db.query(models.ElectionUserRole)
            .filter(
                models.ElectionUserRole.election_id == election_id,
                models.ElectionUserRole.user_id == user.id,
                models.ElectionUserRole.role == models.ElectionRole.VOTE,
            )
            .first()
        )
        if not allowed:
            raise HTTPException(status_code=403, detail="No autorizado")
    election.status = models.ElectionStatus.CLOSED
    election.closed_at = datetime.now(timezone.utc)
    log = models.AuditLog(
        election_id=election_id,
        username=current_user["username"],
        action="ELECTION_CLOSE",
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(log)
    db.commit()
    db.refresh(election)
    return election


@router.get(
    "/{election_id}",
    response_model=schemas.Election,
    dependencies=[require_role(["ADMIN_BVG", "FUNCIONAL_BVG"])]
)
def get_election(election_id: int, db: Session = Depends(get_db)):
    election = db.query(models.Election).filter_by(id=election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    return election


@router.patch(
    "/{election_id}",
    response_model=schemas.Election,
    dependencies=[require_role(["ADMIN_BVG"])]
)
def update_election(
    election_id: int, payload: schemas.ElectionUpdate, db: Session = Depends(get_db)
):
    election = db.query(models.Election).filter_by(id=election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    if election.status != models.ElectionStatus.DRAFT:
        raise HTTPException(
            status_code=400, detail="Cannot edit election once opened"
        )
    data = payload.model_dump(
        exclude_unset=True,
        exclude={"attendance_registrars", "vote_registrars", "observers", "questions"},
    )
    for key, value in data.items():
        setattr(election, key, value)
    if (
        payload.attendance_registrars is not None
        or payload.vote_registrars is not None
        or payload.observers is not None
    ):
        db.query(models.ElectionUserRole).filter_by(
            election_id=election_id
        ).delete()
        for uid in payload.attendance_registrars or []:
            db.add(
                models.ElectionUserRole(
                    election_id=election_id,
                    user_id=uid,
                    role=models.ElectionRole.ATTENDANCE,
                )
            )
        for uid in payload.vote_registrars or []:
            db.add(
                models.ElectionUserRole(
                    election_id=election_id,
                    user_id=uid,
                    role=models.ElectionRole.VOTE,
                )
            )
        for uid in payload.observers or []:
            db.add(
                models.ElectionUserRole(
                    election_id=election_id,
                    user_id=uid,
                    role=models.ElectionRole.OBSERVER,
                )
            )
    if payload.questions is not None:
        db.query(models.QuestionOption).filter(
            models.QuestionOption.question_id.in_(
                db.query(models.Question.id).filter_by(election_id=election_id)
            )
        ).delete(synchronize_session=False)
        db.query(models.Question).filter_by(election_id=election_id).delete()
        for idx, q in enumerate(payload.questions):
            question = models.Question(
                election_id=election_id,
                text=q.text,
                type=q.type,
                required=q.required,
                order=q.order if q.order is not None else idx,
            )
            db.add(question)
            db.flush()
            for opt in q.options:
                db.add(
                    models.QuestionOption(
                        question_id=question.id, text=opt.text, value=opt.value
                    )
                )
    db.commit()
    db.refresh(election)
    return election


@router.delete(
    "/{election_id}",
    status_code=204,
    dependencies=[require_role(["ADMIN_BVG"])]
)
def delete_election(election_id: int, db: Session = Depends(get_db)):
    election = db.query(models.Election).filter_by(id=election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    db.query(models.ElectionUserRole).filter_by(election_id=election_id).delete()
    db.delete(election)
    db.commit()
    return None


@router.patch(
    "/{election_id}/status",
    response_model=schemas.Election,
    dependencies=[require_role(["ADMIN_BVG"])]
)
def update_election_status(
    election_id: int,
    payload: schemas.ElectionStatusUpdate,
    db: Session = Depends(get_db),
):
    election = db.query(models.Election).filter_by(id=election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    if (
        payload.status == models.ElectionStatus.OPEN
        and election.min_quorum is not None
    ):
        summary = compute_summary(db, election_id)
        if summary["porcentaje_quorum"] < election.min_quorum:
            raise HTTPException(status_code=400, detail="quorum not met")
    election.status = payload.status
    if payload.status == models.ElectionStatus.CLOSED:
        election.closed_at = datetime.now(timezone.utc)
    elif payload.status == models.ElectionStatus.OPEN:
        election.closed_at = None
    db.commit()
    db.refresh(election)
    return election


@router.get(
    "/{election_id}/questions",
    response_model=List[schemas.Question],
    dependencies=[require_role(["ADMIN_BVG", "FUNCIONAL_BVG"])],
)
def list_questions(election_id: int, db: Session = Depends(get_db)):
    election = db.query(models.Election).filter_by(id=election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    qs = (
        db.query(models.Question)
        .filter_by(election_id=election_id)
        .order_by(models.Question.order)
        .all()
    )
    return qs