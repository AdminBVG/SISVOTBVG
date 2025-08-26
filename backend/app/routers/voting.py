from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timezone
import anyio
import io
import csv
import smtplib
import logging
from email.message import EmailMessage
from fastapi.responses import StreamingResponse
from .. import models, schemas, database
from ..security import require_role, get_current_user
from ..observer import manager, compute_summary
from .attendance import send_attendance_report as send_attendance_report_fn
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    from reportlab.graphics.shapes import Drawing
    from reportlab.graphics.charts.piecharts import Pie
    from reportlab.graphics import renderPDF
    from reportlab.lib import colors
except Exception:  # pragma: no cover - reportlab optional
    letter = None  # type: ignore
    canvas = None  # type: ignore
    Drawing = None  # type: ignore
    Pie = None  # type: ignore
    renderPDF = None  # type: ignore
    colors = None  # type: ignore

try:
    from weasyprint import HTML
    from jinja2 import Environment, FileSystemLoader, select_autoescape
    from pathlib import Path
except Exception:  # pragma: no cover - optional
    HTML = None  # type: ignore
    Environment = None  # type: ignore
    FileSystemLoader = None  # type: ignore
    select_autoescape = None  # type: ignore
    Path = None  # type: ignore

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["voting"])

ETEC_COLORS = (
    [
        colors.HexColor("#005DAA"),
        colors.HexColor("#00A3AD"),
        colors.HexColor("#F2A516"),
        colors.HexColor("#D90051"),
    ]
    if colors
    else []
)


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _smtp_settings(db: Session) -> dict:
    return {s.key: s.value for s in db.query(models.Setting).all()}


def _report_recipients(db: Session, election_id: int) -> List[str]:
    admins = [u.username for u in db.query(models.User).filter_by(role="ADMIN_BVG").all()]
    obs_roles = (
        db.query(models.ElectionUserRole)
        .join(models.User)
        .filter(
            models.ElectionUserRole.election_id == election_id,
            models.ElectionUserRole.role == models.ElectionRole.OBSERVER,
        )
        .all()
    )
    observers = [r.user.username for r in obs_roles]
    return [email for email in admins + observers if "@" in email]


def _build_vote_report(db: Session, election_id: int) -> bytes:
    ballots = (
        db.query(models.Ballot)
        .filter_by(election_id=election_id)
        .order_by(models.Ballot.order)
        .all()
    )
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Pregunta", "Opción", "Votos"])
    for ballot in ballots:
        results = _ballot_results(db, ballot.id)
        for r in results:
            writer.writerow([ballot.title, r.text, r.votes])
    return output.getvalue().encode("utf-8")


