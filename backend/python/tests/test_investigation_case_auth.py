import os
import sys
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import jwt
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

PYTHON_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PYTHON_ROOT not in sys.path:
    sys.path.insert(0, PYTHON_ROOT)

os.environ.setdefault("POSTGRES_PASSWORD", "isolated-auth-test")
os.environ.setdefault("JWT_SECRET", "route-test-jwt-secret-at-least-32-characters")  # gitleaks:allow
os.environ.setdefault("ENCRYPTION_KEY", "isolated-auth-encryption-key")

from api.services.investigation_case_auth import current_actor  # noqa: E402


class InvestigationCaseAuthenticationTests(unittest.TestCase):
    secret = "route-test-jwt-secret-at-least-32-characters"  # gitleaks:allow

    def credentials(self, **overrides):
        now = datetime.now(timezone.utc)
        payload = {
            "sub": str(uuid.uuid4()),
            "tenant_id": str(uuid.uuid4()),
            "role": "tenant_admin",
            "iss": "nodeguard-auth",
            "aud": "nodeguard-api",
            "iat": now,
            "exp": now + timedelta(minutes=5),
            **overrides,
        }
        token = jwt.encode(payload, self.secret, algorithm="HS256")
        return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token), payload

    def test_verified_token_maps_tenant_admin_to_case_admin(self):
        credentials, payload = self.credentials()
        with patch.dict(
            os.environ,
            {"JWT_SECRET": self.secret, "JWT_ISSUER": "nodeguard-auth", "JWT_AUDIENCE": "nodeguard-api"},
            clear=False,
        ):
            actor = current_actor(credentials)
        self.assertEqual(actor.tenant_id, payload["tenant_id"])
        self.assertEqual(actor.user_id, payload["sub"])
        self.assertEqual(actor.role, "admin")

    def test_wrong_issuer_and_expired_token_are_rejected(self):
        invalid_issuer, _ = self.credentials(iss="untrusted")
        expired, _ = self.credentials(exp=datetime.now(timezone.utc) - timedelta(seconds=1))
        with patch.dict(
            os.environ,
            {"JWT_SECRET": self.secret, "JWT_ISSUER": "nodeguard-auth", "JWT_AUDIENCE": "nodeguard-api"},
            clear=False,
        ):
            for credentials in (invalid_issuer, expired):
                with self.assertRaises(HTTPException) as rejected:
                    current_actor(credentials)
                self.assertEqual(rejected.exception.status_code, 403)

    def test_missing_or_weak_verification_secret_fails_closed(self):
        credentials, _ = self.credentials()
        with patch.dict(os.environ, {"JWT_SECRET": "short"}, clear=False):
            with self.assertRaises(HTTPException) as unavailable:
                current_actor(credentials)
        self.assertEqual(unavailable.exception.status_code, 503)


if __name__ == "__main__":
    unittest.main()
