from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app import models
from app.routers.auth import hash_password
from datetime import date

client = TestClient(app)


def setup_env():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    db.add_all([
        models.User(username="Admin", hashed_password=hash_password("pass"), role="ADMIN_BVG"),
        models.User(username="Reg", hashed_password=hash_password("pass"), role="REGISTRADOR_BVG"),
        models.User(username="Obs", hashed_password=hash_password("pass"), role="OBSERVADOR_BVG"),
    ])
    db.commit()
    db.close()
    admin_token = client.post("/auth/login", json={"username": "Admin", "password": "pass"}).json()["access_token"]
    reg_token = client.post("/auth/login", json={"username": "Reg", "password": "pass"}).json()["access_token"]
    obs_token = client.post("/auth/login", json={"username": "Obs", "password": "pass"}).json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    reg_headers = {"Authorization": f"Bearer {reg_token}"}
    obs_headers = {"Authorization": f"Bearer {obs_token}"}
    resp = client.post("/elections", json={"name": "Demo", "date": "2024-01-01"}, headers=admin_headers)
    election_id = resp.json()["id"]
    data = [{"code": "SH1", "name": "Alice", "document": "D1", "email": "a@example.com", "actions": 10}]
    client.post(f"/elections/{election_id}/shareholders/import", json=data, headers=reg_headers)
    return election_id, admin_headers, reg_headers, obs_headers, obs_token


def test_observer_ws_and_permissions():
    election_id, admin_headers, reg_headers, obs_headers, obs_token = setup_env()
    with client.websocket_connect(f"/elections/{election_id}/observer/ws?token={obs_token}") as ws:
        first = ws.receive_json()
        assert first["summary"]["presencial"] == 0
        client.post(
            f"/elections/{election_id}/attendance/SH1/mark",
            json={"mode": "PRESENCIAL"},
            headers=reg_headers,
        )
        msg = ws.receive_json()
        assert msg["summary"]["presencial"] == 1
        assert msg["row"]["code"] == "SH1"
        assert msg["row"]["estado"] == "PRESENCIAL"
    resp = client.post(
        f"/elections/{election_id}/attendance/SH1/mark",
        json={"mode": "AUSENTE"},
        headers=obs_headers,
    )
    assert resp.status_code == 403
    resp = client.get(f"/elections/{election_id}/observer", headers=obs_headers)
    assert resp.status_code == 200
    assert resp.json()[0]["code"] == "SH1"


def test_observer_table_shows_represented_actions():
    election_id, admin_headers, reg_headers, obs_headers, obs_token = setup_env()
    db = SessionLocal()
    sh = db.query(models.Shareholder).filter_by(code="SH1").first()
    person = models.Person(type=models.PersonType.TERCERO, name="Proxy One", document="P1", email=None)
    db.add(person)
    db.commit()
    db.refresh(person)
    proxy = models.Proxy(
        election_id=election_id,
        proxy_person_id=person.id,
        tipo_doc="ID",
        num_doc="123",
        fecha_otorg=date(2023,1,1),
        fecha_vigencia=None,
        pdf_url="url",
        status=models.ProxyStatus.VALID,
        mode=models.AttendanceMode.PRESENCIAL,
        present=True,
    )
    db.add(proxy)
    db.commit()
    db.refresh(proxy)
    assignment = models.ProxyAssignment(proxy_id=proxy.id, shareholder_id=sh.id, weight_actions_snapshot=10)
    db.add(assignment)
    db.commit()
    db.close()
    table = client.get(f"/elections/{election_id}/observer", headers=obs_headers).json()
    row = table[0]
    assert row["acciones_representadas"] == 10.0
    assert row["acciones_propias"] == 0.0
