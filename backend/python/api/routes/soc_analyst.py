"""
NodeGuard AI Security Platform - AI SOC Analyst Routes
Interactive AI-powered SOC analyst for alert triage, incident investigation,
threat correlation, and security operations assistance.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
import structlog

from ..services.soc_analyst_service import (
    SOCAnalystService,
    SOCAnalystRequest,
    SOCAnalystResponse,
    SOCAction,
)

logger = structlog.get_logger(__name__)

router = APIRouter()

# Shared service instance
_soc_service = SOCAnalystService()


class ChatRequest(BaseModel):
    """Chat request from the frontend."""
    message: str
    session_id: Optional[str] = None
    action: Optional[str] = None
    attached_data: Optional[Dict[str, Any]] = None
    context: Dict[str, Any] = Field(default_factory=dict)


class QuickTriageRequest(BaseModel):
    """Quick triage request for a single alert."""
    alert_data: Dict[str, Any]
    session_id: Optional[str] = None


class BulkTriageRequest(BaseModel):
    """Bulk triage request for multiple alerts."""
    alerts: List[Dict[str, Any]]
    session_id: Optional[str] = None


@router.post("/chat", response_model=SOCAnalystResponse)
async def soc_analyst_chat(request: ChatRequest) -> SOCAnalystResponse:
    """
    Main chat endpoint for the AI SOC Analyst.
    Supports free-form questions, alert triage, incident investigation, and more.
    """
    try:
        action = None
        if request.action:
            try:
                action = SOCAction(request.action)
            except ValueError:
                action = SOCAction.CHAT

        soc_request = SOCAnalystRequest(
            message=request.message,
            session_id=request.session_id,
            action=action,
            context=request.context,
            attached_data=request.attached_data,
        )

        response = await _soc_service.analyze(soc_request)
        return response

    except Exception as e:
        logger.error("SOC Analyst chat failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"SOC Analyst error: {str(e)}")


@router.post("/triage", response_model=SOCAnalystResponse)
async def quick_triage(request: QuickTriageRequest) -> SOCAnalystResponse:
    """
    Quick triage endpoint for a single security alert.
    Automatically classifies severity and recommends actions.
    """
    try:
        severity = request.alert_data.get("severity", "unknown")
        threat_type = request.alert_data.get("threat_type", request.alert_data.get("event_type", "Unknown"))
        source = request.alert_data.get("source_ip", request.alert_data.get("source", "Unknown"))

        soc_request = SOCAnalystRequest(
            message=f"Triage this security alert: {threat_type} from {source} (severity: {severity}). Assess the risk, determine if it's a true positive, and recommend next steps.",
            session_id=request.session_id,
            action=SOCAction.TRIAGE_ALERT,
            attached_data=request.alert_data,
        )

        return await _soc_service.analyze(soc_request)

    except Exception as e:
        logger.error("Quick triage failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Triage error: {str(e)}")


@router.post("/bulk-triage")
async def bulk_triage(request: BulkTriageRequest) -> Dict[str, Any]:
    """
    Bulk triage multiple alerts at once.
    Returns prioritized list with severity assessments.
    """
    try:
        soc_request = SOCAnalystRequest(
            message=f"Bulk triage these {len(request.alerts)} security alerts. Prioritize by severity, identify any correlated events, and flag the most critical items requiring immediate attention.",
            session_id=request.session_id,
            action=SOCAction.TRIAGE_ALERT,
            attached_data={"alerts": request.alerts, "count": len(request.alerts)},
        )

        response = await _soc_service.analyze(soc_request)

        return {
            "session_id": response.session_id,
            "total_alerts": len(request.alerts),
            "analysis": response.message,
            "severity_assessment": response.severity_assessment,
            "recommended_actions": response.recommended_actions,
            "suggestions": response.suggestions,
            "confidence": response.confidence,
        }

    except Exception as e:
        logger.error("Bulk triage failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Bulk triage error: {str(e)}")


@router.post("/investigate")
async def investigate_incident(incident_data: Dict[str, Any], session_id: Optional[str] = None) -> SOCAnalystResponse:
    """
    Start or continue an AI-guided incident investigation.
    """
    try:
        incident_id = incident_data.get("id", incident_data.get("incident_id", "Unknown"))
        soc_request = SOCAnalystRequest(
            message=f"Investigate incident {incident_id}. Analyze the evidence, build a timeline, identify the attack vector, assess impact, and recommend containment actions.",
            session_id=session_id,
            action=SOCAction.INVESTIGATE_INCIDENT,
            attached_data=incident_data,
        )

        return await _soc_service.analyze(soc_request)

    except Exception as e:
        logger.error("Investigation failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Investigation error: {str(e)}")


@router.post("/correlate")
async def correlate_events(events: List[Dict[str, Any]], session_id: Optional[str] = None) -> SOCAnalystResponse:
    """
    Correlate multiple security events to identify attack patterns.
    """
    try:
        soc_request = SOCAnalystRequest(
            message=f"Correlate these {len(events)} security events. Identify patterns, potential attack chains, shared indicators, and determine if they are part of a coordinated attack campaign.",
            session_id=session_id,
            action=SOCAction.CORRELATE_EVENTS,
            attached_data={"events": events, "count": len(events)},
        )

        return await _soc_service.analyze(soc_request)

    except Exception as e:
        logger.error("Correlation failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Correlation error: {str(e)}")


@router.get("/sessions")
async def list_sessions() -> List[Dict[str, Any]]:
    """List active SOC analyst chat sessions."""
    return await _soc_service.get_active_sessions()


@router.get("/sessions/{session_id}")
async def get_session_history(session_id: str) -> List[Dict[str, Any]]:
    """Get conversation history for a session."""
    history = await _soc_service.get_session_history(session_id)
    if not history:
        raise HTTPException(status_code=404, detail="Session not found")
    return history


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str) -> Dict[str, str]:
    """Delete a chat session."""
    deleted = await _soc_service.delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "deleted", "session_id": session_id}


@router.get("/stats")
async def get_soc_stats() -> Dict[str, Any]:
    """Get SOC analyst dashboard statistics."""
    return await _soc_service.get_quick_stats()
