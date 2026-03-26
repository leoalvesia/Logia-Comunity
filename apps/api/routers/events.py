from datetime import timedelta
from dateutil.relativedelta import relativedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract
from sqlalchemy.orm import selectinload
import uuid

from ..core.database import get_db
from ..core.auth import get_current_active_user, require_role
from ..models.profile import Profile
from ..models.event import Event
from ..models.event_registration import EventRegistration
from ..schemas.event import EventCreate, EventUpdate, EventResponse, EventListResponse, RecurrenceRule

router = APIRouter(prefix="/api/v1/events", tags=["events"])

_MAX_OCCURRENCES = 52


def _generate_occurrences(
    parent: Event,
    rule: RecurrenceRule,
    duration: timedelta,
) -> list[Event]:
    """Return child Event objects (not yet persisted) based on the recurrence rule."""
    occurrences = []
    current = parent.starts_at

    limit = min(rule.count - 1, _MAX_OCCURRENCES) if rule.count else _MAX_OCCURRENCES

    for _ in range(limit):
        if rule.frequency == "daily":
            current = current + timedelta(days=rule.interval)
        elif rule.frequency == "weekly":
            current = current + timedelta(weeks=rule.interval)
        else:  # monthly
            current = current + relativedelta(months=rule.interval)

        if rule.until and current.date() > rule.until:
            break

        occurrences.append(
            Event(
                title=parent.title,
                description=parent.description,
                event_type=parent.event_type,
                starts_at=current,
                ends_at=current + duration,
                timezone=parent.timezone,
                meeting_url=parent.meeting_url,
                max_attendees=parent.max_attendees,
                created_by=parent.created_by,
                is_recurring=True,
                parent_event_id=parent.id,
                status="scheduled",
            )
        )

    return occurrences


@router.get("", response_model=EventListResponse)
async def list_events(
    month: int | None = Query(None, ge=1, le=12),
    year: int | None = Query(None, ge=2020, le=2100),
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    query = (
        select(Event)
        .where(Event.status != "cancelled")
        .options(selectinload(Event.creator))
        .order_by(Event.starts_at.asc())
    )
    if month and year:
        query = query.where(
            extract("month", Event.starts_at) == month,
            extract("year", Event.starts_at) == year,
        )
    elif year:
        query = query.where(extract("year", Event.starts_at) == year)

    result = await db.execute(query)
    events = result.scalars().all()

    # Check registrations for current user
    event_ids = [e.id for e in events]
    registered_ids = set()
    attendee_counts = {}
    if event_ids:
        regs = (await db.execute(
            select(EventRegistration.event_id)
            .where(
                EventRegistration.user_id == current_user.id,
                EventRegistration.event_id.in_(event_ids),
            )
        )).scalars().all()
        registered_ids = set(regs)

        counts = (await db.execute(
            select(EventRegistration.event_id, func.count(EventRegistration.id))
            .where(EventRegistration.event_id.in_(event_ids))
            .group_by(EventRegistration.event_id)
        )).all()
        attendee_counts = {row[0]: row[1] for row in counts}

    items = []
    for e in events:
        d = EventResponse.model_validate(e)
        d.is_registered = e.id in registered_ids
        d.attendee_count = attendee_counts.get(e.id, 0)
        items.append(d)

    return EventListResponse(items=items, total=len(items))


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    payload: EventCreate,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_role("admin")),
    current_user: Profile = Depends(get_current_active_user),
):
    is_recurring = payload.recurrence_rule is not None
    event = Event(
        title=payload.title,
        description=payload.description,
        event_type=payload.event_type,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        timezone=payload.timezone,
        meeting_url=payload.meeting_url,
        max_attendees=payload.max_attendees,
        created_by=current_user.id,
        is_recurring=is_recurring,
        recurrence_rule=payload.recurrence_rule.model_dump() if payload.recurrence_rule else None,
    )
    db.add(event)
    await db.flush()  # get parent ID before generating children

    if payload.recurrence_rule:
        duration = payload.ends_at - payload.starts_at
        children = _generate_occurrences(event, payload.recurrence_rule, duration)
        db.add_all(children)

    await db.commit()
    await db.refresh(event)

    result = await db.execute(
        select(Event).where(Event.id == event.id).options(selectinload(Event.creator))
    )
    e = result.scalar_one()
    d = EventResponse.model_validate(e)
    d.attendee_count = 0
    d.is_registered = False
    return d


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Event).where(Event.id == event_id).options(selectinload(Event.creator))
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    count_result = await db.execute(
        select(func.count(EventRegistration.id))
        .where(EventRegistration.event_id == event_id)
    )
    attendee_count = count_result.scalar_one()

    reg = (await db.execute(
        select(EventRegistration).where(
            EventRegistration.event_id == event_id,
            EventRegistration.user_id == current_user.id,
        )
    )).scalar_one_or_none()

    d = EventResponse.model_validate(event)
    d.attendee_count = attendee_count
    d.is_registered = reg is not None
    return d


@router.patch("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: uuid.UUID,
    payload: EventUpdate,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_role("admin")),
    current_user: Profile = Depends(get_current_active_user),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, field, value)

    await db.commit()
    await db.refresh(event)
    result2 = await db.execute(
        select(Event).where(Event.id == event_id).options(selectinload(Event.creator))
    )
    e = result2.scalar_one()
    d = EventResponse.model_validate(e)
    d.attendee_count = 0
    d.is_registered = False
    return d


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_role("admin")),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    await db.delete(event)
    await db.commit()


@router.post("/{event_id}/register", status_code=status.HTTP_201_CREATED)
async def register_for_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.status == "cancelled":
        raise HTTPException(status_code=400, detail="Event is cancelled")

    # Check capacity
    if event.max_attendees:
        count = (await db.execute(
            select(func.count(EventRegistration.id))
            .where(EventRegistration.event_id == event_id)
        )).scalar_one()
        if count >= event.max_attendees:
            raise HTTPException(status_code=409, detail="Event is full")

    existing = (await db.execute(
        select(EventRegistration).where(
            EventRegistration.event_id == event_id,
            EventRegistration.user_id == current_user.id,
        )
    )).scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=409, detail="Already registered")

    reg = EventRegistration(event_id=event_id, user_id=current_user.id)
    db.add(reg)
    await db.commit()
    return {"registered": True}


@router.delete("/{event_id}/register", status_code=status.HTTP_204_NO_CONTENT)
async def unregister_from_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    reg = (await db.execute(
        select(EventRegistration).where(
            EventRegistration.event_id == event_id,
            EventRegistration.user_id == current_user.id,
        )
    )).scalar_one_or_none()

    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    await db.delete(reg)
    await db.commit()
