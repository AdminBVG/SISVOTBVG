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
            role="ADMIN_BVG",
        )
    )
    db.commit()
    db.close()
    token = client.post("/auth/login", json={"username": "AdminBVG", "password": "BVG2025"}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_election_with_questions():
    headers = auth_headers()
    resp = client.post(
        "/elections",
        json={
            "name": "Demo",
            "date": "2024-01-01",
            "questions": [
                {"text": "¿Asiste?", "type": "short_text", "order": 0}
            ],
        },
        headers=headers,
    )
    assert resp.status_code == 200
    election_id = resp.json()["id"]

    resp = client.get(f"/elections/{election_id}/questions", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["text"] == "¿Asiste?"
    resp = client.get(f"/elections/{election_id}/ballots", headers=headers)
    assert resp.status_code == 200
    ballots = resp.json()
    assert len(ballots) == 1
    assert ballots[0]["title"] == "¿Asiste?"
