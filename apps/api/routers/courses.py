from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone
import uuid

from ..core.database import get_db
from ..core.auth import get_current_active_user, require_role
from ..core.require_paid import require_paid
from ..models.profile import Profile
from ..models.course import Course
from ..models.module import Module
from ..models.lesson import Lesson
from ..models.lesson_progress import LessonProgress
from ..schemas.course import (
    CourseCreate, CourseUpdate, CourseResponse, CourseListResponse,
    ModuleCreate, ModuleUpdate, ModuleResponse,
    LessonCreate, LessonUpdate, LessonResponse,
    ProgressUpdate,
)
from ..services.courses_service import generate_slug
from ..services.points_service import award_points

router = APIRouter(prefix="/api/v1", tags=["courses"])


def _course_query(include_draft: bool = False):
    q = select(Course).options(
        selectinload(Course.modules).selectinload(Module.lessons)
    )
    if not include_draft:
        q = q.where(Course.status == "published")
    return q.order_by(Course.order_index.asc(), Course.created_at.desc())


@router.get("/courses", response_model=CourseListResponse)
async def list_courses(
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    is_admin = current_user.role in ("admin", "moderator")
    query = _course_query(include_draft=is_admin)
    result = await db.execute(query)
    courses = result.scalars().all()

    # Attach progress per course
    progress_map: dict[uuid.UUID, tuple[int, int]] = {}
    for course in courses:
        lesson_ids = [l.id for m in course.modules for l in m.lessons]
        if lesson_ids:
            prog_result = await db.execute(
                select(func.count()).select_from(LessonProgress)
                .where(
                    LessonProgress.user_id == current_user.id,
                    LessonProgress.lesson_id.in_(lesson_ids),
                    LessonProgress.completed == True,
                )
            )
            completed = prog_result.scalar_one()
        else:
            completed = 0
        progress_map[course.id] = (len(lesson_ids), completed)

    items = []
    for c in courses:
        d = CourseResponse.model_validate(c)
        d.total_lessons, d.completed_lessons = progress_map.get(c.id, (0, 0))
        items.append(d)

    return CourseListResponse(items=items, total=len(items))


@router.post("/courses", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(
    payload: CourseCreate,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_role("admin")),
    current_user: Profile = Depends(get_current_active_user),
):
    slug = payload.slug or generate_slug(payload.title)
    # Ensure slug uniqueness
    counter = 1
    base_slug = slug
    while True:
        existing = (await db.execute(select(Course).where(Course.slug == slug))).scalar_one_or_none()
        if not existing:
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    course = Course(
        title=payload.title,
        slug=slug,
        description=payload.description,
        thumbnail_url=payload.thumbnail_url,
        category=payload.category,
        level=payload.level,
        estimated_hours=payload.estimated_hours,
        is_free=payload.is_free,
        created_by=current_user.id,
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)

    result = await db.execute(
        select(Course).where(Course.id == course.id)
        .options(selectinload(Course.modules).selectinload(Module.lessons))
    )
    return CourseResponse.model_validate(result.scalar_one())


@router.get("/courses/{slug}", response_model=CourseResponse)
async def get_course(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Course).where(Course.slug == slug)
        .options(selectinload(Course.modules).selectinload(Module.lessons))
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.status == "draft" and current_user.role not in ("admin", "moderator"):
        raise HTTPException(status_code=404, detail="Course not found")

    lesson_ids = [l.id for m in course.modules for l in m.lessons]
    completed = 0
    if lesson_ids:
        prog_result = await db.execute(
            select(func.count()).select_from(LessonProgress)
            .where(
                LessonProgress.user_id == current_user.id,
                LessonProgress.lesson_id.in_(lesson_ids),
                LessonProgress.completed == True,
            )
        )
        completed = prog_result.scalar_one()

    # Attach per-lesson progress
    prog_records = {}
    if lesson_ids:
        progs = (await db.execute(
            select(LessonProgress).where(
                LessonProgress.user_id == current_user.id,
                LessonProgress.lesson_id.in_(lesson_ids),
            )
        )).scalars().all()
        prog_records = {p.lesson_id: p for p in progs}

    d = CourseResponse.model_validate(course)
    d.total_lessons = len(lesson_ids)
    d.completed_lessons = completed

    # Embed progress in lessons
    for mod in d.modules:
        for les in mod.lessons:
            if les.id in prog_records:
                from ..schemas.course import LessonProgressResponse
                les.progress = LessonProgressResponse.model_validate(prog_records[les.id])
    return d


@router.patch("/courses/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: uuid.UUID,
    payload: CourseUpdate,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_role("admin")),
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(course, field, value)
    course.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(course)
    result2 = await db.execute(
        select(Course).where(Course.id == course_id)
        .options(selectinload(Course.modules).selectinload(Module.lessons))
    )
    return CourseResponse.model_validate(result2.scalar_one())


@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_role("admin")),
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    await db.delete(course)
    await db.commit()


# ── Modules ──────────────────────────────────────────────────────────────────

