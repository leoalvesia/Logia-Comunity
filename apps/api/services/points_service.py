import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.point_transaction import PointTransaction
from ..models.profile import Profile
from ..models.level import Level

# Point values per action
POINT_ACTIONS = {
    "welcome_bonus": 50,
    "post_created": 10,
    "comment_created": 5,
    "lesson_completed": 20,
    "event_attended": 15,
    "post_liked": 2,
    "profile_completed": 25,
}


async def award_points(
    db: AsyncSession,
    user_id: uuid.UUID,
    points: int,
    action: str,
    reference_id: Optional[uuid.UUID] = None,
) -> PointTransaction:
    """Award points to a user and update their level if necessary."""
    transaction = PointTransaction(
        user_id=user_id,
        points=points,
        action=action,
        reference_id=reference_id,
    )
    db.add(transaction)

    # Update total points
    result = await db.execute(select(Profile).where(Profile.id == user_id))
    profile = result.scalar_one_or_none()
    if profile:
        profile.points += points
        new_level = await calculate_level(db, profile.points)
        if new_level > profile.level:
            profile.level = new_level

    return transaction


async def calculate_level(db: AsyncSession, total_points: int) -> int:
    """Determine the user level based on total points."""
    result = await db.execute(
        select(Level)
        .where(Level.points_required <= total_points, Level.is_public == True)
        .order_by(Level.level.desc())
        .limit(1)
    )
    level = result.scalar_one_or_none()
    return level.level if level else 1
