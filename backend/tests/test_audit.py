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


def test_audit_logs_recorded():
    headers, election_id = setup_env()
    resp = client.post(
        f"/elections/{election_id}/shareholders/import",
        json=[{"code": "SH1", "name": "Alice", "document": "D1", "email": "a@example.com", "actions": 10}],
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    db = SessionLocal()
    person = models.Person(type=models.PersonType.TERCERO, name="Proxy", document="P1", email=None)
    db.add(person)
    db.commit()
    db.refresh(person)
    sh = db.query(models.Shareholder).filter_by(code="SH1").first()
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
        proxy_id=proxy.id, shareholder_id=sh.id, weight_actions_snapshot=10
    )
    db.add(assignment)
    db.commit()
    proxy_id = proxy.id
    db.close()
    client.post(
        f"/elections/{election_id}/proxies/{proxy_id}/invalidate", headers=headers
    )
    resp = client.get(f"/elections/{election_id}/audit", headers=headers)
    assert resp.status_code == 200
    logs = resp.json()
    assert logs[0]["action"] == "SHAREHOLDER_IMPORT"
    assert logs[1]["action"] == "PROXY_INVALIDATE"
