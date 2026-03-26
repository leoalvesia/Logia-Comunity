from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta, timezone
import uuid

from ..core.database import get_db
from ..core.auth import require_role
from ..models.profile import Profile
from ..models.course import Course
from ..models.lesson import Lesson
from ..models.post import Post
from ..models.event import Event
from ..schemas.admin import AdminStatsResponse, AdminMemberResponse, RoleUpdateRequest, BanRequest

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

_require_admin = Depends(require_role("admin"))


@router.get("/stats/overview", response_model=AdminStatsResponse)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _admin=_require_admin,
):
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)

    total_members = (await db.execute(select(func.count(Profile.id)))).scalar_one()
    active_7d = (await db.execute(
        select(func.count(Profile.id)).where(Profile.last_seen_at >= seven_days_ago)
    )).scalar_one()
    total_courses = (await db.execute(select(func.count(Course.id)))).scalar_one()
    total_lessons = (await db.execute(select(func.count(Lesson.id)))).scalar_one()
    total_posts = (await db.execute(
        select(func.count(Post.id)).where(Post.deleted_at.is_(None))
    )).scalar_one()
    total_events = (await db.execute(select(func.count(Event.id)))).scalar_one()
    paid_members = (await db.execute(
        select(func.count(Profile.id)).where(Profile.is_paid == True)
    )).scalar_one()
    new_30d = (await db.execute(
        select(func.count(Profile.id)).where(Profile.joined_at >= thirty_days_ago)
    )).scalar_one()

    return AdminStatsResponse(
        total_members=total_members,
        active_members_7d=active_7d,
        total_courses=total_courses,
        total_lessons=total_lessons,
        total_posts=total_posts,
        total_events=total_events,
        paid_members=paid_members,
        new_members_30d=new_30d,
    )


@router.get("/members", response_model=list[AdminMemberResponse])
async def list_admin_members(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    search: str | None = Query(None),
    role: str | None = Query(None),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _admin=_require_admin,
):
    offset = (page - 1) * limit
    query = select(Profile).order_by(Profile.joined_at.desc())

    if search:
        query = query.where(
            Profile.username.ilike(f"%{search}%")
            | Profile.full_name.ilike(f"%{search}%")
            | Profile.email.ilike(f"%{search}%")
        )
    if role:
        query = query.where(Profile.role == role)
    if status:
        query = query.where(Profile.status == status)

    result = await db.execute(query.offset(offset).limit(limit))
    return result.scalars().all()


@router.patch("/members/{member_id}/role")
async def update_member_role(
    member_id: uuid.UUID,
    payload: RoleUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _admin=_require_admin,
):
    allowed_roles = {"member", "admin", "moderator"}
    if payload.role not in allowed_roles:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {allowed_roles}")

    result = await db.execute(select(Profile).where(Profile.id == member_id))
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    member.role = payload.role
    await db.commit()
    return {"id": str(member_id), "role": payload.role}


@router.post("/members/{member_id}/ban")
async def ban_member(
    member_id: uuid.UUID,
    payload: BanRequest,
    db: AsyncSession = Depends(get_db),
    _admin=_require_admin,
):
    result = await db.execute(select(Profile).where(Profile.id == member_id))
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.role == "admin":
        raise HTTPException(status_code=403, detail="Cannot ban an admin")

    member.status = "banned"
    await db.commit()
    return {"id": str(member_id), "status": "banned", "reason": payload.reason}
