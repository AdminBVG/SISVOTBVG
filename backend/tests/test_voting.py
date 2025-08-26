from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app import models
from app.routers.auth import hash_password
from datetime import datetime, timedelta, timezone

client = TestClient(app)


def auth_headers():
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
    return {"Authorization": f"Bearer {token}"}


def test_voting_flow():
    headers = auth_headers()
    resp = client.post(
        "/elections",
        json={"name": "Vote", "date": "2024-01-01"},
        headers=headers,
    )
    election_id = resp.json()["id"]
    client.patch(
        f"/elections/{election_id}/status",
        json={"status": "OPEN"},
        headers=headers,
    )
    client.post(
        f"/elections/{election_id}/start-voting",
        headers=headers,
    )

    # create shareholders, attendance, and attendees directly in db
    db = SessionLocal()
    sh1 = models.Shareholder(code="1", name="A1", document="D1", actions=10)
    sh2 = models.Shareholder(code="2", name="A2", document="D2", actions=20)
    db.add_all([sh1, sh2])
    db.commit()
    db.refresh(sh1)
    db.refresh(sh2)
    db.add_all(
        [
            models.Attendance(
                election_id=election_id,
                shareholder_id=sh1.id,
                mode=models.AttendanceMode.PRESENCIAL,
                present=True,
            ),
            models.Attendance(
                election_id=election_id,
                shareholder_id=sh2.id,
                mode=models.AttendanceMode.PRESENCIAL,
                present=True,
            ),
            models.Attendee(
                election_id=election_id,
                identifier="1",
                accionista="A1",
                acciones=10,
            ),
            models.Attendee(
                election_id=election_id,
                identifier="2",
                accionista="A2",
                acciones=20,
            ),
        ]
    )
    db.commit()
    db.close()

    resp = client.post(
        f"/elections/{election_id}/ballots",
        json={"title": "Presidente", "order": 1},
        headers=headers,
    )
    ballot_id = resp.json()["id"]

    option1 = client.post(
        f"/ballots/{ballot_id}/options",
        json={"text": "A"},
        headers=headers,
    ).json()
    option2 = client.post(
        f"/ballots/{ballot_id}/options",
        json={"text": "B"},
        headers=headers,
    ).json()

    client.post(
        f"/ballots/{ballot_id}/vote-all",
        json={"option_id": option1["id"]},
        headers=headers,
    )

    client.post(
        f"/ballots/{ballot_id}/vote",
        json={"option_id": option2["id"], "attendee_id": 2},
        headers=headers,
    )

    resp = client.get(f"/ballots/{ballot_id}/results", headers=headers)
    assert resp.status_code == 200
    results = {r["text"]: r["votes"] for r in resp.json()}
    assert results["A"] == 10
    assert results["B"] == 20

    client.post(f"/ballots/{ballot_id}/close", headers=headers)
    pending = client.get(
        f"/elections/{election_id}/ballots/pending", headers=headers
    )
    assert pending.json() == []

    fail = client.post(
        f"/ballots/{ballot_id}/vote",
        json={"option_id": option1["id"], "attendee_id": 1},
        headers=headers,
    )
    assert fail.status_code == 400

    reopen = client.post(f"/ballots/{ballot_id}/reopen", headers=headers)
    assert reopen.status_code == 200
    ok = client.post(
        f"/ballots/{ballot_id}/vote",
        json={"option_id": option1["id"], "attendee_id": 1},
        headers=headers,
    )
    assert ok.status_code == 200

    client.post(f"/elections/{election_id}/close", headers=headers)
    db = SessionLocal()
    actions = [
        log.action
        for log in db.query(models.AuditLog).order_by(models.AuditLog.id).all()
    ]
    db.close()
    assert actions == ["VOTING_OPEN", "BALLOT_CLOSE", "BALLOT_REOPEN", "ELECTION_CLOSE"]


