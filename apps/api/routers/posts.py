from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone
import uuid

from ..core.database import get_db
from ..core.auth import get_current_active_user, require_role
from ..models.profile import Profile
from ..models.post import Post
from ..models.comment import Comment
from ..models.reaction import Reaction
from ..schemas.post import (
    PostCreate, PostUpdate, PostResponse, PostListResponse,
    CommentCreate, CommentResponse, ReactRequest
)
from ..services.posts_service import sanitize_html
from ..services.points_service import award_points
from ..core.redis import redis_publish

router = APIRouter(prefix="/api/v1/posts", tags=["posts"])


@router.get("", response_model=PostListResponse)
async def list_posts(
    category: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    offset = (page - 1) * limit
    query = (
        select(Post)
        .where(Post.deleted_at.is_(None))
        .options(selectinload(Post.author), selectinload(Post.category))
        .order_by(Post.is_pinned.desc(), Post.pin_order.asc(), Post.created_at.desc())
    )

    if category:
        from ..models.category import Category
        cat_result = await db.execute(select(Category).where(Category.slug == category))
        cat = cat_result.scalar_one_or_none()
        if cat:
            query = query.where(Post.category_id == cat.id)

    count_query = select(func.count()).select_from(Post).where(Post.deleted_at.is_(None))
    if category:
        from ..models.category import Category
        cat_result = await db.execute(select(Category).where(Category.slug == category))
        cat = cat_result.scalar_one_or_none()
        if cat:
            count_query = count_query.where(Post.category_id == cat.id)

    total = (await db.execute(count_query)).scalar_one()
    posts = (await db.execute(query.offset(offset).limit(limit))).scalars().all()

    # Check user likes
    post_ids = [p.id for p in posts]
    liked_ids = set()
    if post_ids:
        reactions = (await db.execute(
            select(Reaction.target_id).where(
                Reaction.user_id == current_user.id,
                Reaction.target_type == "post",
                Reaction.target_id.in_(post_ids),
            )
        )).scalars().all()
        liked_ids = {r for r in reactions}

    items = []
    for p in posts:
        d = PostResponse.model_validate(p)
        d.user_has_liked = p.id in liked_ids
        items.append(d)

    return PostListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        has_next=(offset + limit) < total,
    )


@router.post("", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    payload: PostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    clean_body = sanitize_html(payload.body)
    post = Post(
        author_id=current_user.id,
        title=payload.title,
        body=clean_body,
        category_id=payload.category_id,
        media_urls=payload.media_urls,
    )
    db.add(post)
    await db.flush()

    await award_points(db, current_user.id, 10, "post_created", post.id)
    await db.commit()
    await db.refresh(post)

    # Reload with relationships
    result = await db.execute(
        select(Post)
        .where(Post.id == post.id)
        .options(selectinload(Post.author), selectinload(Post.category))
    )
    post = result.scalar_one()

    await redis_publish("feed", {"event": "new_post", "post_id": str(post.id)})
    return PostResponse.model_validate(post)


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Post)
        .where(Post.id == post_id, Post.deleted_at.is_(None))
        .options(selectinload(Post.author), selectinload(Post.category))
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Increment views
    await db.execute(update(Post).where(Post.id == post_id).values(views=Post.views + 1))
    await db.commit()

    liked = (await db.execute(
        select(Reaction).where(
            Reaction.user_id == current_user.id,
            Reaction.target_type == "post",
            Reaction.target_id == post_id,
        )
    )).scalar_one_or_none()

    d = PostResponse.model_validate(post)
    d.user_has_liked = liked is not None
    return d


@router.patch("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: uuid.UUID,
    payload: PostUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    result = await db.execute(select(Post).where(Post.id == post_id, Post.deleted_at.is_(None)))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if post.author_id != current_user.id and current_user.role not in ("admin", "moderator"):
        raise HTTPException(status_code=403, detail="Not allowed")

    if payload.body is not None:
        post.body = sanitize_html(payload.body)
    if payload.title is not None:
        post.title = payload.title
    if payload.category_id is not None:
        post.category_id = payload.category_id
    if payload.media_urls is not None:
        post.media_urls = payload.media_urls
    post.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(post)

    result2 = await db.execute(
        select(Post).where(Post.id == post_id)
        .options(selectinload(Post.author), selectinload(Post.category))
    )
    return PostResponse.model_validate(result2.scalar_one())


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    result = await db.execute(select(Post).where(Post.id == post_id, Post.deleted_at.is_(None)))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if post.author_id != current_user.id and current_user.role not in ("admin", "moderator"):
        raise HTTPException(status_code=403, detail="Not allowed")

    post.deleted_at = datetime.now(timezone.utc)
    await db.commit()


@router.post("/{post_id}/pin", status_code=status.HTTP_200_OK)
async def pin_post(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_role("admin", "moderator")),
):
    result = await db.execute(select(Post).where(Post.id == post_id, Post.deleted_at.is_(None)))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    post.is_pinned = not post.is_pinned
    await db.commit()
    return {"is_pinned": post.is_pinned}


@router.post("/{post_id}/react")
async def react_to_post(
    post_id: uuid.UUID,
    payload: ReactRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    result = await db.execute(select(Post).where(Post.id == post_id, Post.deleted_at.is_(None)))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = (await db.execute(
        select(Reaction).where(
            Reaction.user_id == current_user.id,
            Reaction.target_type == "post",
            Reaction.target_id == post_id,
        )
    )).scalar_one_or_none()

    if existing:
        # Toggle off
        await db.delete(existing)
        post.likes_count = max(0, post.likes_count - 1)
        liked = False
    else:
        reaction = Reaction(
            user_id=current_user.id,
            target_type="post",
            target_id=post_id,
            emoji=payload.emoji,
        )
        db.add(reaction)
        post.likes_count += 1
        liked = True

    await db.commit()
    return {"liked": liked, "likes_count": post.likes_count}


@router.get("/{post_id}/comments", response_model=list[CommentResponse])
async def get_comments(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_active_user),
):
    result = await db.execute(
        select(Comment)
        .where(Comment.post_id == post_id, Comment.deleted_at.is_(None), Comment.parent_id.is_(None))
        .options(selectinload(Comment.author), selectinload(Comment.replies))
        .order_by(Comment.created_at.asc())
    )
    return result.scalars().all()


@router.post("/{post_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    post_id: uuid.UUID,
    payload: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    result = await db.execute(select(Post).where(Post.id == post_id, Post.deleted_at.is_(None)))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    comment = Comment(
        post_id=post_id,
        author_id=current_user.id,
        body=sanitize_html(payload.body),
        parent_id=payload.parent_id,
    )
    db.add(comment)
    post.comments_count += 1

    await db.flush()
    await award_points(db, current_user.id, 5, "comment_created", comment.id)
    await db.commit()

    result2 = await db.execute(
        select(Comment).where(Comment.id == comment.id)
        .options(selectinload(Comment.author))
    )
    return result2.scalar_one()


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Comment).where(Comment.id == comment_id, Comment.deleted_at.is_(None))
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.author_id != current_user.id and current_user.role not in ("admin", "moderator"):
        raise HTTPException(status_code=403, detail="Not allowed")

    comment.deleted_at = datetime.now(timezone.utc)

    # Decrement post comment count
    await db.execute(
        update(Post).where(Post.id == comment.post_id)
        .values(comments_count=Post.comments_count - 1)
    )
    await db.commit()
