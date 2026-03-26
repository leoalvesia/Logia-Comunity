from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, Any, Literal
from datetime import datetime, date
import uuid

from .profile import ProfilePublic


class RecurrenceRule(BaseModel):
    """
    Defines how an event repeats.
    frequency: daily | weekly | monthly
    interval:  every N periods (default 1)
    count:     total number of occurrences (including the first) — mutually exclusive with until
    until:     repeat until this date (inclusive) — mutually exclusive with count
    """
    frequency: Literal["daily", "weekly", "monthly"]
    interval: int = 1
    count: Optional[int] = None   # max 52 to prevent abuse
    until: Optional[date] = None


class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: str  # webinar|workshop|q_and_a|meetup
    starts_at: datetime
    ends_at: datetime
    timezone: str = "America/Sao_Paulo"
    meeting_url: Optional[str] = None
    max_attendees: Optional[int] = None

    @field_validator("ends_at")
    @classmethod
    def ends_after_starts(cls, v: datetime, info) -> datetime:
        starts = info.data.get("starts_at")
        if starts and v <= starts:
            raise ValueError("ends_at must be after starts_at")
        return v


class EventCreate(EventBase):
    recurrence_rule: Optional[RecurrenceRule] = None


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_type: Optional[str] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    timezone: Optional[str] = None
    meeting_url: Optional[str] = None
    max_attendees: Optional[int] = None
    status: Optional[str] = None


class EventResponse(EventBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str
    is_recurring: bool
    recurrence_rule: Optional[Any] = None
    parent_event_id: Optional[uuid.UUID] = None
    created_at: datetime
    creator: Optional[ProfilePublic] = None
    attendee_count: int = 0
    is_registered: bool = False


class EventListResponse(BaseModel):
    items: list[EventResponse]
    total: int
