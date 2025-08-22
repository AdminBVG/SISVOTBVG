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
    lines = ["id,accionista,representante_legal,apoderado,acciones\n"]
    for r in rows:
        lines.append(",".join(map(str, r)) + "\n")
    return "".join(lines)


def create_xlsx(rows):
    wb = Workbook()
    ws = wb.active
    ws.append(["id", "accionista", "representante_legal", "apoderado", "acciones"])
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


def test_get_update_delete_attendee():
    headers, election_id = setup_auth_and_election()
    data = create_csv([["1", "Alice", "", "", 10]])
    files = {"file": ("attendees.csv", data, "text/csv")}
    resp = client.post(
        f"/elections/{election_id}/assistants/import-excel",
        files=files,
        headers=headers,
    )
    attendee_id = resp.json()[0]["id"]

    get_resp = client.get(
        f"/elections/{election_id}/assistants/{attendee_id}",
        headers=headers,
    )
    assert get_resp.status_code == 200
    assert get_resp.json()["identifier"] == "1"

    update_resp = client.put(
        f"/elections/{election_id}/assistants/{attendee_id}",
        json={"acciones": 20},
        headers=headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["acciones"] == 20

    del_resp = client.delete(
        f"/elections/{election_id}/assistants/{attendee_id}",
        headers=headers,
    )
    assert del_resp.status_code == 204
    list_resp = client.get(
        f"/elections/{election_id}/assistants",
        headers=headers,
    )
    assert list_resp.status_code == 200
    assert list_resp.json() == []


def test_import_attendees_creates_shareholders():
    headers, election_id = setup_auth_and_election()
    data = create_csv([["1", "Alice", "", "", 10]])
    files = {"file": ("attendees.csv", data, "text/csv")}
    # import attendees as admin
    resp = client.post(
        f"/elections/{election_id}/assistants/import-excel",
        files=files,
        headers=headers,
    )
    assert resp.status_code == 200
    # create registrar user and assign role
    db = SessionLocal()
    reg = models.User(
        username="Reg",
        hashed_password=hash_password("pass"),
        role="FUNCIONAL_BVG",
    )
    db.add(reg)
    db.commit()
    db.add(
        models.ElectionUserRole(
            election_id=election_id,
            user_id=reg.id,
            role=models.ElectionRole.ATTENDANCE,
        )
    )
    db.commit()
    db.close()
    token = client.post(
        "/auth/login", json={"username": "Reg", "password": "pass"}
    ).json()["access_token"]
    reg_headers = {"Authorization": f"Bearer {token}"}
    share_resp = client.get(
        f"/elections/{election_id}/shareholders", headers=reg_headers
    )
    assert share_resp.status_code == 200
    data = share_resp.json()
    assert len(data) == 1
    assert data[0]["code"] == "1"


def test_export_template():
    headers, election_id = setup_auth_and_election()
    resp = client.get(f"/elections/{election_id}/assistants/template", headers=headers)
    assert resp.status_code == 200
    assert "id,accionista,representante_legal,apoderado,acciones" in resp.text
    resp_xlsx = client.get(
        f"/elections/{election_id}/assistants/template",
        headers=headers,
        params={"format": "xlsx"},
    )
    assert resp_xlsx.status_code == 200


def test_import_validations():
    headers, election_id = setup_auth_and_election()
    # missing id
    data = create_csv([["", "Alice", "", "", 10]])
    files = {"file": ("attendees.csv", data, "text/csv")}
    resp = client.post(
        f"/elections/{election_id}/assistants/import-excel",
        files=files,
        headers=headers,
    )
    assert resp.status_code == 400
    # duplicate id
    data = create_csv([["1", "Alice", "", "", 10], ["1", "Bob", "", "", 5]])
    files = {"file": ("attendees.csv", data, "text/csv")}
    resp = client.post(
        f"/elections/{election_id}/assistants/import-excel",
        files=files,
        headers=headers,
    )
    assert resp.status_code == 400
    # acciones negative
    data = create_csv([["2", "Charlie", "", "", -5]])
    files = {"file": ("attendees.csv", data, "text/csv")}
    resp = client.post(
        f"/elections/{election_id}/assistants/import-excel",
        files=files,
        headers=headers,
    )
    assert resp.status_code == 400


def test_upload_apoderado_pdf():
    headers, election_id = setup_auth_and_election()
    data = create_csv([["1", "Alice", "", "Bob", 10]])
    files = {"file": ("attendees.csv", data, "text/csv")}
    resp = client.post(
        f"/elections/{election_id}/assistants/import-excel",
        files=files,
        headers=headers,
    )
    attendee_id = resp.json()[0]["id"]
    pdf_content = b"%PDF-1.4\n%test\n"
    upload_files = {"file": ("doc.pdf", pdf_content, "application/pdf")}
    up_resp = client.post(
        f"/elections/{election_id}/assistants/{attendee_id}/apoderado-pdf",
        files=upload_files,
        headers=headers,
    )
    assert up_resp.status_code == 200
    data = up_resp.json()
    assert data["document_uploaded"] is True
    # duplicate upload replaces existing file
    up_resp2 = client.post(
        f"/elections/{election_id}/assistants/{attendee_id}/apoderado-pdf",
        files=upload_files,
        headers=headers,
    )
    assert up_resp2.status_code == 200
    assert up_resp2.json()["document_uploaded"] is True
    # attendee without apoderado
    data2 = create_csv([["2", "Carol", "", "", 5]])
    files2 = {"file": ("attendees.csv", data2, "text/csv")}
    resp2 = client.post(
        f"/elections/{election_id}/assistants/import-excel",
        files=files2,
        headers=headers,
    )
    att2 = resp2.json()[0]["id"]
    up_resp3 = client.post(
        f"/elections/{election_id}/assistants/{att2}/apoderado-pdf",
        files=upload_files,
        headers=headers,
    )
    assert up_resp3.status_code == 400