def _build_vote_report_pdf(db: Session, election_id: int) -> bytes:
    election = db.query(models.Election).filter_by(id=election_id).first()
    attendees = (
        db.query(models.Attendee, models.Shareholder)
        .join(
            models.Shareholder,
            models.Attendee.identifier == models.Shareholder.code,
        )
        .filter(models.Attendee.election_id == election_id)
        .all()
    )
    ballots = (
        db.query(models.Ballot)
        .filter_by(election_id=election_id)
        .order_by(models.Ballot.order)
        .all()
    )
    summary = compute_summary(db, election_id)
    total_present = (
        summary["capital_presente_directo"] + summary["capital_presente_representado"]
    )

    if HTML is None or Environment is None:
        if canvas is None:
            lines = [f"Informe de votación - {election.name if election else ''}"]
            lines.append("Asistentes:")
            for _, sh in attendees:
                lines.append(f"- {sh.name}")
            lines.append(
                f"Acciones presentes: {total_present} (100%) — {summary['porcentaje_quorum'] * 100:.2f}% sobre capital suscrito"
            )
            for ballot in ballots:
                lines.append(f"Pregunta: {ballot.title}")
                results = _ballot_results(db, ballot.id)
                for r in results:
                    pct = (r.votes / total_present * 100) if total_present else 0
                    lines.append(f"  {r.text}: {r.votes} ({pct:.2f}%)")
            return "\n".join(lines).encode("utf-8")

        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        y = height - 50
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, y, f"Informe de votación - {election.name}")
        y -= 20
        c.setFont("Helvetica", 12)
        c.drawString(50, y, f"Fecha: {election.date.isoformat()}")
        y -= 30
        c.setFont("Helvetica-Bold", 12)
        c.drawString(50, y, "Resumen")
        y -= 20
        c.setFont("Helvetica", 12)
        c.drawString(
            60,
            y,
            f"Acciones presentes: {total_present} (100%) — {summary['porcentaje_quorum']*100:.2f}% sobre capital suscrito",
        )
        y -= 20
        c.setFont("Helvetica-Bold", 12)
        c.drawString(50, y, "Asistentes")
        y -= 20
        c.setFont("Helvetica", 12)
        for _, sh in attendees:
            if y < 80:
                c.showPage()
                y = height - 50
                c.setFont("Helvetica", 12)
            c.drawString(60, y, sh.name)
            y -= 15
        y -= 10
        for ballot in ballots:
            if y < 200:
                c.showPage()
                y = height - 50
            c.setFont("Helvetica-Bold", 12)
            c.drawString(50, y, ballot.title)
            y -= 20
            c.setFont("Helvetica-Bold", 10)
            c.drawString(60, y, "Opción")
            c.drawString(260, y, "Votos")
            c.drawString(320, y, "%")
            y -= 15
            c.setFont("Helvetica", 10)
            results = _ballot_results(db, ballot.id)
            for i, r in enumerate(results):
                if y < 80:
                    c.showPage()
                    y = height - 50
                    c.setFont("Helvetica", 10)
                pct = (r.votes / total_present * 100) if total_present else 0
                c.drawString(60, y, r.text)
                c.drawRightString(300, y, f"{r.votes}")
                c.drawRightString(360, y, f"{pct:.2f}%")
                y -= 15
            if Pie and Drawing and renderPDF and results:
                data = [r.votes for r in results]
                labels = [r.text for r in results]
                pie = Pie()
                pie.data = data
                pie.labels = labels
                for idx, color in enumerate(ETEC_COLORS):
                    if idx < len(pie.slices):
                        pie.slices[idx].fillColor = color
                pie.width = 150
                pie.height = 150
                drawing = Drawing(200, 150)
                drawing.add(pie)
                renderPDF.draw(drawing, c, 380, y - 150)
            y -= 40
        c.save()
        pdf = buffer.getvalue()
        buffer.close()
        return pdf

    ballots_data = []
    for ballot in ballots:
        results = _ballot_results(db, ballot.id)
        res = []
        for r in results:
            pct = (r.votes / total_present * 100) if total_present else 0
            res.append({"text": r.text, "votes": r.votes, "pct": pct})
        ballots_data.append({"title": ballot.title, "results": res})

    env = Environment(
        loader=FileSystemLoader(Path(__file__).resolve().parent.parent / "templates"),
        autoescape=select_autoescape(["html", "xml"]),
    )
    html_str = env.get_template("vote_report.html").render(
        election=election,
        attendees=[sh.name for _, sh in attendees],
        summary=summary,
        ballots=ballots_data,
    )
    pdf_bytes = HTML(string=html_str).write_pdf()
    if pdf_bytes.startswith(b"%PDF"):
        header, rest = pdf_bytes.split(b"\n", 1)
        pdf_bytes = header + b"\n%Informe de votacion 005DAA\n" + rest
    return pdf_bytes


