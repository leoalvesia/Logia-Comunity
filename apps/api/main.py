import json
import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from .core.config import settings
from .core.database import init_db
from .core.redis import get_redis, close_redis
from .core.auth import get_current_active_user
from .routers import auth, posts, courses, events, members, leaderboard, admin, webhooks, payments, search

# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])


# ── WebSocket connection manager ──────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, set[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_to_user(self, user_id: str, message: dict):
        connections = self.active_connections.get(user_id, [])
        for ws in list(connections):
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(user_id, ws)

    async def broadcast(self, message: dict):
        for user_id, connections in list(self.active_connections.items()):
            for ws in list(connections):
                try:
                    await ws.send_json(message)
                except Exception:
                    self.disconnect(user_id, ws)


manager = ConnectionManager()


# ── Hourly event reminder loop ────────────────────────────────────────────────
async def event_reminder_loop():
    """Send 1-hour-before reminders for registered events. Runs every hour."""
    while True:
        try:
            await asyncio.sleep(3600)
            from .workers.tasks import run_event_reminders
            await asyncio.to_thread(run_event_reminders)
        except asyncio.CancelledError:
            break
        except Exception:
            pass  # never crash the app due to email failure


# ── Redis pub/sub listener ────────────────────────────────────────────────────
async def redis_listener():
    """Forward Redis pub/sub messages to connected WebSocket clients."""
    try:
        redis = await get_redis()
        pubsub = redis.pubsub()
        await pubsub.subscribe("feed", "notifications")

        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    data = json.loads(message["data"])
                    channel = message["channel"]
                    if channel == "notifications" and "user_id" in data:
                        await manager.send_to_user(data["user_id"], data)
                    else:
                        await manager.broadcast(data)
                except (json.JSONDecodeError, Exception):
                    pass
    except asyncio.CancelledError:
        pass
    except Exception:
        pass


# ── App lifespan ──────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    listener_task = asyncio.create_task(redis_listener())
    reminder_task = asyncio.create_task(event_reminder_loop())
    yield
    listener_task.cancel()
    reminder_task.cancel()
    await close_redis()


# ── App factory ───────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(posts.router)
app.include_router(courses.router)
app.include_router(events.router)
app.include_router(members.router)
app.include_router(leaderboard.router)
app.include_router(admin.router)
app.include_router(webhooks.router)
app.include_router(payments.router)
app.include_router(search.router)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "version": "1.0.0"}


# ── WebSocket endpoint ────────────────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Authenticated WebSocket for real-time notifications.
    Client must send: {"token": "<jwt_access_token>"} as first message.
    """
    await websocket.accept()
    user_id = None

    try:
        # Authenticate via first message
        auth_data = await asyncio.wait_for(websocket.receive_json(), timeout=10.0)
        token = auth_data.get("token")

        if not token:
            await websocket.send_json({"error": "No token provided"})
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        from .core.auth import decode_token
        from .core.database import AsyncSessionLocal
        from .models.profile import Profile
        from sqlalchemy import select

        payload = decode_token(token)
        user_id = payload.get("sub")

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Profile).where(Profile.id == user_id))
            user = result.scalar_one_or_none()
            if not user:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return

        # Re-register the connection since we already accepted above
        if user_id not in manager.active_connections:
            manager.active_connections[user_id] = set()
        manager.active_connections[user_id].add(websocket)

        await websocket.send_json({"type": "connected", "user_id": user_id})

        # Keep alive — listen for pings
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        pass
    except asyncio.TimeoutError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
    except Exception:
        pass
    finally:
        if user_id:
            manager.disconnect(user_id, websocket)
