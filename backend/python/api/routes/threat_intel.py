"""
NodeGuard AI Security Platform - Threat Intelligence Routes
Threat intelligence and IOC management endpoints
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import structlog
import random

logger = structlog.get_logger(__name__)

router = APIRouter()


class ThreatIndicator(BaseModel):
    """Threat indicator model"""
    id: str
    type: str
    value: str
    threat_type: str
    severity: str
    confidence: int
    source: str
    first_seen: str
    last_seen: str
    description: str
    tags: List[str] = []


class ThreatFeed(BaseModel):
    """Threat feed model"""
    id: str
    name: str
    source: str
    status: str
    last_updated: str
    indicators_count: int
    feed_type: str


@router.get("/", response_model=Dict[str, Any])
async def get_threat_intelligence(
    type: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100
) -> Dict[str, Any]:
    """Get threat intelligence data including indicators and feeds"""
    try:
        # Mock threat indicators
        indicator_types = ['ip', 'domain', 'hash', 'url', 'email']
        severities = ['low', 'medium', 'high', 'critical']
        threat_types = ['malware', 'phishing', 'botnet', 'ransomware', 'apt', 'trojan']
        sources = ['VirusTotal', 'MITRE ATT&CK', 'AlienVault OTX', 'Threat Crowd', 'Internal Analysis']
        
        indicators = []
        for i in range(1, min(limit + 1, 51)):
            indicator_type = random.choice(indicator_types)
            severity = random.choice(severities)
            
            # Generate realistic indicator values based on type
            if indicator_type == 'ip':
                value = f"{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
            elif indicator_type == 'domain':
                domains = ['malicious-site.com', 'phishing-bank.net', 'fake-update.org', 'suspicious-download.info']
                value = random.choice(domains)
            elif indicator_type == 'hash':
                value = f"{''.join(random.choices('abcdef0123456789', k=64))}"
            elif indicator_type == 'url':
                urls = ['http://malicious-site.com/payload', 'https://phishing-bank.net/login', 'http://fake-update.org/download']
                value = random.choice(urls)
            else:  # email
                emails = ['attacker@malicious.com', 'phisher@fake-bank.net', 'spam@suspicious.org']
                value = random.choice(emails)
            
            indicator = ThreatIndicator(
                id=f"ioc_{i}",
                type=indicator_type,
                value=value,
                threat_type=random.choice(threat_types),
                severity=severity,
                confidence=random.randint(60, 95),
                source=random.choice(sources),
                first_seen=f"2025-08-{random.randint(1, 2):02d}T{random.randint(8, 12):02d}:00:00Z",
                last_seen=f"2025-08-02T{random.randint(10, 15):02d}:00:00Z",
                description=f"Suspicious {indicator_type} associated with {random.choice(threat_types)} activity",
                tags=[random.choice(threat_types), random.choice(['network', 'endpoint', 'web', 'email'])]
            )
            indicators.append(indicator)
        
        # Apply filters
        if type:
            indicators = [i for i in indicators if i.type == type]
        if severity:
            indicators = [i for i in indicators if i.severity == severity]
        if search:
            indicators = [i for i in indicators if search.lower() in i.value.lower() or search.lower() in i.description.lower()]
        
        # Mock threat feeds
        feeds = [
            ThreatFeed(
                id="feed_1",
                name="VirusTotal Intelligence",
                source="VirusTotal",
                status="active",
                last_updated="2025-08-02T12:00:00Z",
                indicators_count=15420,
                feed_type="commercial"
            ),
            ThreatFeed(
                id="feed_2",
                name="MITRE ATT&CK",
                source="MITRE Corporation",
                status="active",
                last_updated="2025-08-02T11:30:00Z",
                indicators_count=8934,
                feed_type="open_source"
            ),
            ThreatFeed(
                id="feed_3",
                name="AlienVault OTX",
                source="AT&T Cybersecurity",
                status="active",
                last_updated="2025-08-02T11:45:00Z",
                indicators_count=12567,
                feed_type="community"
            ),
            ThreatFeed(
                id="feed_4",
                name="Threat Crowd",
                source="Threat Crowd",
                status="inactive",
                last_updated="2025-08-01T18:00:00Z",
                indicators_count=5432,
                feed_type="community"
            ),
            ThreatFeed(
                id="feed_5",
                name="Internal Threat Intel",
                source="NodeGuard Internal",
                status="active",
                last_updated="2025-08-02T13:00:00Z",
                indicators_count=2341,
                feed_type="internal"
            ),
            ThreatFeed(
                id="feed_6",
                name="Emerging Threats",
                source="Proofpoint",
                status="error",
                last_updated="2025-08-02T08:00:00Z",
                indicators_count=9876,
                feed_type="commercial"
            )
        ]
        
        return {
            "indicators": [indicator.dict() for indicator in indicators],
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
        # Mock detailed indicator
        return ThreatIndicator(
            id=indicator_id,
            type="ip",
            value="192.168.1.100",
            threat_type="malware",
            severity="high",
            confidence=87,
            source="VirusTotal",
            first_seen="2025-08-01T10:00:00Z",
            last_seen="2025-08-02T12:00:00Z",
            description="IP address associated with known malware command and control infrastructure",
            tags=["malware", "c2", "botnet", "network"]
        )
        
    except Exception as e:
        logger.error("Error retrieving threat indicator", error=str(e), indicator_id=indicator_id)
        raise HTTPException(status_code=500, detail="Failed to retrieve indicator")
