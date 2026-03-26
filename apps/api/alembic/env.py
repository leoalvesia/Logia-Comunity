import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Import your models so Alembic can detect them
import sys
import os

# Support both local dev (apps/api as package "app") and monorepo root layout
_api_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_workspace_dir = os.path.dirname(_api_dir)  # logia-community/
sys.path.insert(0, _workspace_dir)           # enables "app.*" when api dir is named "app"
sys.path.insert(0, _api_dir)                 # fallback for direct local runs

try:
    from app.core.database import Base
    from app.core.config import settings
    import app.models  # noqa: F401
except ModuleNotFoundError:
    from core.database import Base  # type: ignore
    from core.config import settings  # type: ignore
    import models  # type: ignore  # noqa: F401

config = context.config

# Override the sqlalchemy.url with our settings
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
