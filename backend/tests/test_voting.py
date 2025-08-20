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


def test_voting_flow():
    headers = auth_headers()
    resp = client.post("/elections", json={"name": "Vote", "date": "2024-01-01"}, headers=headers)
    election_id = resp.json()["id"]

    resp = client.post(
        f"/elections/{election_id}/ballots",
        json={"title": "Presidente"},
        headers=headers,
    )
    ballot_id = resp.json()["id"]

    option1 = client.post(
        f"/ballots/{ballot_id}/options",
        json={"text": "A"},
        headers=headers,
    ).json()
    client.post(
        f"/ballots/{ballot_id}/options",
        json={"text": "B"},
        headers=headers,
    )

    client.post(
        f"/ballots/{ballot_id}/vote",
        json={"option_id": option1["id"]},
        headers=headers,
    )

    resp = client.get(f"/ballots/{ballot_id}/results", headers=headers)
    assert resp.status_code == 200
    results = {r["text"]: r["votes"] for r in resp.json()}
    assert results["A"] == 1
    assert results["B"] == 0