@router.post("/courses/{course_id}/modules", response_model=ModuleResponse, status_code=status.HTTP_201_CREATED)
async def create_module(
    course_id: uuid.UUID,
    payload: ModuleCreate,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_role("admin")),
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Course not found")

    module = Module(
        course_id=course_id,
        title=payload.title,
        order_index=payload.order_index,
        is_published=payload.is_published,
    )
    db.add(module)
    await db.commit()
    await db.refresh(module)

    result2 = await db.execute(
        select(Module).where(Module.id == module.id).options(selectinload(Module.lessons))
    )
    return result2.scalar_one()


@router.patch("/courses/{course_id}/modules/{module_id}", response_model=ModuleResponse)
async def update_module(
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    payload: ModuleUpdate,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_role("admin")),
):
    result = await db.execute(
        select(Module).where(Module.id == module_id, Module.course_id == course_id)
    )
    module = result.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(module, field, value)

    await db.commit()
    await db.refresh(module)
    result2 = await db.execute(
        select(Module).where(Module.id == module_id).options(selectinload(Module.lessons))
    )
    return result2.scalar_one()


@router.delete("/courses/{course_id}/modules/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_module(
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_role("admin")),
):
    result = await db.execute(
        select(Module).where(Module.id == module_id, Module.course_id == course_id)
    )
    module = result.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    await db.delete(module)
    await db.commit()


# ── Lessons ───────────────────────────────────────────────────────────────────

@router.post("/modules/{module_id}/lessons", response_model=LessonResponse, status_code=status.HTTP_201_CREATED)
async def create_lesson(
    module_id: uuid.UUID,
    payload: LessonCreate,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_role("admin")),
):
    result = await db.execute(select(Module).where(Module.id == module_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Module not found")

    lesson = Lesson(
        module_id=module_id,
        title=payload.title,
        description=payload.description,
        order_index=payload.order_index,
        status=payload.status,
        video_provider=payload.video_provider or "youtube",
    )
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return lesson


@router.patch("/lessons/{lesson_id}", response_model=LessonResponse)
async def update_lesson(
    lesson_id: uuid.UUID,
    payload: LessonUpdate,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_role("admin")),
):
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(lesson, field, value)
    lesson.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(lesson)
    return lesson


@router.delete("/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lesson(
    lesson_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_role("admin")),
):
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    await db.delete(lesson)
    await db.commit()


@router.patch("/lessons/{lesson_id}/progress")
async def update_progress(
    lesson_id: uuid.UUID,
    payload: ProgressUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    # Enforce paywall for paid courses
    lesson_result = await db.execute(
        select(Lesson).where(Lesson.id == lesson_id)
    )
    lesson_obj = lesson_result.scalar_one_or_none()
    if lesson_obj:
        module_result = await db.execute(
            select(Module).where(Module.id == lesson_obj.module_id)
        )
        module_obj = module_result.scalar_one_or_none()
        if module_obj:
            course_result = await db.execute(
                select(Course).where(Course.id == module_obj.course_id)
            )
            course_obj = course_result.scalar_one_or_none()
            if course_obj and not course_obj.is_free and not current_user.is_paid:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Esta área requer uma assinatura ativa. Faça o upgrade para continuar.",
                )

    result = await db.execute(
        select(LessonProgress).where(
            LessonProgress.user_id == current_user.id,
            LessonProgress.lesson_id == lesson_id,
        )
    )
    progress = result.scalar_one_or_none()

    if not progress:
        progress = LessonProgress(
            user_id=current_user.id,
            lesson_id=lesson_id,
            watch_percent=payload.watch_percent,
            last_position=payload.last_position,
        )
        db.add(progress)
    else:
        progress.watch_percent = max(progress.watch_percent, payload.watch_percent)
        progress.last_position = payload.last_position

    await db.commit()
    return {"watch_percent": progress.watch_percent, "last_position": progress.last_position}


@router.post("/lessons/{lesson_id}/complete")
async def complete_lesson(
    lesson_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    # Enforce paywall for paid courses
    lesson_result = await db.execute(
        select(Lesson).where(Lesson.id == lesson_id)
    )
    lesson_obj = lesson_result.scalar_one_or_none()
    if lesson_obj:
        module_result = await db.execute(
            select(Module).where(Module.id == lesson_obj.module_id)
        )
        module_obj = module_result.scalar_one_or_none()
        if module_obj:
            course_result = await db.execute(
                select(Course).where(Course.id == module_obj.course_id)
            )
            course_obj = course_result.scalar_one_or_none()
            if course_obj and not course_obj.is_free and not current_user.is_paid:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Esta área requer uma assinatura ativa. Faça o upgrade para continuar.",
                )

    result = await db.execute(
        select(LessonProgress).where(
            LessonProgress.user_id == current_user.id,
            LessonProgress.lesson_id == lesson_id,
        )
    )
    progress = result.scalar_one_or_none()

    already_completed = progress and progress.completed

    if not progress:
        progress = LessonProgress(
            user_id=current_user.id,
            lesson_id=lesson_id,
            watch_percent=100,
            completed=True,
            completed_at=datetime.now(timezone.utc),
        )
        db.add(progress)
    else:
        progress.completed = True
        progress.watch_percent = 100
        if not progress.completed_at:
            progress.completed_at = datetime.now(timezone.utc)

    if not already_completed:
        await award_points(db, current_user.id, 20, "lesson_completed", lesson_id)

    await db.commit()
    return {"completed": True}
