from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── User ──────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: int
    email: str
    role: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserAdminOut(UserOut):
    created_at: Optional[datetime] = None


class UserCreate(BaseModel):
    email: str
    password: str
    role: str = "member"
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class PasswordChange(BaseModel):
    old_password: str
    new_password: str


class MentorOut(BaseModel):
    id: int
    display_name: str
    avatar_url: Optional[str] = None
    title: Optional[str] = None
    bio: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


# ── Auth ──────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# ── Event ─────────────────────────────────────────────────────────────

class EventBase(BaseModel):
    title: str
    date: date
    time: str
    location: str
    organizer: str
    category: str
    status: str
    spots_left: int
    total_spots: int
    image_url: Optional[str] = None
    description: Optional[str] = None
    group_id: Optional[str] = None


class EventCreate(EventBase):
    is_recurring: bool = False
    recurrence_end_date: Optional[date] = None


class EventUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[date] = None
    time: Optional[str] = None
    location: Optional[str] = None
    organizer: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    spots_left: Optional[int] = None
    total_spots: Optional[int] = None
    image_url: Optional[str] = None
    description: Optional[str] = None


class EventOut(EventBase):
    id: int
    registered: bool = False
    checked_in: bool = False
    can_check_in: bool = False

    model_config = ConfigDict(from_attributes=True)


class EventRegistrationOut(BaseModel):
    id: int
    event_id: int
    user_id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class EventRegistrationAdminOut(BaseModel):
    id: int
    event_id: int
    user_id: int
    event_title: str
    user_email: str
    user_name: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class EventCheckinOut(BaseModel):
    id: int
    event_id: int
    user_id: int
    event_title: str
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    image_url: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ── Room ──────────────────────────────────────────────────────────────

class RoomBase(BaseModel):
    name: str
    capacity: int
    equipment: List[str]


class RoomCreate(RoomBase):
    pass


class RoomBookingCreate(BaseModel):
    date: date
    start_hour: int
    end_hour: int
    participants: int
    reason: Optional[str] = None


class RoomBookingOut(BaseModel):
    id: int
    room_id: int
    user_id: int
    date: date
    start_hour: int
    end_hour: int
    participants: int
    reason: Optional[str] = None
    user_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RoomOut(RoomBase):
    id: int
    bookings: List[RoomBookingOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


# ── Announcement ──────────────────────────────────────────────────────

class AnnouncementBase(BaseModel):
    title: str
    category: str
    author: str
    date: date
    content: str


class AnnouncementCreate(AnnouncementBase):
    pass


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    author: Optional[str] = None
    date: Optional[date] = None
    content: Optional[str] = None


class AnnouncementOut(AnnouncementBase):
    id: int
    read: bool = False

    model_config = ConfigDict(from_attributes=True)


# ── Q&A ───────────────────────────────────────────────────────────────

class QaAnswerBase(BaseModel):
    content: str


class QaAnswerCreate(QaAnswerBase):
    pass


class QaAnswerOut(QaAnswerBase):
    id: int
    question_id: int
    author_id: int
    author_name: str = ""
    is_best: bool
    votes: int
    voted: bool = False
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class QaQuestionBase(BaseModel):
    title: str
    content: str
    tags: List[str]
    is_anonymous: bool = False


class QaQuestionCreate(QaQuestionBase):
    mentor_ids: List[int] = Field(default_factory=list)


class QaQuestionOut(QaQuestionBase):
    id: int
    asker_id: int
    asker_name: str = ""
    views: int
    created_at: Optional[datetime] = None
    answers: List[QaAnswerOut]
    mentors: List[MentorOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


# ── Calendar ──────────────────────────────────────────────────────────

class CalendarItemCreate(BaseModel):
    title: str
    date: date
    color: str = "info"


class CalendarItemOut(BaseModel):
    id: int
    user_id: int
    title: str
    date: date
    color: str
    source: str

    model_config = ConfigDict(from_attributes=True)
