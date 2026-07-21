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
from ..schemas.pagination import paginate

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


def _incident_from_row(row: Any) -> Incident:
    """Map a persisted security event without inventing incident details."""
    event_type = row["event_type"]
    title = event_type.replace("_", " ").title()
    if row["user_id"]:
        title += f" - User: {row['user_id']}"
    elif row["source_ip"]:
        title += f" - IP: {row['source_ip']}"

    tags = [event_type]
    if row["source_ip"]:
        tags.append("network")
    if row["user_id"]:
        tags.append("user_activity")
    if row["ml_score"] is not None and float(row["ml_score"]) > 0.8:
        tags.append("high_confidence")

    return Incident(
        incident_id=str(row["id"]),
        title=title,
        description=row["description"] or "",
        severity=row["severity"],
        status=row["status"],
        created_at=row["created_at"].isoformat() + "Z",
        updated_at=row["updated_at"].isoformat() + "Z",
        assigned_to=str(row["assigned_to"]) if row["assigned_to"] else None,
        tags=tags,
        source_ip=str(row["source_ip"]) if row["source_ip"] else None,
        destination_ip=str(row["destination_ip"]) if row["destination_ip"] else None,
        user_id=row["user_id"],
        endpoint=row["endpoint"],
        ml_score=float(row["ml_score"]) if row["ml_score"] is not None else None,
        event_type=event_type,
    )


@router.get("")
@router.get("/")
async def get_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    limit: int = 50
) -> dict:
    """Get security incidents from database with pagination and search"""
    try:
        # Get database service and connection
        db_service = await get_database_service()
        await db_service.ensure_connected()
        connection_context = await db_service.get_connection_context()
        async with connection_context as conn:
            # Build base WHERE clause
            where_clause = "WHERE 1=1"
            params = []

            if status:
                params.append(status)
                where_clause += " AND status = $" + str(len(params))

            if severity:
                params.append(severity)
                where_clause += " AND severity = $" + str(len(params))

            if search:
                search_pattern = f"%{search}%"
                p = len(params)
                params.extend([search_pattern, search_pattern, search_pattern, search_pattern])
                where_clause += (
                    f" AND (description ILIKE ${p+1}"
                    f" OR event_type ILIKE ${p+2}"
                    f" OR user_id ILIKE ${p+3}"
                    f" OR CAST(source_ip AS TEXT) ILIKE ${p+4})"
                )

            # Count query
            count_query = f"SELECT COUNT(*) FROM security.events {where_clause}"
            total = await conn.fetchval(count_query, *params)

            # Data query with pagination
            offset = (page - 1) * page_size
            params.append(page_size)
            params.append(offset)
            data_query = f"""
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
                {where_clause}
                ORDER BY created_at DESC
                LIMIT ${len(params) - 1} OFFSET ${len(params)}
            """

            rows = await conn.fetch(data_query, *params)

        incidents = [_incident_from_row(row) for row in rows]

        return paginate(
            items=[incident.dict() for incident in incidents],
            total=total,
            page=page,
            page_size=page_size
        )

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
    """Get a specific persisted incident."""
    try:
        db_service = await get_database_service()
        connection_context = await db_service.get_connection_context()
        async with connection_context as conn:
            row = await conn.fetchrow(
                """
                SELECT id, event_type, description, severity, status, source_ip,
                       destination_ip, user_id, endpoint, ml_score, created_at,
                       updated_at, assigned_to
                FROM security.events
                WHERE id = $1::uuid
                """,
                incident_id,
            )
        if row is None:
            raise HTTPException(status_code=404, detail="Incident not found")
        return _incident_from_row(row)
    except HTTPException:
        raise
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
    """Update incident lifecycle fields while preserving source evidence."""
    try:
        logger.info("Updating incident", incident_id=incident_id, title=incident.title)
        db_service = await get_database_service()
        connection_context = await db_service.get_connection_context()
        async with connection_context as conn:
            row = await conn.fetchrow(
                """
                UPDATE security.events
                SET status = $2, assigned_to = $3::uuid, updated_at = NOW()
                WHERE id = $1::uuid
                RETURNING id, event_type, description, severity, status, source_ip,
                          destination_ip, user_id, endpoint, ml_score, created_at,
                          updated_at, assigned_to
                """,
                incident_id,
                incident.status,
                incident.assigned_to,
            )
        if row is None:
            raise HTTPException(status_code=404, detail="Incident not found")
        return _incident_from_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating incident", error=str(e), incident_id=incident_id)
        raise HTTPException(status_code=500, detail="Failed to update incident")


@router.delete("/{incident_id}")
async def delete_incident(incident_id: str) -> dict:
    """Never destroy source evidence through the incident API."""
    raise HTTPException(
        status_code=405,
        detail=(
            "Incident evidence cannot be deleted. Apply a documented retention "
            "policy through the investigation-case workflow."
        ),
    )
