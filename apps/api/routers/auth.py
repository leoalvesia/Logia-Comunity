from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..core.database import get_db
from ..core.auth import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, decode_token, get_current_active_user,
    store_refresh_token, revoke_refresh_token, is_refresh_token_valid,
    blacklist_access_token,
)
from ..core.config import settings
from ..models.profile import Profile
from ..models.post import Post
from ..models.comment import Comment
from ..models.point_transaction import PointTransaction
from ..models.event_registration import EventRegistration
from ..models.lesson_progress import LessonProgress
from ..schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest, GoogleAuthRequest, LogoutRequest
from ..schemas.profile import ProfileResponse
from ..services.points_service import award_points

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check duplicates
    existing = await db.execute(
        select(Profile).where(
            (Profile.email == payload.email) | (Profile.username == payload.username)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or username already registered",
        )

    user = Profile(
        email=payload.email,
        username=payload.username,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    await db.flush()  # get id before commit

    # Award welcome points
    await award_points(db, user.id, 50, "welcome_bonus")
    await db.commit()
    await db.refresh(user)

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))
    refresh_payload = decode_token(refresh_token)
    await store_refresh_token(refresh_payload["jti"], str(user.id))

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).where(Profile.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if user.status == "banned":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account banned")

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))
    refresh_payload = decode_token(refresh_token)
    await store_refresh_token(refresh_payload["jti"], str(user.id))

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    decoded = decode_token(payload.refresh_token)
    if decoded.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    old_jti = decoded.get("jti")
    if not old_jti or not await is_refresh_token_valid(old_jti):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revoked")

    user_id = decoded.get("sub")
    result = await db.execute(select(Profile).where(Profile.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Rotate: revoke old refresh token, issue new pair
    await revoke_refresh_token(old_jti)
    access_token = create_access_token(str(user.id))
    new_refresh = create_refresh_token(str(user.id))
    new_refresh_payload = decode_token(new_refresh)
    await store_refresh_token(new_refresh_payload["jti"], str(user.id))

    return TokenResponse(access_token=access_token, refresh_token=new_refresh)


@router.post("/logout")
async def logout(
    request: Request,
    payload: LogoutRequest,
    current_user: Profile = Depends(get_current_active_user),
):
    # Blacklist the current access token until it naturally expires
    authorization = request.headers.get("Authorization", "")
    if authorization.startswith("Bearer "):
        access_token_str = authorization[7:]
        try:
            access_decoded = decode_token(access_token_str)
            if access_decoded.get("jti") and access_decoded.get("exp"):
                await blacklist_access_token(access_decoded["jti"], access_decoded["exp"])
        except Exception:
            pass

    # Revoke refresh token
    try:
        refresh_decoded = decode_token(payload.refresh_token)
        if refresh_decoded.get("jti"):
            await revoke_refresh_token(refresh_decoded["jti"])
    except Exception:
        pass  # already invalid or expired — still proceed

    return {"message": "Logged out successfully"}


@router.get("/me", response_model=ProfileResponse)
async def get_me(current_user: Profile = Depends(get_current_active_user)):
    return current_user


@router.get("/me/data-export")
async def export_my_data(
    current_user: Profile = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    LGPD Art. 18 — Direito de acesso e portabilidade.
    Retorna todos os dados pessoais do usuário em formato JSON.
    """
    posts_result = await db.execute(
        select(Post).where(Post.author_id == current_user.id, Post.deleted_at.is_(None))
    )
    posts = posts_result.scalars().all()

    comments_result = await db.execute(
        select(Comment).where(Comment.author_id == current_user.id, Comment.deleted_at.is_(None))
    )
    comments = comments_result.scalars().all()

    transactions_result = await db.execute(
        select(PointTransaction).where(PointTransaction.user_id == current_user.id)
    )
    transactions = transactions_result.scalars().all()

    registrations_result = await db.execute(
        select(EventRegistration).where(EventRegistration.user_id == current_user.id)
    )
    registrations = registrations_result.scalars().all()

    progress_result = await db.execute(
        select(LessonProgress).where(LessonProgress.user_id == current_user.id)
    )
    progress = progress_result.scalars().all()

    def _str(v):
        return str(v) if v is not None else None

    return JSONResponse(content={
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "profile": {
            "id": _str(current_user.id),
            "username": current_user.username,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "bio": current_user.bio,
            "avatar_url": current_user.avatar_url,
            "location_lat": current_user.location_lat,
            "location_lng": current_user.location_lng,
            "level": current_user.level,
            "points": current_user.points,
            "role": current_user.role,
            "status": current_user.status,
            "joined_at": _str(current_user.joined_at),
            "last_seen_at": _str(current_user.last_seen_at),
            "subscription_status": current_user.subscription_status,
            "current_period_end": _str(current_user.current_period_end),
            "is_paid": current_user.is_paid,
        },
        "posts": [
            {
                "id": _str(p.id),
                "title": p.title,
                "body": p.body,
                "created_at": _str(p.created_at),
                "updated_at": _str(p.updated_at),
            }
            for p in posts
        ],
        "comments": [
            {
                "id": _str(c.id),
                "post_id": _str(c.post_id),
                "body": c.body,
                "created_at": _str(c.created_at),
            }
            for c in comments
        ],
        "point_transactions": [
            {
                "id": t.id,
                "points": t.points,
                "action": t.action,
                "created_at": _str(t.created_at),
            }
            for t in transactions
        ],
        "event_registrations": [
            {
                "event_id": _str(r.event_id),
                "registered_at": _str(r.registered_at),
                "attended": r.attended,
            }
            for r in registrations
        ],
        "lesson_progress": [
            {
                "lesson_id": _str(lp.lesson_id),
                "watch_percent": lp.watch_percent,
                "completed": lp.completed,
                "completed_at": _str(lp.completed_at),
            }
            for lp in progress
        ],
    })


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_account(
    current_user: Profile = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    LGPD Art. 18 — Direito à eliminação.
    Anonimiza todos os dados pessoais e desativa a conta.
    Cancela a assinatura Stripe ativa, se houver.
    """
    # Cancel Stripe subscription if active
    if current_user.stripe_subscription_id and settings.stripe_secret_key:
        try:
            import stripe
            stripe.api_key = settings.stripe_secret_key
            stripe.Subscription.cancel(current_user.stripe_subscription_id)
        except Exception:
            pass  # Proceed with deletion even if Stripe fails

    # Anonymize all PII — keeps the row for referential integrity of posts/comments
    current_user.email = f"deleted_{current_user.id}@deleted.logia"
    current_user.full_name = "Conta Excluída"
    current_user.bio = None
    current_user.avatar_url = None
    current_user.location_lat = None
    current_user.location_lng = None
    current_user.hashed_password = None
    current_user.stripe_customer_id = None
    current_user.stripe_subscription_id = None
    current_user.subscription_status = None
    current_user.is_paid = False
    current_user.status = "deleted"

    await db.commit()


@router.post("/google", response_model=TokenResponse)
async def google_auth(payload: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    """Exchange Google id_token for Logia tokens."""
    import httpx

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.id_token}"
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Google token")
        google_data = resp.json()

    email = google_data.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email not returned by Google")

    result = await db.execute(select(Profile).where(Profile.email == email))
    user = result.scalar_one_or_none()

    if not user:
        # Auto-register
        name = google_data.get("name", email.split("@")[0])
        base_username = email.split("@")[0].lower().replace(".", "_")
        username = base_username
        counter = 1
        while True:
            existing = await db.execute(select(Profile).where(Profile.username == username))
            if not existing.scalar_one_or_none():
                break
            username = f"{base_username}{counter}"
            counter += 1

        user = Profile(
            email=email,
            username=username,
            full_name=name,
            avatar_url=google_data.get("picture"),
        )
        db.add(user)
        await db.flush()
        await award_points(db, user.id, 50, "welcome_bonus")
        await db.commit()
        await db.refresh(user)

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))
    refresh_payload = decode_token(refresh_token)
    await store_refresh_token(refresh_payload["jti"], str(user.id))

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)
