"""Integration tests for posts and comments endpoints."""
import pytest


@pytest.mark.asyncio
class TestPosts:
    async def test_list_posts_requires_auth(self, client):
        resp = await client.get("/api/v1/posts")
        assert resp.status_code == 401

    async def test_create_post(self, client, auth_headers):
        resp = await client.post("/api/v1/posts", json={
            "body": "<p>Hello community!</p>",
            "title": "My first post",
        }, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "My first post"
        assert "<p>Hello community!</p>" in data["body"]
        assert "id" in data
        return data["id"]

    async def test_create_post_xss_stripped(self, client, auth_headers):
        resp = await client.post("/api/v1/posts", json={
            "body": '<p>Safe</p><script>alert("xss")</script>',
        }, headers=auth_headers)
        assert resp.status_code == 201
        assert "<script>" not in resp.json()["body"]

    async def test_list_posts_returns_items(self, client, auth_headers):
        # Create a post first
        await client.post("/api/v1/posts", json={"body": "<p>Test</p>"}, headers=auth_headers)
        resp = await client.get("/api/v1/posts", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)

    async def test_get_post_by_id(self, client, auth_headers):
        create = await client.post("/api/v1/posts", json={"body": "<p>Detail</p>", "title": "Detail"}, headers=auth_headers)
        post_id = create.json()["id"]

        resp = await client.get(f"/api/v1/posts/{post_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == post_id

    async def test_delete_own_post(self, client, auth_headers):
        create = await client.post("/api/v1/posts", json={"body": "<p>To delete</p>"}, headers=auth_headers)
        post_id = create.json()["id"]

        resp = await client.delete(f"/api/v1/posts/{post_id}", headers=auth_headers)
        assert resp.status_code == 204

        # Should return 404 after soft delete
        resp2 = await client.get(f"/api/v1/posts/{post_id}", headers=auth_headers)
        assert resp2.status_code == 404

    async def test_react_to_post(self, client, auth_headers):
        create = await client.post("/api/v1/posts", json={"body": "<p>React</p>"}, headers=auth_headers)
        post_id = create.json()["id"]

        # Like
        resp = await client.post(f"/api/v1/posts/{post_id}/react", json={"emoji": "❤️"}, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["liked"] is True
        assert resp.json()["likes_count"] == 1

        # Unlike (toggle off)
        resp2 = await client.post(f"/api/v1/posts/{post_id}/react", json={"emoji": "❤️"}, headers=auth_headers)
        assert resp2.json()["liked"] is False
        assert resp2.json()["likes_count"] == 0


@pytest.mark.asyncio
class TestComments:
    async def test_create_and_list_comment(self, client, auth_headers):
        post = await client.post("/api/v1/posts", json={"body": "<p>Post</p>"}, headers=auth_headers)
        post_id = post.json()["id"]

        resp = await client.post(f"/api/v1/posts/{post_id}/comments", json={
            "body": "<p>A comment</p>",
        }, headers=auth_headers)
        assert resp.status_code == 201

        list_resp = await client.get(f"/api/v1/posts/{post_id}/comments", headers=auth_headers)
        assert list_resp.status_code == 200
        comments = list_resp.json()
        assert len(comments) >= 1
        bodies = [c["body"] for c in comments]
        assert any("A comment" in b for b in bodies)

    async def test_delete_comment(self, client, auth_headers):
        post = await client.post("/api/v1/posts", json={"body": "<p>P</p>"}, headers=auth_headers)
        post_id = post.json()["id"]
        comment = await client.post(f"/api/v1/posts/{post_id}/comments", json={"body": "<p>C</p>"}, headers=auth_headers)
        comment_id = comment.json()["id"]

        resp = await client.delete(f"/api/v1/posts/comments/{comment_id}", headers=auth_headers)
        assert resp.status_code == 204
