from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
import uuid


class AdminStatsResponse(BaseModel):
    total_members: int
    active_members_7d: int
    total_courses: int
    total_lessons: int
    total_posts: int
    total_events: int
    paid_members: int
    new_members_30d: int


class AdminMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    full_name: str
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    status: str
    level: int
    points: int
    is_paid: bool
    joined_at: datetime
    last_seen_at: Optional[datetime] = None


class RoleUpdateRequest(BaseModel):
    role: str  # member | admin | moderator


class BanRequest(BaseModel):
    reason: Optional[str] = None
