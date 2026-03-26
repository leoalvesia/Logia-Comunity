from pydantic import BaseModel, ConfigDict
from typing import Optional, Any
from datetime import datetime
import uuid


class LessonProgressResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    lesson_id: uuid.UUID
    watch_percent: int
    completed: bool
    completed_at: Optional[datetime] = None
    last_position: int


class LessonBase(BaseModel):
    title: str
    description: Optional[str] = None
    order_index: int
    status: str = "draft"


class LessonCreate(LessonBase):
    video_provider: Optional[str] = None  # youtube | vimeo


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    order_index: Optional[int] = None
    status: Optional[str] = None
    video_url: Optional[str] = None
    video_provider: Optional[str] = None  # youtube | vimeo
    video_duration: Optional[int] = None
    video_thumbnail: Optional[str] = None
    attachments: Optional[Any] = None


class LessonResponse(LessonBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    module_id: uuid.UUID
    video_url: Optional[str] = None
    video_provider: str = "youtube"
    video_bunny_id: Optional[str] = None  # legacy
    video_duration: Optional[int] = None
    video_thumbnail: Optional[str] = None
    attachments: Optional[Any] = None
    created_at: datetime
    updated_at: datetime
    progress: Optional[LessonProgressResponse] = None


class ModuleBase(BaseModel):
    title: str
    order_index: int
    is_published: bool = False


class ModuleCreate(ModuleBase):
    pass


class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    order_index: Optional[int] = None
    is_published: Optional[bool] = None


class ModuleResponse(ModuleBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    course_id: uuid.UUID
    lessons: list[LessonResponse] = []


class CourseBase(BaseModel):
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    category: Optional[str] = None
    level: Optional[str] = None
    estimated_hours: Optional[float] = None
    is_free: bool = False


class CourseCreate(CourseBase):
    slug: Optional[str] = None  # auto-generated if not provided


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    category: Optional[str] = None
    level: Optional[str] = None
    status: Optional[str] = None
    estimated_hours: Optional[float] = None
    is_free: Optional[bool] = None
    order_index: Optional[int] = None


class CourseResponse(CourseBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    status: str
    order_index: int
    created_at: datetime
    updated_at: datetime
    modules: list[ModuleResponse] = []
    total_lessons: int = 0
    completed_lessons: int = 0


class CourseListResponse(BaseModel):
    items: list[CourseResponse]
    total: int


class ProgressUpdate(BaseModel):
    watch_percent: int
    last_position: int


class VideoUploadRequest(BaseModel):
    filename: str
    content_type: str
    file_size: int


class VideoUploadResponse(BaseModel):
    upload_url: str
    lesson_id: uuid.UUID
    bunny_video_id: Optional[str] = None
    upload_headers: dict[str, str] = {}
