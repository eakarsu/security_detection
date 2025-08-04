"""
NodeGuard AI Security Platform - Event Correlation Routes
Real correlation analysis endpoints for workflow nodes
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import structlog
from datetime import datetime, timedelta
from ..services.database import get_database_service
import re

logger = structlog.get_logger(__name__)

router = APIRouter()


class CorrelationRequest(BaseModel):
    """Correlation analysis request model"""
    event_data: Dict[str, Any]
    time_window: Optional[str] = "5m"
    group_by: Optional[List[str]] = ["source_ip"]
    correlation_rules: Optional[List[Dict[str, Any]]] = []


class CorrelationResponse(BaseModel):
    """Correlation analysis response model"""
    correlation_key: str
    related_events_count: int
    related_event_ids: List[str]
    pattern: str
    risk_adjustment: float
    anomaly_score: float
    summary: str
    correlation_strength: str
    temporal_patterns: List[Dict[str, Any]]
    frequency_analysis: Dict[str, Any]


@router.post("/analyze", response_model=CorrelationResponse)
async def analyze_correlation(request: CorrelationRequest) -> CorrelationResponse:
    """Real correlation analysis for security events"""
    try:
        # Get database service
        db_service = await get_database_service()
        await db_service.ensure_connected()
        
        # Parse time window
        time_delta = parse_time_window(request.time_window)
        start_time = datetime.utcnow() - time_delta
        
        # Build correlation key
        correlation_key = build_correlation_key(request.event_data, request.group_by)
        
        # Find related events in database
        related_events = await find_related_events(
            db_service, 
            request.event_data, 
            request.group_by, 
            start_time
        )
        
        # Analyze patterns
        pattern_analysis = analyze_event_patterns(related_events, request.event_data)
        
        # Calculate anomaly score
        anomaly_score = calculate_anomaly_score(related_events, request.event_data)
        
        # Determine correlation strength
        correlation_strength = determine_correlation_strength(len(related_events), time_delta)
        
        # Calculate risk adjustment
        risk_adjustment = calculate_risk_adjustment(pattern_analysis, anomaly_score)
        
        # Generate summary
        summary = generate_correlation_summary(
            len(related_events), 
            request.group_by, 
            request.time_window,
            pattern_analysis
        )
        
        # Analyze temporal patterns
        temporal_patterns = analyze_temporal_patterns(related_events)
        
        # Frequency analysis
        frequency_analysis = analyze_frequency_patterns(related_events, time_delta)
        
        logger.info("Correlation analysis completed", 
                   correlation_key=correlation_key,
                   related_events=len(related_events),
                   pattern=pattern_analysis["primary_pattern"],
                   anomaly_score=anomaly_score)
        
        return CorrelationResponse(
            correlation_key=correlation_key,
            related_events_count=len(related_events),
            related_event_ids=[str(event.get("id", "")) for event in related_events],
            pattern=pattern_analysis["primary_pattern"],
            risk_adjustment=risk_adjustment,
            anomaly_score=anomaly_score,
            summary=summary,
            correlation_strength=correlation_strength,
            temporal_patterns=temporal_patterns,
            frequency_analysis=frequency_analysis
        )
        
    except Exception as e:
        logger.error("Correlation analysis failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Correlation analysis failed: {str(e)}")


@router.post("/rules")
async def create_correlation_rule(rule: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new correlation rule"""
    try:
        # Validate rule structure
        if not validate_correlation_rule(rule):
            raise HTTPException(status_code=400, detail="Invalid correlation rule structure")
        
        # Store rule in database (would implement in production)
        rule_id = f"rule_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        return {
            "rule_id": rule_id,
            "status": "created",
            "rule": rule
        }
        
    except Exception as e:
        logger.error("Failed to create correlation rule", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to create rule: {str(e)}")


@router.get("/patterns")
async def get_correlation_patterns(
    time_window: str = "1h",
    limit: int = 50
) -> Dict[str, Any]:
    """Get common correlation patterns"""
    try:
        db_service = await get_database_service()
        await db_service.ensure_connected()
        
        time_delta = parse_time_window(time_window)
        start_time = datetime.utcnow() - time_delta
        
        # Query for common patterns
        patterns = await find_common_patterns(db_service, start_time, limit)
        
        return {
            "time_window": time_window,
            "patterns_found": len(patterns),
            "patterns": patterns,
            "analysis_time": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to get correlation patterns", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get patterns: {str(e)}")


def parse_time_window(time_window: str) -> timedelta:
    """Parse time window string (e.g., '5m', '1h', '2d') to timedelta"""
    if not time_window:
        return timedelta(minutes=5)
    
    # Extract number and unit
    match = re.match(r'^(\d+)([smhd])$', time_window.lower())
    if not match:
        return timedelta(minutes=5)
    
    value, unit = match.groups()
    value = int(value)
    
    if unit == 's':
        return timedelta(seconds=value)
    elif unit == 'm':
        return timedelta(minutes=value)
    elif unit == 'h':
        return timedelta(hours=value)
    elif unit == 'd':
        return timedelta(days=value)
    else:
        return timedelta(minutes=5)


def build_correlation_key(event_data: Dict[str, Any], group_by: List[str]) -> str:
    """Build correlation key from event data and grouping fields"""
    key_parts = []
    for field in group_by:
        value = event_data.get(field, 'unknown')
        key_parts.append(f"{field}:{value}")
    
    return "|".join(key_parts)


async def find_related_events(
    db_service, 
    event_data: Dict[str, Any], 
    group_by: List[str], 
    start_time: datetime
) -> List[Dict[str, Any]]:
    """Find related events in database based on grouping criteria"""
    try:
        connection_context = await db_service.get_connection_context()
        async with connection_context as conn:
            # Build WHERE clause for grouping criteria
            where_conditions = []
            params = [start_time]
            param_count = 1
            
            for field in group_by:
                field_value = event_data.get(field)
                if field_value:
                    param_count += 1
                    where_conditions.append(f"{field} = ${param_count}")
                    params.append(field_value)
            
            if not where_conditions:
                return []
            
            where_clause = " AND ".join(where_conditions)
            
            query = f"""
                SELECT id, event_type, severity, source_ip, destination_ip, 
                       user_id, ml_score, created_at, description
                FROM security.events 
                WHERE created_at >= $1 AND {where_clause}
                ORDER BY created_at DESC
                LIMIT 100
            """
            
            rows = await conn.fetch(query, *params)
            
            return [dict(row) for row in rows]
            
    except Exception as e:
        logger.error("Failed to find related events", error=str(e))
        return []


def analyze_event_patterns(related_events: List[Dict[str, Any]], current_event: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze patterns in related events"""
    if not related_events:
        return {
            "primary_pattern": "single_event",
            "pattern_confidence": 0.0,
            "pattern_details": {}
        }
    
    # Analyze event types
    event_types = [event.get("event_type", "unknown") for event in related_events]
    current_type = current_event.get("threat_type", "unknown")
    
    # Check for repetitive patterns
    if len(related_events) >= 3:
        same_type_count = sum(1 for et in event_types if et == current_type)
        if same_type_count >= 3:
            return {
                "primary_pattern": "repetitive_attack",
                "pattern_confidence": min(0.9, same_type_count / len(related_events)),
                "pattern_details": {
                    "event_type": current_type,
                    "repetition_count": same_type_count,
                    "total_events": len(related_events)
                }
            }
    
    # Check for escalation patterns
    severity_levels = {"low": 1, "medium": 2, "high": 3, "critical": 4}
    severities = [severity_levels.get(event.get("severity", "low").lower(), 1) for event in related_events]
    current_severity = severity_levels.get(current_event.get("severity", "medium").lower(), 2)
    
    if len(severities) >= 2 and current_severity > max(severities[-3:]):
        return {
            "primary_pattern": "escalation",
            "pattern_confidence": 0.8,
            "pattern_details": {
                "previous_max_severity": max(severities),
                "current_severity": current_severity,
                "escalation_rate": (current_severity - max(severities)) / len(severities)
            }
        }
    
    # Check for burst patterns (many events in short time)
    if len(related_events) >= 5:
        return {
            "primary_pattern": "burst_activity",
            "pattern_confidence": 0.7,
            "pattern_details": {
                "event_count": len(related_events),
                "burst_intensity": len(related_events) / 5  # Events per 5 minutes baseline
            }
        }
    
    # Default to sequence pattern
    return {
        "primary_pattern": "sequence",
        "pattern_confidence": 0.5,
        "pattern_details": {
            "event_count": len(related_events),
            "unique_types": len(set(event_types))
        }
    }


def calculate_anomaly_score(related_events: List[Dict[str, Any]], current_event: Dict[str, Any]) -> float:
    """Calculate anomaly score based on historical patterns"""
    if not related_events:
        return 0.5  # Neutral score for single events
    
    base_score = 0.0
    
    # Frequency anomaly (too many events)
    event_count = len(related_events)
    if event_count >= 10:
        base_score += 0.4
    elif event_count >= 5:
        base_score += 0.2
    
    # Severity anomaly
    current_severity = current_event.get("severity", "medium").lower()
    if current_severity in ["high", "critical"]:
        base_score += 0.3
    
    # Risk score anomaly
    current_risk = current_event.get("risk_score", 0.0)
    if current_risk >= 8.0:
        base_score += 0.3
    elif current_risk >= 6.0:
        base_score += 0.2
    
    # Time distribution anomaly
    if event_count >= 3:
        # Check if events are unusually clustered
        timestamps = [event.get("created_at") for event in related_events if event.get("created_at")]
        if len(timestamps) >= 3:
            # Simple clustering check - if all events within 1 hour
            time_span = max(timestamps) - min(timestamps)
            if time_span.total_seconds() < 3600:  # 1 hour
                base_score += 0.2
    
    return min(1.0, base_score)


def determine_correlation_strength(event_count: int, time_delta: timedelta) -> str:
    """Determine correlation strength based on event count and time window"""
    # Normalize by time window
    events_per_hour = event_count / (time_delta.total_seconds() / 3600)
    
    if events_per_hour >= 10:
        return "very_strong"
    elif events_per_hour >= 5:
        return "strong"
    elif events_per_hour >= 2:
        return "moderate"
    elif events_per_hour >= 0.5:
        return "weak"
    else:
        return "very_weak"


def calculate_risk_adjustment(pattern_analysis: Dict[str, Any], anomaly_score: float) -> float:
    """Calculate risk adjustment factor based on patterns and anomalies"""
    base_adjustment = 1.0
    
    pattern = pattern_analysis.get("primary_pattern", "single_event")
    confidence = pattern_analysis.get("pattern_confidence", 0.0)
    
    # Pattern-based adjustments
    pattern_multipliers = {
        "repetitive_attack": 1.5,
        "escalation": 1.8,
        "burst_activity": 1.3,
        "sequence": 1.1,
        "single_event": 1.0
    }
    
    pattern_adjustment = pattern_multipliers.get(pattern, 1.0)
    
    # Anomaly-based adjustment
    anomaly_adjustment = 1.0 + (anomaly_score * 0.5)  # Up to 50% increase
    
    # Confidence-based adjustment
    confidence_adjustment = 1.0 + (confidence * 0.3)  # Up to 30% increase
    
    final_adjustment = base_adjustment * pattern_adjustment * anomaly_adjustment * confidence_adjustment
    
    return min(3.0, max(0.5, final_adjustment))  # Cap between 0.5x and 3.0x


def generate_correlation_summary(
    event_count: int, 
    group_by: List[str], 
    time_window: str,
    pattern_analysis: Dict[str, Any]
) -> str:
    """Generate human-readable correlation summary"""
    pattern = pattern_analysis.get("primary_pattern", "single_event")
    
    if event_count == 0:
        return f"No related events found within {time_window} when grouped by {', '.join(group_by)}"
    
    pattern_descriptions = {
        "repetitive_attack": f"Detected repetitive attack pattern with {event_count} similar events",
        "escalation": f"Detected escalation pattern across {event_count} events with increasing severity",
        "burst_activity": f"Detected burst activity with {event_count} events in rapid succession",
        "sequence": f"Detected event sequence with {event_count} related events",
        "single_event": f"Single event with no correlated activities"
    }
    
    base_summary = pattern_descriptions.get(pattern, f"Found {event_count} related events")
    
    return f"{base_summary} within {time_window} when grouped by {', '.join(group_by)}"


def analyze_temporal_patterns(related_events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Analyze temporal patterns in related events"""
    if len(related_events) < 2:
        return []
    
    patterns = []
    
    # Sort events by timestamp
    sorted_events = sorted(related_events, key=lambda x: x.get("created_at", datetime.min))
    
    # Calculate time intervals
    intervals = []
    for i in range(1, len(sorted_events)):
        prev_time = sorted_events[i-1].get("created_at")
        curr_time = sorted_events[i].get("created_at")
        if prev_time and curr_time:
            interval = (curr_time - prev_time).total_seconds()
            intervals.append(interval)
    
    if intervals:
        avg_interval = sum(intervals) / len(intervals)
        patterns.append({
            "pattern_type": "interval_analysis",
            "average_interval_seconds": avg_interval,
            "total_intervals": len(intervals),
            "regularity": "regular" if max(intervals) - min(intervals) < avg_interval * 0.5 else "irregular"
        })
    
    return patterns


def analyze_frequency_patterns(related_events: List[Dict[str, Any]], time_delta: timedelta) -> Dict[str, Any]:
    """Analyze frequency patterns in related events"""
    total_events = len(related_events)
    total_seconds = time_delta.total_seconds()
    
    if total_seconds == 0:
        return {}
    
    events_per_second = total_events / total_seconds
    events_per_minute = events_per_second * 60
    events_per_hour = events_per_second * 3600
    
    # Categorize frequency
    if events_per_hour >= 50:
        frequency_level = "very_high"
    elif events_per_hour >= 20:
        frequency_level = "high"
    elif events_per_hour >= 5:
        frequency_level = "moderate"
    elif events_per_hour >= 1:
        frequency_level = "low"
    else:
        frequency_level = "very_low"
    
    return {
        "total_events": total_events,
        "time_window_seconds": total_seconds,
        "events_per_second": round(events_per_second, 4),
        "events_per_minute": round(events_per_minute, 2),
        "events_per_hour": round(events_per_hour, 2),
        "frequency_level": frequency_level
    }


async def find_common_patterns(db_service, start_time: datetime, limit: int) -> List[Dict[str, Any]]:
    """Find common correlation patterns in recent events"""
    try:
        connection_context = await db_service.get_connection_context()
        async with connection_context as conn:
            # Find common source IPs with multiple events
            query = """
                SELECT source_ip, COUNT(*) as event_count, 
                       array_agg(DISTINCT event_type) as event_types,
                       MAX(created_at) as latest_event
                FROM security.events 
                WHERE created_at >= $1 AND source_ip IS NOT NULL
                GROUP BY source_ip
                HAVING COUNT(*) >= 3
                ORDER BY event_count DESC
                LIMIT $2
            """
            
            rows = await conn.fetch(query, start_time, limit)
            
            patterns = []
            for row in rows:
                patterns.append({
                    "pattern_type": "source_ip",
                    "key": row["source_ip"],
                    "event_count": row["event_count"],
                    "event_types": list(row["event_types"]),
                    "latest_event": row["latest_event"].isoformat(),
                    "pattern_strength": "high" if row["event_count"] >= 10 else "moderate"
                })
            
            return patterns
            
    except Exception as e:
        logger.error("Failed to find common patterns", error=str(e))
        return []


def validate_correlation_rule(rule: Dict[str, Any]) -> bool:
    """Validate correlation rule structure"""
    required_fields = ["name", "conditions", "action"]
    return all(field in rule for field in required_fields)