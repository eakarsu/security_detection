"""
NodeGuard AI Security Platform - Threat Intelligence Routes
Threat intelligence and IOC management endpoints
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import structlog
from ..services.database import get_database_service
from ..schemas.pagination import paginate

logger = structlog.get_logger(__name__)

router = APIRouter()


class ThreatIndicator(BaseModel):
    """Threat indicator model"""
    id: str
    type: str
    value: str
    threat_type: str
    severity: str
    confidence: float
    source: str
    first_seen: str
    last_seen: str
    description: str
    tags: List[str] = []
    is_active: bool = True


class ThreatFeed(BaseModel):
    """Threat feed model"""
    id: str
    name: str
    source: str
    status: str
    last_updated: str
    indicators_count: int
    feed_type: str


@router.get("")
@router.get("/")
async def get_threat_intelligence(
    type: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    limit: int = 100
) -> Dict[str, Any]:
    """Get threat intelligence data including indicators and feeds with pagination"""
    try:
        # Get database service and connection
        db_service = await get_database_service()
        await db_service.ensure_connected()
        connection_context = await db_service.get_connection_context()
        async with connection_context as conn:
            # Build base WHERE clause
            where_clause = "WHERE is_active = true"
            params = []

            if type:
                params.append(type)
                where_clause += " AND indicator_type = $" + str(len(params))

            if search:
                search_pattern = f"%{search}%"
                p = len(params)
                params.extend([search_pattern, search_pattern])
                where_clause += f" AND (indicator_value ILIKE ${p+1} OR description ILIKE ${p+2})"

            # Count query for pagination
            count_query = f"SELECT COUNT(*) FROM security.threat_intel {where_clause}"
            total = await conn.fetchval(count_query, *params)

            # Data query with pagination
            offset = (page - 1) * page_size
            params.append(page_size)
            params.append(offset)
            query = f"""
                SELECT
                    id,
                    indicator_type,
                    indicator_value,
                    threat_type,
                    confidence_score,
                    source,
                    description,
                    first_seen,
                    last_seen,
                    is_active,
                    created_at
                FROM security.threat_intel
                {where_clause}
                ORDER BY confidence_score DESC, last_seen DESC
                LIMIT ${len(params) - 1} OFFSET ${len(params)}
            """

            rows = await conn.fetch(query, *params)

        indicators = []
        for row in rows:
            # Map confidence score to severity
            confidence = float(row['confidence_score'])
            if confidence >= 0.9:
                severity_level = "critical"
            elif confidence >= 0.8:
                severity_level = "high"
            elif confidence >= 0.6:
                severity_level = "medium"
            else:
                severity_level = "low"

            # Generate tags based on threat type and indicator type
            tags = [row['threat_type'], row['indicator_type']]
            if row['indicator_type'] in ['ip', 'domain', 'url']:
                tags.append("network")
            elif row['indicator_type'] in ['hash']:
                tags.append("file")
            elif row['indicator_type'] in ['email']:
                tags.append("email")

            indicator = ThreatIndicator(
                id=str(row['id']),
                type=row['indicator_type'],
                value=row['indicator_value'],
                threat_type=row['threat_type'],
                severity=severity_level,
                confidence=confidence,
                source=row['source'],
                first_seen=row['first_seen'].isoformat() + 'Z' if row['first_seen'] else row['created_at'].isoformat() + 'Z',
                last_seen=row['last_seen'].isoformat() + 'Z' if row['last_seen'] else row['created_at'].isoformat() + 'Z',
                description=row['description'],
                tags=tags,
                is_active=row['is_active']
            )
            indicators.append(indicator)

        # Apply severity filter after mapping
        if severity:
            indicators = [i for i in indicators if i.severity == severity]

        # Mock threat feeds (these could also come from database in the future)
        feeds = [
            ThreatFeed(
                id="feed_1",
                name="VirusTotal Intelligence",
                source="VirusTotal",
                status="active",
                last_updated="2025-08-02T12:00:00Z",
                indicators_count=len([i for i in indicators if i.source == "virustotal"]),
                feed_type="commercial"
            ),
            ThreatFeed(
                id="feed_2",
                name="PhishTank",
                source="PhishTank",
                status="active",
                last_updated="2025-08-02T11:30:00Z",
                indicators_count=len([i for i in indicators if i.source == "phishtank"]),
                feed_type="community"
            ),
            ThreatFeed(
                id="feed_3",
                name="Internal Detection",
                source="NodeGuard Internal",
                status="active",
                last_updated="2025-08-02T11:45:00Z",
                indicators_count=len([i for i in indicators if i.source == "internal_detection"]),
                feed_type="internal"
            ),
            ThreatFeed(
                id="feed_4",
                name="Threat Feed",
                source="External Feeds",
                status="active",
                last_updated="2025-08-02T13:00:00Z",
                indicators_count=len([i for i in indicators if i.source == "threat_feed"]),
                feed_type="commercial"
            ),
            ThreatFeed(
                id="feed_5",
                name="Manual Analysis",
                source="Security Team",
                status="active",
                last_updated="2025-08-02T10:00:00Z",
                indicators_count=len([i for i in indicators if i.source == "manual_analysis"]),
                feed_type="internal"
            )
        ]

        paginated_indicators = paginate(
            items=[indicator.dict() for indicator in indicators],
            total=total,
            page=page,
            page_size=page_size
        )

        return {
            "indicators": paginated_indicators,
            "feeds": [feed.dict() for feed in feeds]
        }

    except Exception as e:
        logger.error("Error retrieving threat intelligence", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve threat intelligence data")


@router.get("/indicators", response_model=List[ThreatIndicator])
async def get_threat_indicators(
    indicator_type: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 100
) -> List[ThreatIndicator]:
    """Get threat indicators only"""
    try:
        data = await get_threat_intelligence(type=indicator_type, severity=severity, limit=limit)
        return [ThreatIndicator(**indicator) for indicator in data["indicators"]]
        
    except Exception as e:
        logger.error("Error retrieving threat indicators", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve indicators")


@router.get("/feeds", response_model=List[ThreatFeed])
async def get_threat_feeds() -> List[ThreatFeed]:
    """Get threat intelligence feeds"""
    try:
        data = await get_threat_intelligence()
        return [ThreatFeed(**feed) for feed in data["feeds"]]
        
    except Exception as e:
        logger.error("Error retrieving threat feeds", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve feeds")


@router.get("/indicators/{indicator_id}", response_model=ThreatIndicator)
async def get_threat_indicator(indicator_id: str) -> ThreatIndicator:
    """Get specific threat indicator"""
    try:
        # Get database service and connection
        db_service = await get_database_service()
        await db_service.ensure_connected()
        connection_context = await db_service.get_connection_context()
        async with connection_context as conn:
            query = """
                SELECT 
                    id,
                    indicator_type,
                    indicator_value,
                    threat_type,
                    confidence_score,
                    source,
                    description,
                    first_seen,
                    last_seen,
                    is_active,
                    created_at
                FROM security.threat_intel
                WHERE id = $1
            """
            
            row = await conn.fetchrow(query, indicator_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="Threat indicator not found")
        
        # Map confidence score to severity
        confidence = float(row['confidence_score'])
        if confidence >= 0.9:
            severity_level = "critical"
        elif confidence >= 0.8:
            severity_level = "high"
        elif confidence >= 0.6:
            severity_level = "medium"
        else:
            severity_level = "low"
        
        # Generate tags based on threat type and indicator type
        tags = [row['threat_type'], row['indicator_type']]
        if row['indicator_type'] in ['ip', 'domain', 'url']:
            tags.append("network")
        elif row['indicator_type'] in ['hash']:
            tags.append("file")
        elif row['indicator_type'] in ['email']:
            tags.append("email")
            
        return ThreatIndicator(
            id=str(row['id']),
            type=row['indicator_type'],
            value=row['indicator_value'],
            threat_type=row['threat_type'],
            severity=severity_level,
            confidence=confidence,
            source=row['source'],
            first_seen=row['first_seen'].isoformat() + 'Z' if row['first_seen'] else row['created_at'].isoformat() + 'Z',
            last_seen=row['last_seen'].isoformat() + 'Z' if row['last_seen'] else row['created_at'].isoformat() + 'Z',
            description=row['description'],
            tags=tags,
            is_active=row['is_active']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving threat indicator", error=str(e), indicator_id=indicator_id)
        raise HTTPException(status_code=500, detail="Failed to retrieve indicator")
