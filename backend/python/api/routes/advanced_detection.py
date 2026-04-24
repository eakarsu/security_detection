"""
NodeGuard AI Security Platform - Advanced Detection Routes
Custom detection rules, YARA rules, and correlation rules
"""

import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import structlog

from ..services.database import get_database_service
from ..schemas.pagination import paginate

logger = structlog.get_logger(__name__)
router = APIRouter()


# --- Pydantic Models ---

class CustomDetectionRuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    conditions: Any
    logic_operator: str = "AND"
    actions: Optional[Any] = []
    severity: str = "medium"
    enabled: bool = True
    created_by: Optional[str] = None

class YARARuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    rule_content: str
    tags: Optional[List[str]] = []
    enabled: bool = True

class CorrelationRuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    event_sequence: Any
    window_seconds: int = 300
    threshold: int = 1
    severity: str = "medium"
    enabled: bool = True


# --- Custom Detection Rules ---

@router.post("/rules")
async def create_custom_rule(rule: CustomDetectionRuleCreate):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            row = await conn.fetchrow("""
                INSERT INTO security.custom_detection_rules
                (name, description, conditions, logic_operator, actions, severity, enabled, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
            """, rule.name, rule.description,
                json.dumps(rule.conditions) if not isinstance(rule.conditions, str) else rule.conditions,
                rule.logic_operator,
                json.dumps(rule.actions) if rule.actions else '[]',
                rule.severity, rule.enabled, rule.created_by)
        return {"id": str(row['id']), "status": "created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rules")
