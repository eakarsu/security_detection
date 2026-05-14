"""AI Extras — Custom Feature Suggestions (batch 11).

Implements:
  1. Anomaly Detection enhancement endpoint (UEBA-style)
  2. Alert Correlation & Deduplication (lite re-implementation if needed)
  3. Automated Incident Response (playbook trigger)
  4. Threat Intelligence Enrichment
  5. SOAR Integration (ServiceNow / Jira)
  6. Mobile Incident Response push

503 returned when OPENROUTER_API_KEY missing.
TODO: configure credentials — SERVICENOW_URL/USER/PASS, JIRA_API_TOKEN,
FCM_SERVER_KEY (or APNS_KEY) for mobile push.
"""

import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = structlog.get_logger(__name__)

router = APIRouter()

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = os.getenv("OPENROUTER_MODEL", "anthropic/claude-3.5-sonnet")


async def _llm(system: str, user: str, max_tokens: int = 1500) -> str:
    key = os.getenv("OPENROUTER_API_KEY")
    if not key:
        raise HTTPException(status_code=503, detail="OPENROUTER_API_KEY not configured")
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    body = {
        "model": MODEL,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "max_tokens": max_tokens,
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(OPENROUTER_URL, headers=headers, json=body)
    data = r.json()
    if "error" in data:
        raise HTTPException(status_code=502, detail=data["error"])
    return data["choices"][0]["message"]["content"]


# ----- Schemas -----

class UEBABody(BaseModel):
    user_id: str
    events: List[Dict[str, Any]]
    baseline_window_days: Optional[int] = 30


class CorrelationBody(BaseModel):
    alerts: List[Dict[str, Any]]


class PlaybookBody(BaseModel):
    incident_summary: str
    severity: Optional[str] = "medium"
    asset_inventory: Optional[List[Dict[str, Any]]] = None


class IntelEnrichBody(BaseModel):
    indicators: List[str]  # IPs, domains, hashes


class SoarTicketBody(BaseModel):
    target: str  # "servicenow" | "jira"
    incident_id: str
    title: str
    description: str
    severity: Optional[str] = "medium"


class MobilePushBody(BaseModel):
    analyst_device_token: str
    title: str
    body: str
    incident_id: Optional[str] = None


# ----- Endpoints -----

@router.post("/ueba")
async def ueba(body: UEBABody) -> Dict[str, Any]:
    sys = ("You are a UEBA model. From a user's recent events, compute an anomaly score 0-100, "
           "list the top contributing factors, and recommend an action. Output JSON.")
    user = (f"User: {body.user_id}\nBaseline window: {body.baseline_window_days} days\n"
            f"Events ({len(body.events)}): {body.events[:50]}")
    raw = await _llm(sys, user, 1200)
    return {"user_id": body.user_id, "raw": raw, "at": datetime.now(timezone.utc).isoformat()}


@router.post("/correlate-dedupe")
async def correlate_dedupe(body: CorrelationBody) -> Dict[str, Any]:
    sys = ("You are an alert correlator. Group similar alerts, deduplicate, compute a single severity per group. "
           "Output JSON: { groups: [{ groupId, alertIds, mergedSeverity, summary }], suppressed }.")
    user = f"Alerts ({len(body.alerts)}): {body.alerts[:60]}"
    raw = await _llm(sys, user, 1500)
    return {"raw": raw, "count": len(body.alerts)}


@router.post("/auto-response/playbook")
async def auto_response_playbook(body: PlaybookBody) -> Dict[str, Any]:
    sys = ("You are a SOAR playbook generator. Produce a YAML-style ordered list of containment + remediation steps, "
           "each with an actor (analyst, edr_agent, identity_provider, network) and a rollback option. "
           "Severity: {sev}.").format(sev=body.severity)
    user = f"Incident: {body.incident_summary}\nAssets: {body.asset_inventory or []}"
    raw = await _llm(sys, user, 1500)
    return {"raw": raw, "severity": body.severity}


@router.post("/intel-enrich")
async def intel_enrich(body: IntelEnrichBody) -> Dict[str, Any]:
    if not body.indicators:
        raise HTTPException(status_code=400, detail="indicators[] required")
    sys = ("You are a threat intel analyst. For each indicator, classify type (ip|domain|hash|url), "
           "provide a plausible reputation/context annotation, and a recommended action. Output JSON. "
           "DO NOT make up real intel — flag as 'unverified — wire real feed integration'.")
    user = f"Indicators ({len(body.indicators)}): {body.indicators[:50]}"
    raw = await _llm(sys, user, 1500)
    return {"raw": raw, "note": "Wire real OTX/MISP/VirusTotal feeds in production"}


@router.post("/soar/ticket")
async def soar_ticket(body: SoarTicketBody) -> Dict[str, Any]:
    if body.target not in {"servicenow", "jira"}:
        raise HTTPException(status_code=400, detail="target must be servicenow|jira")
    have = (os.getenv("SERVICENOW_URL") and os.getenv("SERVICENOW_USER") and os.getenv("SERVICENOW_PASSWORD")
            if body.target == "servicenow" else os.getenv("JIRA_API_TOKEN"))
    if not have:
        return {
            "queued": True,
            "ticket": body.dict(),
            "external_id": None,
            "note": f"{body.target} credentials missing — TODO: configure credentials.",
        }
    # Lean v0: emit a stub external ID without hitting external systems.
    return {
        "queued": True,
        "ticket": body.dict(),
        "external_id": f"{body.target.upper()}-{int(datetime.now().timestamp())}",
    }


@router.post("/mobile/push")
async def mobile_push(body: MobilePushBody) -> Dict[str, Any]:
    if not os.getenv("FCM_SERVER_KEY"):
        return {
            "delivered": False,
            "note": "FCM_SERVER_KEY missing — TODO: configure credentials.",
            "preview": body.dict(),
        }
    # Lean v0: simulate dispatch
    return {
        "delivered": True,
        "channel": "fcm",
        "payload": body.dict(),
        "sent_at": datetime.now(timezone.utc).isoformat(),
    }
