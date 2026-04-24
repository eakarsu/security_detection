"""
NodeGuard AI Security Platform - SIEM Routes
Log ingestion, search, streaming, alerting rules, and retention management
"""

import json
import asyncio
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import structlog

from ..services.database import get_database_service
from ..services.log_parser import normalize
from ..services.search_engine import SearchEngine
from ..services.alerting_engine import AlertingEngine
from ..schemas.pagination import paginate

logger = structlog.get_logger(__name__)
router = APIRouter()


# --- Pydantic Models ---

class LogIngestRequest(BaseModel):
    raw_content: str
    format: str = "json"
    source_id: Optional[str] = None

class LogBatchIngestRequest(BaseModel):
    logs: List[LogIngestRequest]

class LogSourceCreate(BaseModel):
    name: str
    source_type: str = "custom"
    format: str = "json"
    description: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    enabled: bool = True

class AlertingRuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    conditions: Any
    threshold: int = 1
    window_seconds: int = 300
    severity: str = "medium"
    actions: Optional[Any] = []

class RetentionPolicyCreate(BaseModel):
    source_type: str
    retention_days: int = 90
    archive_enabled: bool = False
    archive_location: Optional[str] = None


# --- Log Ingestion ---

@router.post("/logs/ingest")
async def ingest_log(request: LogIngestRequest):
    """Ingest a single raw log, parse and normalize it"""
    try:
        db_service = await get_database_service()
        await db_service.ensure_connected()
        ctx = await db_service.get_connection_context()
        async with ctx as conn:
            # Store raw log
            raw_row = await conn.fetchrow("""
                INSERT INTO security.raw_logs (source_id, format, raw_content)
                VALUES ($1, $2, $3) RETURNING id
            """, request.source_id if request.source_id else None,
                request.format, request.raw_content)

            raw_id = raw_row['id']

            # Normalize
            normalized = normalize(request.raw_content, request.format)

            # Insert normalized log
            norm_row = await conn.fetchrow("""
                INSERT INTO security.normalized_logs
                (raw_log_id, timestamp, source_type, source_name, action, severity,
                 src_ip, dst_ip, src_port, dst_port, protocol, username, hostname,
                 message, extra_fields)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING id
            """, raw_id,
                datetime.fromisoformat(normalized['timestamp']) if normalized.get('timestamp') else datetime.utcnow(),
                normalized.get('source_type', ''),
                normalized.get('source_name', ''),
                normalized.get('action', ''),
                normalized.get('severity', 'info'),
                normalized.get('src_ip', ''),
                normalized.get('dst_ip', ''),
                normalized.get('src_port'),
                normalized.get('dst_port'),
                normalized.get('protocol', ''),
                normalized.get('username', ''),
                normalized.get('hostname', ''),
                normalized.get('message', ''),
                json.dumps(normalized.get('extra_fields', {})))

            # Mark raw as processed
            await conn.execute("UPDATE security.raw_logs SET processed = true WHERE id = $1", raw_id)

        return {
            "status": "ingested",
            "raw_log_id": str(raw_id),
            "normalized_log_id": str(norm_row['id']),
            "parsed": normalized
        }

    except Exception as e:
        logger.error("Log ingestion failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")


@router.post("/logs/ingest/batch")
async def ingest_logs_batch(request: LogBatchIngestRequest):
    """Ingest multiple logs at once"""
    results = []
    for log in request.logs:
        try:
            result = await ingest_log(log)
            results.append(result)
        except Exception as e:
            results.append({"status": "error", "error": str(e)})
    return {"ingested": len([r for r in results if r.get('status') == 'ingested']), "total": len(results), "results": results}


# --- Log Search ---

