"""
NodeGuard AI Security Platform - Threat Hunting Routes
Hunt hypotheses, IOC sweeps, UEBA, MITRE ATT&CK, Kill Chain, Sigma rules
"""

import json
import asyncio
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
import structlog

from ..services.database import get_database_service
from ..services.ueba_service import UEBAService
from ..services.sigma_service import parse_sigma_yaml, sigma_to_sql, validate_sigma, export_sigma
from ..services.mitre_service import get_matrix, get_technique_coverage, map_event_to_technique
from ..services.kill_chain_service import detect_kill_chain, build_visualization
from ..services.ioc_sweep_service import run_sweep
from ..schemas.pagination import paginate

logger = structlog.get_logger(__name__)
router = APIRouter()


# --- Pydantic Models ---

class HuntHypothesisCreate(BaseModel):
    title: str
    hypothesis: str
    mitre_tactic: Optional[str] = None
    mitre_technique: Optional[str] = None
    priority: str = "medium"
    assigned_to: Optional[str] = None
    created_by: Optional[str] = None

class HuntFindingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    evidence: Optional[Any] = {}
    severity: str = "medium"
    source_event_id: Optional[str] = None

class IOCSweepCreate(BaseModel):
    name: str
    description: Optional[str] = None
    ioc_list: List[Dict[str, str]]
    time_range_start: Optional[str] = None
    time_range_end: Optional[str] = None

class UEBABaselineBuild(BaseModel):
    entity_id: str
    entity_type: str = "user"
    lookback_days: int = 30

class MITREMappingCreate(BaseModel):
    detection_type: str
    detection_rule_id: Optional[str] = None
    tactic_id: str
    tactic_name: str
    technique_id: str
    technique_name: str
    sub_technique_id: Optional[str] = None
    sub_technique_name: Optional[str] = None
    confidence: str = "medium"
    notes: Optional[str] = None

class KillChainDetect(BaseModel):
    src_ip: str
    time_window_hours: int = 24

class SigmaRuleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    yaml_content: str
    severity: str = "medium"


# --- Hunt Hypotheses ---

@router.post("/hypotheses")
async def create_hypothesis(hunt: HuntHypothesisCreate):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            row = await conn.fetchrow("""
                INSERT INTO security.hunt_hypotheses
                (title, hypothesis, mitre_tactic, mitre_technique, priority, assigned_to, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
            """, hunt.title, hunt.hypothesis, hunt.mitre_tactic, hunt.mitre_technique,
                hunt.priority, hunt.assigned_to, hunt.created_by)
        return {"id": str(row['id']), "status": "created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hypotheses")
async def list_hypotheses(status: Optional[str] = None, page: int = 1, page_size: int = 20):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            where = ""
            params = []
            if status:
                where = "WHERE status = $1"
                params.append(status)

            total = await conn.fetchval(f"SELECT COUNT(*) FROM security.hunt_hypotheses {where}", *params)

            params.append(page_size)
            params.append((page - 1) * page_size)
            rows = await conn.fetch(f"""
                SELECT * FROM security.hunt_hypotheses {where}
                ORDER BY created_at DESC
                LIMIT ${len(params)-1} OFFSET ${len(params)}
            """, *params)

        hunts = [{
            'id': str(r['id']), 'title': r['title'], 'hypothesis': r['hypothesis'],
            'status': r['status'], 'mitre_tactic': r['mitre_tactic'],
            'mitre_technique': r['mitre_technique'], 'priority': r['priority'],
            'assigned_to': r['assigned_to'], 'created_by': r['created_by'],
            'findings_count': r['findings_count'], 'notes': r['notes'],
            'created_at': r['created_at'].isoformat() + 'Z' if r['created_at'] else None,
            'updated_at': r['updated_at'].isoformat() + 'Z' if r['updated_at'] else None,
        } for r in rows]

        return paginate(items=hunts, total=total or 0, page=page, page_size=page_size)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hypotheses/{hunt_id}")
