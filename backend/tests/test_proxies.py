from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app import models

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
client = TestClient(app)

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
    person_id, shareholder_id = setup_entities()
    payload = {
        "election_id": 1,
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
    response = client.post("/elections/1/proxies", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["proxy_person_id"] == person_id
    assert len(data["assignments"]) == 1

    response = client.get("/elections/1/proxies")
    assert response.status_code == 200
    proxies = response.json()
    assert len(proxies) == 1
    assert proxies[0]["id"] == data["id"]

    # cleanup so subsequent tests start with a clean database
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