@router.get("/logs")
async def search_logs(
    time_start: Optional[str] = None,
    time_end: Optional[str] = None,
    source_type: Optional[str] = None,
    severity: Optional[str] = None,
    src_ip: Optional[str] = None,
    dst_ip: Optional[str] = None,
    username: Optional[str] = None,
    hostname: Optional[str] = None,
    action: Optional[str] = None,
    text_search: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
):
    """Search normalized logs with filters"""
    try:
        filters = {
            'page': page,
            'page_size': page_size,
            'text_search': text_search,
        }
        if time_start:
            filters['time_start'] = datetime.fromisoformat(time_start.replace('Z', '+00:00').replace('+00:00', ''))
        if time_end:
            filters['time_end'] = datetime.fromisoformat(time_end.replace('Z', '+00:00').replace('+00:00', ''))
        if source_type:
            filters['source_type'] = source_type
        if severity:
            filters['severity'] = severity
        if src_ip:
            filters['src_ip'] = src_ip
        if dst_ip:
            filters['dst_ip'] = dst_ip
        if username:
            filters['username'] = username
        if hostname:
            filters['hostname'] = hostname
        if action:
            filters['action'] = action

        query, params, count_query, count_params = SearchEngine.build_query(filters)

        db_service = await get_database_service()
        await db_service.ensure_connected()
        ctx = await db_service.get_connection_context()
        async with ctx as conn:
            total = await conn.fetchval(count_query, *count_params)
            rows = await conn.fetch(query, *params)

        logs = []
        for row in rows:
            logs.append({
                'id': str(row['id']),
                'timestamp': row['timestamp'].isoformat() + 'Z' if row['timestamp'] else None,
                'source_type': row['source_type'],
                'source_name': row['source_name'],
                'action': row['action'],
                'severity': row['severity'],
                'src_ip': row['src_ip'],
                'dst_ip': row['dst_ip'],
                'src_port': row['src_port'],
                'dst_port': row['dst_port'],
                'protocol': row['protocol'],
                'username': row['username'],
                'hostname': row['hostname'],
                'message': row['message'],
                'extra_fields': json.loads(row['extra_fields']) if isinstance(row['extra_fields'], str) else row['extra_fields'],
            })

        return paginate(items=logs, total=total or 0, page=page, page_size=page_size)

    except Exception as e:
        logger.error("Log search failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


# --- Log Streaming (SSE) ---

@router.get("/logs/stream")
async def stream_logs(severity: Optional[str] = None, source_type: Optional[str] = None):
    """Server-Sent Events endpoint for real-time log streaming"""
    async def event_generator():
        last_timestamp = datetime.utcnow()
        try:
            while True:
                try:
                    db_service = await get_database_service()
                    await db_service.ensure_connected()
                    ctx = await db_service.get_connection_context()
                    async with ctx as conn:
                        where = "timestamp > $1"
                        params = [last_timestamp]
                        idx = 1

                        if severity:
                            idx += 1
                            where += f" AND severity = ${idx}"
                            params.append(severity)
                        if source_type:
                            idx += 1
                            where += f" AND source_type = ${idx}"
                            params.append(source_type)

                        rows = await conn.fetch(f"""
                            SELECT id, timestamp, source_type, source_name, action, severity,
                                   src_ip, dst_ip, username, hostname, message
                            FROM security.normalized_logs
                            WHERE {where}
                            ORDER BY timestamp ASC
                            LIMIT 50
                        """, *params)

                        for row in rows:
                            log_data = {
                                'id': str(row['id']),
                                'timestamp': row['timestamp'].isoformat() + 'Z' if row['timestamp'] else None,
                                'source_type': row['source_type'],
                                'severity': row['severity'],
                                'src_ip': row['src_ip'],
                                'dst_ip': row['dst_ip'],
                                'username': row['username'],
                                'action': row['action'],
                                'message': (row['message'] or '')[:500],
                            }
                            yield f"data: {json.dumps(log_data)}\n\n"
                            if row['timestamp']:
                                last_timestamp = row['timestamp']

                except Exception as e:
                    logger.error("Stream error", error=str(e))
                    yield f"data: {json.dumps({'error': str(e)})}\n\n"

                await asyncio.sleep(2)
        except asyncio.CancelledError:
            pass

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# --- Log Stats ---

@router.get("/logs/stats")
async def get_log_stats(group_by: str = "source_type", time_range: Optional[str] = None):
    """Get log volume statistics"""
    try:
        tr = {}
        if time_range:
            hours_map = {'15m': 0.25, '1h': 1, '24h': 24, '7d': 168, '30d': 720}
            hours = hours_map.get(time_range, 24)
            tr['start'] = datetime.utcnow() - timedelta(hours=hours)

        query, params = SearchEngine.build_stats_query(group_by, tr)

        db_service = await get_database_service()
        await db_service.ensure_connected()
        ctx = await db_service.get_connection_context()
        async with ctx as conn:
            rows = await conn.fetch(query, *params)
            total = await conn.fetchval("SELECT COUNT(*) FROM security.normalized_logs")

        stats = [{'label': row['label'] or 'unknown', 'count': row['count']} for row in rows]

        return {
            'total_logs': total or 0,
            'group_by': group_by,
            'stats': stats
        }

    except Exception as e:
        logger.error("Stats query failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# --- Log Sources ---

@router.post("/sources")
async def create_log_source(source: LogSourceCreate):
    """Register a new log source"""
    try:
        db_service = await get_database_service()
        await db_service.ensure_connected()
        ctx = await db_service.get_connection_context()
        async with ctx as conn:
            row = await conn.fetchrow("""
                INSERT INTO security.log_sources (name, source_type, format, description, host, port, enabled)
                VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
            """, source.name, source.source_type, source.format,
                source.description, source.host, source.port, source.enabled)

        return {k: (str(v) if k == 'id' else v.isoformat() + 'Z' if isinstance(v, datetime) else v) for k, v in dict(row).items()}

    except Exception as e:
        logger.error("Create source failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sources")
async def list_log_sources():
    """List all registered log sources"""
    try:
        db_service = await get_database_service()
        await db_service.ensure_connected()
        ctx = await db_service.get_connection_context()
        async with ctx as conn:
            rows = await conn.fetch("SELECT * FROM security.log_sources ORDER BY created_at DESC")

        sources = []
        for row in rows:
            sources.append({
                'id': str(row['id']),
                'name': row['name'],
                'source_type': row['source_type'],
                'format': row['format'],
                'description': row['description'],
                'host': row['host'],
                'port': row['port'],
                'enabled': row['enabled'],
                'last_seen_at': row['last_seen_at'].isoformat() + 'Z' if row['last_seen_at'] else None,
                'created_at': row['created_at'].isoformat() + 'Z' if row['created_at'] else None,
            })
        return sources

    except Exception as e:
        logger.error("List sources failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/sources/{source_id}")
async def update_log_source(source_id: str, source: LogSourceCreate):
    """Update a log source"""
    try:
        db_service = await get_database_service()
        await db_service.ensure_connected()
        ctx = await db_service.get_connection_context()
        async with ctx as conn:
            await conn.execute("""
                UPDATE security.log_sources
                SET name=$1, source_type=$2, format=$3, description=$4, host=$5, port=$6, enabled=$7, updated_at=CURRENT_TIMESTAMP
                WHERE id=$8
            """, source.name, source.source_type, source.format,
                source.description, source.host, source.port, source.enabled, source_id)
        return {"status": "updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Alerting Rules ---

@router.post("/rules")
async def create_alerting_rule(rule: AlertingRuleCreate):
    """Create a new alerting rule"""
    try:
        db_service = await get_database_service()
        await db_service.ensure_connected()
        ctx = await db_service.get_connection_context()
        async with ctx as conn:
            row = await conn.fetchrow("""
                INSERT INTO security.alerting_rules (name, description, conditions, threshold, window_seconds, severity, actions)
                VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
            """, rule.name, rule.description,
                json.dumps(rule.conditions) if not isinstance(rule.conditions, str) else rule.conditions,
                rule.threshold, rule.window_seconds, rule.severity,
                json.dumps(rule.actions) if rule.actions else '[]')

        return {"id": str(row['id']), "status": "created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rules")
async def list_alerting_rules():
    """List all alerting rules"""
    try:
        db_service = await get_database_service()
        await db_service.ensure_connected()
        ctx = await db_service.get_connection_context()
        async with ctx as conn:
            rows = await conn.fetch("SELECT * FROM security.alerting_rules ORDER BY created_at DESC")

        rules = []
        for row in rows:
            rules.append({
                'id': str(row['id']),
                'name': row['name'],
                'description': row['description'],
                'conditions': json.loads(row['conditions']) if isinstance(row['conditions'], str) else row['conditions'],
                'threshold': row['threshold'],
                'window_seconds': row['window_seconds'],
                'severity': row['severity'],
                'actions': json.loads(row['actions']) if isinstance(row['actions'], str) else row['actions'],
                'enabled': row['enabled'],
                'last_triggered_at': row['last_triggered_at'].isoformat() + 'Z' if row['last_triggered_at'] else None,
                'created_at': row['created_at'].isoformat() + 'Z' if row['created_at'] else None,
            })
        return rules

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/rules/{rule_id}")
async def update_alerting_rule(rule_id: str, rule: AlertingRuleCreate):
    """Update an alerting rule"""
    try:
        db_service = await get_database_service()
        await db_service.ensure_connected()
        ctx = await db_service.get_connection_context()
        async with ctx as conn:
            await conn.execute("""
                UPDATE security.alerting_rules
                SET name=$1, description=$2, conditions=$3, threshold=$4, window_seconds=$5, severity=$6, actions=$7, updated_at=CURRENT_TIMESTAMP
                WHERE id=$8
            """, rule.name, rule.description,
                json.dumps(rule.conditions) if not isinstance(rule.conditions, str) else rule.conditions,
                rule.threshold, rule.window_seconds, rule.severity,
                json.dumps(rule.actions) if rule.actions else '[]', rule_id)
        return {"status": "updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/rules/{rule_id}")
async def delete_alerting_rule(rule_id: str):
    """Delete an alerting rule"""
    try:
        db_service = await get_database_service()
        await db_service.ensure_connected()
        ctx = await db_service.get_connection_context()
        async with ctx as conn:
            await conn.execute("DELETE FROM security.alerting_rules WHERE id = $1", rule_id)
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rules/{rule_id}/matches")
async def get_rule_matches(rule_id: str, page: int = 1, page_size: int = 20):
    """Get alerting rule match history"""
    try:
        db_service = await get_database_service()
        await db_service.ensure_connected()
        ctx = await db_service.get_connection_context()
        async with ctx as conn:
            total = await conn.fetchval(
                "SELECT COUNT(*) FROM security.alerting_rule_matches WHERE rule_id = $1", rule_id)
            rows = await conn.fetch("""
                SELECT * FROM security.alerting_rule_matches
                WHERE rule_id = $1 ORDER BY matched_at DESC
                LIMIT $2 OFFSET $3
            """, rule_id, page_size, (page - 1) * page_size)

        matches = [{
            'id': str(r['id']),
            'rule_id': str(r['rule_id']),
            'matched_at': r['matched_at'].isoformat() + 'Z' if r['matched_at'] else None,
            'matched_events': json.loads(r['matched_events']) if isinstance(r['matched_events'], str) else r['matched_events'],
            'details': r['details'],
        } for r in rows]

        return paginate(items=matches, total=total or 0, page=page, page_size=page_size)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rules/evaluate")
async def evaluate_rules():
    """Manually trigger evaluation of all alerting rules"""
    try:
        db_service = await get_database_service()
        await db_service.ensure_connected()
        ctx = await db_service.get_connection_context()
        async with ctx as conn:
            matches = await AlertingEngine.check_all_rules(conn)
        return {"matches_found": len(matches), "matches": matches}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Retention Policies ---

@router.post("/retention")
async def create_retention_policy(policy: RetentionPolicyCreate):
    """Create a log retention policy"""
    try:
        db_service = await get_database_service()
        await db_service.ensure_connected()
        ctx = await db_service.get_connection_context()
        async with ctx as conn:
            row = await conn.fetchrow("""
                INSERT INTO security.log_retention_policies (source_type, retention_days, archive_enabled, archive_location)
                VALUES ($1, $2, $3, $4) RETURNING id
            """, policy.source_type, policy.retention_days, policy.archive_enabled, policy.archive_location)
        return {"id": str(row['id']), "status": "created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/retention")
async def list_retention_policies():
    """List all retention policies"""
    try:
        db_service = await get_database_service()
        await db_service.ensure_connected()
        ctx = await db_service.get_connection_context()
        async with ctx as conn:
            rows = await conn.fetch("SELECT * FROM security.log_retention_policies ORDER BY source_type")

        return [{
            'id': str(r['id']),
            'source_type': r['source_type'],
            'retention_days': r['retention_days'],
            'archive_enabled': r['archive_enabled'],
            'archive_location': r['archive_location'],
            'created_at': r['created_at'].isoformat() + 'Z' if r['created_at'] else None,
        } for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
