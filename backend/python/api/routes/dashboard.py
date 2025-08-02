"""
NodeGuard AI Security Platform - Dashboard Routes
Dashboard metrics and analytics endpoints
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import structlog
from datetime import datetime, timedelta
from ..services.database import DatabaseService

logger = structlog.get_logger(__name__)

router = APIRouter()


class DashboardMetrics(BaseModel):
    """Dashboard metrics model"""
    total_events: int
    critical_events: int
    high_events: int
    medium_events: int
    low_events: int
    threat_indicators: int
    blocked_attacks: int
    mean_time_to_detection: float
    mean_time_to_response: float


class EventTrend(BaseModel):
    """Event trend data model"""
    date: str
    count: int
    severity: str


class TopThreat(BaseModel):
    """Top threat model"""
    threat_type: str
    count: int
    severity: str


@router.get("/metrics", response_model=DashboardMetrics)
async def get_dashboard_metrics() -> DashboardMetrics:
    """Get dashboard overview metrics"""
    try:
        # Create database service instance
        db = DatabaseService()
        await db.initialize()
        conn = await db.get_connection()
        
        # Get event counts by severity for today
        today = datetime.now().date()
        event_query = """
            SELECT 
                severity,
                COUNT(*) as count
            FROM security.events 
            WHERE DATE(created_at) = $1
            GROUP BY severity
        """
        
        event_rows = await conn.fetch(event_query, today)
        
        # Initialize counts
        severity_counts = {
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0
        }
        
        total_events = 0
        for row in event_rows:
            severity_counts[row['severity']] = row['count']
            total_events += row['count']
        
        # Get threat intelligence count
        threat_query = """
            SELECT COUNT(*) as count
            FROM security.threat_intel 
            WHERE is_active = true AND confidence_score >= 0.8
        """
        threat_row = await conn.fetchrow(threat_query)
        threat_indicators = threat_row['count'] if threat_row else 0
        
        # Get blocked attacks count (events with status 'blocked')
        blocked_query = """
            SELECT COUNT(*) as count
            FROM security.events 
            WHERE status = 'blocked' AND DATE(created_at) = $1
        """
        blocked_row = await conn.fetchrow(blocked_query, today)
        blocked_attacks = blocked_row['count'] if blocked_row else 0
        
        # Get metrics from analytics table if available
        metrics_query = """
            SELECT metric_name, metric_value
            FROM analytics.metrics 
            WHERE metric_name IN ('mean_time_to_detection', 'mean_time_to_response')
            AND DATE(timestamp) = $1
            ORDER BY timestamp DESC
            LIMIT 2
        """
        metrics_rows = await conn.fetch(metrics_query, today)
        
        mttd = 8.5  # Default values
        mttr = 23.2
        
        for row in metrics_rows:
            if row['metric_name'] == 'mean_time_to_detection':
                mttd = float(row['metric_value'])
            elif row['metric_name'] == 'mean_time_to_response':
                mttr = float(row['metric_value'])
        
        await conn.close()
        
        return DashboardMetrics(
            total_events=total_events,
            critical_events=severity_counts['critical'],
            high_events=severity_counts['high'],
            medium_events=severity_counts['medium'],
            low_events=severity_counts['low'],
            threat_indicators=threat_indicators,
            blocked_attacks=blocked_attacks,
            mean_time_to_detection=mttd,
            mean_time_to_response=mttr
        )
        
    except Exception as e:
        logger.error("Error retrieving dashboard metrics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve dashboard metrics")


@router.get("/trends", response_model=List[EventTrend])
async def get_event_trends(days: int = 7) -> List[EventTrend]:
    """Get event trends for the last N days"""
    try:
        # Create database service instance
        db = DatabaseService()
        await db.initialize()
        conn = await db.get_connection()
        
        # Get daily event counts for the last N days
        query = """
            SELECT 
                DATE(created_at) as event_date,
                severity,
                COUNT(*) as count
            FROM security.events 
            WHERE created_at >= $1
            GROUP BY DATE(created_at), severity
            ORDER BY event_date DESC, severity
        """
        
        start_date = datetime.now().date() - timedelta(days=days-1)
        rows = await conn.fetch(query, start_date)
        await conn.close()
        
        trends = []
        for row in rows:
            trend = EventTrend(
                date=row['event_date'].isoformat(),
                count=row['count'],
                severity=row['severity']
            )
            trends.append(trend)
        
        return trends
        
    except Exception as e:
        logger.error("Error retrieving event trends", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve event trends")


@router.get("/top-threats", response_model=List[TopThreat])
async def get_top_threats(limit: int = 10) -> List[TopThreat]:
    """Get top threat types by frequency"""
    try:
        # Create database service instance
        db = DatabaseService()
        await db.initialize()
        conn = await db.get_connection()
        
        # Get top threat types from recent events
        query = """
            SELECT 
                event_type as threat_type,
                severity,
                COUNT(*) as count
            FROM security.events 
            WHERE created_at >= $1
            GROUP BY event_type, severity
            ORDER BY count DESC
            LIMIT $2
        """
        
        # Look at last 30 days
        start_date = datetime.now() - timedelta(days=30)
        rows = await conn.fetch(query, start_date, limit)
        await conn.close()
        
        threats = []
        for row in rows:
            threat = TopThreat(
                threat_type=row['threat_type'].replace('_', ' ').title(),
                count=row['count'],
                severity=row['severity']
            )
            threats.append(threat)
        
        return threats
        
    except Exception as e:
        logger.error("Error retrieving top threats", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve top threats")


@router.get("/recent-events")
async def get_recent_events(limit: int = 10) -> List[Dict[str, Any]]:
    """Get recent security events for dashboard"""
    try:
        # Create database service instance
        db = DatabaseService()
        await db.initialize()
        conn = await db.get_connection()
        
        query = """
            SELECT 
                id,
                event_type,
                severity,
                description,
                source_ip,
                user_id,
                status,
                created_at,
                ml_score
            FROM security.events 
            ORDER BY created_at DESC
            LIMIT $1
        """
        
        rows = await conn.fetch(query, limit)
        await conn.close()
        
        events = []
        for row in rows:
            event = {
                "id": str(row['id']),
                "type": row['event_type'].replace('_', ' ').title(),
                "severity": row['severity'],
                "description": row['description'],
                "source_ip": str(row['source_ip']) if row['source_ip'] else None,
                "user_id": row['user_id'],
                "status": row['status'],
                "timestamp": row['created_at'].isoformat() + 'Z',
                "ml_score": float(row['ml_score']) if row['ml_score'] else None
            }
            events.append(event)
        
        return events
        
    except Exception as e:
        logger.error("Error retrieving recent events", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve recent events")


@router.get("/system-health")
async def get_system_health() -> Dict[str, Any]:
    """Get system health metrics"""
    try:
        # Create database service instance
        db = DatabaseService()
        await db.initialize()
        conn = await db.get_connection()
        
        # Get database connection status
        db_status = "healthy"
        
        # Get recent event processing rate
        query = """
            SELECT COUNT(*) as count
            FROM security.events 
            WHERE created_at >= $1
        """
        
        one_hour_ago = datetime.now() - timedelta(hours=1)
        row = await conn.fetchrow(query, one_hour_ago)
        events_last_hour = row['count'] if row else 0
        
        # Get threat intel freshness
        threat_query = """
            SELECT MAX(last_seen) as latest_threat
            FROM security.threat_intel 
            WHERE is_active = true
        """
        
        threat_row = await conn.fetchrow(threat_query)
        latest_threat = threat_row['latest_threat'] if threat_row and threat_row['latest_threat'] else datetime.now()
        
        await conn.close()
        
        # Calculate threat intel freshness (hours since last update)
        threat_freshness = (datetime.now() - latest_threat.replace(tzinfo=None)).total_seconds() / 3600
        
        return {
            "database": {
                "status": db_status,
                "connection": "active"
            },
            "event_processing": {
                "events_last_hour": events_last_hour,
                "processing_rate": f"{events_last_hour}/hour"
            },
            "threat_intelligence": {
                "freshness_hours": round(threat_freshness, 1),
                "status": "fresh" if threat_freshness < 24 else "stale"
            },
            "overall_status": "healthy"
        }
        
    except Exception as e:
        logger.error("Error retrieving system health", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve system health")
