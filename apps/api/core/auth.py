from datetime import datetime, timedelta, timezone
from typing import Optional, Callable
from functools import wraps
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .config import settings
from .database import get_db

REFRESH_TOKEN_PREFIX = "refresh_token:"
BLACKLIST_PREFIX = "blacklist:"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str, extra_claims: dict = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": subject,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
        "jti": str(uuid.uuid4()),
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    payload = {
        "sub": subject,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


async def store_refresh_token(jti: str, user_id: str) -> None:
    """Store refresh token jti in Redis so it can be invalidated on logout."""
    from .redis import redis_set
    ttl = settings.refresh_token_expire_days * 86400
    await redis_set(f"{REFRESH_TOKEN_PREFIX}{jti}", user_id, expire=ttl)


async def revoke_refresh_token(jti: str) -> None:
    """Delete refresh token jti from Redis (logout / token rotation)."""
    from .redis import redis_delete
    await redis_delete(f"{REFRESH_TOKEN_PREFIX}{jti}")


async def is_refresh_token_valid(jti: str) -> bool:
    """Returns True if the refresh token jti is still in Redis (not revoked)."""
    from .redis import redis_get
    return await redis_get(f"{REFRESH_TOKEN_PREFIX}{jti}") is not None


async def blacklist_access_token(jti: str, exp: int) -> None:
    """Add access token jti to blacklist until it naturally expires."""
    from .redis import redis_set
    remaining = exp - int(datetime.now(timezone.utc).timestamp())
    if remaining > 0:
        await redis_set(f"{BLACKLIST_PREFIX}{jti}", "1", expire=remaining)


async def is_access_token_blacklisted(jti: str) -> bool:
    from .redis import redis_get
    return await redis_get(f"{BLACKLIST_PREFIX}{jti}") is not None


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    from ..models.profile import Profile  # avoid circular import

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(token)
    if payload.get("type") != "access":
        raise credentials_exception

    user_id: str = payload.get("sub")
    jti: str = payload.get("jti")
    if user_id is None:
        raise credentials_exception

    # Check token blacklist (set on logout)
    if jti and await is_access_token_blacklisted(jti):
        raise credentials_exception

    result = await db.execute(select(Profile).where(Profile.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception

    if user.status == "banned":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been banned.",
        )

    return user


async def get_current_active_user(
    current_user=Depends(get_current_user),
):
    if current_user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive or suspended account.",
        )
    return current_user


def require_role(*roles: str):
    """Dependency factory that checks the user has one of the given roles."""

    async def role_checker(current_user=Depends(get_current_active_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires role: {' or '.join(roles)}",
            )
        return current_user

    return role_checker
