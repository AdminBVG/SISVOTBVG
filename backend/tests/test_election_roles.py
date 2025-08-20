from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app import models
from app.routers.auth import hash_password

client = TestClient(app)

def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    admin = models.User(username="admin", hashed_password=hash_password("pass"), role="ADMIN_BVG")
    reg1 = models.User(username="reg1", hashed_password=hash_password("pass"), role="FUNCIONAL_BVG")
    reg2 = models.User(username="reg2", hashed_password=hash_password("pass"), role="FUNCIONAL_BVG")
    db.add_all([admin, reg1, reg2])
    db.commit()
    reg1_id = reg1.id
    reg2_id = reg2.id
    db.add(models.Shareholder(code="S1", name="S", document="D", actions=1))
    db.commit()
    db.close()
    return reg1_id, reg2_id


def setup_registrars_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    admin = models.User(
        username="admin", hashed_password=hash_password("pass"), role="ADMIN_BVG"
    )
    att = models.User(
        username="att", hashed_password=hash_password("pass"), role="REGISTRADOR_ASISTENCIA"
    )
    vote = models.User(
        username="vote", hashed_password=hash_password("pass"), role="REGISTRADOR_VOTOS"
    )
    db.add_all([admin, att, vote])
    db.commit()
    att_id, vote_id = att.id, vote.id
    db.close()
    return att_id, vote_id


def login(username: str):
    token = client.post("/auth/login", json={"username": username, "password": "pass"}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_assignment_and_filtering():
    reg1_id, reg2_id = setup_db()
    admin_headers = login("admin")
    resp = client.post(
        "/elections",
        json={
            "name": "A",
            "date": "2024-01-01",
            "attendance_registrars": [reg1_id],
        },
        headers=admin_headers,
    )
    election1 = resp.json()["id"]
    resp = client.post(
        "/elections",
        json={
            "name": "B",
            "date": "2024-01-01",
            "attendance_registrars": [reg2_id],
        },
        headers=admin_headers,
    )
    election2 = resp.json()["id"]
    # reg1 should only see election A
    reg1_headers = login("reg1")
    resp = client.get("/elections", headers=reg1_headers)
    assert len(resp.json()) == 1
    assert resp.json()[0]["id"] == election1
    # reg1 cannot mark attendance for election B
    resp = client.post(
        f"/elections/{election2}/attendance/S1/mark",
        json={"mode": "PRESENCIAL"},
        headers=reg1_headers,
    )
    assert resp.status_code == 403


def test_manage_election_user_roles():
    reg1_id, _ = setup_db()
    admin_headers = login("admin")
    # create election
    resp = client.post(
        "/elections",
        json={"name": "A", "date": "2024-01-01"},
        headers=admin_headers,
    )
    election_id = resp.json()["id"]
    # assign voter role
    resp = client.post(
        f"/elections/{election_id}/users",
        json={"user_id": reg1_id, "role": "VOTER"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "VOTER"
    # list roles
    resp = client.get(f"/elections/{election_id}/users", headers=admin_headers)
    assert len(resp.json()) == 1
    # change role
    resp = client.post(
        f"/elections/{election_id}/users",
        json={"user_id": reg1_id, "role": "DELEGATE"},
        headers=admin_headers,
    )
    assert resp.json()["role"] == "DELEGATE"
    # remove role
    resp = client.delete(
        f"/elections/{election_id}/users/{reg1_id}", headers=admin_headers
    )
    assert resp.status_code == 204
    resp = client.get(f"/elections/{election_id}/users", headers=admin_headers)
    assert resp.json() == []


def test_registrar_users_see_assigned_election():
    att_id, vote_id = setup_registrars_db()
    admin_headers = login("admin")
    resp = client.post(
        "/elections",
        json={
            "name": "A",
            "date": "2024-01-01",
            "attendance_registrars": [att_id],
        },
        headers=admin_headers,
    )
    election1 = resp.json()["id"]
    resp = client.post(
        "/elections",
        json={
            "name": "B",
            "date": "2024-01-01",
            "vote_registrars": [vote_id],
        },
        headers=admin_headers,
    )
    election2 = resp.json()["id"]
    att_headers = login("att")
    resp = client.get("/elections", headers=att_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["id"] == election1
    vote_headers = login("vote")
    resp = client.get("/elections", headers=vote_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["id"] == election2
