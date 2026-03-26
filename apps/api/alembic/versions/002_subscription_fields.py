"""Add subscription fields to profiles

Revision ID: 002_subscription_fields
Revises: 001_initial
Create Date: 2025-01-02 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002_subscription_fields"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "profiles",
        sa.Column("stripe_subscription_id", sa.String(100), nullable=True),
    )
    op.add_column(
        "profiles",
        sa.Column("subscription_status", sa.String(30), nullable=True),
    )
    op.add_column(
        "profiles",
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "profiles",
        sa.Column(
            "cancel_at_period_end",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )
    op.add_column(
        "profiles",
        sa.Column("stripe_event_id_last", sa.String(100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("profiles", "stripe_event_id_last")
    op.drop_column("profiles", "cancel_at_period_end")
    op.drop_column("profiles", "current_period_end")
    op.drop_column("profiles", "subscription_status")
    op.drop_column("profiles", "stripe_subscription_id")
