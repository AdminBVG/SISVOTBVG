from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, database
from ..security import require_role, get_current_user

router = APIRouter(prefix="/elections/{election_id}/users", tags=["election-users"])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=List[schemas.ElectionUserRole], dependencies=[require_role(["ADMIN_BVG"])])
def list_election_users(election_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(models.ElectionUserRole, models.User.username)
        .join(models.User, models.ElectionUserRole.user_id == models.User.id)
        .filter(models.ElectionUserRole.election_id == election_id)
        .all()
    )
    return [
        schemas.ElectionUserRole(
            id=r[0].id,
            user_id=r[0].user_id,
            username=r[1],
            role=r[0].role,
        )
        for r in rows
    ]


@router.post("", response_model=schemas.ElectionUserRole, dependencies=[require_role(["ADMIN_BVG"])])
def assign_election_user(
    election_id: int,
    payload: schemas.ElectionUserRoleCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user = db.query(models.User).filter_by(id=payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    assignment = (
        db.query(models.ElectionUserRole)
        .filter_by(election_id=election_id, user_id=payload.user_id)
        .first()
    )
    if assignment:
        assignment.role = payload.role
    else:
        assignment = models.ElectionUserRole(
            election_id=election_id, user_id=payload.user_id, role=payload.role
        )
        db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return schemas.ElectionUserRole(
        id=assignment.id,
        user_id=assignment.user_id,
        username=user.username,
        role=assignment.role,
    )


@router.delete("/{user_id}", status_code=204, dependencies=[require_role(["ADMIN_BVG"])])
def remove_election_user(election_id: int, user_id: int, db: Session = Depends(get_db)):
    assignment = (
        db.query(models.ElectionUserRole)
        .filter_by(election_id=election_id, user_id=user_id)
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(assignment)
    db.commit()
    return None
