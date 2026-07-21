"""
AI SOC Analyst Service
Provides conversational AI-powered security analysis, alert triage,
incident investigation, and threat correlation for SOC analysts.
"""

import json
import time
import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
from enum import Enum

import structlog
from pydantic import BaseModel, Field

logger = structlog.get_logger(__name__)


class ConversationRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class SOCAction(str, Enum):
    TRIAGE_ALERT = "triage_alert"
    INVESTIGATE_INCIDENT = "investigate_incident"
    CORRELATE_EVENTS = "correlate_events"
    HUNT_THREATS = "hunt_threats"
    GENERATE_REPORT = "generate_report"
    RECOMMEND_RESPONSE = "recommend_response"
    EXPLAIN_ALERT = "explain_alert"
    ASSESS_RISK = "assess_risk"
    CHAT = "chat"


class ChatMessage(BaseModel):
    role: ConversationRole
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SOCAnalystRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    action: Optional[SOCAction] = None
    context: Dict[str, Any] = Field(default_factory=dict)
    attached_data: Optional[Dict[str, Any]] = None


class SOCAnalystResponse(BaseModel):
    session_id: str
    message: str
    action_taken: str
    confidence: float
    suggestions: List[str] = Field(default_factory=list)
    related_data: Dict[str, Any] = Field(default_factory=dict)
    severity_assessment: Optional[str] = None
    mitre_techniques: List[Dict[str, str]] = Field(default_factory=list)
    recommended_actions: List[Dict[str, Any]] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# In-memory session store kept only as a deprecated fallback for tests.
# Production traffic now flows through SessionStore (Redis-backed).
_sessions: Dict[str, List[ChatMessage]] = {}

from .session_store import get_session_store

SOC_ANALYST_SYSTEM_PROMPT = """You are an expert AI SOC (Security Operations Center) Analyst embedded in the NodeGuard AI Security Platform. You assist human security analysts with:

1. **Alert Triage**: Prioritize and classify security alerts by severity, determining true positives vs false positives
2. **Incident Investigation**: Guide analysts through investigation workflows, suggest queries, and correlate evidence
3. **Threat Correlation**: Connect related security events to identify attack campaigns and lateral movement
4. **Threat Hunting**: Proactively search for indicators of compromise and suspicious patterns
5. **Response Recommendations**: Suggest containment, eradication, and recovery actions
6. **Report Generation**: Create executive summaries, incident reports, and compliance documentation
7. **Risk Assessment**: Evaluate the risk level of events, assets, and configurations
8. **Knowledge Base**: Answer questions about MITRE ATT&CK, CVEs, threat actors, and security best practices

When analyzing security data, always:
- Map findings to MITRE ATT&CK techniques where applicable
- Assess severity (critical/high/medium/low/informational)
- Provide confidence levels for your assessments
- Suggest concrete next steps
- Consider the full attack chain and potential lateral movement
- Flag potential false positives with reasoning

Respond in a structured JSON format with the following fields:
```json
{
  "message": "Your detailed analysis or response",
  "action_taken": "What type of analysis you performed",
  "confidence": 0.0-1.0,
  "severity_assessment": "critical|high|medium|low|informational|null",
  "suggestions": ["List of follow-up actions or questions"],
  "mitre_techniques": [{"technique_id": "T1234", "name": "Technique Name", "tactic": "Tactic"}],
  "recommended_actions": [{"action": "What to do", "priority": "immediate|high|medium|low", "rationale": "Why"}],
  "related_data": {"key": "Additional structured data relevant to the response"}
}
```

Be concise but thorough. Prioritize actionable intelligence."""


def _msg_to_dict(m: ChatMessage) -> dict:
    return {
        "role": m.role.value if hasattr(m.role, "value") else str(m.role),
        "content": m.content,
        "timestamp": m.timestamp.isoformat() if hasattr(m.timestamp, "isoformat") else str(m.timestamp),
        "metadata": m.metadata or {},
    }


def _dict_to_msg(d: dict) -> ChatMessage:
    return ChatMessage(
        role=ConversationRole(d.get("role", "user")),
        content=d.get("content", ""),
        metadata=d.get("metadata") or {},
    )


