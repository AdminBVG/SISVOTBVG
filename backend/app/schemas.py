from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict
from .models import (
    AttendanceMode,
    PersonType,
    ProxyStatus,
    ElectionStatus,
    QuestionType,
    ElectionRole,
    BallotStatus,
)


class ShareholderBase(BaseModel):
    code: str
    name: str
    document: str
    email: Optional[EmailStr]
    actions: float


class ShareholderCreate(ShareholderBase):
    pass


class ShareholderUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    document: Optional[str] = None
    email: Optional[EmailStr] = None
    actions: Optional[float] = None


class Shareholder(ShareholderBase):
    id: int
    status: str

    model_config = ConfigDict(from_attributes=True)


class ShareholderWithAttendance(Shareholder):
    attendance_mode: Optional[AttendanceMode] = None
    representante: Optional[str] = None
    apoderado: Optional[str] = None
    attendee_id: Optional[int] = None
    apoderado_pdf: bool = False


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


class AttendanceBulkMarkResponse(BaseModel):
    updated: List[Attendance]
    failed: List[str]


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


class QuestionOption(BaseModel):
    text: str
    value: str
    id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class QuestionCreate(BaseModel):
    text: str
    type: QuestionType
    required: bool = False
    order: int
    options: List[QuestionOption] = []


class Question(QuestionCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


class ElectionBase(BaseModel):
    name: str
    date: date
    description: Optional[str] = None
    registration_start: Optional[datetime] = None
    registration_end: Optional[datetime] = None
    min_quorum: Optional[float] = None


class ElectionCreate(ElectionBase):
    status: ElectionStatus = ElectionStatus.DRAFT
    attendance_registrars: List[int] = []
    vote_registrars: List[int] = []
    observers: List[int] = []
    questions: List["QuestionCreate"] = []


class ElectionUpdate(BaseModel):
    name: Optional[str] = None
    date: Optional[date] = None
    description: Optional[str] = None
    observers: Optional[List[int]] = None
    registration_start: Optional[datetime] = None
    registration_end: Optional[datetime] = None
    min_quorum: Optional[float] = None
    attendance_registrars: Optional[List[int]] = None
    vote_registrars: Optional[List[int]] = None
    questions: Optional[List["QuestionCreate"]] = None


class Election(ElectionBase):
    id: int
    status: ElectionStatus
    can_manage_attendance: bool = False
    can_manage_votes: bool = False
    can_observe: bool = False
    created_at: datetime
    closed_at: Optional[datetime] = None
    voting_open: bool = False
    voting_opened_by: Optional[str] = None
    voting_opened_at: Optional[datetime] = None
    voting_closed_by: Optional[str] = None
    voting_closed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ElectionStatusUpdate(BaseModel):
    status: ElectionStatus


class Settings(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from: Optional[EmailStr] = None


class AttendanceReportRequest(BaseModel):
    recipients: List[EmailStr]


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


class UserBase(BaseModel):
    username: str
    role: str


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    role: Optional[str] = None
    password: Optional[str] = None


class User(UserBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class ElectionUserRoleBase(BaseModel):
    user_id: int
    role: ElectionRole


class ElectionUserRoleCreate(ElectionUserRoleBase):
    pass


class ElectionUserRole(ElectionUserRoleBase):
    id: int
    username: str

    model_config = ConfigDict(from_attributes=True)


class AttendeeBase(BaseModel):
    identifier: str
    accionista: str
    representante: Optional[str] = None
    apoderado: Optional[str] = None
    acciones: float


class AttendeeUpdate(BaseModel):
    identifier: Optional[str] = None
    accionista: Optional[str] = None
    representante: Optional[str] = None
    apoderado: Optional[str] = None
    acciones: Optional[float] = None


class Attendee(AttendeeBase):
    id: int
    election_id: int
    apoderado_pdf_url: Optional[str] = None
    requires_document: bool = False
    document_uploaded: bool = False

    model_config = ConfigDict(from_attributes=True)


class BallotBase(BaseModel):
    title: str
    order: int | None = 0


class BallotCreate(BallotBase):
    pass


class Ballot(BallotBase):
    id: int
    election_id: int
    status: BallotStatus

    model_config = ConfigDict(from_attributes=True)


class OptionBase(BaseModel):
    text: str


class OptionCreate(OptionBase):
    pass


class Option(OptionBase):
    id: int
    ballot_id: int

    model_config = ConfigDict(from_attributes=True)


class VoteBase(BaseModel):
    option_id: int
    attendee_id: int


class VoteCreate(VoteBase):
    pass


class VoteAll(BaseModel):
    option_id: int


class BulkVoteResult(BaseModel):
    count: int


class Vote(VoteBase):
    id: int
    ballot_id: int
    weight: float
    created_by: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OptionResult(Option):
    votes: float

