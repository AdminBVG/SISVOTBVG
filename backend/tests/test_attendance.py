from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine

Base.metadata.create_all(bind=engine)
client = TestClient(app)

def test_attendance_history_endpoint():
    data = [{"code": "SH1", "name": "Alice", "document": "D1", "email": "a@example.com", "actions": 10}]
    assert client.post("/elections/1/shareholders/import", json=data).status_code == 200
    assert client.post("/elections/1/attendance/SH1/mark", json={"mode": "PRESENCIAL"}).status_code == 200
    assert client.post("/elections/1/attendance/SH1/mark", json={"mode": "VIRTUAL"}).status_code == 200
    resp = client.get("/elections/1/attendance/history", params={"code": "SH1"})
    assert resp.status_code == 200
    history = resp.json()
    assert len(history) == 2
    assert history[0]["from_mode"] == "AUSENTE"
    assert history[0]["to_mode"] == "PRESENCIAL"
    assert history[1]["from_mode"] == "PRESENCIAL"
    assert history[1]["to_mode"] == "VIRTUAL"