async def list_custom_rules(enabled: Optional[bool] = None):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            if enabled is not None:
                rows = await conn.fetch(
                    "SELECT * FROM security.custom_detection_rules WHERE enabled = $1 ORDER BY created_at DESC", enabled)
            else:
                rows = await conn.fetch("SELECT * FROM security.custom_detection_rules ORDER BY created_at DESC")

        return [{
            'id': str(r['id']), 'name': r['name'], 'description': r['description'],
            'conditions': json.loads(r['conditions']) if isinstance(r['conditions'], str) else r['conditions'],
            'logic_operator': r['logic_operator'],
            'actions': json.loads(r['actions']) if isinstance(r['actions'], str) else r['actions'],
            'severity': r['severity'], 'enabled': r['enabled'],
            'trigger_count': r['trigger_count'],
            'last_triggered_at': r['last_triggered_at'].isoformat() + 'Z' if r['last_triggered_at'] else None,
            'created_at': r['created_at'].isoformat() + 'Z' if r['created_at'] else None,
        } for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rules/{rule_id}")
async def get_custom_rule(rule_id: str):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            r = await conn.fetchrow("SELECT * FROM security.custom_detection_rules WHERE id = $1", rule_id)
        if not r:
            raise HTTPException(status_code=404, detail="Rule not found")
        return {
            'id': str(r['id']), 'name': r['name'], 'description': r['description'],
            'conditions': json.loads(r['conditions']) if isinstance(r['conditions'], str) else r['conditions'],
            'logic_operator': r['logic_operator'],
            'actions': json.loads(r['actions']) if isinstance(r['actions'], str) else r['actions'],
            'severity': r['severity'], 'enabled': r['enabled'],
            'trigger_count': r['trigger_count'],
            'created_at': r['created_at'].isoformat() + 'Z' if r['created_at'] else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/rules/{rule_id}")
async def update_custom_rule(rule_id: str, rule: CustomDetectionRuleCreate):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            await conn.execute("""
                UPDATE security.custom_detection_rules
                SET name=$1, description=$2, conditions=$3, logic_operator=$4,
                    actions=$5, severity=$6, enabled=$7, updated_at=CURRENT_TIMESTAMP
                WHERE id=$8
            """, rule.name, rule.description,
                json.dumps(rule.conditions) if not isinstance(rule.conditions, str) else rule.conditions,
                rule.logic_operator,
                json.dumps(rule.actions) if rule.actions else '[]',
                rule.severity, rule.enabled, rule_id)
        return {"status": "updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/rules/{rule_id}")
async def delete_custom_rule(rule_id: str):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            await conn.execute("DELETE FROM security.custom_detection_rules WHERE id = $1", rule_id)
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rules/{rule_id}/test")
async def test_custom_rule(rule_id: str):
    """Test a custom detection rule against recent logs"""
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            rule = await conn.fetchrow("SELECT * FROM security.custom_detection_rules WHERE id = $1", rule_id)
            if not rule:
                raise HTTPException(status_code=404, detail="Rule not found")

            conditions = json.loads(rule['conditions']) if isinstance(rule['conditions'], str) else rule['conditions']
            logic_op = rule['logic_operator']

            # Build WHERE clause from conditions
            where_parts = []
            params = []
            idx = 0

            valid_fields = ['source_type', 'severity', 'src_ip', 'dst_ip', 'username', 'hostname', 'action', 'message', 'protocol']

            for cond in conditions:
                field = cond.get('field', '')
                operator = cond.get('operator', 'equals')
                value = cond.get('value', '')

                if field not in valid_fields:
                    continue

                idx += 1
                if operator == 'equals':
                    where_parts.append(f"{field} = ${idx}")
                elif operator == 'not_equals':
                    where_parts.append(f"{field} != ${idx}")
                elif operator == 'contains':
                    where_parts.append(f"{field} ILIKE ${idx}")
                    value = f"%{value}%"
                elif operator == 'not_contains':
                    where_parts.append(f"{field} NOT ILIKE ${idx}")
                    value = f"%{value}%"
                elif operator == 'regex':
                    where_parts.append(f"{field} ~ ${idx}")
                else:
                    where_parts.append(f"{field} = ${idx}")
                params.append(value)

            joiner = " OR " if logic_op == "OR" else " AND "
            where_sql = joiner.join(where_parts) if where_parts else "TRUE"

            # Test against last 24h
            idx += 1
            time_clause = f" AND timestamp >= ${idx}"
            params.append(datetime.utcnow() - timedelta(hours=24))

            rows = await conn.fetch(f"""
                SELECT id, timestamp, source_type, severity, src_ip, dst_ip,
                       username, action, message
                FROM security.normalized_logs
                WHERE {where_sql} {time_clause}
                ORDER BY timestamp DESC LIMIT 50
            """, *params)

        matches = [{
            'id': str(r['id']),
            'timestamp': r['timestamp'].isoformat() + 'Z' if r['timestamp'] else None,
            'severity': r['severity'],
            'src_ip': r['src_ip'],
            'action': r['action'],
            'message': (r['message'] or '')[:200],
        } for r in rows]

        return {"rule_id": rule_id, "matches_found": len(matches), "matches": matches}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- YARA Rules ---

@router.post("/yara")
async def create_yara_rule(rule: YARARuleCreate):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            row = await conn.fetchrow("""
                INSERT INTO security.yara_rules (name, description, rule_content, tags, enabled)
                VALUES ($1, $2, $3, $4, $5) RETURNING id
            """, rule.name, rule.description, rule.rule_content, rule.tags or [], rule.enabled)
        return {"id": str(row['id']), "status": "created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/yara")
async def list_yara_rules():
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            rows = await conn.fetch("SELECT * FROM security.yara_rules ORDER BY created_at DESC")
        return [{
            'id': str(r['id']), 'name': r['name'], 'description': r['description'],
            'rule_content': r['rule_content'], 'tags': r['tags'] or [],
            'enabled': r['enabled'], 'compiled': r['compiled'],
            'scan_count': r['scan_count'],
            'last_scanned_at': r['last_scanned_at'].isoformat() + 'Z' if r['last_scanned_at'] else None,
            'created_at': r['created_at'].isoformat() + 'Z' if r['created_at'] else None,
        } for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/yara/{rule_id}")
async def get_yara_rule(rule_id: str):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            r = await conn.fetchrow("SELECT * FROM security.yara_rules WHERE id = $1", rule_id)
        if not r:
            raise HTTPException(status_code=404, detail="YARA rule not found")
        return {
            'id': str(r['id']), 'name': r['name'], 'description': r['description'],
            'rule_content': r['rule_content'], 'tags': r['tags'] or [],
            'enabled': r['enabled'], 'compiled': r['compiled'],
            'scan_count': r['scan_count'],
            'created_at': r['created_at'].isoformat() + 'Z' if r['created_at'] else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/yara/{rule_id}")
async def delete_yara_rule(rule_id: str):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            await conn.execute("DELETE FROM security.yara_rules WHERE id = $1", rule_id)
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/yara/{rule_id}/scan")
async def scan_with_yara(rule_id: str, target: Optional[str] = None):
    """Simulate a YARA scan (actual compilation requires yara-python)"""
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            rule = await conn.fetchrow("SELECT * FROM security.yara_rules WHERE id = $1", rule_id)
            if not rule:
                raise HTTPException(status_code=404, detail="Rule not found")

            # Simulated scan - search log messages for patterns from the YARA rule
            # Extract strings from rule content
            import re
            strings = re.findall(r'"([^"]+)"', rule['rule_content'])

            matches = []
            for s in strings[:5]:
                rows = await conn.fetch("""
                    SELECT id, timestamp, message FROM security.normalized_logs
                    WHERE message ILIKE $1 LIMIT 10
                """, f"%{s}%")
                for r in rows:
                    matches.append({
                        'log_id': str(r['id']),
                        'matched_string': s,
                        'timestamp': r['timestamp'].isoformat() + 'Z' if r['timestamp'] else None,
                        'context': (r['message'] or '')[:200],
                    })

            # Record scan result
            await conn.execute("""
                INSERT INTO security.yara_scan_results (rule_id, target, matched, match_details)
                VALUES ($1, $2, $3, $4)
            """, rule['id'], target or 'normalized_logs', len(matches) > 0, json.dumps(matches))

            await conn.execute("""
                UPDATE security.yara_rules
                SET scan_count = scan_count + 1, last_scanned_at = CURRENT_TIMESTAMP
                WHERE id = $1
            """, rule['id'])

        return {"rule_id": rule_id, "matched": len(matches) > 0, "match_count": len(matches), "matches": matches}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/yara/{rule_id}/results")
async def get_yara_results(rule_id: str):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            rows = await conn.fetch("""
                SELECT * FROM security.yara_scan_results WHERE rule_id = $1 ORDER BY scanned_at DESC
            """, rule_id)
        return [{
            'id': str(r['id']), 'target': r['target'], 'matched': r['matched'],
            'match_details': json.loads(r['match_details']) if isinstance(r['match_details'], str) else r['match_details'],
            'scanned_at': r['scanned_at'].isoformat() + 'Z' if r['scanned_at'] else None,
        } for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Correlation Rules ---

@router.post("/correlation")
async def create_correlation_rule(rule: CorrelationRuleCreate):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            row = await conn.fetchrow("""
                INSERT INTO security.correlation_rules
                (name, description, event_sequence, window_seconds, threshold, severity, enabled)
                VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
            """, rule.name, rule.description,
                json.dumps(rule.event_sequence) if not isinstance(rule.event_sequence, str) else rule.event_sequence,
                rule.window_seconds, rule.threshold, rule.severity, rule.enabled)
        return {"id": str(row['id']), "status": "created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/correlation")
async def list_correlation_rules():
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            rows = await conn.fetch("SELECT * FROM security.correlation_rules ORDER BY created_at DESC")
        return [{
            'id': str(r['id']), 'name': r['name'], 'description': r['description'],
            'event_sequence': json.loads(r['event_sequence']) if isinstance(r['event_sequence'], str) else r['event_sequence'],
            'window_seconds': r['window_seconds'], 'threshold': r['threshold'],
            'severity': r['severity'], 'enabled': r['enabled'],
            'trigger_count': r['trigger_count'],
            'created_at': r['created_at'].isoformat() + 'Z' if r['created_at'] else None,
        } for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/correlation/{rule_id}")
async def update_correlation_rule(rule_id: str, rule: CorrelationRuleCreate):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            await conn.execute("""
                UPDATE security.correlation_rules
                SET name=$1, description=$2, event_sequence=$3, window_seconds=$4,
                    threshold=$5, severity=$6, enabled=$7, updated_at=CURRENT_TIMESTAMP
                WHERE id=$8
            """, rule.name, rule.description,
                json.dumps(rule.event_sequence) if not isinstance(rule.event_sequence, str) else rule.event_sequence,
                rule.window_seconds, rule.threshold, rule.severity, rule.enabled, rule_id)
        return {"status": "updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/correlation/{rule_id}")
async def delete_correlation_rule(rule_id: str):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            await conn.execute("DELETE FROM security.correlation_rules WHERE id = $1", rule_id)
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/correlation/{rule_id}/matches")
async def get_correlation_matches(rule_id: str):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            rows = await conn.fetch("""
                SELECT * FROM security.correlation_matches WHERE rule_id = $1 ORDER BY matched_at DESC
            """, rule_id)
        return [{
            'id': str(r['id']), 'rule_id': str(r['rule_id']),
            'matched_events': json.loads(r['matched_events']) if isinstance(r['matched_events'], str) else r['matched_events'],
            'matched_at': r['matched_at'].isoformat() + 'Z' if r['matched_at'] else None,
            'details': r['details'],
        } for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
