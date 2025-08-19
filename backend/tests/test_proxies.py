from fastapi.testclient import TestClient
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app import models
from app.routers.auth import hash_password

client = TestClient(app)


def setup_env():
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
    election_id = resp.json()["id"]
    return headers, election_id


def setup_entities():
    db = SessionLocal()
    person = models.Person(
        type=models.PersonType.TERCERO,
        name="Proxy Person",
        document="PDOCX",
        email=None,
    )
    shareholder = models.Shareholder(
        code="SH_PRX",
        name="Alice",
        document="D2",
        email="a@example.com",
        actions=10,
    )
    db.add_all([person, shareholder])
    db.commit()
    db.refresh(person)
    db.refresh(shareholder)
    db.close()
    return person.id, shareholder.id


def test_create_and_list_proxies():
    headers, election_id = setup_env()
    person_id, shareholder_id = setup_entities()
    payload = {
        "election_id": election_id,
        "proxy_person_id": person_id,
        "tipo_doc": "ID",
        "num_doc": "123",
        "fecha_otorg": "2024-01-01",
        "fecha_vigencia": "2030-01-01",
        "pdf_url": "http://example.com/proxy.pdf",
        "assignments": [
            {
                "shareholder_id": shareholder_id,
                "weight_actions_snapshot": 10,
                "valid_from": None,
                "valid_until": None,
            }
        ],
    }
    response = client.post(f"/elections/{election_id}/proxies", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["proxy_person_id"] == person_id
    assert len(data["assignments"]) == 1

    response = client.get(f"/elections/{election_id}/proxies", headers=headers)
    assert response.status_code == 200
    proxies = response.json()
    assert len(proxies) == 1
    assert proxies[0]["id"] == data["id"]


def test_proxy_presence_and_invalidation():
    headers, election_id = setup_env()
    person_id, shareholder_id = setup_entities()
    payload = {
        "election_id": election_id,
        "proxy_person_id": person_id,
        "tipo_doc": "ID",
        "num_doc": "123",
        "fecha_otorg": "2024-01-01",
        "fecha_vigencia": "2030-01-01",
        "pdf_url": "http://example.com/proxy.pdf",
        "assignments": [
            {
                "shareholder_id": shareholder_id,
                "weight_actions_snapshot": 10,
                "valid_from": None,
                "valid_until": None,
            }
        ],
    }
    resp = client.post(f"/elections/{election_id}/proxies", json=payload, headers=headers)
    proxy_id = resp.json()["id"]

    # initially no represented count
    summary = client.get(f"/elections/{election_id}/attendance/summary", headers=headers)
    assert summary.json()["representado"] == 0

    # mark proxy present
    mark_payload = {"mode": "PRESENCIAL"}
    client.post(
        f"/elections/{election_id}/proxies/{proxy_id}/mark",
        json=mark_payload,
        headers=headers,
    )
    summary = client.get(f"/elections/{election_id}/attendance/summary", headers=headers)
    assert summary.json()["representado"] == 1

    # invalidate proxy
    client.post(
        f"/elections/{election_id}/proxies/{proxy_id}/invalidate",
        headers=headers,
    )
    summary = client.get(f"/elections/{election_id}/attendance/summary", headers=headers)
    assert summary.json()["representado"] == 0


def test_proxy_vigencia_validation():
    headers, election_id = setup_env()
    person_id, shareholder_id = setup_entities()
    # fecha_otorg after election date -> invalid
    bad_payload = {
        "election_id": election_id,
        "proxy_person_id": person_id,
        "tipo_doc": "ID",
        "num_doc": "123",
        "fecha_otorg": "2025-01-01",
        "fecha_vigencia": "2030-01-01",
        "pdf_url": "http://example.com/proxy.pdf",
        "assignments": []
    }
    resp = client.post(f"/elections/{election_id}/proxies", json=bad_payload, headers=headers)
    assert resp.status_code == 400
