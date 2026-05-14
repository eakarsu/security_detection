"""Tests for the AI rate limiter dependency."""

import os
import sys

import pytest
from fastapi import FastAPI, Depends, Request
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from api.middleware.ai_rate_limit import ai_rate_limiter, _reset_state  # noqa: E402


def make_app(limit: int = 3) -> FastAPI:
    app = FastAPI()

    @app.post("/ai/test", dependencies=[Depends(ai_rate_limiter(limit=limit))])
    async def hit():
        return {"ok": True}

    return app


@pytest.fixture(autouse=True)
def reset_buckets():
    _reset_state()


def test_allows_under_limit():
    app = make_app(limit=3)
    client = TestClient(app)
    for _ in range(3):
        r = client.post("/ai/test")
        assert r.status_code == 200


def test_blocks_over_limit():
    app = make_app(limit=2)
    client = TestClient(app)
    client.post("/ai/test")
    client.post("/ai/test")
    r = client.post("/ai/test")
    assert r.status_code == 429
    assert "rate limit" in r.json()["detail"].lower()
    assert int(r.headers.get("Retry-After", "0")) >= 0
