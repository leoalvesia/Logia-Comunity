import bleach

# Allowed HTML tags from TipTap rich text editor
ALLOWED_TAGS = [
    "p", "br", "strong", "em", "u", "s", "code", "pre",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "blockquote",
    "a", "img",
    "table", "thead", "tbody", "tr", "th", "td",
    "span", "div",
    "hr",
]

ALLOWED_ATTRIBUTES = {
    "a": ["href", "title", "target", "rel"],
    "img": ["src", "alt", "width", "height"],
    "td": ["colspan", "rowspan"],
    "th": ["colspan", "rowspan"],
    "span": ["class"],
    "div": ["class"],
    "code": ["class"],
    "pre": ["class"],
    "p": ["class"],
}


def sanitize_html(raw_html: str) -> str:
    """
    Sanitize HTML produced by TipTap before storing in the database.
    Strips disallowed tags/attributes to prevent XSS.
    """
    if not raw_html:
        return ""
    cleaned = bleach.clean(
        raw_html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        strip=True,
        strip_comments=True,
    )
    return cleaned
