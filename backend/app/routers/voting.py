from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
import anyio
from .. import models, schemas, database
from ..security import require_role, get_current_user
from ..observer import manager

router = APIRouter(prefix="", tags=["voting"])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post(
    "/elections/{election_id}/ballots",
    response_model=schemas.Ballot,
    dependencies=[require_role(["ADMIN_BVG"])]
)
def create_ballot(election_id: int, ballot: schemas.BallotCreate, db: Session = Depends(get_db)):
    db_ballot = models.Ballot(
        election_id=election_id, title=ballot.title, order=ballot.order or 0
    )
    db.add(db_ballot)
    db.commit()
    db.refresh(db_ballot)
    return db_ballot


@router.get(
    "/elections/{election_id}/ballots",
    response_model=List[schemas.Ballot],
    dependencies=[require_role(["ADMIN_BVG", "FUNCIONAL_BVG"])]
)
def list_ballots(election_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Ballot)
        .filter_by(election_id=election_id)
        .order_by(models.Ballot.order)
        .all()
    )


@router.get(
    "/elections/{election_id}/ballots/pending",
    response_model=List[schemas.Ballot],
    dependencies=[require_role(["ADMIN_BVG", "FUNCIONAL_BVG"])]
)
def list_pending_ballots(election_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Ballot)
        .filter_by(election_id=election_id, status=models.BallotStatus.OPEN)
        .order_by(models.Ballot.order)
        .all()
    )


def _ballot_results(db: Session, ballot_id: int) -> List[schemas.OptionResult]:
    options = db.query(models.BallotOption).filter_by(ballot_id=ballot_id).all()
    results: List[schemas.OptionResult] = []
    for opt in options:
        count = db.query(models.Vote).filter_by(option_id=opt.id).count()
        results.append(
            schemas.OptionResult(
                id=opt.id, ballot_id=opt.ballot_id, text=opt.text, votes=count
            )
        )
    return results


@router.post(
    "/ballots/{ballot_id}/options",
    response_model=schemas.Option,
    dependencies=[require_role(["ADMIN_BVG"])]
)
def create_option(ballot_id: int, option: schemas.OptionCreate, db: Session = Depends(get_db)):
    db_option = models.BallotOption(ballot_id=ballot_id, text=option.text)
    db.add(db_option)
    db.commit()
    db.refresh(db_option)
    return db_option


