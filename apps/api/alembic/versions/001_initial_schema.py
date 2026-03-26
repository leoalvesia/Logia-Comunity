"""Initial schema

Revision ID: 001_initial
Revises:
Create Date: 2025-01-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # profiles
    op.create_table(
        "profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("username", sa.String(50), nullable=False),
        sa.Column("full_name", sa.String(150), nullable=False),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column("location_lat", sa.Float(), nullable=True),
        sa.Column("location_lng", sa.Float(), nullable=True),
        sa.Column("level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("points", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("role", sa.String(20), nullable=False, server_default="member"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("stripe_customer_id", sa.String(100), nullable=True),
        sa.Column("is_paid", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("hashed_password", sa.String(200), nullable=True),
        sa.Column("email", sa.String(200), nullable=True),
        sa.PrimaryKeyConstraint("id", name="pk_profiles"),
        sa.UniqueConstraint("username", name="uq_profiles_username"),
        sa.UniqueConstraint("email", name="uq_profiles_email"),
    )
    op.create_index("ix_profiles_username", "profiles", ["username"])
    op.create_index("ix_profiles_email", "profiles", ["email"])
    op.create_index("ix_profiles_points", "profiles", ["points"])

    # categories
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("slug", sa.String(50), nullable=False),
        sa.Column("icon", sa.String(10), nullable=True),
        sa.Column("color", sa.String(7), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.PrimaryKeyConstraint("id", name="pk_categories"),
        sa.UniqueConstraint("slug", name="uq_categories_slug"),
    )
    op.create_index("ix_categories_slug", "categories", ["slug"])

    # posts
    op.create_table(
        "posts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("author_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("category_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(200), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("media_urls", postgresql.JSONB(), nullable=True),
        sa.Column("is_pinned", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("pin_order", sa.Integer(), nullable=True),
        sa.Column("views", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("likes_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("comments_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["author_id"], ["profiles.id"], ondelete="CASCADE", name="fk_posts_author_id_profiles"),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], name="fk_posts_category_id_categories"),
        sa.PrimaryKeyConstraint("id", name="pk_posts"),
    )
    op.create_index("ix_posts_author_id", "posts", ["author_id"])
    op.create_index("ix_posts_created_at", "posts", ["created_at"])

    # comments
    op.create_table(
        "comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("author_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("likes_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"], ondelete="CASCADE", name="fk_comments_post_id_posts"),
        sa.ForeignKeyConstraint(["author_id"], ["profiles.id"], ondelete="CASCADE", name="fk_comments_author_id_profiles"),
        sa.ForeignKeyConstraint(["parent_id"], ["comments.id"], name="fk_comments_parent_id_comments"),
        sa.PrimaryKeyConstraint("id", name="pk_comments"),
    )
    op.create_index("ix_comments_post_id", "comments", ["post_id"])

    # reactions
    op.create_table(
        "reactions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_type", sa.String(20), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("emoji", sa.String(10), nullable=False, server_default="👍"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["user_id"], ["profiles.id"], ondelete="CASCADE", name="fk_reactions_user_id_profiles"),
        sa.PrimaryKeyConstraint("id", name="pk_reactions"),
        sa.UniqueConstraint("user_id", "target_type", "target_id", name="uq_reaction_user_target"),
    )

    # courses
    op.create_table(
        "courses",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("thumbnail_url", sa.Text(), nullable=True),
        sa.Column("category", sa.String(50), nullable=True),
        sa.Column("level", sa.String(20), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("estimated_hours", sa.Float(), nullable=True),
        sa.Column("is_free", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["created_by"], ["profiles.id"], name="fk_courses_created_by_profiles"),
        sa.PrimaryKeyConstraint("id", name="pk_courses"),
        sa.UniqueConstraint("slug", name="uq_courses_slug"),
    )
    op.create_index("ix_courses_slug", "courses", ["slug"])

    # modules
    op.create_table(
        "modules",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("course_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default="false"),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE", name="fk_modules_course_id_courses"),
        sa.PrimaryKeyConstraint("id", name="pk_modules"),
    )
    op.create_index("ix_modules_course_id", "modules", ["course_id"])

    # lessons
    op.create_table(
        "lessons",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("module_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("video_url", sa.Text(), nullable=True),
        sa.Column("video_bunny_id", sa.String(100), nullable=True),
        sa.Column("video_duration", sa.Integer(), nullable=True),
        sa.Column("video_thumbnail", sa.Text(), nullable=True),
        sa.Column("attachments", postgresql.JSONB(), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["module_id"], ["modules.id"], ondelete="CASCADE", name="fk_lessons_module_id_modules"),
        sa.PrimaryKeyConstraint("id", name="pk_lessons"),
    )
    op.create_index("ix_lessons_module_id", "lessons", ["module_id"])

    # lesson_progress
    op.create_table(
        "lesson_progress",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lesson_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("watch_percent", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_position", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["user_id"], ["profiles.id"], ondelete="CASCADE", name="fk_lesson_progress_user_id_profiles"),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"], ondelete="CASCADE", name="fk_lesson_progress_lesson_id_lessons"),
        sa.PrimaryKeyConstraint("id", name="pk_lesson_progress"),
        sa.UniqueConstraint("user_id", "lesson_id", name="uq_progress_user_lesson"),
    )
    op.create_index("ix_lesson_progress_user_id", "lesson_progress", ["user_id"])

    # events
    op.create_table(
        "events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("event_type", sa.String(30), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("timezone", sa.String(50), nullable=False, server_default="America/Sao_Paulo"),
        sa.Column("meeting_url", sa.Text(), nullable=True),
        sa.Column("is_recurring", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("recurrence_rule", postgresql.JSONB(), nullable=True),
        sa.Column("parent_event_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("max_attendees", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="scheduled"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["created_by"], ["profiles.id"], name="fk_events_created_by_profiles"),
        sa.ForeignKeyConstraint(["parent_event_id"], ["events.id"], name="fk_events_parent_event_id_events"),
        sa.PrimaryKeyConstraint("id", name="pk_events"),
    )
    op.create_index("ix_events_starts_at", "events", ["starts_at"])

    # event_registrations
    op.create_table(
        "event_registrations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("registered_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("attended", sa.Boolean(), nullable=False, server_default="false"),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE", name="fk_event_registrations_event_id_events"),
        sa.ForeignKeyConstraint(["user_id"], ["profiles.id"], ondelete="CASCADE", name="fk_event_registrations_user_id_profiles"),
        sa.PrimaryKeyConstraint("id", name="pk_event_registrations"),
        sa.UniqueConstraint("event_id", "user_id", name="uq_event_registration"),
    )
    op.create_index("ix_event_registrations_event_id", "event_registrations", ["event_id"])

    # levels
    op.create_table(
        "levels",
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("points_required", sa.Integer(), nullable=False),
        sa.Column("unlock_benefit", sa.Text(), nullable=True),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default="true"),
        sa.PrimaryKeyConstraint("level", name="pk_levels"),
    )

    # point_transactions
    op.create_table(
        "point_transactions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("reference_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["user_id"], ["profiles.id"], ondelete="CASCADE", name="fk_point_transactions_user_id_profiles"),
        sa.PrimaryKeyConstraint("id", name="pk_point_transactions"),
    )
    op.create_index("ix_point_transactions_user_id", "point_transactions", ["user_id"])

    # Seed default levels
    op.execute("""
        INSERT INTO levels (level, name, points_required, unlock_benefit) VALUES
        (1, 'Iniciante', 0, 'Acesso ao fórum'),
        (2, 'Aprendiz', 100, 'Badge exclusivo de Aprendiz'),
        (3, 'Praticante', 300, 'Acesso a conteúdos extras'),
        (4, 'Especialista', 700, 'Destaque no perfil'),
        (5, 'Mestre', 1500, 'Mentoria gratuita mensal'),
        (6, 'Lenda', 3000, 'Co-criação de conteúdo');
    """)

    # Seed default categories
    op.execute("""
        INSERT INTO categories (name, slug, icon, color, order_index) VALUES
        ('Geral', 'geral', '💬', '#4ECDC4', 0),
        ('Negócios', 'negocios', '💼', '#FF6B2B', 1),
        ('Marketing', 'marketing', '📣', '#E55A1C', 2),
        ('Tecnologia', 'tecnologia', '💻', '#1A1A2E', 3),
        ('Finanças', 'financas', '💰', '#4ECDC4', 4),
        ('Dúvidas', 'duvidas', '❓', '#FF6B2B', 5);
    """)


def downgrade() -> None:
    op.drop_table("point_transactions")
    op.drop_table("levels")
    op.drop_table("event_registrations")
    op.drop_table("events")
    op.drop_table("lesson_progress")
    op.drop_table("lessons")
    op.drop_table("modules")
    op.drop_table("courses")
    op.drop_table("reactions")
    op.drop_table("comments")
    op.drop_table("posts")
    op.drop_table("categories")
    op.drop_table("profiles")
