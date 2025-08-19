import hashlib
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app import models

client = TestClient(app)


def setup_env():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    db.add(models.User(username="AdminBVG", hashed_password=hashlib.sha256("BVG2025".encode()).hexdigest(), role="REGISTRADOR_BVG"))
    db.commit()
    db.close()
    token = client.post("/auth/login", json={"username": "AdminBVG", "password": "BVG2025"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.post("/elections", json={"name": "Demo", "date": "2024-01-01"}, headers=headers)
    election_id = resp.json()["id"]
    return headers, election_id


def test_attendance_history_endpoint():
    headers, election_id = setup_env()
    data = [{"code": "SH1", "name": "Alice", "document": "D1", "email": "a@example.com", "actions": 10}]
    assert client.post(f"/elections/{election_id}/shareholders/import", json=data, headers=headers).status_code == 200
    assert client.post(f"/elections/{election_id}/attendance/SH1/mark", json={"mode": "PRESENCIAL"}, headers=headers).status_code == 200
    assert client.post(f"/elections/{election_id}/attendance/SH1/mark", json={"mode": "VIRTUAL"}, headers=headers).status_code == 200
    resp = client.get(f"/elections/{election_id}/attendance/history", params={"code": "SH1"}, headers=headers)
    assert resp.status_code == 200
    history = resp.json()
    assert len(history) == 2
    assert history[0]["from_mode"] == "AUSENTE"
    assert history[0]["to_mode"] == "PRESENCIAL"
    assert history[1]["from_mode"] == "PRESENCIAL"
    assert history[1]["to_mode"] == "VIRTUAL"