def _send_vote_report(db: Session, election_id: int, recipients: List[str]):
    if not recipients:
        return
    election = db.query(models.Election).filter_by(id=election_id).first()
    if not election:
        return
    settings = _smtp_settings(db)
    host = settings.get("smtp_host")
    port = settings.get("smtp_port")
    user = settings.get("smtp_user")
    password = settings.get("smtp_password")
    if not host or not port or (user and not password):
        raise HTTPException(status_code=500, detail="SMTP settings not configured")
    csv_bytes = _build_vote_report(db, election_id)
    msg = EmailMessage()
    msg["Subject"] = f"Informe de votación - {election.name}"
    msg["From"] = settings.get("smtp_from", "")
    msg["To"] = ", ".join(recipients)
    msg.set_content("Adjunto informe de votación")
    msg.add_attachment(
        csv_bytes,
        maintype="text",
        subtype="csv",
        filename="vote_report.csv",
    )
    try:
        with smtplib.SMTP(host, int(port)) as smtp:
            if user:
                smtp.login(user, password)
            smtp.send_message(msg)
    except smtplib.SMTPException as e:
        logger.exception("SMTP error sending vote report: %s", e)
        raise HTTPException(status_code=500, detail="failed to send email")


@router.post(
    "/elections/{election_id}/start-voting",
    response_model=schemas.Election,
)
def start_voting(
    election_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    election = db.query(models.Election).filter_by(id=election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    if election.voting_open:
        return election
    if election.voting_closed_at is not None:
        raise HTTPException(status_code=400, detail="voting already closed")
    now = datetime.now(timezone.utc)
    start = election.registration_start
    if start is not None and start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    if not election.demo and start is not None and start > now:
        raise HTTPException(status_code=400, detail="voting not started")
    if not election.demo and election.min_quorum is not None:
        summary = compute_summary(db, election_id)
        if summary["porcentaje_quorum"] < election.min_quorum:
            raise HTTPException(status_code=400, detail="quorum not met")
    if current_user["role"] != "ADMIN_BVG":
        user = (
            db.query(models.User)
            .filter_by(username=current_user["username"])
            .first()
        )
        allowed = (
            db.query(models.ElectionUserRole)
            .filter_by(
                election_id=election_id,
                user_id=user.id,
                role=models.ElectionRole.VOTE,
            )
            .first()
        )
        if not allowed:
            raise HTTPException(status_code=403, detail="No autorizado")
    election.voting_open = True
    election.voting_opened_by = current_user["username"]
    election.voting_opened_at = datetime.now(timezone.utc)
    log = models.AuditLog(
        election_id=election_id,
        username=current_user["username"],
        action="VOTING_OPEN",
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(log)
    db.commit()
    db.refresh(election)
    recipients = _report_recipients(db, election_id)
    send_attendance_report_fn(
        election_id,
        schemas.AttendanceReportRequest(recipients=recipients),
        db,
    )
    return election


@router.post(
    "/elections/{election_id}/close-voting",
    response_model=schemas.Election,
)
def close_voting(
    election_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    election = db.query(models.Election).filter_by(id=election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    if not election.voting_open:
        raise HTTPException(status_code=400, detail="voting not open")
    if election.voting_closed_at is not None:
        raise HTTPException(status_code=400, detail="voting already closed")
    if current_user["role"] != "ADMIN_BVG":
        user = (
            db.query(models.User)
            .filter_by(username=current_user["username"])
            .first()
        )
        allowed = (
            db.query(models.ElectionUserRole)
            .filter_by(
                election_id=election_id,
                user_id=user.id,
                role=models.ElectionRole.VOTE,
            )
            .first()
        )
        if not allowed:
            raise HTTPException(status_code=403, detail="No autorizado")
    election.voting_open = False
    election.voting_closed_by = current_user["username"]
    election.voting_closed_at = datetime.now(timezone.utc)
    log = models.AuditLog(
        election_id=election_id,
        username=current_user["username"],
        action="VOTING_CLOSE",
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(log)
    db.commit()
    db.refresh(election)
    recipients = _report_recipients(db, election_id)
    _send_vote_report(db, election_id, recipients)
    return election


@router.get(
    "/elections/{election_id}/vote-report",
    dependencies=[require_role(["ADMIN_BVG", "FUNCIONAL_BVG"])],
)
def vote_report(election_id: int, db: Session = Depends(get_db)):
    election = db.query(models.Election).filter_by(id=election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    csv_bytes = _build_vote_report(db, election_id)
    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=vote_report.csv"},
    )


@router.get(
    "/elections/{election_id}/vote-report/pdf",
    dependencies=[require_role(["ADMIN_BVG", "FUNCIONAL_BVG"])],
)
def vote_report_pdf(election_id: int, db: Session = Depends(get_db)):
    election = db.query(models.Election).filter_by(id=election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    pdf_bytes = _build_vote_report_pdf(db, election_id)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=vote_report.pdf"},
    )


@router.post(
    "/elections/{election_id}/vote-report/send",
    dependencies=[require_role(["ADMIN_BVG", "FUNCIONAL_BVG"])],
)
def send_vote_report(election_id: int, db: Session = Depends(get_db)):
    recipients = _report_recipients(db, election_id)
    _send_vote_report(db, election_id, recipients)
    return {"status": "sent"}


@router.post(
    "/elections/{election_id}/ballots",
    response_model=schemas.Ballot,
    dependencies=[require_role(["ADMIN_BVG"])]
)
def create_ballot(election_id: int, ballot: schemas.BallotCreate, db: Session = Depends(get_db)):
    db_ballot = models.Ballot(
        election_id=election_id, title=ballot.title, order=ballot.order or 0
    )
    db.add(db_ballot)
    db.commit()
    db.refresh(db_ballot)
    return db_ballot


@router.get(
    "/elections/{election_id}/ballots",
    response_model=List[schemas.Ballot],
    dependencies=[require_role(["ADMIN_BVG", "FUNCIONAL_BVG"])]
)
def list_ballots(election_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Ballot)
        .filter_by(election_id=election_id)
        .order_by(models.Ballot.order)
        .all()
    )


@router.get(
    "/elections/{election_id}/ballots/pending",
    response_model=List[schemas.Ballot],
    dependencies=[require_role(["ADMIN_BVG", "FUNCIONAL_BVG"])]
)
def list_pending_ballots(election_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Ballot)
        .filter_by(election_id=election_id, status=models.BallotStatus.OPEN)
        .order_by(models.Ballot.order)
        .all()
    )


def _ballot_results(db: Session, ballot_id: int) -> List[schemas.OptionResult]:
    options = db.query(models.BallotOption).filter_by(ballot_id=ballot_id).all()
    results: List[schemas.OptionResult] = []
    for opt in options:
        total = (
            db.query(func.coalesce(func.sum(models.Vote.weight), 0))
            .filter_by(option_id=opt.id)
            .scalar()
        )
        results.append(
            schemas.OptionResult(
                id=opt.id,
                ballot_id=opt.ballot_id,
                text=opt.text,
                votes=float(total),
            )
        )
    return results


@router.post(
    "/ballots/{ballot_id}/options",
    response_model=schemas.Option,
    dependencies=[require_role(["ADMIN_BVG"])]
)
def create_option(ballot_id: int, option: schemas.OptionCreate, db: Session = Depends(get_db)):
    db_option = models.BallotOption(ballot_id=ballot_id, text=option.text)
    db.add(db_option)
    db.commit()
    db.refresh(db_option)
    return db_option


@router.post(
    "/ballots/{ballot_id}/vote",
    response_model=schemas.Vote,
)
def cast_vote(
    ballot_id: int,
    vote: schemas.VoteCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ballot = db.query(models.Ballot).filter_by(id=ballot_id).first()
    if not ballot:
        raise HTTPException(status_code=404, detail="Ballot not found")
    if ballot.status != models.BallotStatus.OPEN:
        raise HTTPException(status_code=400, detail="Ballot closed")
    election = db.query(models.Election).filter_by(id=ballot.election_id).first()
    if not election or election.status != models.ElectionStatus.OPEN:
        raise HTTPException(status_code=400, detail="Election closed")
    if not election.voting_open:
        raise HTTPException(status_code=400, detail="voting not open")
    if election.min_quorum is not None:
        summary = compute_summary(db, election.id)
        if summary["porcentaje_quorum"] < election.min_quorum:
            raise HTTPException(status_code=400, detail="quorum not met")
    if current_user["role"] != "ADMIN_BVG":
        user = (
            db.query(models.User)
            .filter_by(username=current_user["username"])
            .first()
        )
        allowed = (
            db.query(models.ElectionUserRole)
            .filter(
                models.ElectionUserRole.election_id == ballot.election_id,
                models.ElectionUserRole.user_id == user.id,
                models.ElectionUserRole.role.in_(
                    [models.ElectionRole.VOTE, models.ElectionRole.VOTER]
                ),
            )
            .first()
        )
        if not allowed:
            raise HTTPException(status_code=403, detail="No autorizado")
    option = (
        db.query(models.BallotOption)
        .filter_by(id=vote.option_id, ballot_id=ballot_id)
        .first()
    )
    if not option:
        raise HTTPException(status_code=400, detail="Invalid option for ballot")
    attendee = (
        db.query(models.Attendee)
        .filter_by(id=vote.attendee_id, election_id=ballot.election_id)
        .first()
    )
    if not attendee:
        raise HTTPException(status_code=400, detail="Invalid attendee")
    db_vote = (
        db.query(models.Vote)
        .filter_by(ballot_id=ballot_id, attendee_id=attendee.id)
        .first()
    )
    if db_vote:
        db_vote.option_id = vote.option_id
        db_vote.weight = attendee.acciones
        db_vote.created_by = current_user["username"]
        db_vote.created_at = datetime.now(timezone.utc)
    else:
        db_vote = models.Vote(
            ballot_id=ballot_id,
            option_id=vote.option_id,
            attendee_id=attendee.id,
            weight=attendee.acciones,
            created_by=current_user["username"],
        )
        db.add(db_vote)
    db.commit()
    db.refresh(db_vote)
    results = [r.model_dump() for r in _ballot_results(db, ballot_id)]
    anyio.from_thread.run(
        manager.broadcast,
        {"ballot": {"id": ballot_id, "title": ballot.title, "results": results}},
    )
    return db_vote


@router.post(
    "/ballots/{ballot_id}/vote-all",
    response_model=schemas.BulkVoteResult,
)
def vote_all(
    ballot_id: int,
    payload: schemas.VoteAll,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ballot = db.query(models.Ballot).filter_by(id=ballot_id).first()
    if not ballot:
        raise HTTPException(status_code=404, detail="Ballot not found")
    if ballot.status != models.BallotStatus.OPEN:
        raise HTTPException(status_code=400, detail="Ballot closed")
    election = db.query(models.Election).filter_by(id=ballot.election_id).first()
    if not election or election.status != models.ElectionStatus.OPEN:
        raise HTTPException(status_code=400, detail="Election closed")
    if not election.voting_open:
        raise HTTPException(status_code=400, detail="voting not open")
    if election.min_quorum is not None:
        summary = compute_summary(db, election.id)
        if summary["porcentaje_quorum"] < election.min_quorum:
            raise HTTPException(status_code=400, detail="quorum not met")
    if current_user["role"] != "ADMIN_BVG":
        user = (
            db.query(models.User)
            .filter_by(username=current_user["username"])
            .first()
        )
        allowed = (
            db.query(models.ElectionUserRole)
            .filter(
                models.ElectionUserRole.election_id == ballot.election_id,
                models.ElectionUserRole.user_id == user.id,
                models.ElectionUserRole.role.in_(
                    [models.ElectionRole.VOTE, models.ElectionRole.VOTER]
                ),
            )
            .first()
        )
        if not allowed:
            raise HTTPException(status_code=403, detail="No autorizado")
    option = (
        db.query(models.BallotOption)
        .filter_by(id=payload.option_id, ballot_id=ballot_id)
        .first()
    )
    if not option:
        raise HTTPException(status_code=400, detail="Invalid option for ballot")
    attendees = (
        db.query(models.Attendee)
        .filter_by(election_id=ballot.election_id)
        .all()
    )
    count = 0
    for attendee in attendees:
        vote_obj = (
            db.query(models.Vote)
            .filter_by(ballot_id=ballot_id, attendee_id=attendee.id)
            .first()
        )
        if vote_obj:
            vote_obj.option_id = payload.option_id
            vote_obj.weight = attendee.acciones
            vote_obj.created_by = current_user["username"]
            vote_obj.created_at = datetime.now(timezone.utc)
        else:
            db.add(
                models.Vote(
                    ballot_id=ballot_id,
                    option_id=payload.option_id,
                    attendee_id=attendee.id,
                    weight=attendee.acciones,
                    created_by=current_user["username"],
                )
            )
        count += 1
    db.commit()
    results = [r.model_dump() for r in _ballot_results(db, ballot_id)]
    anyio.from_thread.run(
        manager.broadcast,
        {"ballot": {"id": ballot_id, "title": ballot.title, "results": results}},
    )
    return {"count": count}


@router.post(
    "/ballots/{ballot_id}/close",
    response_model=schemas.Ballot,
)
def close_ballot(
    ballot_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ballot = db.query(models.Ballot).filter_by(id=ballot_id).first()
    if not ballot:
        raise HTTPException(status_code=404, detail="Ballot not found")
    if current_user["role"] != "ADMIN_BVG":
        user = (
            db.query(models.User)
            .filter_by(username=current_user["username"])
            .first()
        )
        allowed = (
            db.query(models.ElectionUserRole)
            .filter(
                models.ElectionUserRole.election_id == ballot.election_id,
                models.ElectionUserRole.user_id == user.id,
                models.ElectionUserRole.role.in_(
                    [models.ElectionRole.VOTE, models.ElectionRole.VOTER]
                ),
            )
            .first()
        )
        if not allowed:
            raise HTTPException(status_code=403, detail="No autorizado")
    ballot.status = models.BallotStatus.CLOSED
    log = models.AuditLog(
        election_id=ballot.election_id,
        username=current_user["username"],
        action="BALLOT_CLOSE",
        details={"ballot_id": ballot.id},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(log)
    db.commit()
    db.refresh(ballot)
    results = [r.model_dump() for r in _ballot_results(db, ballot_id)]
    anyio.from_thread.run(
        manager.broadcast,
        {"ballot": {"id": ballot_id, "title": ballot.title, "results": results}},
    )
    return ballot


@router.post(
    "/ballots/{ballot_id}/reopen",
    response_model=schemas.Ballot,
)
def reopen_ballot(
    ballot_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ballot = db.query(models.Ballot).filter_by(id=ballot_id).first()
    if not ballot:
        raise HTTPException(status_code=404, detail="Ballot not found")
    if current_user["role"] != "ADMIN_BVG":
        user = (
            db.query(models.User)
            .filter_by(username=current_user["username"])
            .first()
        )
        allowed = (
            db.query(models.ElectionUserRole)
            .filter(
                models.ElectionUserRole.election_id == ballot.election_id,
                models.ElectionUserRole.user_id == user.id,
                models.ElectionUserRole.role.in_(
                    [models.ElectionRole.VOTE, models.ElectionRole.VOTER]
                ),
            )
            .first()
        )
        if not allowed:
            raise HTTPException(status_code=403, detail="No autorizado")
    ballot.status = models.BallotStatus.OPEN
    log = models.AuditLog(
        election_id=ballot.election_id,
        username=current_user["username"],
        action="BALLOT_REOPEN",
        details={"ballot_id": ballot.id},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(log)
    db.commit()
    db.refresh(ballot)
    return ballot


@router.get(
    "/ballots/{ballot_id}/results",
    response_model=List[schemas.OptionResult],
    dependencies=[require_role(["ADMIN_BVG", "FUNCIONAL_BVG"])]
)
def ballot_results(ballot_id: int, db: Session = Depends(get_db)):
    return _ballot_results(db, ballot_id)
