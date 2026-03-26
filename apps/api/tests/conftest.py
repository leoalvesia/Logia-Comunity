"""
Test fixtures for Logia Community API.

Uses the Docker PostgreSQL test database:
  postgresql+asyncpg://logia:logia_dev_password@localhost:5433/logia

Set TEST_DATABASE_URL env var to override (e.g. in CI with a postgres service).
"""
import os
import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

TEST_DB_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://logia:logia_dev_password@localhost:5433/logia",
)


@pytest_asyncio.fixture(scope="session")
async def engine():
    """Session-scoped async engine pointing at the test database."""
    eng = create_async_engine(TEST_DB_URL, echo=False)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture(scope="session")
async def session_factory(engine):
    return async_sessionmaker(engine, expire_on_commit=False)


@pytest_asyncio.fixture()
async def db(session_factory):
    """Per-test DB session that rolls back after each test."""
    async with session_factory() as session:
        async with session.begin():
            yield session
            await session.rollback()


@pytest_asyncio.fixture(scope="session")
async def app():
    """FastAPI application instance (session-scoped)."""
    # Override DATABASE_URL so the app uses the test DB
    os.environ["DATABASE_URL"] = TEST_DB_URL
    from app.main import app as fastapi_app
    return fastapi_app


@pytest_asyncio.fixture(scope="session")
async def client(app):
    """Authenticated HTTP client (session-scoped, no auth by default)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


# ── Helpers ───────────────────────────────────────────────────────────────────

def unique_email() -> str:
    return f"test_{uuid.uuid4().hex[:8]}@logia.test"


def unique_username() -> str:
    return f"user_{uuid.uuid4().hex[:8]}"


@pytest_asyncio.fixture()
async def registered_user(client):
    """Register a fresh user and return (user_data, access_token)."""
    email = unique_email()
    username = unique_username()
    payload = {
        "email": email,
        "username": username,
        "full_name": "Test User",
        "password": "TestPass123!",
    }
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201, resp.text
    tokens = resp.json()
    return {"email": email, "username": username, "full_name": "Test User"}, tokens["access_token"]


@pytest_asyncio.fixture()
def auth_headers(registered_user):
    _, token = registered_user
    return {"Authorization": f"Bearer {token}"}
