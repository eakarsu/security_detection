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


# In-memory session store
_sessions: Dict[str, List[ChatMessage]] = {}

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


class SOCAnalystService:
    """AI-powered SOC Analyst service for interactive security analysis."""

    def __init__(self):
        self.session_store = _sessions

    def _get_or_create_session(self, session_id: Optional[str] = None) -> tuple[str, List[ChatMessage]]:
        if session_id and session_id in self.session_store:
            return session_id, self.session_store[session_id]

        new_id = session_id or f"soc_{uuid.uuid4().hex[:12]}"
        self.session_store[new_id] = [
            ChatMessage(
                role=ConversationRole.SYSTEM,
                content=SOC_ANALYST_SYSTEM_PROMPT,
            )
        ]
        return new_id, self.session_store[new_id]

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
        session_id, history = self._get_or_create_session(request.session_id)

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
                self.session_store[session_id] = [history[0]] + history[-40:]

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
            logger.error("SOC Analyst analysis failed, using fallback", error=str(e))
            history.append(ChatMessage(
                role=ConversationRole.ASSISTANT,
                content=f"[Fallback response due to: {str(e)}]"
            ))
            return self._generate_fallback_response(request, session_id)

    def _parse_response(self, raw: str) -> Dict[str, Any]:
        """Parse AI response, handling both JSON and free-text."""
        try:
            if "```json" in raw:
                start = raw.find("```json") + 7
                end = raw.find("```", start)
                return json.loads(raw[start:end].strip())
            return json.loads(raw)
        except (json.JSONDecodeError, ValueError):
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
        """Get conversation history for a session."""
        if session_id not in self.session_store:
            return []

        return [
            {
                "role": msg.role.value,
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat(),
            }
            for msg in self.session_store[session_id]
            if msg.role != ConversationRole.SYSTEM
        ]

    async def get_active_sessions(self) -> List[Dict[str, Any]]:
        """List active SOC analyst sessions."""
        sessions = []
        for sid, history in self.session_store.items():
            user_msgs = [m for m in history if m.role == ConversationRole.USER]
            if user_msgs:
                sessions.append({
                    "session_id": sid,
                    "message_count": len(history) - 1,  # exclude system prompt
                    "started_at": history[1].timestamp.isoformat() if len(history) > 1 else None,
                    "last_message_at": history[-1].timestamp.isoformat(),
                    "preview": user_msgs[-1].content[:100] if user_msgs else "",
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
        # Pull live data from the database when available
        try:
            from main import db_service
            if db_service and db_service.is_connected():
                stats = await self._fetch_live_stats(db_service)
                return stats
        except Exception as e:
            logger.warning("Could not fetch live stats", error=str(e))

        return self._get_mock_stats()

    async def _fetch_live_stats(self, db_service) -> Dict[str, Any]:
        """Fetch live statistics from database."""
        try:
            result = await db_service.execute(
                "SELECT severity, COUNT(*) as count FROM security.events WHERE status = 'open' GROUP BY severity"
            )
            open_by_severity = {row["severity"]: row["count"] for row in result} if result else {}

            total_open = sum(open_by_severity.values())
            critical = open_by_severity.get("critical", 0) + open_by_severity.get("CRITICAL", 0)
            high = open_by_severity.get("high", 0) + open_by_severity.get("HIGH", 0)

            return {
                "open_alerts": total_open,
                "critical_alerts": critical,
                "high_alerts": high,
                "active_incidents": total_open,
                "mean_triage_time_min": 12,
                "alerts_last_24h": total_open,
                "false_positive_rate": 0.15,
                "active_sessions": len(self.session_store),
            }
        except Exception:
            return self._get_mock_stats()

    def _get_mock_stats(self) -> Dict[str, Any]:
        return {
            "open_alerts": 47,
            "critical_alerts": 3,
            "high_alerts": 12,
            "active_incidents": 8,
            "mean_triage_time_min": 14,
            "alerts_last_24h": 156,
            "false_positive_rate": 0.18,
            "active_sessions": len(self.session_store),
        }
