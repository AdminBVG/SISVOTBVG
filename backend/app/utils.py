from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session
from . import models


def enforce_registration_window(db: Session, election_id: int, user):
    election = db.query(models.Election).filter_by(id=election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="election not found")
    now = datetime.now(timezone.utc)
    end = election.registration_end
    if end and end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    if end and now > end and user["role"] != "ADMIN_BVG":
        raise HTTPException(status_code=403, detail="registration closed")
    return election
