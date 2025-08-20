from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    DateTime,
    Boolean,
    Enum,
    DECIMAL,
    ForeignKey,
    JSON
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from ..database import Base

class AttendanceMode(str, enum.Enum):
    PRESENCIAL = "PRESENCIAL"
    VIRTUAL = "VIRTUAL"
    AUSENTE = "AUSENTE"

class PersonType(str, enum.Enum):
    ACCIONISTA = "ACCIONISTA"
    TERCERO = "TERCERO"

class ProxyStatus(str, enum.Enum):
    VALID = "VALID"
    INVALID = "INVALID"
    EXPIRED = "EXPIRED"

class Shareholder(Base):
    __tablename__ = "shareholders"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    document = Column(String, nullable=False)
    email = Column(String)
    actions = Column(DECIMAL, nullable=False, default=0)
    status = Column(String, default="ACTIVE")
    attendances = relationship("Attendance", back_populates="shareholder")

class Attendance(Base):
    __tablename__ = "attendances"
    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, index=True, nullable=False)
    shareholder_id = Column(Integer, ForeignKey("shareholders.id"), nullable=False)
    mode = Column(Enum(AttendanceMode), default=AttendanceMode.AUSENTE, nullable=False)
    present = Column(Boolean, default=False)
    marked_by = Column(String)
    marked_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    evidence_json = Column(JSON)
    shareholder = relationship("Shareholder", back_populates="attendances")
    history = relationship("AttendanceHistory", back_populates="attendance")

class AttendanceHistory(Base):
    __tablename__ = "attendance_history"
    id = Column(Integer, primary_key=True)
    attendance_id = Column(Integer, ForeignKey("attendances.id"), nullable=False)
    from_mode = Column(Enum(AttendanceMode))
    to_mode = Column(Enum(AttendanceMode))
    from_present = Column(Boolean)
    to_present = Column(Boolean)
    changed_by = Column(String, nullable=False)
    changed_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    reason = Column(String)
    ip = Column(String)
    user_agent = Column(String)
    attendance = relationship("Attendance", back_populates="history")

class Person(Base):
    __tablename__ = "persons"
    id = Column(Integer, primary_key=True)
    type = Column(Enum(PersonType), nullable=False)
    name = Column(String, nullable=False)
    document = Column(String, nullable=False)
    email = Column(String)

class Proxy(Base):
    __tablename__ = "proxies"
    id = Column(Integer, primary_key=True)
    election_id = Column(Integer, index=True, nullable=False)
    proxy_person_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    tipo_doc = Column(String, nullable=False)
    num_doc = Column(String, nullable=False)
    fecha_otorg = Column(Date, nullable=False)
    fecha_vigencia = Column(Date)
    pdf_url = Column(String, nullable=False)
    status = Column(Enum(ProxyStatus), default=ProxyStatus.VALID)
    mode = Column(Enum(AttendanceMode), default=AttendanceMode.AUSENTE, nullable=False)
    present = Column(Boolean, default=False)
    marked_by = Column(String)
    marked_at = Column(DateTime(timezone=True))
    assignments = relationship("ProxyAssignment", back_populates="proxy")

class ProxyAssignment(Base):
    __tablename__ = "proxy_assignments"
    id = Column(Integer, primary_key=True)
    proxy_id = Column(Integer, ForeignKey("proxies.id"), nullable=False)
    shareholder_id = Column(Integer, ForeignKey("shareholders.id"), nullable=False)
    weight_actions_snapshot = Column(DECIMAL, nullable=False)
    valid_from = Column(Date)
    valid_until = Column(Date)
    proxy = relationship("Proxy", back_populates="assignments")


class ElectionStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    OPEN = "OPEN"
    CLOSED = "CLOSED"


class Election(Base):
    __tablename__ = "elections"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    status = Column(
        Enum(ElectionStatus), default=ElectionStatus.DRAFT, nullable=False
    )
    registration_start = Column(DateTime(timezone=True))
    registration_end = Column(DateTime(timezone=True))


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="REGISTRADOR_BVG")
    is_verified = Column(Boolean, default=True)
    verification_token = Column(String, nullable=True)
    reset_token = Column(String, nullable=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)


class ElectionRole(str, enum.Enum):
    ATTENDANCE = "ATTENDANCE"
    VOTE = "VOTE"


class ElectionUserRole(Base):
    __tablename__ = "election_user_roles"
    id = Column(Integer, primary_key=True)
    election_id = Column(Integer, ForeignKey("elections.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(Enum(ElectionRole), nullable=False)
    user = relationship("User")
    election = relationship("Election")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    election_id = Column(Integer, index=True, nullable=False)
    username = Column(String, nullable=False)
    action = Column(String, nullable=False)
    details = Column(JSON)
    ip = Column(String)
    user_agent = Column(String)
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class Attendee(Base):
    __tablename__ = "attendees"
    id = Column(Integer, primary_key=True)
    election_id = Column(Integer, index=True, nullable=False)
    identifier = Column(String, nullable=False)
    accionista = Column(String, nullable=False)
    representante = Column(String)
    apoderado = Column(String)
    acciones = Column(DECIMAL, nullable=False, default=0)


class Ballot(Base):
    __tablename__ = "ballots"
    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("elections.id"), nullable=False)
    title = Column(String, nullable=False)
    options = relationship("BallotOption", back_populates="ballot")
    votes = relationship("Vote", back_populates="ballot")


class BallotOption(Base):
    __tablename__ = "ballot_options"
    id = Column(Integer, primary_key=True, index=True)
    ballot_id = Column(Integer, ForeignKey("ballots.id"), nullable=False)
    text = Column(String, nullable=False)
    ballot = relationship("Ballot", back_populates="options")
    votes = relationship("Vote", back_populates="option")


class Vote(Base):
    __tablename__ = "votes"
    id = Column(Integer, primary_key=True, index=True)
    ballot_id = Column(Integer, ForeignKey("ballots.id"), nullable=False)
    option_id = Column(Integer, ForeignKey("ballot_options.id"), nullable=False)
    ballot = relationship("Ballot", back_populates="votes")
    option = relationship("BallotOption", back_populates="votes")
