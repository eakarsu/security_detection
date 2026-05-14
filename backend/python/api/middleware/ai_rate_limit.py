"""
AI-specific rate limiter dependency for FastAPI routes.

Defaults to 20 requests / hour per user. Slides over a 1-hour window.
For multi-instance deployments, swap the in-memory dict for Redis.

Usage:
    from api.middleware.ai_rate_limit import ai_rate_limiter

    @router.post("/analyze", dependencies=[Depends(ai_rate_limiter())])
    async def analyze(...): ...
"""

from __future__ import annotations

import os
import time
from collections import deque
from typing import Callable, Deque, Dict, Optional

from fastapi import HTTPException, Request, status

WINDOW_SECONDS = 60 * 60
DEFAULT_LIMIT = int(os.getenv("AI_RATE_LIMIT_PER_HOUR", "20"))

_buckets: Dict[str, Deque[float]] = {}


def _key_from_request(request: Request) -> str:
    user = getattr(request.state, "user", None) if hasattr(request, "state") else None
    if user and getattr(user, "id", None):
        return f"user:{user.id}"
    # Fallback to client IP
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return f"ip:{forwarded.split(',')[0].strip()}"
    if request.client and request.client.host:
        return f"ip:{request.client.host}"
    return "ip:unknown"


def ai_rate_limiter(limit: int = DEFAULT_LIMIT, key_fn: Optional[Callable[[Request], str]] = None):
    """Returns a FastAPI dependency that enforces N requests / hour."""

    def _dep(request: Request) -> None:
        key = (key_fn or _key_from_request)(request)
        now = time.time()
        bucket = _buckets.get(key)
        if bucket is None:
            bucket = deque()
            _buckets[key] = bucket

        # Drop entries older than the window
        while bucket and now - bucket[0] > WINDOW_SECONDS:
            bucket.popleft()

        if len(bucket) >= limit:
            retry_after = int(WINDOW_SECONDS - (now - bucket[0]))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"AI rate limit exceeded: {limit}/hour. Retry in {retry_after}s.",
                headers={
                    "Retry-After": str(max(1, retry_after)),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                },
            )

        bucket.append(now)
        # No way to set response headers from a Depends-only fn cleanly;
        # the route handler can read len(bucket) if needed.

    return _dep


def _reset_state() -> None:
    """Test-only: clear all buckets."""
    _buckets.clear()
