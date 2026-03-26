"""Unit tests for posts_service — no database required."""
import pytest
from app.services.posts_service import sanitize_html


def test_sanitize_allows_basic_formatting():
    html = "<p><strong>Hello</strong> <em>world</em></p>"
    assert sanitize_html(html) == html


def test_sanitize_removes_script_tags():
    html = '<p>Safe</p><script>alert("xss")</script>'
    result = sanitize_html(html)
    assert "<script>" not in result
    assert "alert" not in result
    assert "<p>Safe</p>" in result


def test_sanitize_removes_on_event_attributes():
    html = '<a href="https://example.com" onclick="evil()">Click</a>'
    result = sanitize_html(html)
    assert "onclick" not in result
    assert 'href="https://example.com"' in result


def test_sanitize_strips_data_uri_images():
    html = '<img src="data:image/png;base64,abc123" alt="img">'
    result = sanitize_html(html)
    # data: URIs must be stripped by bleach (not in allowed src values)
    assert "data:image" not in result


def test_sanitize_keeps_https_images():
    html = '<img src="https://example.com/photo.jpg" alt="photo">'
    result = sanitize_html(html)
    assert "https://example.com/photo.jpg" in result


def test_sanitize_allows_code_blocks():
    html = "<pre><code class=\"language-python\">print('hello')</code></pre>"
    result = sanitize_html(html)
    assert "<pre>" in result
    assert "<code" in result


def test_sanitize_removes_iframes():
    html = '<iframe src="https://evil.com"></iframe><p>text</p>'
    result = sanitize_html(html)
    assert "<iframe" not in result
    assert "<p>text</p>" in result


def test_sanitize_empty_string():
    assert sanitize_html("") == ""


def test_sanitize_strips_comments():
    html = "<!-- hidden comment --><p>visible</p>"
    result = sanitize_html(html)
    assert "<!--" not in result
    assert "<p>visible</p>" in result


def test_sanitize_allows_links_with_target():
    html = '<a href="https://logia.com" target="_blank" rel="noopener">link</a>'
    result = sanitize_html(html)
    assert 'href="https://logia.com"' in result
    assert 'target="_blank"' in result
