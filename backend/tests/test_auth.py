from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_login_success():
    response = client.post("/auth/login", json={"username": "AdminBVG", "password": "BVG2025"})
    assert response.status_code == 200
    data = response.json()
    assert data["access_token"]
    assert data["role"] == "REGISTRADOR_BVG"
    assert data["username"] == "AdminBVG"

def test_login_failure():
    response = client.post("/auth/login", json={"username": "foo", "password": "bar"})
    assert response.status_code == 401
