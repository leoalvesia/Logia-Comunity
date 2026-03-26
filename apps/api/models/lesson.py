import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from ..core.database import Base


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    module_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("modules.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    video_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    video_provider: Mapped[str] = mapped_column(String(20), nullable=False, server_default="youtube")  # youtube | vimeo
    video_bunny_id: Mapped[str | None] = mapped_column(String(100), nullable=True)  # legacy, kept for DB compat
    video_duration: Mapped[int | None] = mapped_column(Integer, nullable=True)
    video_thumbnail: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachments: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft|published
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    module: Mapped["Module"] = relationship("Module", back_populates="lessons")
    progress_records: Mapped[list["LessonProgress"]] = relationship(
        "LessonProgress", back_populates="lesson", cascade="all, delete-orphan"
    )
