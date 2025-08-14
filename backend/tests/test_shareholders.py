from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal

Base.metadata.create_all(bind=engine)
client = TestClient(app)

def test_import_and_list_shareholders():
    data = [{"code": "SH1", "name": "Alice", "document": "D1", "email": "a@example.com", "actions": 10}]
    response = client.post("/elections/1/shareholders/import", json=data)
    assert response.status_code == 200
    assert response.json()[0]["code"] == "SH1"
    response = client.get("/elections/1/shareholders")
    assert response.status_code == 200
    assert len(response.json()) == 1
