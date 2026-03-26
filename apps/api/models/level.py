from sqlalchemy import String, Integer, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column
from ..core.database import Base


class Level(Base):
    __tablename__ = "levels"

    level: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    points_required: Mapped[int] = mapped_column(Integer, nullable=False)
    unlock_benefit: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
