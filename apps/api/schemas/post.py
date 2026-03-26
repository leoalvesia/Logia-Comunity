from pydantic import BaseModel, ConfigDict
from typing import Optional, Any
from datetime import datetime
import uuid

from .profile import ProfilePublic


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    icon: Optional[str] = None
    color: Optional[str] = None


class PostCreate(BaseModel):
    title: Optional[str] = None
    body: str
    category_id: Optional[int] = None
    media_urls: Optional[Any] = None


class PostUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    category_id: Optional[int] = None
    media_urls: Optional[Any] = None


class PostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: Optional[str] = None
    body: str
    media_urls: Optional[Any] = None
    is_pinned: bool
    pin_order: Optional[int] = None
    views: int
    likes_count: int
    comments_count: int
    created_at: datetime
    updated_at: datetime
    author: Optional[ProfilePublic] = None
    category: Optional[CategoryResponse] = None
    user_has_liked: bool = False


class PostListResponse(BaseModel):
    items: list[PostResponse]
    total: int
    page: int
    limit: int
    has_next: bool


class CommentCreate(BaseModel):
    body: str
    parent_id: Optional[uuid.UUID] = None


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    post_id: uuid.UUID
    body: str
    likes_count: int
    created_at: datetime
    parent_id: Optional[uuid.UUID] = None
    author: Optional[ProfilePublic] = None


class ReactRequest(BaseModel):
    emoji: str = "👍"
