from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, database
from ..security import require_role, get_current_user

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
    db_ballot = models.Ballot(election_id=election_id, title=ballot.title)
    db.add(db_ballot)
    db.commit()
    db.refresh(db_ballot)
    return db_ballot


@router.get(
    "/elections/{election_id}/ballots",
    response_model=List[schemas.Ballot],
    dependencies=[require_role(["ADMIN_BVG", "REGISTRADOR_BVG", "OBSERVADOR_BVG"])]
)
def list_ballots(election_id: int, db: Session = Depends(get_db)):
    return db.query(models.Ballot).filter_by(election_id=election_id).all()


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
    if current_user["role"] != "ADMIN_BVG":
        user = (
            db.query(models.User)
            .filter_by(username=current_user["username"])
            .first()
        )
        allowed = (
            db.query(models.ElectionUserRole)
            .filter_by(
                election_id=ballot.election_id,
                user_id=user.id,
                role=models.ElectionRole.VOTE,
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
    db_vote = models.Vote(ballot_id=ballot_id, option_id=vote.option_id)
    db.add(db_vote)
    db.commit()
    db.refresh(db_vote)
    return db_vote


@router.get(
    "/ballots/{ballot_id}/results",
    response_model=List[schemas.OptionResult],
    dependencies=[require_role(["ADMIN_BVG", "REGISTRADOR_BVG", "OBSERVADOR_BVG"])]
)
def ballot_results(ballot_id: int, db: Session = Depends(get_db)):
    options = db.query(models.BallotOption).filter_by(ballot_id=ballot_id).all()
    results = []
    for opt in options:
        count = db.query(models.Vote).filter_by(option_id=opt.id).count()
        results.append(schemas.OptionResult(id=opt.id, ballot_id=opt.ballot_id, text=opt.text, votes=count))
    return results
