from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta, timezone

from ..core.database import get_db
from ..core.auth import get_current_active_user
from ..models.profile import Profile
from ..models.point_transaction import PointTransaction
from ..schemas.profile import ProfilePublic

router = APIRouter(prefix="/api/v1/leaderboard", tags=["leaderboard"])


class LeaderboardEntry(ProfilePublic):
    period_points: int = 0
    rank: int = 0


async def _build_ranked_list(period: str, db: AsyncSession, limit: int = 50):
    if period == "all-time":
        result = await db.execute(
            select(Profile)
            .where(Profile.status == "active")
            .order_by(Profile.points.desc())
            .limit(limit)
        )
        members = result.scalars().all()
        return [
            {
                **ProfilePublic.model_validate(m).model_dump(),
                "period_points": m.points,
                "rank": idx + 1,
            }
            for idx, m in enumerate(members)
        ]
    else:
        days = 7 if period == "7d" else 30
        since = datetime.now(timezone.utc) - timedelta(days=days)
        subq = (
            select(
                PointTransaction.user_id,
                func.sum(PointTransaction.points).label("period_points"),
            )
            .where(PointTransaction.created_at >= since)
            .group_by(PointTransaction.user_id)
            .subquery()
        )
        result = await db.execute(
            select(Profile, subq.c.period_points)
            .join(subq, Profile.id == subq.c.user_id)
            .where(Profile.status == "active")
            .order_by(subq.c.period_points.desc())
            .limit(limit)
        )
        rows = result.all()
        return [
            {
                **ProfilePublic.model_validate(row[0]).model_dump(),
                "period_points": row[1] or 0,
                "rank": idx + 1,
            }
            for idx, row in enumerate(rows)
        ]


@router.get("/me")
async def get_my_rank(
    period: str = Query("all-time", regex="^(7d|30d|all-time)$"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Return the current user's rank and period points (searches full list, not capped at 50)."""
    if period == "all-time":
        result = await db.execute(
            select(Profile).where(Profile.status == "active").order_by(Profile.points.desc())
        )
        members = result.scalars().all()
        for idx, m in enumerate(members):
            if str(m.id) == str(current_user.id):
                return {
                    **ProfilePublic.model_validate(m).model_dump(),
                    "period_points": m.points,
                    "rank": idx + 1,
                }
    else:
        days = 7 if period == "7d" else 30
        since = datetime.now(timezone.utc) - timedelta(days=days)
        subq = (
            select(
                PointTransaction.user_id,
                func.sum(PointTransaction.points).label("period_points"),
            )
            .where(PointTransaction.created_at >= since)
            .group_by(PointTransaction.user_id)
            .subquery()
        )
        result = await db.execute(
            select(Profile, subq.c.period_points)
            .join(subq, Profile.id == subq.c.user_id)
            .where(Profile.status == "active")
            .order_by(subq.c.period_points.desc())
        )
        rows = result.all()
        for idx, row in enumerate(rows):
            if str(row[0].id) == str(current_user.id):
                return {
                    **ProfilePublic.model_validate(row[0]).model_dump(),
                    "period_points": row[1] or 0,
                    "rank": idx + 1,
                }

    # User has no activity in this period
    return {
        **ProfilePublic.model_validate(current_user).model_dump(),
        "period_points": 0,
        "rank": None,
    }


@router.get("")
async def get_leaderboard(
    period: str = Query("all-time", regex="^(7d|30d|all-time)$"),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_active_user),
):
    return await _build_ranked_list(period, db, limit)
