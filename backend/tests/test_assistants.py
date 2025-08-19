from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app import models
from app.routers.auth import hash_password
from openpyxl import Workbook
from io import BytesIO

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
    token = client.post(
        "/auth/login", json={"username": "AdminBVG", "password": "BVG2025"}
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.post(
        "/elections", json={"name": "Demo", "date": "2024-01-01"}, headers=headers
    )
    election_id = resp.json()["id"]
    return headers, election_id


def create_csv(rows):
    lines = ["id,accionista,representante,apoderado,acciones\n"]
    for r in rows:
        lines.append(",".join(map(str, r)) + "\n")
    return "".join(lines)


def create_xlsx(rows):
    wb = Workbook()
    ws = wb.active
    ws.append(["id", "accionista", "representante", "apoderado", "acciones"])
    for r in rows:
        ws.append(r)
    bio = BytesIO()
    wb.save(bio)
    bio.seek(0)
    return bio.getvalue()


def test_import_attendees_excel_success():
    headers, election_id = setup_auth_and_election()
    data = create_csv([["1", "Alice", "", "", 10]])
    files = {"file": ("attendees.csv", data, "text/csv")}
    resp = client.post(
        f"/elections/{election_id}/assistants/import-excel",
        files=files,
        headers=headers,
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    list_resp = client.get(
        f"/elections/{election_id}/assistants", headers=headers
    )
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1


def test_import_attendees_excel_xlsx_success():
    headers, election_id = setup_auth_and_election()
    data = create_xlsx([["1", "Alice", "", "", 10]])
    files = {
        "file": (
            "attendees.xlsx",
            data,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    }
    resp = client.post(
        f"/elections/{election_id}/assistants/import-excel",
        files=files,
        headers=headers,
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_import_attendees_excel_missing_columns():
    headers, election_id = setup_auth_and_election()
    data = "id,accionista,acciones\n1,Alice,10\n"
    files = {"file": ("attendees.csv", data, "text/csv")}
    resp = client.post(
        f"/elections/{election_id}/assistants/import-excel",
        files=files,
        headers=headers,
    )
    assert resp.status_code == 400
