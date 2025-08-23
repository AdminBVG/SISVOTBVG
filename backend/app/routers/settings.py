from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import schemas, models, database
from ..security import require_role

router = APIRouter(prefix="/settings", tags=["settings"], dependencies=[require_role(["ADMIN_BVG"])])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=schemas.Settings)
def get_settings(db: Session = Depends(get_db)):
    rows = db.query(models.Setting).all()
    data = {row.key: row.value for row in rows}
    return schemas.Settings(**data)


@router.put("", response_model=schemas.Settings)
def update_settings(payload: schemas.Settings, db: Session = Depends(get_db)):
    for key, value in payload.model_dump(exclude_unset=True).items():
        setting = db.query(models.Setting).filter_by(key=key).first()
        if setting:
            setting.value = str(value)
        else:
            db.add(models.Setting(key=key, value=str(value)))
    db.commit()
    return payload
