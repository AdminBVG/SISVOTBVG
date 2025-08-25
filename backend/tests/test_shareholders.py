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


def test_list_shareholders_scoped_by_election():
    headers, election_id = setup_auth_and_election()
    # Create another election
    resp = client.post(
        "/elections",
        json={"name": "Other", "date": "2024-02-01"},
        headers=headers,
    )
    other_election = resp.json()["id"]
    data1 = [
        {"code": "SH1", "name": "Alice", "document": "D1", "email": "a@example.com", "actions": 10},
    ]
    data2 = [
        {"code": "SH2", "name": "Bob", "document": "D2", "email": "b@example.com", "actions": 5},
    ]
    client.post(f"/elections/{election_id}/shareholders/import", json=data1, headers=headers)
    client.post(f"/elections/{other_election}/shareholders/import", json=data2, headers=headers)
    resp1 = client.get(f"/elections/{election_id}/shareholders", headers=headers)
    resp2 = client.get(f"/elections/{other_election}/shareholders", headers=headers)
    assert len(resp1.json()) == 1
    assert resp1.json()[0]["code"] == "SH1"
    assert len(resp2.json()) == 1
    assert resp2.json()[0]["code"] == "SH2"


def test_get_update_delete_shareholder():
    headers, election_id = setup_auth_and_election()
    payload = [
        {
            "code": "SH1",
            "name": "Alice",
            "document": "D1",
            "email": "a@example.com",
            "actions": 10,
        }
    ]
    resp = client.post(
        f"/elections/{election_id}/shareholders/import",
        json=payload,
        headers=headers,
    )
    shareholder_id = resp.json()[0]["id"]

    get_resp = client.get(
        f"/elections/{election_id}/shareholders/{shareholder_id}",
        headers=headers,
    )
    assert get_resp.status_code == 200
    assert get_resp.json()["code"] == "SH1"

    update_resp = client.put(
        f"/elections/{election_id}/shareholders/{shareholder_id}",
        json={"name": "Alice Updated"},
        headers=headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "Alice Updated"

    del_resp = client.delete(
        f"/elections/{election_id}/shareholders/{shareholder_id}",
        headers=headers,
    )
    assert del_resp.status_code == 204
    list_resp = client.get(
        f"/elections/{election_id}/shareholders",
        headers=headers,
    )
    assert list_resp.status_code == 200
    assert list_resp.json() == []


def test_vote_registrar_can_access_shareholders():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    admin = models.User(
        username="admin", hashed_password=hash_password("pass"), role="ADMIN_BVG"
    )
    vote = models.User(
        username="vote", hashed_password=hash_password("pass"), role="REGISTRADOR_VOTOS"
    )
    db.add_all([admin, vote])
    db.commit()
    vote_id = vote.id
    db.close()

    token = client.post(
        "/auth/login", json={"username": "admin", "password": "pass"}
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.post(
        "/elections",
        json={"name": "A", "date": "2024-01-01", "vote_registrars": [vote_id]},
        headers=headers,
    )
    election_id = resp.json()["id"]
    payload = [
        {
            "code": "SH1",
            "name": "Alice",
            "document": "D1",
            "email": "a@example.com",
            "actions": 10,
        }
    ]
    client.post(
        f"/elections/{election_id}/shareholders/import", json=payload, headers=headers
    )

    token_vote = client.post(
        "/auth/login", json={"username": "vote", "password": "pass"}
    ).json()["access_token"]
    vote_headers = {"Authorization": f"Bearer {token_vote}"}
    list_resp = client.get(
        f"/elections/{election_id}/shareholders", headers=vote_headers
    )
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1
    sh_id = list_resp.json()[0]["id"]
    get_resp = client.get(
        f"/elections/{election_id}/shareholders/{sh_id}", headers=vote_headers
    )
    assert get_resp.status_code == 200
    assert get_resp.json()["code"] == "SH1"

