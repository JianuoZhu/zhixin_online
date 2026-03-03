from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="member")
    display_name = Column(String(255))
    avatar_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event_registrations = relationship("EventRegistration", back_populates="user", cascade="all, delete-orphan")
    room_bookings = relationship("RoomBooking", back_populates="user", cascade="all, delete-orphan")
    announcement_reads = relationship("AnnouncementRead", back_populates="user", cascade="all, delete-orphan")
    qa_questions = relationship("QaQuestion", back_populates="asker", cascade="all, delete-orphan")
    qa_answers = relationship("QaAnswer", back_populates="author", cascade="all, delete-orphan")
    calendar_items = relationship("CalendarItem", back_populates="user", cascade="all, delete-orphan")
    event_checkins = relationship("EventCheckin", back_populates="user", cascade="all, delete-orphan")
    mentor_profile = relationship("MentorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    mentor_assignments = relationship("QaQuestionMentor", back_populates="mentor", cascade="all, delete-orphan")
    answer_votes = relationship("AnswerVote", back_populates="user", cascade="all, delete-orphan")


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    date = Column(Date, nullable=False)
    time = Column(String(100), nullable=False)
    location = Column(String(255), nullable=False)
    organizer = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False, default="open")
    spots_left = Column(Integer, nullable=False)
    total_spots = Column(Integer, nullable=False)
    image_url = Column(String(500))
    description = Column(Text)
    group_id = Column(String(50), index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    registrations = relationship("EventRegistration", back_populates="event", cascade="all, delete-orphan")
    checkins = relationship("EventCheckin", back_populates="event", cascade="all, delete-orphan")


class EventRegistration(Base):
    __tablename__ = "event_registrations"
    __table_args__ = (UniqueConstraint("event_id", "user_id", name="uq_event_user"),)

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("Event", back_populates="registrations")
    user = relationship("User", back_populates="event_registrations")


class EventCheckin(Base):
    __tablename__ = "event_checkins"
    __table_args__ = (UniqueConstraint("event_id", "user_id", name="uq_checkin_event_user"),)

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("Event", back_populates="checkins")
    user = relationship("User", back_populates="event_checkins")


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    capacity = Column(Integer, nullable=False)
    equipment = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    bookings = relationship("RoomBooking", back_populates="room", cascade="all, delete-orphan")


class RoomBooking(Base):
    __tablename__ = "room_bookings"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    start_hour = Column(Integer, nullable=False)
    end_hour = Column(Integer, nullable=False)
    participants = Column(Integer, nullable=False)
    reason = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    room = relationship("Room", back_populates="bookings")
    user = relationship("User", back_populates="room_bookings")


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    author = Column(String(255), nullable=False)
    date = Column(Date, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reads = relationship("AnnouncementRead", back_populates="announcement", cascade="all, delete-orphan")


class AnnouncementRead(Base):
    __tablename__ = "announcement_reads"
    __table_args__ = (UniqueConstraint("announcement_id", "user_id", name="uq_announcement_user"),)

    id = Column(Integer, primary_key=True, index=True)
    announcement_id = Column(Integer, ForeignKey("announcements.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    read_at = Column(DateTime(timezone=True), server_default=func.now())

    announcement = relationship("Announcement", back_populates="reads")
    user = relationship("User", back_populates="announcement_reads")


class MentorProfile(Base):
    __tablename__ = "mentor_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    title = Column(String(255))
    bio = Column(Text)
    tags = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="mentor_profile")


class QaQuestionMentor(Base):
    __tablename__ = "qa_question_mentors"
    __table_args__ = (UniqueConstraint("question_id", "mentor_id", name="uq_qa_question_mentor"),)

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("qa_questions.id", ondelete="CASCADE"), nullable=False)
    mentor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    question = relationship("QaQuestion", back_populates="mentor_links")
    mentor = relationship("User", back_populates="mentor_assignments")


class QaQuestion(Base):
    __tablename__ = "qa_questions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    tags = Column(JSON, nullable=False, default=list)
    asker_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    is_anonymous = Column(Boolean, nullable=False, default=False)
    views = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    asker = relationship("User", back_populates="qa_questions")
    answers = relationship("QaAnswer", back_populates="question", cascade="all, delete-orphan")
    mentor_links = relationship("QaQuestionMentor", back_populates="question", cascade="all, delete-orphan")


class QaAnswer(Base):
    __tablename__ = "qa_answers"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("qa_questions.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    is_best = Column(Boolean, nullable=False, default=False)
    votes = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    question = relationship("QaQuestion", back_populates="answers")
    author = relationship("User", back_populates="qa_answers")
    vote_records = relationship("AnswerVote", back_populates="answer", cascade="all, delete-orphan")


class AnswerVote(Base):
    """Track individual votes to prevent duplicate voting."""
    __tablename__ = "answer_votes"
    __table_args__ = (UniqueConstraint("answer_id", "user_id", name="uq_answer_vote"),)

    id = Column(Integer, primary_key=True, index=True)
    answer_id = Column(Integer, ForeignKey("qa_answers.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    answer = relationship("QaAnswer", back_populates="vote_records")
    user = relationship("User", back_populates="answer_votes")


class CalendarItem(Base):
    __tablename__ = "calendar_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    date = Column(Date, nullable=False)
    color = Column(String(50), nullable=False, default="info")
    source = Column(String(50), nullable=False, default="custom")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="calendar_items")
