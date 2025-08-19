from fastapi.testclient import TestClient
import hashlib
import pytest

from app.main import app
from app.database import Base, engine, SessionLocal
from app import models

client = TestClient(app)


@pytest.fixture(scope="module")
def admin_user():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    db.add(
        models.User(
            username="AdminBVG",
            hashed_password=hashlib.sha256("BVG2025".encode()).hexdigest(),
            role="REGISTRADOR_BVG",
        )
    )
    db.commit()
    db.close()
    yield
    db = SessionLocal()
    db.query(models.User).delete()
    db.commit()
    db.close()

def test_login_success(admin_user):
    response = client.post("/auth/login", json={"username": "AdminBVG", "password": "BVG2025"})
    assert response.status_code == 200
    data = response.json()
    assert data["access_token"]
    assert data["role"] == "REGISTRADOR_BVG"
    assert data["username"] == "AdminBVG"

def test_login_failure(admin_user):
    response = client.post("/auth/login", json={"username": "foo", "password": "bar"})
    assert response.status_code == 401
