import smtplib
from datetime import date

import pytest
from fastapi import HTTPException

from app.database import Base, engine, SessionLocal
from app import models
from app.routers.voting import (
    _send_vote_report,
    _build_vote_report_pdf,
    _ballot_results,
)


def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    election = models.Election(name="E", date=date.today())
    db.add(election)
    db.commit()
    db.refresh(election)
    return db, election.id


def test_send_vote_report_missing_config():
    db, election_id = setup_db()
    with pytest.raises(HTTPException):
        _send_vote_report(db, election_id, ["a@test.com"])
    db.close()


def test_send_vote_report_smtp_error(monkeypatch):
    db, election_id = setup_db()
    db.add_all(
        [
            models.Setting(key="smtp_host", value="localhost"),
            models.Setting(key="smtp_port", value="25"),
            models.Setting(key="smtp_user", value="user"),
            models.Setting(key="smtp_password", value="pass"),
        ]
    )
    db.commit()

    class FailSMTP:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            pass

        def login(self, user, password):
            pass

        def send_message(self, msg):
            raise smtplib.SMTPException("boom")

    monkeypatch.setattr(smtplib, "SMTP", FailSMTP)

    with pytest.raises(HTTPException):
        _send_vote_report(db, election_id, ["x@test.com"])
    db.close()


def test_build_vote_report_pdf_percentages():
    pytest.importorskip("weasyprint")
    pytest.importorskip("jinja2")
    db, election_id = setup_db()
    sh = models.Shareholder(code="S1", name="SH1", document="D1", actions=100)
    db.add(sh)
    db.commit()
    db.refresh(sh)
    db.add(
        models.Attendance(
            election_id=election_id,
            shareholder_id=sh.id,
            mode=models.AttendanceMode.PRESENCIAL,
            present=True,
        )
    )
    attendee = models.Attendee(
        election_id=election_id, identifier="1", accionista="SH1", acciones=100
    )
    db.add(attendee)
    db.commit()
    db.refresh(attendee)
    ballot = models.Ballot(election_id=election_id, title="Q1", order=1)
    db.add(ballot)
    db.commit()
    db.refresh(ballot)
    opt1 = models.BallotOption(ballot_id=ballot.id, text="A")
    opt2 = models.BallotOption(ballot_id=ballot.id, text="B")
    db.add_all([opt1, opt2])
    db.commit()
    db.refresh(opt1)
    db.refresh(opt2)
    db.add(models.Vote(ballot_id=ballot.id, option_id=opt1.id, attendee_id=attendee.id, weight=50))
    db.add(models.Vote(ballot_id=ballot.id, option_id=opt2.id, attendee_id=attendee.id, weight=50))
    db.commit()
    results = _ballot_results(db, ballot.id)
    total = sum(r.votes for r in results)
    assert total == 100
    assert [r.votes / total for r in results] == [0.5, 0.5]
    pdf = _build_vote_report_pdf(db, election_id)
    assert pdf.startswith(b"%PDF")
    assert b"Informe de votaci" in pdf
    assert b"005DAA" in pdf
    db.close()
