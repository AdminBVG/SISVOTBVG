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
    reg1 = models.User(username="reg1", hashed_password=hash_password("pass"), role="REGISTRADOR_BVG")
    reg2 = models.User(username="reg2", hashed_password=hash_password("pass"), role="REGISTRADOR_BVG")
    db.add_all([admin, reg1, reg2])
    db.commit()
    reg1_id = reg1.id
    reg2_id = reg2.id
    db.add(models.Shareholder(code="S1", name="S", document="D", actions=1))
    db.commit()
    db.close()
    return reg1_id, reg2_id


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
