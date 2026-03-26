import uuid
import random
import math

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..core.database import get_db
from ..core.auth import get_current_active_user
from ..core.config import settings
from ..models.profile import Profile
from ..schemas.profile import ProfilePublic, ProfileResponse, ProfileUpdate

router = APIRouter(prefix="/api/v1/members", tags=["members"])

# ~10 miles ≈ 0.145°. Applied deterministically per user_id so the offset is
# stable across requests (same user → same pin location on the map).
_PRIVACY_MAX_OFFSET = 0.15


def _privacy_offset(user_id, lat: float, lng: float) -> tuple[float, float]:
    seed = int(str(user_id).replace("-", ""), 16) % (2**32)
    rng = random.Random(seed)
    angle = rng.uniform(0, 2 * math.pi)
    dist = rng.uniform(0.10, _PRIVACY_MAX_OFFSET)
    return round(lat + dist * math.sin(angle), 4), round(lng + dist * math.cos(angle), 4)


@router.get("", response_model=list[ProfilePublic])
async def list_members(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_active_user),
):
    offset = (page - 1) * limit
    query = (
        select(Profile)
        .where(Profile.status == "active")
        .order_by(Profile.points.desc(), Profile.joined_at.desc())
    )
    if search:
        query = query.where(
            Profile.username.ilike(f"%{search}%") | Profile.full_name.ilike(f"%{search}%")
        )
    result = await db.execute(query.offset(offset).limit(limit))
    return result.scalars().all()


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: Profile = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload avatar image to Supabase Storage.
    Returns the public URL. Falls back to a placeholder if Supabase is not configured.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be smaller than 2MB")

    if not settings.supabase_url or not settings.supabase_service_key:
        raise HTTPException(
            status_code=501,
            detail="Storage not configured. Use a direct URL instead.",
        )

    import httpx

    ext = (file.filename or "avatar.jpg").rsplit(".", 1)[-1].lower()
    safe_ext = ext if ext in ("jpg", "jpeg", "png", "webp", "gif") else "jpg"
    object_path = f"avatars/{current_user.id}/{uuid.uuid4()}.{safe_ext}"

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.supabase_url}/storage/v1/object/{object_path}",
            headers={
                "Authorization": f"Bearer {settings.supabase_service_key}",
                "Content-Type": file.content_type,
                "x-upsert": "true",
            },
            content=content,
        )
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail="Failed to upload to storage")

    public_url = f"{settings.supabase_url}/storage/v1/object/public/{object_path}"

    # Persist the URL to the profile immediately
    result = await db.execute(select(Profile).where(Profile.id == current_user.id))
    profile = result.scalar_one_or_none()
    if profile:
        profile.avatar_url = public_url
        await db.commit()

    return {"url": public_url}


@router.get("/map")
async def get_members_map(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_active_user),
):
    """
    Returns members that have set a location, with a deterministic ~10-mile
    privacy offset applied so exact addresses are never exposed.
    """
    result = await db.execute(
        select(Profile)
        .where(
            Profile.status == "active",
            Profile.location_lat.is_not(None),
            Profile.location_lng.is_not(None),
        )
    )
    members = result.scalars().all()
    features = []
    for m in members:
        offset_lat, offset_lng = _privacy_offset(m.id, m.location_lat, m.location_lng)
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [offset_lng, offset_lat]},
            "properties": {
                "id": str(m.id),
                "username": m.username,
                "full_name": m.full_name,
                "avatar_url": m.avatar_url,
                "level": m.level,
                "points": m.points,
            },
        })
    return {"type": "FeatureCollection", "features": features}


@router.get("/{username}", response_model=ProfilePublic)
async def get_member(
    username: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_active_user),
):
    result = await db.execute(select(Profile).where(Profile.username == username))
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member


@router.patch("/{member_id}", response_model=ProfileResponse)
async def update_member(
    member_id: str,
    payload: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    import uuid

    try:
        target_id = uuid.UUID(member_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid member ID")

    if current_user.id != target_id and current_user.role not in ("admin",):
        raise HTTPException(status_code=403, detail="Not allowed")

    result = await db.execute(select(Profile).where(Profile.id == target_id))
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(member, field, value)

    await db.commit()
    await db.refresh(member)
    return member
