from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app import models
from app.routers.auth import hash_password

client = TestClient(app)


def auth_headers():
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
    token = client.post("/auth/login", json={"username": "AdminBVG", "password": "BVG2025"}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_list_and_update_election():
    headers = auth_headers()
    resp = client.post("/elections", json={"name": "Demo", "date": "2024-01-01"}, headers=headers)
    assert resp.status_code == 200
    election_id = resp.json()["id"]

    resp = client.get("/elections", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    resp = client.patch(f"/elections/{election_id}/status", json={"status": "CLOSED"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "CLOSED"
