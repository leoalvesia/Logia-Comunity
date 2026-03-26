from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..core.database import get_db
from ..core.auth import get_current_active_user
from ..models.profile import Profile
from ..models.post import Post
from ..models.course import Course

router = APIRouter(prefix="/api/v1/search", tags=["search"])


@router.get("")
async def global_search(
    q: str = Query(..., min_length=2, max_length=100),
    limit: int = Query(5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    _user: Profile = Depends(get_current_active_user),
):
    """
    Search posts, courses and members by keyword.
    Returns up to `limit` results per category.
    """
    term = f"%{q}%"

    posts_result = await db.execute(
        select(Post)
        .where(
            Post.deleted_at.is_(None),
            Post.title.ilike(term) | Post.body.ilike(term),
        )
        .options(selectinload(Post.author))
        .order_by(Post.created_at.desc())
        .limit(limit)
    )
    posts = posts_result.scalars().all()

    courses_result = await db.execute(
        select(Course)
        .where(
            Course.status == "published",
            Course.title.ilike(term) | Course.description.ilike(term),
        )
        .order_by(Course.order_index.asc())
        .limit(limit)
    )
    courses = courses_result.scalars().all()

    members_result = await db.execute(
        select(Profile)
        .where(
            Profile.status == "active",
            Profile.full_name.ilike(term) | Profile.username.ilike(term),
        )
        .order_by(Profile.points.desc())
        .limit(limit)
    )
    members = members_result.scalars().all()

    return {
        "query": q,
        "posts": [
            {
                "id": str(p.id),
                "title": p.title or p.body[:80],
                "author": p.author.full_name if p.author else None,
                "created_at": p.created_at.isoformat(),
            }
            for p in posts
        ],
        "courses": [
            {
                "id": str(c.id),
                "slug": c.slug,
                "title": c.title,
                "thumbnail_url": c.thumbnail_url,
            }
            for c in courses
        ],
        "members": [
            {
                "id": str(m.id),
                "username": m.username,
                "full_name": m.full_name,
                "avatar_url": m.avatar_url,
                "level": m.level,
            }
            for m in members
        ],
    }
