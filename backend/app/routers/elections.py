from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import schemas, models, database
from ..security import require_role, get_current_user

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
        exclude={"attendance_registrars", "vote_registrars", "questions"}
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


@router.get(
    "",
    response_model=List[schemas.Election],
    dependencies=[require_role(["ADMIN_BVG", "REGISTRADOR_BVG", "OBSERVADOR_BVG"])]
)
def list_elections(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    query = db.query(models.Election)
    if current_user["role"] == "REGISTRADOR_BVG":
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
        role_map = {}
        for r in roles:
            role_map.setdefault(r.election_id, []).append(r.role)
        result = []
        for e in elections:
            perms = role_map.get(e.id, [])
            result.append(
                schemas.Election(
                    id=e.id,
                    name=e.name,
                    date=e.date,
                    status=e.status,
                    registration_start=e.registration_start,
                    registration_end=e.registration_end,
                    can_manage_attendance=models.ElectionRole.ATTENDANCE in perms,
                    can_manage_votes=models.ElectionRole.VOTE in perms,
                )
            )
        return result
    elections = query.all()
    return [
        schemas.Election(
            id=e.id,
            name=e.name,
            date=e.date,
            status=e.status,
            registration_start=e.registration_start,
            registration_end=e.registration_end,
        )
        for e in elections
    ]


@router.get(
    "/{election_id}",
    response_model=schemas.Election,
    dependencies=[require_role(["ADMIN_BVG", "REGISTRADOR_BVG", "OBSERVADOR_BVG"])]
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
        exclude={"attendance_registrars", "vote_registrars"},
    )
    for key, value in data.items():
        setattr(election, key, value)
    if (
        payload.attendance_registrars is not None
        or payload.vote_registrars is not None
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
    election.status = payload.status
    db.commit()
    db.refresh(election)
    return election


@router.get(
    "/{election_id}/questions",
    response_model=List[schemas.Question],
    dependencies=[require_role(["ADMIN_BVG", "REGISTRADOR_BVG", "OBSERVADOR_BVG"])],
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
