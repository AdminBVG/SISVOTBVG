from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app import models
from app.routers.auth import hash_password

client = TestClient(app)


def setup_auth_and_election():
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
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.post("/elections", json={"name": "Demo", "date": "2024-01-01"}, headers=headers)
    assert resp.status_code == 200
    election_id = resp.json()["id"]
    return headers, election_id


def test_import_and_list_shareholders():
    headers, election_id = setup_auth_and_election()
    data = [{"code": "SH1", "name": "Alice", "document": "D1", "email": "a@example.com", "actions": 10}]
    response = client.post(f"/elections/{election_id}/shareholders/import", json=data, headers=headers)
    assert response.status_code == 200
    assert response.json()[0]["code"] == "SH1"
    response = client.get(f"/elections/{election_id}/shareholders", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 1
