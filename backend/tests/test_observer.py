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
        models.User(username="Reg", hashed_password=hash_password("pass"), role="FUNCIONAL_BVG"),
        models.User(username="Obs", hashed_password=hash_password("pass"), role="FUNCIONAL_BVG"),
    ])
    db.commit()
    reg_id = db.query(models.User).filter_by(username="Reg").first().id
    obs_id = db.query(models.User).filter_by(username="Obs").first().id
    db.close()
    admin_token = client.post("/auth/login", json={"username": "Admin", "password": "pass"}).json()["access_token"]
    reg_token = client.post("/auth/login", json={"username": "Reg", "password": "pass"}).json()["access_token"]
    obs_token = client.post("/auth/login", json={"username": "Obs", "password": "pass"}).json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    reg_headers = {"Authorization": f"Bearer {reg_token}"}
    obs_headers = {"Authorization": f"Bearer {obs_token}"}
    resp = client.post(
        "/elections",
        json={
            "name": "Demo",
            "date": "2024-01-01",
            "attendance_registrars": [reg_id],
            "observers": [obs_id],
        },
        headers=admin_headers,
    )
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


def test_observer_receives_ballot_progress():
    election_id, admin_headers, reg_headers, obs_headers, obs_token = setup_env()
    db = SessionLocal()
    db.add(
        models.Attendee(
            election_id=election_id, identifier="1", accionista="A1", acciones=10
        )
    )
    db.commit()
    db.close()
    ballot = client.post(
        f"/elections/{election_id}/ballots",
        json={"title": "Q1", "order": 1},
        headers=admin_headers,
    ).json()
    opt_yes = client.post(
        f"/ballots/{ballot['id']}/options", json={"text": "Si"}, headers=admin_headers
    ).json()
    client.post(
        f"/ballots/{ballot['id']}/options", json={"text": "No"}, headers=admin_headers
    )
    with client.websocket_connect(
        f"/elections/{election_id}/observer/ws?token={obs_token}"
    ) as ws:
        ws.receive_json()
        client.post(
            f"/ballots/{ballot['id']}/vote-all",
            json={"option_id": opt_yes["id"]},
            headers=admin_headers,
        )
        msg = ws.receive_json()
        assert msg["ballot"]["id"] == ballot["id"]
        counts = {r["id"]: r["votes"] for r in msg["ballot"]["results"]}
        assert counts[opt_yes["id"]] == 1