@router.post(
    "/ballots/{ballot_id}/vote",
    response_model=schemas.Vote,
)
def cast_vote(
    ballot_id: int,
    vote: schemas.VoteCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ballot = db.query(models.Ballot).filter_by(id=ballot_id).first()
    if not ballot:
        raise HTTPException(status_code=404, detail="Ballot not found")
    if ballot.status != models.BallotStatus.OPEN:
        raise HTTPException(status_code=400, detail="Ballot closed")
    if current_user["role"] != "ADMIN_BVG":
        user = (
            db.query(models.User)
            .filter_by(username=current_user["username"])
            .first()
        )
        allowed = (
            db.query(models.ElectionUserRole)
            .filter(
                models.ElectionUserRole.election_id == ballot.election_id,
                models.ElectionUserRole.user_id == user.id,
                models.ElectionUserRole.role.in_(
                    [models.ElectionRole.VOTE, models.ElectionRole.VOTER]
                ),
            )
            .first()
        )
        if not allowed:
            raise HTTPException(status_code=403, detail="No autorizado")
    option = (
        db.query(models.BallotOption)
        .filter_by(id=vote.option_id, ballot_id=ballot_id)
        .first()
    )
    if not option:
        raise HTTPException(status_code=400, detail="Invalid option for ballot")
    attendee = (
        db.query(models.Attendee)
        .filter_by(id=vote.attendee_id, election_id=ballot.election_id)
        .first()
    )
    if not attendee:
        raise HTTPException(status_code=400, detail="Invalid attendee")
    db_vote = (
        db.query(models.Vote)
        .filter_by(ballot_id=ballot_id, attendee_id=attendee.id)
        .first()
    )
    if db_vote:
        db_vote.option_id = vote.option_id
        db_vote.weight = attendee.acciones
        db_vote.created_by = current_user["username"]
        db_vote.created_at = datetime.now(timezone.utc)
    else:
        db_vote = models.Vote(
            ballot_id=ballot_id,
            option_id=vote.option_id,
            attendee_id=attendee.id,
            weight=attendee.acciones,
            created_by=current_user["username"],
        )
        db.add(db_vote)
    db.commit()
    db.refresh(db_vote)
    results = [r.model_dump() for r in _ballot_results(db, ballot_id)]
    anyio.from_thread.run(
        manager.broadcast,
        {"ballot": {"id": ballot_id, "title": ballot.title, "results": results}},
    )
    return db_vote


@router.post(
    "/ballots/{ballot_id}/vote-all",
    response_model=schemas.BulkVoteResult,
)
def vote_all(
    ballot_id: int,
    payload: schemas.VoteAll,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ballot = db.query(models.Ballot).filter_by(id=ballot_id).first()
    if not ballot:
        raise HTTPException(status_code=404, detail="Ballot not found")
    if ballot.status != models.BallotStatus.OPEN:
        raise HTTPException(status_code=400, detail="Ballot closed")
    if current_user["role"] != "ADMIN_BVG":
        user = (
            db.query(models.User)
            .filter_by(username=current_user["username"])
            .first()
        )
        allowed = (
            db.query(models.ElectionUserRole)
            .filter(
                models.ElectionUserRole.election_id == ballot.election_id,
                models.ElectionUserRole.user_id == user.id,
                models.ElectionUserRole.role.in_(
                    [models.ElectionRole.VOTE, models.ElectionRole.VOTER]
                ),
            )
            .first()
        )
        if not allowed:
            raise HTTPException(status_code=403, detail="No autorizado")
    option = (
        db.query(models.BallotOption)
        .filter_by(id=payload.option_id, ballot_id=ballot_id)
        .first()
    )
    if not option:
        raise HTTPException(status_code=400, detail="Invalid option for ballot")
    attendees = (
        db.query(models.Attendee)
        .filter_by(election_id=ballot.election_id)
        .all()
    )
    count = 0
    for attendee in attendees:
        vote_obj = (
            db.query(models.Vote)
            .filter_by(ballot_id=ballot_id, attendee_id=attendee.id)
            .first()
        )
        if vote_obj:
            vote_obj.option_id = payload.option_id
            vote_obj.weight = attendee.acciones
            vote_obj.created_by = current_user["username"]
            vote_obj.created_at = datetime.now(timezone.utc)
        else:
            db.add(
                models.Vote(
                    ballot_id=ballot_id,
                    option_id=payload.option_id,
                    attendee_id=attendee.id,
                    weight=attendee.acciones,
                    created_by=current_user["username"],
                )
            )
        count += 1
    db.commit()
    results = [r.model_dump() for r in _ballot_results(db, ballot_id)]
    anyio.from_thread.run(
        manager.broadcast,
        {"ballot": {"id": ballot_id, "title": ballot.title, "results": results}},
    )
    return {"count": count}


@router.post(
    "/ballots/{ballot_id}/close",
    response_model=schemas.Ballot,
)
def close_ballot(
    ballot_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ballot = db.query(models.Ballot).filter_by(id=ballot_id).first()
    if not ballot:
        raise HTTPException(status_code=404, detail="Ballot not found")
    if current_user["role"] != "ADMIN_BVG":
        user = (
            db.query(models.User)
            .filter_by(username=current_user["username"])
            .first()
        )
        allowed = (
            db.query(models.ElectionUserRole)
            .filter(
                models.ElectionUserRole.election_id == ballot.election_id,
                models.ElectionUserRole.user_id == user.id,
                models.ElectionUserRole.role.in_(
                    [models.ElectionRole.VOTE, models.ElectionRole.VOTER]
                ),
            )
            .first()
        )
        if not allowed:
            raise HTTPException(status_code=403, detail="No autorizado")
    ballot.status = models.BallotStatus.CLOSED
    log = models.AuditLog(
        election_id=ballot.election_id,
        username=current_user["username"],
        action="BALLOT_CLOSE",
        details={"ballot_id": ballot.id},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(log)
    db.commit()
    db.refresh(ballot)
    results = [r.model_dump() for r in _ballot_results(db, ballot_id)]
    anyio.from_thread.run(
        manager.broadcast,
        {"ballot": {"id": ballot_id, "title": ballot.title, "results": results}},
    )
    return ballot


@router.get(
    "/ballots/{ballot_id}/results",
    response_model=List[schemas.OptionResult],
    dependencies=[require_role(["ADMIN_BVG", "FUNCIONAL_BVG"])]
)
def ballot_results(ballot_id: int, db: Session = Depends(get_db)):
    return _ballot_results(db, ballot_id)
