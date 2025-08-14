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
from datetime import datetime
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
    marked_at = Column(DateTime, default=datetime.utcnow)
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
    changed_at = Column(DateTime, default=datetime.utcnow)
    reason = Column(String)
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