async def get_hypothesis(hunt_id: str):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            hunt = await conn.fetchrow("SELECT * FROM security.hunt_hypotheses WHERE id = $1", hunt_id)
            if not hunt:
                raise HTTPException(status_code=404, detail="Hunt not found")

            findings = await conn.fetch("""
                SELECT * FROM security.hunt_findings WHERE hunt_id = $1 ORDER BY created_at DESC
            """, hunt_id)

        return {
            'id': str(hunt['id']), 'title': hunt['title'], 'hypothesis': hunt['hypothesis'],
            'status': hunt['status'], 'mitre_tactic': hunt['mitre_tactic'],
            'mitre_technique': hunt['mitre_technique'], 'priority': hunt['priority'],
            'findings_count': hunt['findings_count'], 'notes': hunt['notes'],
            'created_at': hunt['created_at'].isoformat() + 'Z' if hunt['created_at'] else None,
            'findings': [{
                'id': str(f['id']), 'title': f['title'], 'description': f['description'],
                'evidence': json.loads(f['evidence']) if isinstance(f['evidence'], str) else f['evidence'],
                'severity': f['severity'],
                'created_at': f['created_at'].isoformat() + 'Z' if f['created_at'] else None,
            } for f in findings]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/hypotheses/{hunt_id}")
async def update_hypothesis(hunt_id: str, update: Dict[str, Any]):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            sets = []
            params = []
            idx = 0
            for key in ['title', 'hypothesis', 'status', 'mitre_tactic', 'mitre_technique', 'priority', 'assigned_to', 'notes']:
                if key in update:
                    idx += 1
                    sets.append(f"{key} = ${idx}")
                    params.append(update[key])
            if not sets:
                return {"status": "no changes"}
            sets.append("updated_at = CURRENT_TIMESTAMP")
            idx += 1
            params.append(hunt_id)
            await conn.execute(f"UPDATE security.hunt_hypotheses SET {', '.join(sets)} WHERE id = ${idx}", *params)
        return {"status": "updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/hypotheses/{hunt_id}")
async def delete_hypothesis(hunt_id: str):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            await conn.execute("DELETE FROM security.hunt_hypotheses WHERE id = $1", hunt_id)
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/hypotheses/{hunt_id}/findings")
async def add_finding(hunt_id: str, finding: HuntFindingCreate):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            row = await conn.fetchrow("""
                INSERT INTO security.hunt_findings (hunt_id, title, description, evidence, severity, source_event_id)
                VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
            """, hunt_id, finding.title, finding.description,
                json.dumps(finding.evidence) if not isinstance(finding.evidence, str) else finding.evidence,
                finding.severity,
                finding.source_event_id if finding.source_event_id else None)
            await conn.execute("""
                UPDATE security.hunt_hypotheses SET findings_count = findings_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1
            """, hunt_id)
        return {"id": str(row['id']), "status": "created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- IOC Sweep ---

@router.post("/ioc-sweep")
async def start_ioc_sweep(sweep: IOCSweepCreate, background_tasks: BackgroundTasks):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            row = await conn.fetchrow("""
                INSERT INTO security.ioc_sweeps (name, description, ioc_list, time_range_start, time_range_end)
                VALUES ($1, $2, $3, $4, $5) RETURNING id
            """, sweep.name, sweep.description, json.dumps(sweep.ioc_list),
                datetime.fromisoformat(sweep.time_range_start) if sweep.time_range_start else None,
                datetime.fromisoformat(sweep.time_range_end) if sweep.time_range_end else None)
            sweep_id = row['id']

        time_range = {}
        if sweep.time_range_start:
            time_range['start'] = datetime.fromisoformat(sweep.time_range_start)
        if sweep.time_range_end:
            time_range['end'] = datetime.fromisoformat(sweep.time_range_end)

        # Run sweep in background
        async def run_bg():
            db2 = await get_database_service()
            await db2.ensure_connected()
            ctx2 = await db2.get_connection_context()
            async with ctx2 as conn2:
                await run_sweep(sweep_id, sweep.ioc_list, time_range, conn2)

        background_tasks.add_task(run_bg)

        return {"id": str(sweep_id), "status": "started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ioc-sweep")
async def list_ioc_sweeps():
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            rows = await conn.fetch("SELECT * FROM security.ioc_sweeps ORDER BY created_at DESC")
        return [{
            'id': str(r['id']), 'name': r['name'], 'status': r['status'],
            'ioc_list': json.loads(r['ioc_list']) if isinstance(r['ioc_list'], str) else r['ioc_list'],
            'results_count': r['results_count'],
            'started_at': r['started_at'].isoformat() + 'Z' if r['started_at'] else None,
            'completed_at': r['completed_at'].isoformat() + 'Z' if r['completed_at'] else None,
            'created_at': r['created_at'].isoformat() + 'Z' if r['created_at'] else None,
        } for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ioc-sweep/{sweep_id}")
async def get_ioc_sweep(sweep_id: str):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            sweep = await conn.fetchrow("SELECT * FROM security.ioc_sweeps WHERE id = $1", sweep_id)
            if not sweep:
                raise HTTPException(status_code=404, detail="Sweep not found")
            results = await conn.fetch("""
                SELECT * FROM security.ioc_sweep_results WHERE sweep_id = $1 ORDER BY matched_at DESC
            """, sweep_id)

        return {
            'id': str(sweep['id']), 'name': sweep['name'], 'status': sweep['status'],
            'results_count': sweep['results_count'],
            'results': [{
                'id': str(r['id']), 'ioc_value': r['ioc_value'], 'ioc_type': r['ioc_type'],
                'matched_field': r['matched_field'], 'context': r['context'],
                'matched_at': r['matched_at'].isoformat() + 'Z' if r['matched_at'] else None,
            } for r in results]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- UEBA ---

@router.post("/ueba/baselines/build")
async def build_ueba_baseline(req: UEBABaselineBuild):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            result = await UEBAService.build_baseline(req.entity_id, req.entity_type, conn, req.lookback_days)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ueba/baselines")
async def list_ueba_baselines():
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            rows = await conn.fetch("SELECT * FROM security.ueba_baselines ORDER BY last_updated DESC")
        return [{
            'id': str(r['id']), 'entity_id': r['entity_id'], 'entity_type': r['entity_type'],
            'baseline_data': json.loads(r['baseline_data']) if isinstance(r['baseline_data'], str) else r['baseline_data'],
            'sample_count': r['sample_count'],
            'last_updated': r['last_updated'].isoformat() + 'Z' if r['last_updated'] else None,
        } for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ueba/anomalies")
async def list_ueba_anomalies(entity_id: Optional[str] = None):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            if entity_id:
                rows = await conn.fetch("""
                    SELECT * FROM security.ueba_anomalies WHERE entity_id = $1
                    ORDER BY detected_at DESC LIMIT 100
                """, entity_id)
            else:
                rows = await conn.fetch("""
                    SELECT * FROM security.ueba_anomalies ORDER BY score DESC, detected_at DESC LIMIT 100
                """)
        return [{
            'id': str(r['id']), 'entity_id': r['entity_id'], 'entity_type': r['entity_type'],
            'anomaly_type': r['anomaly_type'], 'score': r['score'], 'deviation': r['deviation'],
            'details': json.loads(r['details']) if isinstance(r['details'], str) else r['details'],
            'detected_at': r['detected_at'].isoformat() + 'Z' if r['detected_at'] else None,
            'acknowledged': r['acknowledged'],
        } for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ueba/detect")
async def detect_ueba_anomalies(req: UEBABaselineBuild):
    """Run anomaly detection for an entity"""
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            anomalies = await UEBAService.detect_anomalies(req.entity_id, req.entity_type, conn)
        return {"entity_id": req.entity_id, "anomalies_found": len(anomalies), "anomalies": anomalies}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- MITRE ATT&CK ---

@router.get("/mitre/matrix")
async def get_mitre_matrix():
    """Get full MITRE ATT&CK matrix with coverage data"""
    try:
        matrix = get_matrix()

        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            coverage = await get_technique_coverage(conn)

        # Enrich matrix with coverage
        covered = coverage.get('covered_techniques', {})
        for tactic in matrix:
            for tech in tactic['techniques']:
                key = f"{tactic['id']}:{tech['id']}"
                tech['detection_count'] = covered.get(key, 0)
                tech['covered'] = tech['detection_count'] > 0

        return {
            'matrix': matrix,
            'coverage': {
                'total_techniques': coverage['total_techniques'],
                'covered_count': coverage['covered_count'],
                'coverage_percentage': coverage['coverage_percentage'],
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mitre/mappings")
async def list_mitre_mappings():
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            rows = await conn.fetch("SELECT * FROM security.mitre_mappings ORDER BY created_at DESC")
        return [{
            'id': str(r['id']), 'detection_type': r['detection_type'],
            'tactic_id': r['tactic_id'], 'tactic_name': r['tactic_name'],
            'technique_id': r['technique_id'], 'technique_name': r['technique_name'],
            'confidence': r['confidence'], 'notes': r['notes'],
            'created_at': r['created_at'].isoformat() + 'Z' if r['created_at'] else None,
        } for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mitre/mappings")
async def create_mitre_mapping(mapping: MITREMappingCreate):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            row = await conn.fetchrow("""
                INSERT INTO security.mitre_mappings
                (detection_type, tactic_id, tactic_name, technique_id, technique_name,
                 sub_technique_id, sub_technique_name, confidence, notes)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
            """, mapping.detection_type, mapping.tactic_id, mapping.tactic_name,
                mapping.technique_id, mapping.technique_name,
                mapping.sub_technique_id, mapping.sub_technique_name,
                mapping.confidence, mapping.notes)
        return {"id": str(row['id']), "status": "created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mitre/suggest/{event_type}")
async def suggest_mitre_mapping(event_type: str):
    """Auto-suggest MITRE mappings for an event type"""
    return map_event_to_technique(event_type)


# --- Kill Chain ---

@router.post("/kill-chain/detect")
async def detect_kill_chain_endpoint(req: KillChainDetect):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            result = await detect_kill_chain(req.src_ip, conn, req.time_window_hours)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kill-chain")
async def list_kill_chains():
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            rows = await conn.fetch("SELECT * FROM security.kill_chains ORDER BY created_at DESC")
        return [{
            'id': str(r['id']), 'name': r['name'], 'description': r['description'],
            'src_ip': r['src_ip'], 'status': r['status'],
            'created_at': r['created_at'].isoformat() + 'Z' if r['created_at'] else None,
        } for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kill-chain/{chain_id}")
async def get_kill_chain(chain_id: str):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            result = await build_visualization(chain_id, conn)
        if not result:
            raise HTTPException(status_code=404, detail="Kill chain not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Sigma Rules ---

@router.post("/sigma")
async def import_sigma_rule(rule: SigmaRuleCreate):
    try:
        errors = validate_sigma(rule.yaml_content)
        if errors:
            raise HTTPException(status_code=400, detail={"validation_errors": errors})

        parsed = parse_sigma_yaml(rule.yaml_content)
        logsource = parsed.get('logsource', {})

        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            row = await conn.fetchrow("""
                INSERT INTO security.sigma_rules
                (title, description, yaml_content, parsed_logic, severity,
                 logsource_category, logsource_product, tags, author)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
            """, rule.title or parsed.get('title', ''),
                rule.description or parsed.get('description', ''),
                rule.yaml_content,
                json.dumps(parsed.get('detection', {})),
                rule.severity or parsed.get('level', 'medium'),
                logsource.get('category', ''),
                logsource.get('product', ''),
                parsed.get('tags', []),
                parsed.get('author', ''))
        return {"id": str(row['id']), "status": "imported", "parsed": parsed}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sigma")
async def list_sigma_rules(status: Optional[str] = None):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            if status:
                rows = await conn.fetch(
                    "SELECT * FROM security.sigma_rules WHERE status = $1 ORDER BY created_at DESC", status)
            else:
                rows = await conn.fetch("SELECT * FROM security.sigma_rules ORDER BY created_at DESC")
        return [{
            'id': str(r['id']), 'title': r['title'], 'description': r['description'],
            'status': r['status'], 'severity': r['severity'],
            'logsource_category': r['logsource_category'],
            'logsource_product': r['logsource_product'],
            'tags': r['tags'] or [],
            'author': r['author'],
            'created_at': r['created_at'].isoformat() + 'Z' if r['created_at'] else None,
        } for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sigma/{rule_id}")
async def get_sigma_rule(rule_id: str):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            r = await conn.fetchrow("SELECT * FROM security.sigma_rules WHERE id = $1", rule_id)
        if not r:
            raise HTTPException(status_code=404, detail="Sigma rule not found")
        return {
            'id': str(r['id']), 'title': r['title'], 'description': r['description'],
            'yaml_content': r['yaml_content'],
            'parsed_logic': json.loads(r['parsed_logic']) if isinstance(r['parsed_logic'], str) else r['parsed_logic'],
            'status': r['status'], 'severity': r['severity'],
            'logsource_category': r['logsource_category'],
            'tags': r['tags'] or [],
            'created_at': r['created_at'].isoformat() + 'Z' if r['created_at'] else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/sigma/{rule_id}")
async def update_sigma_rule(rule_id: str, update: Dict[str, Any]):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            sets, params, idx = [], [], 0
            for key in ['title', 'description', 'yaml_content', 'status', 'severity']:
                if key in update:
                    idx += 1
                    sets.append(f"{key} = ${idx}")
                    params.append(update[key])
            if 'yaml_content' in update:
                parsed = parse_sigma_yaml(update['yaml_content'])
                idx += 1
                sets.append(f"parsed_logic = ${idx}")
                params.append(json.dumps(parsed.get('detection', {})))
            sets.append("updated_at = CURRENT_TIMESTAMP")
            idx += 1
            params.append(rule_id)
            await conn.execute(f"UPDATE security.sigma_rules SET {', '.join(sets)} WHERE id = ${idx}", *params)
        return {"status": "updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sigma/{rule_id}")
async def delete_sigma_rule(rule_id: str):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            await conn.execute("DELETE FROM security.sigma_rules WHERE id = $1", rule_id)
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sigma/{rule_id}/export")
async def export_sigma_rule(rule_id: str):
    try:
        db = await get_database_service()
        await db.ensure_connected()
        ctx = await db.get_connection_context()
        async with ctx as conn:
            r = await conn.fetchrow("SELECT * FROM security.sigma_rules WHERE id = $1", rule_id)
        if not r:
            raise HTTPException(status_code=404, detail="Rule not found")
        return {"yaml": r['yaml_content']}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
