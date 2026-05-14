"""
SOC session store — Redis-backed with in-memory fallback.

Audit fix: soc_analyst_service.py:68 used a process-local dict, so sessions
died on restart and weren't safe across multiple FastAPI workers. This module
abstracts the storage so callers can swap backends without code changes.
"""

from __future__ import annotations

import json
import os
from typing import List, Optional

import structlog

logger = structlog.get_logger(__name__)

SESSION_TTL_SECONDS = int(os.getenv("SOC_SESSION_TTL_SECONDS", "86400"))  # 24h
SESSION_PREFIX = os.getenv("SOC_SESSION_PREFIX", "soc:session:")


class SessionStore:
    """Async session store with Redis primary + in-memory fallback."""

    def __init__(self) -> None:
        self._redis = None
        self._memory: dict[str, list[dict]] = {}
        self._initialized = False

    async def initialize(self) -> None:
        if self._initialized:
            return
        url = os.getenv("REDIS_URL")
        if url:
            try:
                # Lazy import so the dependency is optional
                import redis.asyncio as aioredis  # type: ignore
                self._redis = aioredis.from_url(url, decode_responses=True)
                # Verify connectivity
                await self._redis.ping()
                logger.info("SessionStore using Redis backend", url=url)
            except Exception as e:
                logger.warning("Redis not available; SessionStore falling back to in-memory", error=str(e))
                self._redis = None
        else:
            logger.info("SessionStore using in-memory backend (REDIS_URL not set)")
        self._initialized = True

    async def get(self, session_id: str) -> Optional[List[dict]]:
        await self.initialize()
        if self._redis:
            try:
                raw = await self._redis.get(SESSION_PREFIX + session_id)
                if raw is None:
                    return None
                return json.loads(raw)
            except Exception as e:
                logger.warning("Redis get failed, falling back to memory", error=str(e))
        return self._memory.get(session_id)

    async def set(self, session_id: str, messages: List[dict]) -> None:
        await self.initialize()
        if self._redis:
            try:
                await self._redis.setex(
                    SESSION_PREFIX + session_id,
                    SESSION_TTL_SECONDS,
                    json.dumps(messages, default=str),
                )
                return
            except Exception as e:
                logger.warning("Redis set failed, falling back to memory", error=str(e))
        self._memory[session_id] = messages

    async def delete(self, session_id: str) -> None:
        await self.initialize()
        if self._redis:
            try:
                await self._redis.delete(SESSION_PREFIX + session_id)
                return
            except Exception as e:
                logger.warning("Redis delete failed", error=str(e))
        self._memory.pop(session_id, None)

    async def list_keys(self, limit: int = 100) -> List[str]:
        await self.initialize()
        if self._redis:
            try:
                keys: List[str] = []
                async for key in self._redis.scan_iter(SESSION_PREFIX + "*", count=limit):
                    keys.append(key.replace(SESSION_PREFIX, ""))
                    if len(keys) >= limit:
                        break
                return keys
            except Exception as e:
                logger.warning("Redis list_keys failed", error=str(e))
        return list(self._memory.keys())[:limit]


_singleton: Optional[SessionStore] = None


def get_session_store() -> SessionStore:
    global _singleton
    if _singleton is None:
        _singleton = SessionStore()
    return _singleton
