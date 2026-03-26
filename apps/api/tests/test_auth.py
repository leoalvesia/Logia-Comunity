"""Integration tests for authentication endpoints."""
import pytest
from conftest import unique_email, unique_username


@pytest.mark.asyncio
class TestRegister:
    async def test_register_success(self, client):
        resp = await client.post("/api/v1/auth/register", json={
            "email": unique_email(),
            "username": unique_username(),
            "full_name": "New User",
            "password": "SecurePass123!",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    async def test_register_duplicate_email(self, client):
        email = unique_email()
        payload = {"email": email, "username": unique_username(), "full_name": "A", "password": "Pass123!"}
        await client.post("/api/v1/auth/register", json=payload)
        payload2 = {**payload, "username": unique_username()}
        resp = await client.post("/api/v1/auth/register", json=payload2)
        assert resp.status_code == 409

    async def test_register_duplicate_username(self, client):
        username = unique_username()
        payload = {"email": unique_email(), "username": username, "full_name": "A", "password": "Pass123!"}
        await client.post("/api/v1/auth/register", json=payload)
        payload2 = {**payload, "email": unique_email()}
        resp = await client.post("/api/v1/auth/register", json=payload2)
        assert resp.status_code == 409


@pytest.mark.asyncio
class TestLogin:
    async def test_login_success(self, client):
        email = unique_email()
        password = "MyPass123!"
        await client.post("/api/v1/auth/register", json={
            "email": email, "username": unique_username(),
            "full_name": "Login Test", "password": password,
        })
        resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    async def test_login_wrong_password(self, client):
        email = unique_email()
        await client.post("/api/v1/auth/register", json={
            "email": email, "username": unique_username(),
            "full_name": "X", "password": "CorrectPass1!",
        })
        resp = await client.post("/api/v1/auth/login", json={"email": email, "password": "WrongPass!"})
        assert resp.status_code == 401

    async def test_login_unknown_email(self, client):
        resp = await client.post("/api/v1/auth/login", json={
            "email": "nobody@logia.test", "password": "anypass",
        })
        assert resp.status_code == 401


@pytest.mark.asyncio
class TestMe:
    async def test_get_me(self, client, registered_user, auth_headers):
        user, _ = registered_user
        resp = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == user["email"]
        assert data["username"] == user["username"]

    async def test_get_me_no_auth(self, client):
        resp = await client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    async def test_token_refresh(self, client, registered_user):
        _, access_token = registered_user
        # Get refresh token
        email = registered_user[0]["email"]
        login_resp = await client.post("/api/v1/auth/login", json={
            "email": email, "password": "TestPass123!",
        })
        refresh_token = login_resp.json()["refresh_token"]
        resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert resp.status_code == 200
        assert "access_token" in resp.json()


@pytest.mark.asyncio
class TestLGPD:
    async def test_data_export_returns_all_sections(self, client, auth_headers):
        resp = await client.get("/api/v1/auth/me/data-export", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "profile" in data
        assert "posts" in data
        assert "comments" in data
        assert "point_transactions" in data
        assert "event_registrations" in data
        assert "lesson_progress" in data
        assert "exported_at" in data

    async def test_data_export_no_auth(self, client):
        resp = await client.get("/api/v1/auth/me/data-export")
        assert resp.status_code == 401
