from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app import models
from app.routers.auth import hash_password
from datetime import date, datetime, timedelta, timezone

client = TestClient(app)


def setup_env():
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
    assert history[0]["changed_by"] == "AdminBVG"
    assert history[0]["ip"]
    assert history[0]["user_agent"]


def test_bulk_mark_attendance():
    headers, election_id = setup_env()
    data = [
        {"code": "SH1", "name": "Alice", "document": "D1", "email": "a@example.com", "actions": 10},
        {"code": "SH2", "name": "Bob", "document": "D2", "email": "b@example.com", "actions": 5},
    ]
    assert (
        client.post(
            f"/elections/{election_id}/shareholders/import", json=data, headers=headers
        ).status_code
        == 200
    )
    resp = client.post(
        f"/elections/{election_id}/attendance/bulk_mark",
        json={"codes": ["SH1", "SH2"], "mode": "PRESENCIAL"},
        headers=headers,
    )
    assert resp.status_code == 200
    result = resp.json()
    assert len(result) == 2
    assert all(r["mode"] == "PRESENCIAL" for r in result)


def test_quorum_summary():
    headers, election_id = setup_env()
    data = [
        {"code": "SH1", "name": "Alice", "document": "D1", "email": "a@example.com", "actions": 100},
        {"code": "SH2", "name": "Bob", "document": "D2", "email": "b@example.com", "actions": 50},
    ]
    assert client.post(f"/elections/{election_id}/shareholders/import", json=data, headers=headers).status_code == 200
    db = SessionLocal()
    person = models.Person(type=models.PersonType.TERCERO, name="Proxy", document="P1", email=None)
    db.add(person)
    db.commit()
    db.refresh(person)
    sh2 = db.query(models.Shareholder).filter_by(code="SH2").first()
    proxy = models.Proxy(
        election_id=election_id,
        proxy_person_id=person.id,
        tipo_doc="ID",
        num_doc="123",
        fecha_otorg=date(2023, 1, 1),
        fecha_vigencia=None,
        pdf_url="http://example.com/proxy.pdf",
        status=models.ProxyStatus.VALID,
    )
    db.add(proxy)
    db.commit()
    db.refresh(proxy)
    assignment = models.ProxyAssignment(
        proxy_id=proxy.id, shareholder_id=sh2.id, weight_actions_snapshot=50
    )
    db.add(assignment)
    db.commit()
    proxy_id = proxy.id
    db.close()
    assert (
        client.post(
            f"/elections/{election_id}/attendance/SH1/mark",
            json={"mode": "PRESENCIAL"},
            headers=headers,
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/elections/{election_id}/proxies/{proxy_id}/mark",
            json={"mode": "PRESENCIAL"},
            headers=headers,
        ).status_code
        == 200
    )
    summary = client.get(f"/elections/{election_id}/attendance/summary", headers=headers).json()
    assert summary["capital_suscrito"] == 150.0
    assert summary["capital_presente_directo"] == 100.0
    assert summary["capital_presente_representado"] == 50.0
    assert summary["porcentaje_quorum"] == 1.0


def test_cannot_mark_absent_with_active_proxy():
    headers, election_id = setup_env()
    client.post(
        f"/elections/{election_id}/shareholders/import",
        json=[{"code": "SH1", "name": "Alice", "document": "D1", "email": "a@example.com", "actions": 10}],
        headers=headers,
    )
    db = SessionLocal()
    shareholder = db.query(models.Shareholder).filter_by(code="SH1").first()
    person = models.Person(
        type=models.PersonType.TERCERO,
        name="Proxy Person",
        document="PDOC",
        email=None,
    )
    db.add(person)
    db.commit()
    db.refresh(person)
    proxy = models.Proxy(
        election_id=election_id,
        proxy_person_id=person.id,
        tipo_doc="ID",
        num_doc="123",
        fecha_otorg=date.today(),
        fecha_vigencia=None,
        pdf_url="http://example.com/proxy.pdf",
        status=models.ProxyStatus.VALID,
    )
    db.add(proxy)
    db.commit()
    db.refresh(proxy)
    assignment = models.ProxyAssignment(
        proxy_id=proxy.id,
        shareholder_id=shareholder.id,
        weight_actions_snapshot=10,
    )
    db.add(assignment)
    db.commit()
    db.close()
    resp = client.post(
        f"/elections/{election_id}/attendance/SH1/mark",
        json={"mode": "AUSENTE"},
        headers=headers,
    )
    assert resp.status_code == 400


def test_registration_window_blocks_marking():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    db.add(
        models.User(
            username="Reg", hashed_password=hash_password("pass"), role="REGISTRADOR_BVG"
        )
    )
    db.add(
        models.User(
            username="Admin", hashed_password=hash_password("pass"), role="ADMIN_BVG"
        )
    )
    db.commit()
    db.close()
    reg_token = client.post("/auth/login", json={"username": "Reg", "password": "pass"}).json()["access_token"]
    admin_token = client.post("/auth/login", json={"username": "Admin", "password": "pass"}).json()["access_token"]
    headers_reg = {"Authorization": f"Bearer {reg_token}"}
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    now = datetime.now(timezone.utc)
    resp = client.post(
        "/elections",
        json={
            "name": "Timed",
            "date": "2024-01-01",
            "registration_start": (now - timedelta(days=1)).isoformat(),
            "registration_end": (now - timedelta(hours=1)).isoformat(),
        },
        headers=headers_admin,
    )
    assert resp.status_code == 200
    election_id = resp.json()["id"]
    resp = client.post(
        f"/elections/{election_id}/shareholders/import",
        json=[{"code": "S1", "name": "A", "document": "D", "email": "a@a.com", "actions": 1}],
        headers=headers_admin,
    )
    assert resp.status_code == 200
    assert (
        client.post(
            f"/elections/{election_id}/attendance/S1/mark",
            json={"mode": "PRESENCIAL"},
            headers=headers_reg,
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"/elections/{election_id}/attendance/S1/mark",
            json={"mode": "PRESENCIAL"},
            headers=headers_admin,
        ).status_code
        == 200
    )
