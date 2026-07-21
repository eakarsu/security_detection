"""JWT verification for governed investigation cases."""

import os
from typing import Optional

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError

from .investigation_case_workflow import Actor

bearer = HTTPBearer(auto_error=False)


def current_actor(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> Actor:
    secret = os.getenv("JWT_SECRET")
    if not secret or len(secret) < 32:
        raise HTTPException(503, "JWT verification is not configured")
    if not credentials:
        raise HTTPException(401, "Bearer token required")
    try:
        payload = jwt.decode(
            credentials.credentials,
            secret,
            algorithms=["HS256"],
            audience=os.getenv("JWT_AUDIENCE", "nodeguard-api"),
            issuer=os.getenv("JWT_ISSUER", "nodeguard-auth"),
        )
        roles = {
            "viewer": "auditor",
            "tenant_admin": "admin",
            "super_admin": "admin",
        }
        return Actor(payload["tenant_id"], payload["sub"], roles.get(payload["role"], payload["role"]))
    except (InvalidTokenError, KeyError, TypeError) as exc:
        raise HTTPException(403, "Invalid or expired bearer token") from exc
