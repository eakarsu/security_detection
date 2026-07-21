"""Governed incident-investigation evidence workflow.

The workflow is intentionally provider- and repository-driven: no OCR, filing,
signature, storage, or template response is fabricated when an integration is
unavailable.  All mutations use optimistic versions and append a chained audit
event through the repository boundary.
"""

from __future__ import annotations

import base64
import copy
import hashlib
import json
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Protocol


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256(value: bytes | str) -> str:
    if isinstance(value, str):
        value = value.encode("utf-8")
    return hashlib.sha256(value).hexdigest()


class CaseWorkflowError(Exception):
    def __init__(self, code: str, message: str, status: int = 400):
        super().__init__(message)
        self.code = code
        self.status = status


@dataclass(frozen=True)
class Actor:
    tenant_id: str
    user_id: str
    role: str


class CaseRepository(Protocol):
    async def create(self, state: Dict[str, Any], actor: Actor, action: str, payload: Dict[str, Any]) -> Dict[str, Any]: ...
    async def load(self, tenant_id: str, case_id: str) -> Optional[Dict[str, Any]]: ...
    async def mutate(
        self,
        tenant_id: str,
        case_id: str,
        expected_version: int,
        state: Dict[str, Any],
        actor: Actor,
        action: str,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]: ...
    async def audit_events(self, tenant_id: str, case_id: str) -> List[Dict[str, Any]]: ...


class MemoryCaseRepository:
    """Deterministic repository used by unit tests; mirrors database CAS/audit rules."""

    def __init__(self):
        self.states: Dict[str, Dict[str, Any]] = {}
        self.events: Dict[str, List[Dict[str, Any]]] = {}

    async def create(self, state, actor, action, payload):
        if state["id"] in self.states:
            raise CaseWorkflowError("DUPLICATE_CASE", "Case already exists", 409)
        self.states[state["id"]] = copy.deepcopy(state)
        self.events[state["id"]] = []
        self._append(state["id"], actor, action, payload)
        return copy.deepcopy(state)

    async def load(self, tenant_id, case_id):
        state = self.states.get(case_id)
        if not state or state["tenant_id"] != tenant_id:
            return None
        return copy.deepcopy(state)

    async def mutate(self, tenant_id, case_id, expected_version, state, actor, action, payload):
        current = self.states.get(case_id)
        if not current or current["tenant_id"] != tenant_id:
            raise CaseWorkflowError("CASE_NOT_FOUND", "Investigation case not found", 404)
        if current["version"] != expected_version:
            raise CaseWorkflowError("VERSION_CONFLICT", "Case changed; reload before retrying", 409)
        state = copy.deepcopy(state)
        state["version"] = expected_version + 1
        state["updated_at"] = utc_now().isoformat()
        self.states[case_id] = state
        self._append(case_id, actor, action, payload)
        return copy.deepcopy(state)

    async def audit_events(self, tenant_id, case_id):
        if not await self.load(tenant_id, case_id):
            return []
        return copy.deepcopy(self.events.get(case_id, []))

    def _append(self, case_id, actor, action, payload):
        events = self.events[case_id]
        sequence = len(events) + 1
        previous_hash = events[-1]["event_hash"] if events else "GENESIS"
        body = {
            "case_id": case_id,
            "sequence": sequence,
            "actor_id": actor.user_id,
            "action": action,
            "payload": payload,
            "previous_hash": previous_hash,
        }
        events.append({**body, "event_hash": sha256(canonical(body)), "created_at": utc_now().isoformat()})


