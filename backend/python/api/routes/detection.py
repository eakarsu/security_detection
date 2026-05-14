"""
NodeGuard AI Security Platform - Detection Routes
Real-time threat detection and analysis endpoints
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime
import structlog
from ..schemas.pagination import paginate
from ..services.rule_based_engine import RuleBasedEngine
from ..services.threat_intel_loader import get_threat_intel

logger = structlog.get_logger(__name__)

router = APIRouter()

# Audit fix: KNOWN_MALICIOUS_IPS is now backed by the threat intel loader,
# which pulls from local files, remote feeds, and the IOC DB table.
# Use threat_intel.is_malicious_ip(ip) instead of membership check.
threat_intel = get_threat_intel()

_rule_based_engine = RuleBasedEngine()


@router.get("/threat-intel/stats")
async def threat_intel_stats():
    """Inspect loaded threat intel sources + counts."""
    return threat_intel.stats()


@router.post("/threat-intel/refresh")
async def threat_intel_refresh():
    """Force a refresh of all configured threat intel sources."""
    await threat_intel.refresh()
    return threat_intel.stats()


class SecurityEvent(BaseModel):
    """Security event model"""
    event_id: str
    timestamp: str
    source_ip: str
    destination_ip: Optional[str] = None
    event_type: str
    severity: str
    raw_data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None


class DetectionResult(BaseModel):
    """Detection result model"""
    event_id: str
    threat_detected: bool
    threat_type: Optional[str] = None
    confidence_score: float
    risk_level: str
    recommendations: List[str]
    analysis_details: Dict[str, Any]


@router.post("/analyze", response_model=DetectionResult)
async def analyze_security_event(
    event: SecurityEvent,
    background_tasks: BackgroundTasks
) -> DetectionResult:
    """
    Analyze a security event for potential threats using the ML ensemble.
    Falls back to rule-based detection when ML service is unavailable.
    """
    try:
        logger.info("Analyzing security event", event_id=event.event_id)

        start_time = datetime.utcnow()

        # Build event_data dict for ML service
        event_data = {
            "event_id": event.event_id,
            "timestamp": event.timestamp,
            "source_ip": event.source_ip,
            "destination_ip": event.destination_ip,
            "event_type": event.event_type,
            "severity": event.severity,
            **event.raw_data,
        }
        if event.metadata:
            event_data.update(event.metadata)

        # --- Try real ML scoring first ---
        ml_result = None
        analysis_method = "ml_ensemble"
        try:
            from main import ml_service
            if ml_service and ml_service.is_ready():
                features = ml_service.extract_features(event_data)
                ml_result = await ml_service.predict_threat_from_features(features, model_type="ensemble")
        except Exception as ml_err:
            logger.warning("ML service unavailable for detection route, using rule-based fallback",
                           error=str(ml_err))

        if ml_result is not None:
            threat_score = float(ml_result.get("threat_score", 0.0))
            confidence = float(ml_result.get("confidence", 0.7))
            threat_detected = threat_score >= 0.5
            risk_level = _score_to_risk_level(threat_score)
            threat_type = event.event_type if threat_detected else None
            recommendations = _build_recommendations(risk_level)
            analysis_details = {
                "analyzed_at": event.timestamp,
                "analysis_engine": "NodeGuard ML Ensemble",
                "analysis_method": analysis_method,
                "threat_score": threat_score,
                "model_name": ml_result.get("model_name", "ensemble"),
                "requires_ai_analysis": ml_result.get("requires_ai_analysis", False),
                "processing_time_ms": int((datetime.utcnow() - start_time).total_seconds() * 1000),
            }
        else:
            # --- Rule-based fallback ---
            rb = _rule_based_engine.evaluate(event_data)
            threat_score = rb["threat_score"]
            confidence = rb["confidence"]
            threat_detected = rb["threat_detected"]
            risk_level = rb["risk_level"]
            threat_type = rb["threat_type"]
            recommendations = rb["recommendations"]
            analysis_details = {
                "analyzed_at": event.timestamp,
                "analysis_engine": "NodeGuard Rule Engine",
                "analysis_method": "rule_based",
                "method": "rule_based",
                "confidence": confidence,
                "matched_rules": rb.get("matched_rules", []),
                "processing_time_ms": int((datetime.utcnow() - start_time).total_seconds() * 1000),
            }

        result = DetectionResult(
            event_id=event.event_id,
            threat_detected=threat_detected,
            threat_type=threat_type,
            confidence_score=confidence,
            risk_level=risk_level,
            recommendations=recommendations,
            analysis_details=analysis_details,
        )

        background_tasks.add_task(process_detection_result, result)
        return result

    except Exception as e:
        logger.error("Error analyzing security event", error=str(e), event_id=event.event_id)
        raise HTTPException(status_code=500, detail="Analysis failed")


def _score_to_risk_level(score: float) -> str:
    if score >= 0.85:
        return "critical"
    elif score >= 0.65:
        return "high"
    elif score >= 0.4:
        return "medium"
    return "low"


def _build_recommendations(risk_level: str) -> List[str]:
    if risk_level in ("critical", "high"):
        return [
            "Immediately isolate the source IP from critical systems",
            "Monitor source IP for additional activity",
            "Review network logs for similar patterns",
            "Consider blocking the suspicious IP",
            "Escalate to incident response team",
        ]
    elif risk_level == "medium":
        return [
            "Monitor source IP for additional activity",
            "Review network logs for similar patterns",
            "Consider blocking suspicious IP if pattern continues",
        ]
    return ["Continue monitoring"]


@router.get("/events")
async def get_recent_events(
    limit: int = 100,
    severity: Optional[str] = None,
    page: int = 1,
    page_size: int = 20
) -> dict:
    """
    Get recent security events with pagination
    """
    try:
        # Mock data - replace with actual database query
        events = [
            SecurityEvent(
                event_id=f"evt_{i}",
                timestamp="2025-08-02T12:00:00Z",
                source_ip=f"192.168.1.{i}",
                destination_ip="10.0.0.1",
                event_type="network_scan",
                severity="medium",
                raw_data={"port": 22, "protocol": "tcp"},
                metadata={"source": "network_monitor"}
            )
            for i in range(1, min(limit + 1, 11))
        ]

        if severity:
            events = [e for e in events if e.severity == severity]

        total = len(events)
        start = (page - 1) * page_size
        end = start + page_size
        paginated_events = events[start:end]

        return paginate(
            items=[event.dict() for event in paginated_events],
            total=total,
            page=page,
            page_size=page_size
        )

    except Exception as e:
        logger.error("Error retrieving events", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve events")


@router.get("/stats")
async def get_detection_stats() -> Dict[str, Any]:
    """
    Get detection statistics
    """
    try:
        return {
            "total_events_today": 1247,
            "threats_detected": 23,
            "false_positives": 5,
            "accuracy_rate": 0.92,
            "avg_response_time_ms": 145,
            "top_threat_types": [
                {"type": "network_scan", "count": 8},
                {"type": "brute_force", "count": 6},
                {"type": "malware", "count": 4},
                {"type": "data_exfiltration", "count": 3},
                {"type": "privilege_escalation", "count": 2}
            ]
        }
        
    except Exception as e:
        logger.error("Error retrieving detection stats", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve statistics")


@router.get("/detections/{detection_id}/mitre")
async def get_mitre_mappings_for_detection(detection_id: str) -> Dict[str, Any]:
    """
    Retrieve persisted MITRE ATT&CK mappings for a given detection / event ID.
    Mappings are stored by the AI analysis route when it processes a threat.
    """
    try:
        from ..services.database import get_database_service
        db = await get_database_service()
        await db.ensure_connected()

        async with db._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    id::text            AS mapping_id,
                    tactic_id,
                    tactic_name,
                    technique_id,
                    technique_name,
                    sub_technique_id,
                    sub_technique_name,
                    confidence,
                    notes,
                    created_at
                FROM security.mitre_mappings
                WHERE detection_event_id = $1
                   OR notes LIKE $2
                ORDER BY created_at DESC
                """,
                detection_id,
                f"detection_id:{detection_id}%",
            )

        mappings = [
            {
                "mapping_id": row["mapping_id"],
                "detection_id": detection_id,
                "tactic_id": row["tactic_id"],
                "tactic_name": row["tactic_name"],
                "technique_id": row["technique_id"],
                "technique_name": row["technique_name"],
                "sub_technique_id": row["sub_technique_id"],
                "sub_technique_name": row["sub_technique_name"],
                "confidence": row["confidence"],
                "timestamp": row["created_at"].isoformat() + "Z",
            }
            for row in rows
        ]

        return {
            "detection_id": detection_id,
            "total": len(mappings),
            "mitre_mappings": mappings,
        }

    except Exception as e:
        logger.error(
            "Error retrieving MITRE mappings",
            error=str(e),
            detection_id=detection_id,
        )
        raise HTTPException(status_code=500, detail="Failed to retrieve MITRE mappings")


async def process_detection_result(result: DetectionResult):
    """
    Background task to process detection results
    """
    try:
        logger.info("Processing detection result", event_id=result.event_id)
        
        # Here you would:
        # 1. Store result in database
        # 2. Send alerts if threat detected
        # 3. Update threat intelligence
        # 4. Trigger automated responses
        
        if result.threat_detected:
            logger.warning(
                "Threat detected",
                event_id=result.event_id,
                threat_type=result.threat_type,
                confidence=result.confidence_score
            )
            
    except Exception as e:
        logger.error("Error processing detection result", error=str(e))
