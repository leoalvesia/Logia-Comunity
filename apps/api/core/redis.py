import json
from typing import Any, Optional
import redis.asyncio as aioredis
from .config import settings

_redis_client: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


async def redis_set(key: str, value: Any, expire: int = None) -> None:
    client = await get_redis()
    serialized = json.dumps(value) if not isinstance(value, str) else value
    if expire:
        await client.setex(key, expire, serialized)
    else:
        await client.set(key, serialized)


async def redis_get(key: str) -> Optional[Any]:
    client = await get_redis()
    value = await client.get(key)
    if value is None:
        return None
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return value


async def redis_delete(key: str) -> None:
    client = await get_redis()
    await client.delete(key)


async def redis_publish(channel: str, message: Any) -> None:
    client = await get_redis()
    payload = json.dumps(message) if not isinstance(message, str) else message
    await client.publish(channel, payload)


async def redis_subscribe(channel: str):
    client = await get_redis()
    pubsub = client.pubsub()
    await pubsub.subscribe(channel)
    return pubsub


async def close_redis() -> None:
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None
