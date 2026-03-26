import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Float, Integer, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from ..core.database import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    location_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    location_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    level: Mapped[int] = mapped_column(Integer, default=1)
    points: Mapped[int] = mapped_column(Integer, default=0, index=True)
    role: Mapped[str] = mapped_column(String(20), default="member")  # member|admin|moderator
    status: Mapped[str] = mapped_column(String(20), default="active")  # active|inactive|banned
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    stripe_customer_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    subscription_status: Mapped[str | None] = mapped_column(String(30), nullable=True)  # active | past_due | trialing | canceled
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False)
    stripe_event_id_last: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=False)
    hashed_password: Mapped[str | None] = mapped_column(String(200), nullable=True)
    email: Mapped[str | None] = mapped_column(String(200), unique=True, nullable=True, index=True)

    # Relationships
    posts: Mapped[list["Post"]] = relationship(
        "Post", back_populates="author", cascade="all, delete-orphan"
    )
    comments: Mapped[list["Comment"]] = relationship(
        "Comment", back_populates="author", cascade="all, delete-orphan"
    )
    reactions: Mapped[list["Reaction"]] = relationship(
        "Reaction", back_populates="user", cascade="all, delete-orphan"
    )
    lesson_progress: Mapped[list["LessonProgress"]] = relationship(
        "LessonProgress", back_populates="user", cascade="all, delete-orphan"
    )
    event_registrations: Mapped[list["EventRegistration"]] = relationship(
        "EventRegistration", back_populates="user", cascade="all, delete-orphan"
    )
    point_transactions: Mapped[list["PointTransaction"]] = relationship(
        "PointTransaction", back_populates="user", cascade="all, delete-orphan"
    )
    created_courses: Mapped[list["Course"]] = relationship(
        "Course", back_populates="creator"
    )
    created_events: Mapped[list["Event"]] = relationship(
        "Event", back_populates="creator"
    )