class InvestigationCaseWorkflow:
    PERMISSIONS = {"OWNER", "EDITOR", "LEGAL_REVIEWER", "VIEWER"}

    def __init__(self, repository: CaseRepository, providers: Any, retention_days: int = 2555):
        self.repository = repository
        self.providers = providers
        self.retention_days = retention_days

    async def create_case(self, actor: Actor, incident_id: str, jurisdiction: str, incident_at: str, title: str):
        self._actor(actor)
        incident_id = self._uuid("incident_id", incident_id)
        jurisdiction = self._text("jurisdiction", jurisdiction, 32).upper()
        title = self._text("title", title, 180)
        at = self._date("incident_at", incident_at)
        if at > utc_now():
            raise CaseWorkflowError("FUTURE_INCIDENT", "Incident date cannot be in the future")
        template = await self.providers.templates.resolve(jurisdiction, at.isoformat())
        self._validate_template(template, jurisdiction, at)
        case_id = str(uuid.uuid4())
        retention_until = datetime.fromtimestamp(at.timestamp() + self.retention_days * 86400, timezone.utc)
        state = {
            "id": case_id,
            "tenant_id": actor.tenant_id,
            "incident_id": incident_id,
            "title": title,
            "jurisdiction": jurisdiction,
            "incident_at": at.isoformat(),
            "status": "EVIDENCE_PENDING",
            "created_by": actor.user_id,
            "version": 1,
            "members": {actor.user_id: {"permission": "OWNER", "revoked_at": None}},
            "template": template,
            "documents": {},
            "reviews": [],
            "signatures": [],
            "filing": None,
            "exports": [],
            "legal_hold": None,
            "retention_until": retention_until.isoformat(),
            "disposed_at": None,
            "created_at": utc_now().isoformat(),
            "updated_at": utc_now().isoformat(),
        }
        return await self.repository.create(
            state,
            actor,
            "CASE_CREATED",
            {"incident_id": incident_id, "jurisdiction": jurisdiction, "template_hash": template["content_hash"]},
        )

    async def grant_access(self, actor: Actor, case_id: str, user_id: str, permission: str):
        state = await self._authorized(actor, case_id, {"OWNER"})
        if permission not in self.PERMISSIONS - {"OWNER"}:
            raise CaseWorkflowError("INVALID_PERMISSION", "Permission is invalid")
        user_id = self._uuid("user_id", user_id)
        state["members"][user_id] = {"permission": permission, "revoked_at": None}
        return await self._save(state, actor, "ACCESS_GRANTED", {"user_id": user_id, "permission": permission})

    async def revoke_access(self, actor: Actor, case_id: str, user_id: str, reason: str):
        state = await self._authorized(actor, case_id, {"OWNER"})
        if user_id == actor.user_id:
            raise CaseWorkflowError("SELF_REVOCATION", "The acting owner cannot revoke their own access", 409)
        member = state["members"].get(user_id)
        if not member or member["revoked_at"]:
            raise CaseWorkflowError("ACCESS_NOT_FOUND", "Active access was not found", 404)
        member["revoked_at"] = utc_now().isoformat()
        member["reason"] = self._text("reason", reason, 500)
        return await self._save(state, actor, "ACCESS_REVOKED", {"user_id": user_id, "reason": reason})

    async def add_evidence(
        self,
        actor: Actor,
        case_id: str,
        name: str,
        kind: str,
        content_base64: str,
        source_reference: str,
        privileged: bool = False,
        document_id: Optional[str] = None,
    ):
        state = await self._authorized(actor, case_id, {"OWNER", "EDITOR"})
        if privileged and actor.role not in {"counsel", "admin"}:
            raise CaseWorkflowError("PRIVILEGED_RESTRICTED", "Counsel or admin role is required", 403)
        try:
            content = base64.b64decode(content_base64, validate=True)
        except Exception as exc:
            raise CaseWorkflowError("INVALID_CONTENT", "Evidence must be valid base64") from exc
        if not content or len(content) > 5 * 1024 * 1024:
            raise CaseWorkflowError("INVALID_CONTENT", "Evidence must be between 1 byte and 5 MB")
        digest = sha256(content)
        name = self._text("name", name, 180)
        kind = self._text("kind", kind, 60).upper()
        source_reference = self._text("source_reference", source_reference, 500)
        stored = await self.providers.storage.put(
            case_id=case_id,
            name=name,
            content_base64=content_base64,
            content_hash=digest,
            idempotency_key=f"evidence:{case_id}:{digest}",
        )
        ocr = await self.providers.ocr.extract(
            storage_reference=stored.get("reference"),
            content_hash=digest,
            idempotency_key=f"ocr:{digest}",
        )
        self._provider_evidence("storage", stored)
        self._provider_evidence("ocr", ocr, require_text=True)
        if document_id:
            document = state["documents"].get(document_id)
            if not document:
                raise CaseWorkflowError("DOCUMENT_NOT_FOUND", "Document not found", 404)
        else:
            document_id = str(uuid.uuid4())
            document = {
                "id": document_id,
                "name": name,
                "kind": kind,
                "privileged": bool(privileged),
                "created_by": actor.user_id,
                "versions": [],
            }
            state["documents"][document_id] = document
        if any(version["content_hash"] == digest for version in document["versions"]):
            raise CaseWorkflowError("DUPLICATE_VERSION", "This document content already exists", 409)
        version = {
            "number": len(document["versions"]) + 1,
            "content_hash": digest,
            "storage_provider": stored["provider"],
            "storage_reference": stored["reference"],
            "source_reference": source_reference,
            "ocr_provider": ocr["provider"],
            "ocr_reference": ocr["reference"],
            "extracted_text": ocr["text"][:200_000],
            "created_by": actor.user_id,
            "created_at": utc_now().isoformat(),
        }
        document["versions"].append(version)
        if state["status"] not in {"EVIDENCE_PENDING", "REVIEW_REQUIRED"}:
            state["status"] = "REVIEW_REQUIRED"
            state["reviews"] = []
        return await self._save(
            state,
            actor,
            "DOCUMENT_VERSION_ADDED",
            {
                "document_id": document_id,
                "version": version["number"],
                "content_hash": digest,
                "privileged": document["privileged"],
                "storage_reference": stored["reference"],
                "source_reference": source_reference,
            },
        )

    async def create_authoritative_form(self, actor: Actor, case_id: str):
        state = await self._authorized(actor, case_id, {"OWNER", "EDITOR"})
        template = state["template"]
        body = (
            template["body"]
            .replace("{{case_id}}", state["id"])
            .replace("{{incident_id}}", state["incident_id"])
            .replace("{{jurisdiction}}", state["jurisdiction"])
            .replace("{{incident_date}}", state["incident_at"][:10])
        )
        return await self.add_evidence(
            actor,
            case_id,
            f"Authoritative form {template['version']}",
            "FORM_DRAFT",
            base64.b64encode(body.encode()).decode(),
            template["source_uri"],
            privileged=actor.role in {"counsel", "admin"},
        )

    async def submit_review(self, actor: Actor, case_id: str):
        state = await self._authorized(actor, case_id, {"OWNER", "EDITOR"})
        if not state["documents"]:
            raise CaseWorkflowError("EVIDENCE_REQUIRED", "At least one evidence document is required", 409)
        state["status"] = "REVIEW_REQUIRED"
        return await self._save(state, actor, "LEGAL_REVIEW_REQUESTED", {"manifest_hash": self._manifest(state)})

    async def review(
        self,
        actor: Actor,
        case_id: str,
        decision: str,
        notes: str,
        jurisdiction_checked: bool,
        effective_date_checked: bool,
    ):
        state = await self._authorized(actor, case_id, {"LEGAL_REVIEWER"})
        if actor.role not in {"counsel", "admin"}:
            raise CaseWorkflowError("COUNSEL_REQUIRED", "Legal review requires counsel or admin role", 403)
        if actor.user_id == state["created_by"]:
            raise CaseWorkflowError("INDEPENDENCE_REQUIRED", "The case creator cannot approve it", 409)
        if state["status"] != "REVIEW_REQUIRED":
            raise CaseWorkflowError("INVALID_STATE", "Case is not awaiting legal review", 409)
        if not jurisdiction_checked or not effective_date_checked:
            raise CaseWorkflowError("VALIDATION_REQUIRED", "Jurisdiction and effective-date checks are mandatory", 422)
        decision = decision.upper()
        if decision not in {"APPROVE", "REJECT"}:
            raise CaseWorkflowError("INVALID_DECISION", "Decision must be APPROVE or REJECT")
        self._validate_template(state["template"], state["jurisdiction"], self._date("incident_at", state["incident_at"]))
        review = {
            "id": str(uuid.uuid4()),
            "reviewer_id": actor.user_id,
            "decision": decision,
            "notes": self._text("notes", notes, 2_000),
            "jurisdiction_checked": True,
            "effective_date_checked": True,
            "manifest_hash": self._manifest(state),
            "created_at": utc_now().isoformat(),
        }
        state["reviews"].append(review)
        state["status"] = "APPROVED" if decision == "APPROVE" else "REJECTED"
        return await self._save(state, actor, "LEGAL_REVIEW_RECORDED", review)

    async def request_signature(self, actor: Actor, case_id: str, signer_email: str, idempotency_key: str):
        state = await self._authorized(actor, case_id, {"OWNER", "EDITOR"})
        idempotency_key = self._text("idempotency_key", idempotency_key, 120)
        signer_email = self._email(signer_email)
        for signature in state["signatures"]:
            if signature["idempotency_key"] == idempotency_key:
                return state
        if state["status"] not in {"APPROVED", "SIGNER_FAILED"}:
            raise CaseWorkflowError("APPROVAL_REQUIRED", "Independent legal approval is required", 409)
        try:
            result = await self.providers.signature.request(
                case_id=case_id,
                signer_email=signer_email,
                manifest_hash=self._manifest(state),
                idempotency_key=idempotency_key,
            )
            self._provider_evidence("signature", result)
            signature = {
                "id": str(uuid.uuid4()),
                "idempotency_key": idempotency_key,
                "provider": result["provider"],
                "reference": result["reference"],
                "status": "PENDING",
                "failure_code": None,
            }
            state["status"] = "SIGNATURE_PENDING"
            action = "SIGNATURE_REQUESTED"
        except Exception as exc:
            signature = {
                "id": str(uuid.uuid4()),
                "idempotency_key": idempotency_key,
                "provider": "unavailable",
                "reference": None,
                "status": "FAILED",
                "failure_code": getattr(exc, "code", "PROVIDER_FAILURE"),
            }
            state["status"] = "SIGNER_FAILED"
            action = "SIGNATURE_REQUEST_FAILED"
        state["signatures"].append(signature)
        return await self._save(state, actor, action, signature)

    async def reconcile_signature(self, actor: Actor, case_id: str, provider_reference: str, signed_at: str):
        state = await self._authorized(actor, case_id, {"OWNER", "EDITOR"})
        if actor.role not in {"analyst", "counsel", "admin"}:
            raise CaseWorkflowError("STAFF_REQUIRED", "Staff reconciliation is required", 403)
        match = next((item for item in state["signatures"] if item["reference"] == provider_reference and item["status"] == "PENDING"), None)
        if not match:
            raise CaseWorkflowError("SIGNATURE_NOT_FOUND", "Pending signature not found", 404)
        at = self._date("signed_at", signed_at)
        if at > utc_now():
            raise CaseWorkflowError("INVALID_SIGNED_AT", "signed_at cannot be in the future")
        match["status"] = "SIGNED"
        match["signed_at"] = at.isoformat()
        state["status"] = "SIGNED"
        return await self._save(state, actor, "SIGNATURE_RECONCILED", {"reference": provider_reference, "signed_at": at.isoformat()})

    async def file_case(self, actor: Actor, case_id: str, idempotency_key: str):
        state = await self._authorized(actor, case_id, {"OWNER", "EDITOR"})
        idempotency_key = self._text("idempotency_key", idempotency_key, 120)
        if state["filing"]:
            if state["filing"].get("idempotency_key") == idempotency_key:
                return state
            raise CaseWorkflowError("ALREADY_FILED", "Case was already filed", 409)
        if state["status"] != "SIGNED":
            raise CaseWorkflowError("SIGNATURE_REQUIRED", "Signed evidence is required before filing", 409)
        result = await self.providers.filing.submit(
            case_id=case_id,
            jurisdiction=state["jurisdiction"],
            manifest_hash=self._manifest(state),
            idempotency_key=idempotency_key,
        )
        self._provider_evidence("filing", result)
        state["filing"] = {
            "provider": result["provider"],
            "reference": result["reference"],
            "idempotency_key": idempotency_key,
            "filed_at": utc_now().isoformat(),
        }
        state["status"] = "FILED"
        return await self._save(state, actor, "CASE_FILED", state["filing"])

    async def set_legal_hold(self, actor: Actor, case_id: str, active: bool, reason: str):
        state = await self._authorized(actor, case_id, {"OWNER", "LEGAL_REVIEWER"})
        if actor.role not in {"counsel", "admin"}:
            raise CaseWorkflowError("COUNSEL_REQUIRED", "Counsel or admin must control legal hold", 403)
        state["legal_hold"] = {"active": bool(active), "reason": self._text("reason", reason, 500), "changed_by": actor.user_id, "changed_at": utc_now().isoformat()}
        return await self._save(state, actor, "LEGAL_HOLD_PLACED" if active else "LEGAL_HOLD_RELEASED", state["legal_hold"])

    async def export_case(self, actor: Actor, case_id: str, include_privileged: bool, idempotency_key: str):
        state = await self._authorized(actor, case_id, {"OWNER", "EDITOR", "LEGAL_REVIEWER", "VIEWER"})
        permission = state["members"][actor.user_id]["permission"]
        may_see_privileged = actor.role in {"counsel", "admin"} and permission in {"OWNER", "LEGAL_REVIEWER"}
        if include_privileged and not may_see_privileged:
            raise CaseWorkflowError("PRIVILEGED_EXPORT_FORBIDDEN", "Privileged export requires counsel owner/reviewer access", 403)
        documents = []
        for document in state["documents"].values():
            if document["privileged"] and not include_privileged:
                continue
            latest = document["versions"][-1]
            documents.append({
                "id": document["id"],
                "name": document["name"],
                "kind": document["kind"],
                "privileged": document["privileged"],
                "version": latest["number"],
                "content_hash": latest["content_hash"],
                "storage_reference": latest["storage_reference"],
            })
        reviews = state["reviews"] if include_privileged and may_see_privileged else [
            {key: review[key] for key in ("id", "decision", "jurisdiction_checked", "effective_date_checked", "manifest_hash", "created_at")}
            for review in state["reviews"]
        ]
        package = {
            "case": {key: state[key] for key in ("id", "incident_id", "title", "jurisdiction", "status", "version")},
            "documents": documents,
            "reviews": reviews,
            "filing": state["filing"],
        }
        body = canonical(package)
        digest = sha256(body)
        result = await self.providers.storage.put(
            case_id=case_id,
            name="case-export.json",
            content_base64=base64.b64encode(body.encode()).decode(),
            content_hash=digest,
            idempotency_key=self._text("idempotency_key", idempotency_key, 120),
        )
        self._provider_evidence("storage", result)
        export = {"id": str(uuid.uuid4()), "privileged": include_privileged, "manifest_hash": digest, "provider": result["provider"], "reference": result["reference"], "created_at": utc_now().isoformat()}
        state["exports"].append(export)
        return await self._save(state, actor, "CASE_EXPORTED", export)

    async def enforce_retention(self, actor: Actor, case_id: str, as_of: str, reason: str):
        state = await self._authorized(actor, case_id, {"OWNER", "LEGAL_REVIEWER"})
        if actor.role not in {"counsel", "admin"}:
            raise CaseWorkflowError("COUNSEL_REQUIRED", "Counsel or admin must execute retention", 403)
        at = self._date("as_of", as_of)
        if (state.get("legal_hold") or {}).get("active"):
            raise CaseWorkflowError("LEGAL_HOLD_ACTIVE", "Legal hold blocks retention", 409)
        if at > utc_now():
            raise CaseWorkflowError("INVALID_AS_OF", "Retention as_of cannot be in the future", 422)
        if at < self._date("retention_until", state["retention_until"]):
            raise CaseWorkflowError("RETENTION_NOT_DUE", "Retention period has not elapsed", 409)
        if state["status"] not in {"FILED", "REJECTED", "CLOSED"}:
            raise CaseWorkflowError("INVALID_STATE", "Only terminal cases may be disposed", 409)
        references = [version["storage_reference"] for document in state["documents"].values() for version in document["versions"]]
        result = await self.providers.storage.dispose(
            case_id=case_id,
            references=references,
            reason=self._text("reason", reason, 500),
            idempotency_key=f"retention:{case_id}:{state['version']}",
        )
        self._provider_evidence("disposition", result)
        state["disposed_at"] = at.isoformat()
        state["status"] = "CLOSED"
        state["disposition"] = {"provider": result["provider"], "reference": result["reference"], "object_count": len(references)}
        return await self._save(state, actor, "RETENTION_DISPOSITION_COMPLETED", state["disposition"])

    async def view(self, actor: Actor, case_id: str):
        state = await self._authorized(actor, case_id, {"OWNER", "EDITOR", "LEGAL_REVIEWER", "VIEWER"})
        permission = state["members"][actor.user_id]["permission"]
        may_see_privileged = actor.role in {"counsel", "admin"} and permission in {"OWNER", "LEGAL_REVIEWER"}
        if not may_see_privileged:
            state["documents"] = {key: value for key, value in state["documents"].items() if not value["privileged"]}
            state["reviews"] = [
                {key: review[key] for key in ("id", "decision", "jurisdiction_checked", "effective_date_checked", "manifest_hash", "created_at")}
                for review in state["reviews"]
            ]
        audit = await self.repository.audit_events(actor.tenant_id, case_id)
        if not may_see_privileged:
            for event in audit:
                if event["action"] in {"LEGAL_REVIEW_RECORDED", "LEGAL_HOLD_PLACED", "LEGAL_HOLD_RELEASED"}:
                    event["payload"] = {"redacted": True}
                    event["payload_redacted"] = True
        state["audit"] = audit
        return state

    async def _authorized(self, actor: Actor, case_id: str, permissions: set[str]):
        self._actor(actor)
        case_id = self._uuid("case_id", case_id)
        state = await self.repository.load(actor.tenant_id, case_id)
        if not state:
            raise CaseWorkflowError("CASE_NOT_FOUND", "Investigation case not found", 404)
        member = state["members"].get(actor.user_id)
        if not member or member["revoked_at"] or member["permission"] not in permissions:
            raise CaseWorkflowError("FORBIDDEN", "Active case-scoped permission is required", 403)
        return state

    async def _save(self, state, actor, action, payload):
        return await self.repository.mutate(actor.tenant_id, state["id"], state["version"], state, actor, action, payload)

    def _manifest(self, state):
        rows = []
        for document_id in sorted(state["documents"]):
            latest = state["documents"][document_id]["versions"][-1]
            rows.append({"document_id": document_id, "version": latest["number"], "content_hash": latest["content_hash"]})
        if not rows:
            raise CaseWorkflowError("EVIDENCE_REQUIRED", "At least one evidence document is required", 409)
        return sha256(canonical(rows))

    @staticmethod
    def _actor(actor):
        if not actor.tenant_id or not actor.user_id or actor.role not in {"analyst", "counsel", "admin", "auditor"}:
            raise CaseWorkflowError("INVALID_ACTOR", "A valid tenant identity is required", 401)
        InvestigationCaseWorkflow._uuid("tenant_id", actor.tenant_id)
        InvestigationCaseWorkflow._uuid("user_id", actor.user_id)

    @staticmethod
    def _uuid(name, value):
        try:
            return str(uuid.UUID(value))
        except (ValueError, TypeError, AttributeError) as exc:
            raise CaseWorkflowError("INVALID_INPUT", f"{name} must be a UUID") from exc

    @staticmethod
    def _email(value):
        value = InvestigationCaseWorkflow._text("signer_email", value, 254).lower()
        local, separator, domain = value.partition("@")
        if not separator or not local or "." not in domain or domain.startswith(".") or domain.endswith("."):
            raise CaseWorkflowError("INVALID_INPUT", "signer_email must be a valid email address")
        return value

    @staticmethod
    def _text(name, value, maximum):
        if not isinstance(value, str) or not value.strip() or len(value.strip()) > maximum:
            raise CaseWorkflowError("INVALID_INPUT", f"{name} is required and must be at most {maximum} characters")
        return value.strip()

    @staticmethod
    def _date(name, value):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except Exception as exc:
            raise CaseWorkflowError("INVALID_DATE", f"{name} is invalid") from exc

    @staticmethod
    def _provider_evidence(name, result, require_text=False):
        if not isinstance(result, dict) or not result.get("provider") or not result.get("reference"):
            raise CaseWorkflowError("PROVIDER_EVIDENCE_INVALID", f"{name} provider returned no provenance", 502)
        if require_text and not isinstance(result.get("text"), str):
            raise CaseWorkflowError("PROVIDER_EVIDENCE_INVALID", f"{name} provider returned no extracted text", 502)

    def _validate_template(self, template, jurisdiction, incident_at):
        required = {"authority", "source_uri", "jurisdiction", "version", "effective_from", "content_hash", "body"}
        if not isinstance(template, dict) or not required.issubset(template):
            raise CaseWorkflowError("TEMPLATE_INVALID", "Authoritative template response is incomplete", 502)
        if template["jurisdiction"].upper() != jurisdiction or not template["source_uri"].startswith("https://"):
            raise CaseWorkflowError("TEMPLATE_OUT_OF_SCOPE", "Template source or jurisdiction is invalid", 422)
        if sha256(template["body"]) != template["content_hash"]:
            raise CaseWorkflowError("TEMPLATE_HASH_MISMATCH", "Template digest does not match its body", 422)
        start = self._date("effective_from", template["effective_from"])
        end = self._date("effective_to", template["effective_to"]) if template.get("effective_to") else None
        if incident_at < start or (end and incident_at >= end):
            raise CaseWorkflowError("TEMPLATE_NOT_EFFECTIVE", "Template was not effective on the incident date", 422)
