from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app import models
from app.routers.auth import hash_password

client = TestClient(app)


def setup_auth_and_election():
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
    resp = client.post(
        "/elections", json={"name": "Demo", "date": "2024-01-01"}, headers=headers
    )
    assert resp.status_code == 200
    election_id = resp.json()["id"]
    return headers, election_id


def test_import_preview_and_confirm_shareholders_csv():
    headers, election_id = setup_auth_and_election()
    csv_content = (
        "code,name,document,email,actions\n"
        "SH1,Alice,D1,a@example.com,10\n"
        "SH1,Bob,D2,b@example.com,5\n"
        "SH3,Charlie,D3,c@example.com,-1\n"
    )
    files = {"file": ("shareholders.csv", csv_content, "text/csv")}
    response = client.post(
        f"/elections/{election_id}/shareholders/import-file?preview=true",
        files=files,
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["valid"]) == 1
    assert len(data["invalid"]) == 2

    valid_csv = (
        "code,name,document,email,actions\n"
        "SH1,Alice,D1,a@example.com,10\n"
    )
    files = {"file": ("shareholders.csv", valid_csv, "text/csv")}
    response = client.post(
        f"/elections/{election_id}/shareholders/import-file?preview=false",
        files=files,
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()[0]["code"] == "SH1"

    # idempotent import
    response = client.post(
        f"/elections/{election_id}/shareholders/import-file?preview=false",
        files=files,
        headers=headers,
    )
    assert response.status_code == 200
    list_resp = client.get(
        f"/elections/{election_id}/shareholders", headers=headers
    )
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1

    # search filter
    search_resp = client.get(
        f"/elections/{election_id}/shareholders?q=SH1", headers=headers
    )
    assert search_resp.status_code == 200
    assert len(search_resp.json()) == 1
    empty_resp = client.get(
        f"/elections/{election_id}/shareholders?q=ZZZ", headers=headers
    )
    assert empty_resp.status_code == 200
    assert len(empty_resp.json()) == 0
