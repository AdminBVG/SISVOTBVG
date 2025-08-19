from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict
from .models import AttendanceMode, PersonType, ProxyStatus, ElectionStatus


class ShareholderBase(BaseModel):
    code: str
    name: str
    document: str
    email: Optional[EmailStr]
    actions: float


class ShareholderCreate(ShareholderBase):
    pass


class Shareholder(ShareholderBase):
    id: int
    status: str

    model_config = ConfigDict(from_attributes=True)


class ShareholderWithAttendance(Shareholder):
    attendance_mode: Optional[AttendanceMode] = None


class AttendanceBase(BaseModel):
    election_id: int
    mode: AttendanceMode
    present: bool
    evidence_json: Optional[dict]


class Attendance(AttendanceBase):
    id: int
    shareholder_id: int
    marked_by: Optional[str]
    marked_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AttendanceBulkMark(BaseModel):
    codes: List[str]
    mode: AttendanceMode
    evidence: Optional[dict] = None
    reason: Optional[str] = None


class AttendanceHistory(BaseModel):
    id: int
    attendance_id: int
    from_mode: Optional[AttendanceMode]
    to_mode: Optional[AttendanceMode]
    from_present: Optional[bool]
    to_present: Optional[bool]
    changed_by: str
    changed_at: datetime
    reason: Optional[str]
    ip: Optional[str]
    user_agent: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class PersonBase(BaseModel):
    type: PersonType
    name: str
    document: str
    email: Optional[EmailStr]


class Person(PersonBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class ProxyAssignmentBase(BaseModel):
    shareholder_id: int
    weight_actions_snapshot: float
    valid_from: Optional[date]
    valid_until: Optional[date]


class ProxyAssignment(ProxyAssignmentBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class ProxyBase(BaseModel):
    election_id: int
    proxy_person_id: int
    tipo_doc: str
    num_doc: str
    fecha_otorg: date
    fecha_vigencia: Optional[date]
    status: ProxyStatus = ProxyStatus.VALID
    mode: AttendanceMode = AttendanceMode.AUSENTE
    present: bool = False
    marked_by: Optional[str] = None
    marked_at: Optional[datetime] = None
    assignments: Optional[List[ProxyAssignmentBase]] = None


class ProxyCreate(ProxyBase):
    pass


class Proxy(BaseModel):
    id: int
    election_id: int
    proxy_person_id: int
    tipo_doc: str
    num_doc: str
    fecha_otorg: date
    fecha_vigencia: Optional[date]
    pdf_url: str
    status: ProxyStatus = ProxyStatus.VALID
    mode: AttendanceMode = AttendanceMode.AUSENTE
    present: bool = False
    marked_by: Optional[str] = None
    marked_at: Optional[datetime] = None
    assignments: List[ProxyAssignment] = []

    model_config = ConfigDict(from_attributes=True)


class ProxyMark(BaseModel):
    mode: AttendanceMode


class ObserverRow(BaseModel):
    code: str
    name: str
    estado: AttendanceMode
    apoderado: Optional[str] = None
    acciones_propias: float
    acciones_representadas: float
    total_quorum: float


class ElectionBase(BaseModel):
    name: str
    date: date
    registration_start: Optional[datetime] = None
    registration_end: Optional[datetime] = None


class ElectionCreate(ElectionBase):
    status: ElectionStatus = ElectionStatus.DRAFT


class ElectionUpdate(BaseModel):
    name: Optional[str] = None
    date: Optional[date] = None
    registration_start: Optional[datetime] = None
    registration_end: Optional[datetime] = None


class Election(ElectionBase):
    id: int
    status: ElectionStatus

    model_config = ConfigDict(from_attributes=True)


class ElectionStatusUpdate(BaseModel):
    status: ElectionStatus


class AuditLog(BaseModel):
    id: int
    election_id: int
    username: str
    action: str
    details: Optional[dict]
    ip: Optional[str]
    user_agent: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

