"""
NodeGuard AI Security Platform - Incidents Routes
Security incident management endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import structlog
from datetime import datetime
from ..services.database import get_database_service

logger = structlog.get_logger(__name__)

router = APIRouter()


class Incident(BaseModel):
    """Security incident model"""
    incident_id: str
    title: str
    description: str
    severity: str
    status: str
    created_at: str
    updated_at: str
    assigned_to: Optional[str] = None
    tags: List[str] = []
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    user_id: Optional[str] = None
    endpoint: Optional[str] = None
    ml_score: Optional[float] = None
    event_type: Optional[str] = None


@router.get("", response_model=List[Incident])
@router.get("/", response_model=List[Incident])
async def get_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 50
) -> List[Incident]:
    """Get security incidents from database"""
    try:
        # Get database service and connection
        db_service = await get_database_service()
        await db_service.ensure_connected()
        connection_context = await db_service.get_connection_context()
        async with connection_context as conn:
            # Build query with filters
            query = """
                SELECT 
                    id,
                    event_type,
                    description,
                    severity,
                    status,
                    source_ip,
                    destination_ip,
                    user_id,
                    endpoint,
                    ml_score,
                    created_at,
                    updated_at,
                    assigned_to
                FROM security.events
                WHERE 1=1
            """
            params = []
            
            if status:
                query += " AND status = $" + str(len(params) + 1)
                params.append(status)
                
            if severity:
                query += " AND severity = $" + str(len(params) + 1)
                params.append(severity)
                
            query += " ORDER BY created_at DESC LIMIT $" + str(len(params) + 1)
            params.append(limit)
            
            rows = await conn.fetch(query, *params)
        
        incidents = []
        for row in rows:
            # Create title based on event type and description
            title = f"{row['event_type'].replace('_', ' ').title()}"
            if row['user_id']:
                title += f" - User: {row['user_id']}"
            elif row['source_ip']:
                title += f" - IP: {row['source_ip']}"
                
            # Extract tags from event type and other fields
            tags = [row['event_type']]
            if row['source_ip']:
                tags.append("network")
            if row['user_id']:
                tags.append("user_activity")
            if row['ml_score'] and row['ml_score'] > 0.8:
                tags.append("high_confidence")
                
            incident = Incident(
                incident_id=str(row['id']),
                title=title,
                description=row['description'],
                severity=row['severity'],
                status=row['status'],
                created_at=row['created_at'].isoformat() + 'Z',
                updated_at=row['updated_at'].isoformat() + 'Z',
                assigned_to=str(row['assigned_to']) if row['assigned_to'] else None,
                tags=tags,
                source_ip=str(row['source_ip']) if row['source_ip'] else None,
                destination_ip=str(row['destination_ip']) if row['destination_ip'] else None,
                user_id=row['user_id'],
                endpoint=row['endpoint'],
                ml_score=float(row['ml_score']) if row['ml_score'] else None,
                event_type=row['event_type']
            )
            incidents.append(incident)
            
        return incidents
        
    except Exception as e:
        logger.error("Error retrieving incidents", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve incidents")


@router.get("/count")
async def get_incident_count() -> dict:
    """Get total count of all incidents"""
    try:
        # Get database service and connection
        db_service = await get_database_service()
        await db_service.ensure_connected()
        connection_context = await db_service.get_connection_context()
        
        async with connection_context as conn:
            # Count all incidents in security.events table
            count_query = "SELECT COUNT(*) FROM security.events"
            total_count = await conn.fetchval(count_query)
            
            # Also get counts by severity for additional info
            severity_query = """
                SELECT severity, COUNT(*) as count 
                FROM security.events 
                GROUP BY severity
            """
            severity_counts = await conn.fetch(severity_query)
            
            severity_breakdown = {row['severity']: row['count'] for row in severity_counts}
        
        logger.info("Retrieved incident count", total=total_count, by_severity=severity_breakdown)
        
        return {
            "total_incidents": total_count,
            "severity_breakdown": severity_breakdown,
            "timestamp": datetime.utcnow().isoformat() + 'Z'
        }
        
    except Exception as e:
        logger.error("Error getting incident count", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get incident count")


@router.get("/{incident_id}", response_model=Incident)
async def get_incident(incident_id: str) -> Incident:
    """Get specific incident"""
    try:
        # Mock data
        return Incident(
            incident_id=incident_id,
            title="Sample Security Incident",
            description="Detailed incident description",
            severity="high",
            status="investigating",
            created_at="2025-08-02T12:00:00Z",
            updated_at="2025-08-02T12:30:00Z",
            assigned_to="security_analyst_1",
            tags=["malware", "endpoint"]
        )
        
    except Exception as e:
        logger.error("Error retrieving incident", error=str(e), incident_id=incident_id)
        raise HTTPException(status_code=500, detail="Failed to retrieve incident")


@router.post("/", response_model=Incident)
async def create_incident(incident_data: Dict[str, Any]) -> Incident:
    """Create new incident"""
    try:
        logger.info("Creating new incident", title=incident_data.get('title', 'Unknown'))
        
        # Get database service and connection
        db_service = await get_database_service()
        await db_service.ensure_connected()
        connection_context = await db_service.get_connection_context()
        
        async with connection_context as conn:
            # Insert into security.events table
            query = """
                INSERT INTO security.events (
                    event_type, description, severity, status,
                    source_ip, destination_ip, user_id, endpoint,
                    ml_score, created_at, updated_at, assigned_to
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), $10)
                RETURNING id
            """
            
            event_id = await conn.fetchval(
                query,
                incident_data.get('title', 'Security Incident'),
                incident_data.get('description', 'Incident created via API'),
                incident_data.get('severity', 'medium'),
                incident_data.get('status', 'open'),
                incident_data.get('source_ip'),
                incident_data.get('destination_ip'),
                incident_data.get('user_id'),
                incident_data.get('endpoint'),
                incident_data.get('ml_score'),
                incident_data.get('assigned_to')
            )
            
        logger.info("Successfully created incident in database", event_id=event_id)
        
        # Return incident object
        return Incident(
            incident_id=str(event_id),
            title=incident_data.get('title', 'Security Incident'),
            description=incident_data.get('description', 'Incident created via API'),
            severity=incident_data.get('severity', 'medium'),
            status=incident_data.get('status', 'open'),
            created_at=datetime.utcnow().isoformat() + 'Z',
            updated_at=datetime.utcnow().isoformat() + 'Z',
            assigned_to=incident_data.get('assigned_to'),
            tags=incident_data.get('tags', []),
            source_ip=incident_data.get('source_ip'),
            destination_ip=incident_data.get('destination_ip'),
            user_id=incident_data.get('user_id'),
            endpoint=incident_data.get('endpoint'),
            ml_score=incident_data.get('ml_score'),
            event_type=incident_data.get('event_type', 'security_incident')
        )
        
    except Exception as e:
        logger.error("Error creating incident", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create incident")


@router.put("/{incident_id}", response_model=Incident)
async def update_incident(incident_id: str, incident: Incident) -> Incident:
    """Update existing incident"""
    try:
        logger.info("Updating incident", incident_id=incident_id, title=incident.title)
        # Mock update - would update in database
        incident.incident_id = incident_id
        return incident
        
    except Exception as e:
        logger.error("Error updating incident", error=str(e), incident_id=incident_id)
        raise HTTPException(status_code=500, detail="Failed to update incident")


@router.delete("/{incident_id}")
async def delete_incident(incident_id: str) -> dict:
    """Delete incident"""
    try:
        logger.info("Deleting incident", incident_id=incident_id)
        # Mock deletion - would delete from database
        return {"message": f"Incident {incident_id} deleted successfully"}
        
    except Exception as e:
        logger.error("Error deleting incident", error=str(e), incident_id=incident_id)
        raise HTTPException(status_code=500, detail="Failed to delete incident")
