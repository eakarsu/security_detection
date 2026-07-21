"""PostgreSQL integration coverage for governed investigation cases.

Set TEST_DATABASE_URL to an isolated database after applying init.sql and the
investigation-case migration. The suite skips cleanly when no test database is
explicitly supplied.
"""

import base64
import os
import sys
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

PYTHON_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PYTHON_ROOT not in sys.path:
    sys.path.insert(0, PYTHON_ROOT)

from api.services.investigation_case_workflow import (  # noqa: E402
    Actor,
    InvestigationCaseWorkflow,
    canonical,
    sha256,
)
from tests.test_investigation_case_workflow import (  # noqa: E402
    FakeFiling,
    FakeOCR,
    FakeSignature,
    FakeStorage,
    FakeTemplates,
)


class PostgresInvestigationCaseTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        database_url = os.getenv("TEST_DATABASE_URL")
        if not database_url:
            self.skipTest("TEST_DATABASE_URL is not configured")

        os.environ["DATABASE_URL"] = database_url
        os.environ.setdefault("POSTGRES_PASSWORD", "isolated-test-only")
        os.environ.setdefault("OPENROUTER_API_KEY", "not-used-by-case-tests")
        os.environ.setdefault("JWT_SECRET", "integration-test-jwt-secret-32-characters")  # gitleaks:allow
        os.environ.setdefault("ENCRYPTION_KEY", "integration-test-encryption-key")

        from api.services.database import get_database_service
        from api.services.investigation_case_repository import PostgresCaseRepository

        self.get_database_service = get_database_service
        self.repository = PostgresCaseRepository()
        self.storage = FakeStorage()
        providers = SimpleNamespace(
            templates=FakeTemplates(),
            storage=self.storage,
            ocr=FakeOCR(),
            signature=FakeSignature(),
            filing=FakeFiling(),
        )
        self.workflow = InvestigationCaseWorkflow(self.repository, providers)
        self.tenant_id = str(uuid.uuid4())
        self.owner = Actor(self.tenant_id, str(uuid.uuid4()), "analyst")
        self.counsel = Actor(self.tenant_id, str(uuid.uuid4()), "counsel")
        self.incident_id = str(uuid.uuid4())

        database = await self.get_database_service()
        connection_context = await database.get_connection_context()
        async with connection_context as connection:
            await connection.execute(
                """
                INSERT INTO security.events(id, event_type, description, severity, status)
                VALUES ($1::uuid, 'integration_case', 'isolated test incident', 'high', 'open')
                """,
                self.incident_id,
            )

    async def asyncTearDown(self):
        if not hasattr(self, "get_database_service"):
            return
        database = await self.get_database_service()
        await database.close()

    async def test_persistence_provenance_review_and_immutable_audit(self):
        incident_at = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        case = await self.workflow.create_case(
            self.owner,
            self.incident_id,
            "NY-US",
            incident_at,
            "Database-backed investigation",
        )
        case = await self.workflow.add_evidence(
            self.owner,
            case["id"],
            "edr-evidence.txt",
            "FORENSIC_EVIDENCE",
            base64.b64encode(b"immutable integration evidence").decode(),
            "edr:event:integration-1",
        )
        case = await self.workflow.submit_review(self.owner, case["id"])
        case = await self.workflow.grant_access(
            self.owner,
            case["id"],
            self.counsel.user_id,
            "LEGAL_REVIEWER",
        )
        case = await self.workflow.review(
            self.counsel,
            case["id"],
            "APPROVE",
            "Jurisdiction, effective date, and evidence provenance verified",
            True,
            True,
        )

        reloaded = await self.repository.load(self.tenant_id, case["id"])
        self.assertEqual(reloaded["status"], "APPROVED")
        self.assertEqual(reloaded["version"], 5)

        events = await self.repository.audit_events(self.tenant_id, case["id"])
        self.assertEqual(len(events), 5)
        for position, event in enumerate(events):
            self.assertEqual(event["sequence"], position + 1)
            expected_previous = "GENESIS" if position == 0 else events[position - 1]["event_hash"]
            self.assertEqual(event["previous_hash"], expected_previous)
            body = {
                key: event[key]
                for key in ("case_id", "sequence", "actor_id", "action", "payload", "previous_hash")
            }
            self.assertEqual(event["event_hash"], sha256(canonical(body)))

        database = await self.get_database_service()
        connection_context = await database.get_connection_context()
        async with connection_context as connection:
            document_count = await connection.fetchval(
                "SELECT COUNT(*) FROM security.investigation_document_versions WHERE case_id=$1::uuid",
                case["id"],
            )
            self.assertEqual(document_count, 1)
            with self.assertRaises(Exception) as immutable:
                await connection.execute(
                    "UPDATE security.investigation_audit_events SET action='TAMPERED' WHERE case_id=$1::uuid",
                    case["id"],
                )
            self.assertIn("append-only", str(immutable.exception))


if __name__ == "__main__":
    unittest.main()
