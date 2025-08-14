from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from .models import AttendanceMode, PersonType, ProxyStatus

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

    class Config:
        orm_mode = True

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

    class Config:
        orm_mode = True

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

    class Config:
        orm_mode = True

class PersonBase(BaseModel):
    type: PersonType
    name: str
    document: str
    email: Optional[EmailStr]

class Person(PersonBase):
    id: int

    class Config:
        orm_mode = True

class ProxyAssignmentBase(BaseModel):
    shareholder_id: int
    weight_actions_snapshot: float
    valid_from: Optional[date]
    valid_until: Optional[date]

class ProxyAssignment(ProxyAssignmentBase):
    id: int

    class Config:
        orm_mode = True

class ProxyBase(BaseModel):
    election_id: int
    proxy_person_id: int
    tipo_doc: str
    num_doc: str
    fecha_otorg: date
    fecha_vigencia: Optional[date]
    pdf_url: str
    status: ProxyStatus = ProxyStatus.VALID
    assignments: Optional[List[ProxyAssignmentBase]] = None

class ProxyCreate(ProxyBase):
    pass

class Proxy(ProxyBase):
    id: int
    assignments: List[ProxyAssignment] = []

    class Config:
        orm_mode = True
