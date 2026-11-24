from typing import Any

from redis.asyncio import Redis

from app.core.config import settings

_redis_client: Redis | None = None


async def init_redis() -> Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


async def close_redis() -> None:
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None


def set_redis_client(client: Any) -> None:
    global _redis_client
    _redis_client = client


async def get_redis() -> Any:
    if _redis_client is None:
        await init_redis()
    return _redis_client


async def revoke_token(jti: str, ttl_seconds: int) -> None:
    if ttl_seconds <= 0:
        return
    client = await get_redis()
    await client.setex(f"revoked_token:{jti}", ttl_seconds, "1")


async def is_token_revoked(jti: str) -> bool:
    client = await get_redis()
    value = await client.get(f"revoked_token:{jti}")
    return value is not None