def test_vote_all_skips_absent_attendees():
    headers = auth_headers()
    resp = client.post(
        "/elections",
        json={"name": "VA", "date": "2024-01-01"},
        headers=headers,
    )
    election_id = resp.json()["id"]
    client.patch(
        f"/elections/{election_id}/status",
        json={"status": "OPEN"},
        headers=headers,
    )
    client.post(
        f"/elections/{election_id}/start-voting",
        headers=headers,
    )

    db = SessionLocal()
    sh1 = models.Shareholder(code="S1", name="SH1", document="D1", actions=10)
    sh2 = models.Shareholder(code="S2", name="SH2", document="D2", actions=20)
    db.add_all([sh1, sh2])
    db.commit()
    db.refresh(sh1)
    db.refresh(sh2)

    att1 = models.Attendance(
        election_id=election_id,
        shareholder_id=sh1.id,
        mode=models.AttendanceMode.PRESENCIAL,
        present=True,
    )
    att2 = models.Attendance(
        election_id=election_id,
        shareholder_id=sh2.id,
        mode=models.AttendanceMode.AUSENTE,
        present=False,
    )
    a1 = models.Attendee(
        election_id=election_id,
        identifier=sh1.code,
        accionista="SH1",
        acciones=sh1.actions,
    )
    a2 = models.Attendee(
        election_id=election_id,
        identifier=sh2.code,
        accionista="SH2",
        acciones=sh2.actions,
    )
    db.add_all([att1, att2, a1, a2])
    db.commit()
    db.refresh(a1)
    db.refresh(a2)
    absent_attendee_id = a2.id
    db.close()

    ballot = client.post(
        f"/elections/{election_id}/ballots",
        json={"title": "B", "order": 1},
        headers=headers,
    ).json()
    option = client.post(
        f"/ballots/{ballot['id']}/options",
        json={"text": "Yes"},
        headers=headers,
    ).json()

    vote_all_resp = client.post(
        f"/ballots/{ballot['id']}/vote-all",
        json={"option_id": option["id"]},
        headers=headers,
    )
    assert vote_all_resp.status_code == 200
    assert vote_all_resp.json()["count"] == 1

    res = client.get(f"/ballots/{ballot['id']}/results", headers=headers)
    votes = {r["text"]: r["votes"] for r in res.json()}
    assert votes["Yes"] == 10

    db = SessionLocal()
    absent_vote = (
        db.query(models.Vote)
        .filter_by(ballot_id=ballot["id"], attendee_id=absent_attendee_id)
        .first()
    )
    db.close()
    assert absent_vote is None


def test_election_status_and_quorum():
    headers = auth_headers()
    resp = client.post(
        "/elections",
        json={"name": "Q", "date": "2024-01-01", "min_quorum": 0.5},
        headers=headers,
    )
    election_id = resp.json()["id"]
    db = SessionLocal()
    sh = models.Shareholder(
        code="S1", name="SH1", document="D1", actions=100
    )
    db.add(sh)
    db.commit()
    db.refresh(sh)
    db.add(
        models.Attendance(
            election_id=election_id,
            shareholder_id=sh.id,
            mode=models.AttendanceMode.AUSENTE,
            present=False,
        )
    )
    db.add(
        models.Attendee(
            election_id=election_id,
            identifier="1",
            accionista="A1",
            acciones=100,
        )
    )
    db.commit()
    sh_id = sh.id
    db.close()
    ballot = client.post(
        f"/elections/{election_id}/ballots",
        json={"title": "B", "order": 1},
        headers=headers,
    ).json()
    option = client.post(
        f"/ballots/{ballot['id']}/options",
        json={"text": "Si"},
        headers=headers,
    ).json()
    # status DRAFT should block
    fail_status = client.post(
        f"/ballots/{ballot['id']}/vote",
        json={"option_id": option['id'], "attendee_id": 1},
        headers=headers,
    )
    assert fail_status.status_code == 400
    # Force open without quorum
    db = SessionLocal()
    election = db.query(models.Election).get(election_id)
    election.status = models.ElectionStatus.OPEN
    db.commit()
    db.close()
    client.post(
        f"/elections/{election_id}/start-voting",
        headers=headers,
    )
    fail_quorum = client.post(
        f"/ballots/{ballot['id']}/vote",
        json={"option_id": option['id'], "attendee_id": 1},
        headers=headers,
    )
    assert fail_quorum.status_code == 400
    # Meet quorum and vote succeeds
    db = SessionLocal()
    attendance = db.query(models.Attendance).filter_by(
        election_id=election_id, shareholder_id=sh_id
    ).first()
    attendance.present = True
    attendance.mode = models.AttendanceMode.PRESENCIAL
    db.commit()
    db.close()
    client.post(
        f"/elections/{election_id}/start-voting",
        headers=headers,
    )
    ok = client.post(
        f"/ballots/{ballot['id']}/vote",
        json={"option_id": option['id'], "attendee_id": 1},
        headers=headers,
    )
    assert ok.status_code == 200


def test_start_voting_requires_time_or_demo():
    headers = auth_headers()
    future = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    resp = client.post(
        "/elections",
        json={"name": "T", "date": "2024-01-01", "registration_start": future},
        headers=headers,
    )
    eid = resp.json()["id"]
    client.patch(
        f"/elections/{eid}/status", json={"status": "OPEN"}, headers=headers
    )
    early = client.post(f"/elections/{eid}/start-voting", headers=headers)
    assert early.status_code == 400
    resp2 = client.post(
        "/elections",
        json={
            "name": "D",
            "date": "2024-01-01",
            "registration_start": future,
            "demo": True,
        },
        headers=headers,
    )
    eid2 = resp2.json()["id"]
    client.patch(
        f"/elections/{eid2}/status", json={"status": "OPEN"}, headers=headers
    )
    ok = client.post(f"/elections/{eid2}/start-voting", headers=headers)
    assert ok.status_code == 200
