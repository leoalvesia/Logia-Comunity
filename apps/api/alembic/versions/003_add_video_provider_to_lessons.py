"""Add video_provider to lessons

Revision ID: 003_add_video_provider_to_lessons
Revises: 002_subscription_fields
Create Date: 2026-03-17 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "003_video_provider"
down_revision: Union[str, None] = "002_subscription_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "lessons",
        sa.Column(
            "video_provider",
            sa.String(20),
            nullable=False,
            server_default="bunny",
        ),
    )


def downgrade() -> None:
    op.drop_column("lessons", "video_provider")
