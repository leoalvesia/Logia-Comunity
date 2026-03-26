"""Integration tests for global search endpoint."""
import pytest


@pytest.mark.asyncio
class TestSearch:
    async def test_search_requires_auth(self, client):
        resp = await client.get("/api/v1/search?q=test")
        assert resp.status_code == 401

    async def test_search_requires_min_length(self, client, auth_headers):
        resp = await client.get("/api/v1/search?q=a", headers=auth_headers)
        assert resp.status_code == 422  # query too short (min_length=2)

    async def test_search_returns_sections(self, client, auth_headers):
        resp = await client.get("/api/v1/search?q=test", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "query" in data
        assert "posts" in data
        assert "courses" in data
        assert "members" in data

    async def test_search_finds_created_post(self, client, auth_headers):
        unique_title = "UniqueSearchableTitle12345"
        await client.post("/api/v1/posts", json={
            "body": f"<p>{unique_title}</p>",
            "title": unique_title,
        }, headers=auth_headers)

        resp = await client.get(f"/api/v1/search?q={unique_title[:10]}", headers=auth_headers)
        assert resp.status_code == 200
        post_titles = [p["title"] for p in resp.json()["posts"]]
        assert any(unique_title in t for t in post_titles)

    async def test_search_empty_results(self, client, auth_headers):
        resp = await client.get("/api/v1/search?q=xyzzyabcdef999notfound", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["posts"] == []
        assert data["courses"] == []
        # members might still match by chance but typically empty

    async def test_search_limit_parameter(self, client, auth_headers):
        resp = await client.get("/api/v1/search?q=a&limit=2", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["posts"]) <= 2
        assert len(data["courses"]) <= 2
        assert len(data["members"]) <= 2
