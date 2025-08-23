"""Database seeding utilities.

This module is intentionally minimal: running it will ensure that an
administrator account exists but it will **not** populate the database with
any random or example data.  This keeps development and production environments
clean while still providing the required admin user.
"""

from .database import SessionLocal, Base, engine
from . import models
from .routers.auth import hash_password

Base.metadata.create_all(bind=engine)

def run():
    db = SessionLocal()
    if db.query(models.User).filter_by(username="AdminBVG").first() is None:
        admin = models.User(
            username="AdminBVG",
            hashed_password=hash_password("BVG2025"),
            role="ADMIN_BVG",
        )
        db.add(admin)
        db.commit()
    db.close()

if __name__ == '__main__':
    run()