class SOCAnalystService:
    """AI-powered SOC Analyst service for interactive security analysis."""

    def __init__(self):
        self._store = get_session_store()

    async def _get_or_create_session(self, session_id: Optional[str] = None) -> tuple[str, List[ChatMessage]]:
        if session_id:
            existing = await self._store.get(session_id)
            if existing:
                return session_id, [_dict_to_msg(d) for d in existing]

        new_id = session_id or f"soc_{uuid.uuid4().hex[:12]}"
        history = [
            ChatMessage(
                role=ConversationRole.SYSTEM,
                content=SOC_ANALYST_SYSTEM_PROMPT,
            )
        ]
        await self._store.set(new_id, [_msg_to_dict(m) for m in history])
        return new_id, history

    async def _persist_history(self, session_id: str, history: List[ChatMessage]) -> None:
        await self._store.set(session_id, [_msg_to_dict(m) for m in history])

    def _build_user_prompt(self, request: SOCAnalystRequest) -> str:
        parts = []

        if request.action and request.action != SOCAction.CHAT:
            parts.append(f"[Action: {request.action.value}]")

        parts.append(request.message)

        if request.attached_data:
            parts.append(f"\n\n**Attached Security Data:**\n```json\n{json.dumps(request.attached_data, indent=2, default=str)}\n```")

        if request.context:
            parts.append(f"\n\n**Context:**\n```json\n{json.dumps(request.context, indent=2, default=str)}\n```")

        return "\n".join(parts)

    async def analyze(self, request: SOCAnalystRequest) -> SOCAnalystResponse:
        """Process a SOC analyst request through the AI service."""
        start_time = time.time()
        session_id, history = await self._get_or_create_session(request.session_id)

        user_prompt = self._build_user_prompt(request)
        history.append(ChatMessage(role=ConversationRole.USER, content=user_prompt))

        try:
            from main import openrouter_service
            if not openrouter_service or not openrouter_service.is_ready():
                raise RuntimeError("OpenRouter service not available")

            messages = [{"role": m.role.value, "content": m.content} for m in history]
            raw_response = await openrouter_service._make_request(messages)

            if not raw_response:
                raise RuntimeError("Empty response from AI service")

            history.append(ChatMessage(role=ConversationRole.ASSISTANT, content=raw_response))

            # Trim history to prevent context overflow (keep system + last 40 messages)
            if len(history) > 42:
                history = [history[0]] + history[-40:]

            await self._persist_history(session_id, history)

            parsed = self._parse_response(raw_response)
            processing_time = time.time() - start_time

            logger.info("SOC Analyst analysis completed",
                        session_id=session_id,
                        action=request.action,
                        processing_time=processing_time)

            return SOCAnalystResponse(
                session_id=session_id,
                message=parsed.get("message", raw_response),
                action_taken=parsed.get("action_taken", request.action.value if request.action else "chat"),
                confidence=float(parsed.get("confidence", 0.8)),
                suggestions=parsed.get("suggestions", []),
                related_data=parsed.get("related_data", {}),
                severity_assessment=parsed.get("severity_assessment"),
                mitre_techniques=parsed.get("mitre_techniques", []),
                recommended_actions=parsed.get("recommended_actions", []),
            )

        except Exception as e:
            logger.error("SOC Analyst provider analysis failed", error=str(e))
            raise RuntimeError("SOC Analyst provider analysis failed") from e

    def _parse_response(self, raw: str) -> Dict[str, Any]:
        """Parse AI response using the resilient 3-strategy parser."""
        try:
            from utils.parse_ai_json import parse_ai_json  # type: ignore
            parsed = parse_ai_json(raw, fallback=None)
            if isinstance(parsed, dict):
                return parsed
            if parsed is not None:
                return {"message": raw, "data": parsed}
        except Exception:
            pass
        return {"message": raw}

    def _generate_fallback_response(self, request: SOCAnalystRequest, session_id: str) -> SOCAnalystResponse:
        """Generate a rule-based fallback when AI is unavailable."""
        action = request.action or SOCAction.CHAT
        data = request.attached_data or {}

        if action == SOCAction.TRIAGE_ALERT:
            return self._fallback_triage(data, session_id)
        elif action == SOCAction.INVESTIGATE_INCIDENT:
            return self._fallback_investigate(data, session_id)
        elif action == SOCAction.ASSESS_RISK:
            return self._fallback_risk_assessment(data, session_id)
        else:
            return SOCAnalystResponse(
                session_id=session_id,
                message="I'm currently operating in offline mode. I can still help with basic alert triage and risk assessment. Please provide security event data for analysis.",
                action_taken="fallback_chat",
                confidence=0.5,
                suggestions=[
                    "Try attaching alert or event data for triage",
                    "Ask about MITRE ATT&CK techniques",
                    "Request an incident investigation workflow",
                ],
            )

    def _fallback_triage(self, data: Dict[str, Any], session_id: str) -> SOCAnalystResponse:
        severity = data.get("severity", "medium").lower()
        risk_score = float(data.get("risk_score", 5.0))
        threat_type = data.get("threat_type", "Unknown")
        source_ip = data.get("source_ip", "Unknown")

        if risk_score >= 8.0 or severity == "critical":
            sev = "critical"
            conf = 0.85
            msg = f"CRITICAL ALERT: {threat_type} from {source_ip} (risk: {risk_score}/10). Immediate investigation required. Recommend isolating affected systems and escalating to incident response team."
        elif risk_score >= 6.0 or severity == "high":
            sev = "high"
            conf = 0.75
            msg = f"HIGH PRIORITY: {threat_type} from {source_ip} (risk: {risk_score}/10). Requires prompt investigation. Check for related events and validate indicators."
        elif risk_score >= 4.0 or severity == "medium":
            sev = "medium"
            conf = 0.70
            msg = f"MEDIUM ALERT: {threat_type} from {source_ip} (risk: {risk_score}/10). Monitor for escalation. Review related logs and check for false positive indicators."
        else:
            sev = "low"
            conf = 0.65
            msg = f"LOW PRIORITY: {threat_type} from {source_ip} (risk: {risk_score}/10). Log for tracking. May be a false positive — validate against baseline behavior."

        return SOCAnalystResponse(
            session_id=session_id,
            message=msg,
            action_taken="triage_alert",
            confidence=conf,
            severity_assessment=sev,
            suggestions=[
                "Check related events from the same source IP",
                "Cross-reference with threat intelligence feeds",
                "Review UEBA baselines for anomalies",
                "Search SIEM logs for related IOCs",
            ],
            recommended_actions=[
                {"action": "Investigate source IP in threat intel", "priority": "high" if sev in ["critical", "high"] else "medium", "rationale": "Determine if source is known malicious"},
                {"action": "Check for lateral movement indicators", "priority": "high" if sev == "critical" else "medium", "rationale": "Assess blast radius"},
                {"action": "Document findings in incident ticket", "priority": "medium", "rationale": "Maintain audit trail"},
            ],
        )

    def _fallback_investigate(self, data: Dict[str, Any], session_id: str) -> SOCAnalystResponse:
        incident_id = data.get("id", data.get("incident_id", "Unknown"))
        return SOCAnalystResponse(
            session_id=session_id,
            message=f"Investigation workflow for incident {incident_id}:\n\n1. **Scope Assessment**: Identify all affected systems and users\n2. **Evidence Collection**: Gather logs, memory dumps, and network captures\n3. **Timeline Reconstruction**: Build attack timeline from earliest indicator\n4. **Root Cause Analysis**: Determine initial access vector\n5. **Impact Assessment**: Evaluate data exposure and system compromise\n6. **Containment**: Isolate affected systems if not already done",
            action_taken="investigate_incident",
            confidence=0.7,
            suggestions=[
                "Pull SIEM logs for the affected timeframe",
                "Check MITRE ATT&CK matrix for technique mapping",
                "Review user behavior analytics for anomalies",
                "Search for IOCs across all log sources",
            ],
            recommended_actions=[
                {"action": "Collect forensic evidence", "priority": "immediate", "rationale": "Preserve volatile data before it's lost"},
                {"action": "Identify all affected systems", "priority": "high", "rationale": "Understand full scope of compromise"},
                {"action": "Notify stakeholders", "priority": "high", "rationale": "Keep leadership informed"},
            ],
        )

    def _fallback_risk_assessment(self, data: Dict[str, Any], session_id: str) -> SOCAnalystResponse:
        risk_score = float(data.get("risk_score", 5.0))
        asset_value = data.get("asset_value", "medium")
        exposure = data.get("exposure", "internal")

        overall = "high" if risk_score >= 7.0 or asset_value == "critical" else ("medium" if risk_score >= 4.0 else "low")

        return SOCAnalystResponse(
            session_id=session_id,
            message=f"Risk Assessment Summary:\n- Risk Score: {risk_score}/10\n- Asset Value: {asset_value}\n- Exposure: {exposure}\n- Overall Risk: {overall.upper()}\n\nThis {'requires immediate attention' if overall == 'high' else 'should be monitored and addressed in the normal workflow'}.",
            action_taken="assess_risk",
            confidence=0.7,
            severity_assessment=overall,
            suggestions=[
                "Review compensating controls",
                "Check vulnerability scan results",
                "Validate network segmentation",
            ],
        )

    async def get_session_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Get conversation history for a session (Redis-backed)."""
        raw = await self._store.get(session_id)
        if not raw:
            return []
        return [
            {
                "role": d.get("role"),
                "content": d.get("content"),
                "timestamp": d.get("timestamp"),
            }
            for d in raw
            if d.get("role") != ConversationRole.SYSTEM.value
        ]

    async def get_active_sessions(self) -> List[Dict[str, Any]]:
        """List active SOC analyst sessions (Redis-backed)."""
        sessions: List[Dict[str, Any]] = []
        for sid in await self._store.list_keys(limit=100):
            raw = await self._store.get(sid)
            if not raw:
                continue
            user_msgs = [m for m in raw if m.get("role") == ConversationRole.USER.value]
            if not user_msgs:
                continue
            sessions.append({
                "session_id": sid,
                "message_count": max(0, len(raw) - 1),
                "started_at": raw[1].get("timestamp") if len(raw) > 1 else None,
                "last_message_at": raw[-1].get("timestamp"),
                "preview": (user_msgs[-1].get("content") or "")[:100],
            })
        return sessions

    async def delete_session(self, session_id: str) -> bool:
        """Delete a conversation session."""
        if session_id in self.session_store:
            del self.session_store[session_id]
            return True
        return False

    async def get_quick_stats(self) -> Dict[str, Any]:
        """Get quick stats for the SOC analyst dashboard."""
        from .database import get_database_service

        database = await get_database_service()
        return await self._fetch_live_stats(database)

    async def _fetch_live_stats(self, db_service) -> Dict[str, Any]:
        """Fetch live statistics from database."""
        await db_service.ensure_connected()
        connection_context = await db_service.get_connection_context()
        async with connection_context as connection:
            row = await connection.fetchrow(
                """
                SELECT
                  COUNT(*) FILTER (WHERE status IN ('open', 'investigating')) AS open_alerts,
                  COUNT(*) FILTER (WHERE status IN ('open', 'investigating') AND LOWER(severity)='critical') AS critical_alerts,
                  COUNT(*) FILTER (WHERE status IN ('open', 'investigating') AND LOWER(severity)='high') AS high_alerts,
                  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS alerts_last_24h,
                  COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at-created_at))/60)
                    FILTER (WHERE status IN ('resolved', 'closed')), 0) AS mean_triage_time_min,
                  COALESCE(
                    COUNT(*) FILTER (WHERE status='false_positive')::float /
                    NULLIF(COUNT(*) FILTER (WHERE status IN ('false_positive', 'resolved', 'closed')), 0),
                    0
                  ) AS false_positive_rate
                FROM security.events
                """
            )
        return {
            "open_alerts": row["open_alerts"],
            "critical_alerts": row["critical_alerts"],
            "high_alerts": row["high_alerts"],
            "active_incidents": row["open_alerts"],
            "mean_triage_time_min": float(row["mean_triage_time_min"]),
            "alerts_last_24h": row["alerts_last_24h"],
            "false_positive_rate": float(row["false_positive_rate"]),
            "active_sessions": len(await self._store.list_keys(limit=100)),
        }
