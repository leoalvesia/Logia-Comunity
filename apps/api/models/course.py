import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Float, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from ..core.database import Base


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    level: Mapped[str | None] = mapped_column(String(20), nullable=True)  # beginner|intermediate|advanced
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft|published|archived
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    estimated_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_free: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    creator: Mapped["Profile | None"] = relationship("Profile", back_populates="created_courses")
    modules: Mapped[list["Module"]] = relationship(
        "Module", back_populates="course", cascade="all, delete-orphan",
        order_by="Module.order_index"
    )
