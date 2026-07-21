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
    CaseWorkflowError,
    InvestigationCaseWorkflow,
    MemoryCaseRepository,
    canonical,
    sha256,
)


class FakeTemplates:
    def __init__(self):
        self.body = "Case {{case_id}} incident {{incident_id}} in {{jurisdiction}} on {{incident_date}}"
        self.bad_hash = False

    async def resolve(self, jurisdiction, incident_at):
        return {
            "authority": "Example State Security Authority",
            "source_uri": "https://authority.example/templates/security-incident-v3",
            "jurisdiction": jurisdiction,
            "version": "3.0",
            "effective_from": "2020-01-01T00:00:00+00:00",
            "effective_to": None,
            "content_hash": "bad" if self.bad_hash else sha256(self.body),
            "body": self.body,
        }


class FakeStorage:
    def __init__(self):
        self.objects = {}
        self.dispositions = []

    async def put(self, **value):
        reference = f"object:{value['content_hash']}"
        self.objects[reference] = value
        return {"provider": "test-storage", "reference": reference}

    async def dispose(self, **value):
        self.dispositions.append(value)
        return {"provider": "test-storage", "reference": f"disposition:{value['case_id']}"}


class FakeOCR:
    async def extract(self, **value):
        return {"provider": "test-ocr", "reference": f"ocr:{value['content_hash']}", "text": "verified extracted text"}


class FakeSignature:
    def __init__(self):
        self.fail = False
        self.calls = []

    async def request(self, **value):
        self.calls.append(value)
        if self.fail:
            error = RuntimeError("signer unavailable")
            error.code = "SIGNER_UNAVAILABLE"
            raise error
        return {"provider": "test-sign", "reference": f"envelope:{value['idempotency_key']}"}


class FakeFiling:
    async def submit(self, **value):
        return {"provider": "test-filing", "reference": f"filing:{value['idempotency_key']}"}


class InvestigationCaseWorkflowTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.repository = MemoryCaseRepository()
        self.templates = FakeTemplates()
        self.storage = FakeStorage()
        self.signature = FakeSignature()
        providers = SimpleNamespace(
            templates=self.templates,
            storage=self.storage,
            ocr=FakeOCR(),
            signature=self.signature,
            filing=FakeFiling(),
        )
        self.workflow = InvestigationCaseWorkflow(self.repository, providers, retention_days=0)
        self.tenant = str(uuid.uuid4())
        self.owner = Actor(self.tenant, str(uuid.uuid4()), "analyst")
        self.counsel = Actor(self.tenant, str(uuid.uuid4()), "counsel")
        self.viewer = Actor(self.tenant, str(uuid.uuid4()), "auditor")
        self.incident_id = str(uuid.uuid4())
        self.incident_at = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()

    async def create_case(self):
        return await self.workflow.create_case(
            self.owner,
            self.incident_id,
            "NY-US",
            self.incident_at,
            "Credential exfiltration investigation",
        )

    async def add_evidence(self, actor=None, case_id=None, document_id=None, privileged=False, content=b"evidence-v1"):
        actor = actor or self.owner
        case_id = case_id or next(iter(self.repository.states))
        return await self.workflow.add_evidence(
            actor,
            case_id,
            "forensic-image.txt",
            "FORENSIC_EVIDENCE",
            base64.b64encode(content).decode(),
            "sensor:edr:event-42",
            privileged=privileged,
            document_id=document_id,
        )

    async def approved_case(self):
        case = await self.create_case()
        case = await self.add_evidence(case_id=case["id"])
        case = await self.workflow.submit_review(self.owner, case["id"])
        await self.workflow.grant_access(self.owner, case["id"], self.counsel.user_id, "LEGAL_REVIEWER")
        case = await self.workflow.review(
            self.counsel,
            case["id"],
            "APPROVE",
            "Evidence and controlling form reviewed",
            True,
            True,
        )
        return case

    async def test_rejects_untrusted_authoritative_template(self):
        self.templates.bad_hash = True
        with self.assertRaisesRegex(CaseWorkflowError, "digest") as error:
            await self.create_case()
        self.assertEqual(error.exception.code, "TEMPLATE_HASH_MISMATCH")

    async def test_case_scoped_access_revocation_and_tenant_isolation(self):
        case = await self.create_case()
        await self.workflow.grant_access(self.owner, case["id"], self.viewer.user_id, "VIEWER")
        self.assertEqual((await self.workflow.view(self.viewer, case["id"]))["id"], case["id"])
        await self.workflow.revoke_access(self.owner, case["id"], self.viewer.user_id, "Engagement ended")
        with self.assertRaises(CaseWorkflowError) as revoked:
            await self.workflow.view(self.viewer, case["id"])
        self.assertEqual(revoked.exception.code, "FORBIDDEN")
        outsider = Actor(str(uuid.uuid4()), self.owner.user_id, "analyst")
        with self.assertRaises(CaseWorkflowError) as hidden:
            await self.workflow.view(outsider, case["id"])
        self.assertEqual(hidden.exception.code, "CASE_NOT_FOUND")

    async def test_document_provenance_versions_and_conflict_invalidate_review(self):
        case = await self.approved_case()
        document_id = next(iter(case["documents"]))
        changed = await self.add_evidence(case_id=case["id"], document_id=document_id, content=b"conflicting-v2")
        self.assertEqual(changed["status"], "REVIEW_REQUIRED")
        self.assertEqual(len(changed["documents"][document_id]["versions"]), 2)
        self.assertEqual(changed["reviews"], [])
        self.assertEqual(changed["documents"][document_id]["versions"][1]["source_reference"], "sensor:edr:event-42")

    async def test_human_review_must_be_independent_and_validate_jurisdiction(self):
        case = await self.create_case()
        await self.add_evidence(case_id=case["id"])
        await self.workflow.submit_review(self.owner, case["id"])
        await self.workflow.grant_access(self.owner, case["id"], self.counsel.user_id, "LEGAL_REVIEWER")
        await self.workflow.grant_access(self.owner, case["id"], self.owner.user_id, "LEGAL_REVIEWER")
        self_owner_as_counsel = Actor(self.tenant, self.owner.user_id, "counsel")
        with self.assertRaises(CaseWorkflowError) as not_independent:
            await self.workflow.review(self_owner_as_counsel, case["id"], "APPROVE", "self review", True, True)
        self.assertEqual(not_independent.exception.code, "INDEPENDENCE_REQUIRED")
        with self.assertRaises(CaseWorkflowError) as unchecked:
            await self.workflow.review(self.counsel, case["id"], "APPROVE", "review", False, True)
        self.assertEqual(unchecked.exception.code, "VALIDATION_REQUIRED")

    async def test_signer_failure_retry_idempotency_reconciliation_and_filing(self):
        case = await self.approved_case()
        self.signature.fail = True
        failed = await self.workflow.request_signature(self.owner, case["id"], "signer@example.com", "sign-1")
        self.assertEqual(failed["status"], "SIGNER_FAILED")
        self.assertEqual(failed["signatures"][-1]["failure_code"], "SIGNER_UNAVAILABLE")
        same = await self.workflow.request_signature(self.owner, case["id"], "signer@example.com", "sign-1")
        self.assertEqual(len(same["signatures"]), 1)
        self.signature.fail = False
        pending = await self.workflow.request_signature(self.owner, case["id"], "signer@example.com", "sign-2")
        reference = pending["signatures"][-1]["reference"]
        signed = await self.workflow.reconcile_signature(self.owner, case["id"], reference, datetime.now(timezone.utc).isoformat())
        self.assertEqual(signed["status"], "SIGNED")
        filed = await self.workflow.file_case(self.owner, case["id"], "file-1")
        self.assertEqual(filed["status"], "FILED")
        self.assertEqual(filed["filing"]["provider"], "test-filing")

    async def test_privileged_export_is_redacted_for_viewer(self):
        case = await self.create_case()
        await self.workflow.grant_access(self.owner, case["id"], self.counsel.user_id, "EDITOR")
        privileged = await self.add_evidence(self.counsel, case["id"], privileged=True, content=b"counsel notes")
        await self.workflow.submit_review(self.owner, case["id"])
        await self.workflow.grant_access(self.owner, case["id"], self.counsel.user_id, "LEGAL_REVIEWER")
        await self.workflow.review(
            self.counsel,
            case["id"],
            "APPROVE",
            "Privileged counsel analysis must not be disclosed",
            True,
            True,
        )
        await self.workflow.grant_access(self.owner, case["id"], self.viewer.user_id, "VIEWER")
        viewed = await self.workflow.view(self.viewer, case["id"])
        self.assertNotIn("Privileged counsel analysis", canonical(viewed))
        exported = await self.workflow.export_case(self.viewer, case["id"], False, "export-redacted")
        exported_object = self.storage.objects[exported["exports"][-1]["reference"]]
        package = base64.b64decode(exported_object["content_base64"]).decode()
        self.assertNotIn(next(iter(privileged["documents"])), package)
        self.assertNotIn("Privileged counsel analysis", package)
        with self.assertRaises(CaseWorkflowError) as forbidden:
            await self.workflow.export_case(self.viewer, case["id"], True, "export-privileged")
        self.assertEqual(forbidden.exception.code, "PRIVILEGED_EXPORT_FORBIDDEN")

    async def test_legal_hold_blocks_retention_then_release_allows_disposition(self):
        case = await self.approved_case()
        pending = await self.workflow.request_signature(self.owner, case["id"], "signer@example.com", "sign-retention")
        signed = await self.workflow.reconcile_signature(self.owner, case["id"], pending["signatures"][-1]["reference"], datetime.now(timezone.utc).isoformat())
        case = await self.workflow.file_case(self.owner, signed["id"], "file-retention")
        held = await self.workflow.set_legal_hold(self.counsel, case["id"], True, "Regulatory inquiry")
        with self.assertRaises(CaseWorkflowError) as blocked:
            await self.workflow.enforce_retention(self.counsel, case["id"], datetime.now(timezone.utc).isoformat(), "Policy expiry")
        self.assertEqual(blocked.exception.code, "LEGAL_HOLD_ACTIVE")
        await self.workflow.set_legal_hold(self.counsel, held["id"], False, "Inquiry closed")
        with self.assertRaises(CaseWorkflowError) as future:
            await self.workflow.enforce_retention(
                self.counsel,
                held["id"],
                (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
                "Future-dated disposition",
            )
        self.assertEqual(future.exception.code, "INVALID_AS_OF")
        disposed = await self.workflow.enforce_retention(self.counsel, held["id"], datetime.now(timezone.utc).isoformat(), "Policy expiry")
        self.assertEqual(disposed["status"], "CLOSED")
        self.assertEqual(len(self.storage.dispositions), 1)

    async def test_audit_chain_is_complete_and_tamper_evident(self):
        case = await self.create_case()
        await self.add_evidence(case_id=case["id"])
        events = await self.repository.audit_events(self.tenant, case["id"])
        self.assertEqual([event["sequence"] for event in events], [1, 2])
        self.assertEqual(events[1]["previous_hash"], events[0]["event_hash"])
        for event in events:
            body = {key: event[key] for key in ("case_id", "sequence", "actor_id", "action", "payload", "previous_hash")}
            self.assertEqual(event["event_hash"], sha256(canonical(body)))

    async def test_optimistic_version_conflict_rejects_stale_writer(self):
        case = await self.create_case()
        stale = await self.repository.load(self.tenant, case["id"])
        await self.workflow.grant_access(self.owner, case["id"], self.viewer.user_id, "VIEWER")
        with self.assertRaises(CaseWorkflowError) as conflict:
            await self.repository.mutate(self.tenant, case["id"], stale["version"], stale, self.owner, "STALE_WRITE", {})
        self.assertEqual(conflict.exception.code, "VERSION_CONFLICT")


if __name__ == "__main__":
    unittest.main()
