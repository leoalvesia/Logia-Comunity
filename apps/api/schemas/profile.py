from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
import uuid


class ProfileBase(BaseModel):
    username: str
    full_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None


class ProfileResponse(ProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    level: int
    points: int
    role: str
    status: str
    joined_at: datetime
    last_seen_at: Optional[datetime] = None
    is_paid: bool
    email: Optional[str] = None


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None


class ProfilePublic(BaseModel):
    """Public profile data — no sensitive fields."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    full_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    level: int
    points: int
    role: str
    joined_at: datetime
    is_paid: bool
