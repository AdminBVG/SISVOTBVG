from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.database import Base, engine, SessionLocal
from app import models
from app.routers.auth import hash_password

client = TestClient(app)


@pytest.fixture(scope="module")
def admin_user():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    db.add(
        models.User(
            username="AdminBVG",
            hashed_password=hash_password("BVG2025"),
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


def test_auth_flows():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # register user
    resp = client.post("/auth/register", json={"username": "user1", "password": "pass"})
    assert resp.status_code == 200
    token = resp.json()["verification_token"]

    # cannot login before verification
    assert (
        client.post("/auth/login", json={"username": "user1", "password": "pass"}).status_code
        == 401
    )

    # verify account
    assert client.post("/auth/verify", json={"username": "user1", "token": token}).status_code == 200

    # login and obtain tokens
    resp = client.post("/auth/login", json={"username": "user1", "password": "pass"})
    assert resp.status_code == 200
    access_token = resp.json()["access_token"]
    refresh_token = resp.json()["refresh_token"]

    # refresh access token
    resp = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert resp.json()["access_token"]

    # change password
    headers = {"Authorization": f"Bearer {access_token}"}
    assert (
        client.post(
            "/auth/change-password",
            json={"old_password": "pass", "new_password": "newpass"},
            headers=headers,
        ).status_code
        == 200
    )
    assert (
        client.post("/auth/login", json={"username": "user1", "password": "pass"}).status_code
        == 401
    )
    resp = client.post("/auth/login", json={"username": "user1", "password": "newpass"})
    access_token = resp.json()["access_token"]

    # request password reset
    resp = client.post("/auth/request-reset", json={"username": "user1"})
    reset_token = resp.json()["reset_token"]
    assert (
        client.post(
            "/auth/reset-password",
            json={"token": reset_token, "new_password": "resetpass"},
        ).status_code
        == 200
    )
    assert (
        client.post("/auth/login", json={"username": "user1", "password": "newpass"}).status_code
        == 401
    )
    assert (
        client.post("/auth/login", json={"username": "user1", "password": "resetpass"}).status_code
        == 200
    )
