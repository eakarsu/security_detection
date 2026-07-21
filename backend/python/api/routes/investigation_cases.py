"""Authenticated, tenant-scoped incident-investigation case API."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..services.investigation_case_auth import current_actor
from ..services.investigation_case_providers import ProviderBundle, ProviderConfigurationError
from ..services.investigation_case_repository import PostgresCaseRepository
from ..services.investigation_case_workflow import Actor, CaseWorkflowError, InvestigationCaseWorkflow

router = APIRouter()
repository = PostgresCaseRepository()


def workflow() -> InvestigationCaseWorkflow:
    try:
        providers = ProviderBundle.from_environment()
    except ProviderConfigurationError as exc:
        raise HTTPException(503, str(exc)) from exc
    return InvestigationCaseWorkflow(repository, providers)


def translate(exc: Exception):
    if isinstance(exc, CaseWorkflowError):
        raise HTTPException(exc.status, {"code": exc.code, "message": str(exc)}) from exc
    raise exc


class CreateCase(BaseModel):
    incident_id: str
    jurisdiction: str = Field(min_length=2, max_length=32)
    incident_at: str
    title: str = Field(min_length=1, max_length=180)


class AccessGrant(BaseModel):
    user_id: str
    permission: str


class AccessRevoke(BaseModel):
    user_id: str
    reason: str


class EvidenceInput(BaseModel):
    name: str
    kind: str
    content_base64: str
    source_reference: str
    privileged: bool = False
    document_id: Optional[str] = None


class ReviewInput(BaseModel):
    decision: str
    notes: str
    jurisdiction_checked: bool
    effective_date_checked: bool


class SignatureInput(BaseModel):
    signer_email: str
    idempotency_key: str


class ReconcileInput(BaseModel):
    provider_reference: str
    signed_at: str


class IdempotentInput(BaseModel):
    idempotency_key: str


class HoldInput(BaseModel):
    active: bool
    reason: str


class ExportInput(BaseModel):
    include_privileged: bool = False
    idempotency_key: str


class RetentionInput(BaseModel):
    as_of: str
    reason: str


@router.post("")
async def create_case(body: CreateCase, actor: Actor = Depends(current_actor)):
    try:
        return await workflow().create_case(actor, **body.model_dump())
    except Exception as exc:
        translate(exc)


@router.get("/{case_id}")
async def view_case(case_id: str, actor: Actor = Depends(current_actor)):
    try:
        return await workflow().view(actor, case_id)
    except Exception as exc:
        translate(exc)


@router.post("/{case_id}/access")
async def grant_access(case_id: str, body: AccessGrant, actor: Actor = Depends(current_actor)):
    try:
        return await workflow().grant_access(actor, case_id, body.user_id, body.permission)
    except Exception as exc:
        translate(exc)


@router.post("/{case_id}/access/revoke")
async def revoke_access(case_id: str, body: AccessRevoke, actor: Actor = Depends(current_actor)):
    try:
        return await workflow().revoke_access(actor, case_id, body.user_id, body.reason)
    except Exception as exc:
        translate(exc)


@router.post("/{case_id}/evidence")
async def add_evidence(case_id: str, body: EvidenceInput, actor: Actor = Depends(current_actor)):
    try:
        return await workflow().add_evidence(actor, case_id, **body.model_dump())
    except Exception as exc:
        translate(exc)


@router.post("/{case_id}/authoritative-form")
async def authoritative_form(case_id: str, actor: Actor = Depends(current_actor)):
    try:
        return await workflow().create_authoritative_form(actor, case_id)
    except Exception as exc:
        translate(exc)


@router.post("/{case_id}/submit-review")
async def submit_review(case_id: str, actor: Actor = Depends(current_actor)):
    try:
        return await workflow().submit_review(actor, case_id)
    except Exception as exc:
        translate(exc)


@router.post("/{case_id}/reviews")
async def review(case_id: str, body: ReviewInput, actor: Actor = Depends(current_actor)):
    try:
        return await workflow().review(actor, case_id, **body.model_dump())
    except Exception as exc:
        translate(exc)


@router.post("/{case_id}/signatures")
async def request_signature(case_id: str, body: SignatureInput, actor: Actor = Depends(current_actor)):
    try:
        return await workflow().request_signature(actor, case_id, **body.model_dump())
    except Exception as exc:
        translate(exc)


@router.post("/{case_id}/signatures/reconcile")
async def reconcile_signature(case_id: str, body: ReconcileInput, actor: Actor = Depends(current_actor)):
    try:
        return await workflow().reconcile_signature(actor, case_id, **body.model_dump())
    except Exception as exc:
        translate(exc)


@router.post("/{case_id}/file")
async def file_case(case_id: str, body: IdempotentInput, actor: Actor = Depends(current_actor)):
    try:
        return await workflow().file_case(actor, case_id, body.idempotency_key)
    except Exception as exc:
        translate(exc)


@router.post("/{case_id}/legal-hold")
async def legal_hold(case_id: str, body: HoldInput, actor: Actor = Depends(current_actor)):
    try:
        return await workflow().set_legal_hold(actor, case_id, body.active, body.reason)
    except Exception as exc:
        translate(exc)


@router.post("/{case_id}/exports")
async def export_case(case_id: str, body: ExportInput, actor: Actor = Depends(current_actor)):
    try:
        return await workflow().export_case(actor, case_id, **body.model_dump())
    except Exception as exc:
        translate(exc)


@router.post("/{case_id}/retention/dispose")
async def retention(case_id: str, body: RetentionInput, actor: Actor = Depends(current_actor)):
    try:
        return await workflow().enforce_retention(actor, case_id, **body.model_dump())
    except Exception as exc:
        translate(exc)
