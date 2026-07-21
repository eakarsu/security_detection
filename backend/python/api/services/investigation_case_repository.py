"""PostgreSQL repository for governed investigation cases."""

import copy
import json
from typing import Any, Dict, List, Optional

from .database import get_database_service
from .investigation_case_workflow import Actor, CaseWorkflowError, canonical, sha256


class PostgresCaseRepository:
    async def create(self, state: Dict[str, Any], actor: Actor, action: str, payload: Dict[str, Any]):
        db = await get_database_service()
        context = await db.get_connection_context()
        async with context as conn:
            async with conn.transaction():
                incident_exists = await conn.fetchval(
                    "SELECT EXISTS(SELECT 1 FROM security.events WHERE id = $1::uuid)", state["incident_id"]
                )
                if not incident_exists:
                    raise CaseWorkflowError("INCIDENT_NOT_FOUND", "Security incident not found", 404)
                await conn.execute(
                    """
                    INSERT INTO security.investigation_cases(id, tenant_id, incident_id, state, version)
                    VALUES ($1::uuid, $2::uuid, $3::uuid, $4::jsonb, 1)
                    """,
                    state["id"], state["tenant_id"], state["incident_id"], json.dumps(state),
                )
                await self._append_audit(conn, state, actor, action, payload)
        return copy.deepcopy(state)

    async def load(self, tenant_id: str, case_id: str) -> Optional[Dict[str, Any]]:
        db = await get_database_service()
        context = await db.get_connection_context()
        async with context as conn:
            row = await conn.fetchrow(
                "SELECT state, version FROM security.investigation_cases WHERE id=$1::uuid AND tenant_id=$2::uuid",
                case_id, tenant_id,
            )
        if not row:
            return None
        state = json.loads(row["state"]) if isinstance(row["state"], str) else dict(row["state"])
        state["version"] = row["version"]
        return state

    async def mutate(self, tenant_id, case_id, expected_version, state, actor, action, payload):
        db = await get_database_service()
        context = await db.get_connection_context()
        async with context as conn:
            async with conn.transaction():
                current = await conn.fetchrow(
                    """
                    SELECT state, version FROM security.investigation_cases
                    WHERE id=$1::uuid AND tenant_id=$2::uuid FOR UPDATE
                    """,
                    case_id, tenant_id,
                )
                if not current:
                    raise CaseWorkflowError("CASE_NOT_FOUND", "Investigation case not found", 404)
                if current["version"] != expected_version:
                    raise CaseWorkflowError("VERSION_CONFLICT", "Case changed; reload before retrying", 409)
                next_state = copy.deepcopy(state)
                next_state["version"] = expected_version + 1
                await conn.execute(
                    """
                    UPDATE security.investigation_cases
                    SET state=$3::jsonb, version=$4, updated_at=NOW()
                    WHERE id=$1::uuid AND tenant_id=$2::uuid
                    """,
                    case_id, tenant_id, json.dumps(next_state), expected_version + 1,
                )
                if action == "DOCUMENT_VERSION_ADDED":
                    await conn.execute(
                        """
                        INSERT INTO security.investigation_document_versions(
                          tenant_id, case_id, document_id, version, content_hash,
                          storage_reference, source_reference, privileged
                        ) VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8)
                        """,
                        tenant_id, case_id, payload["document_id"], payload["version"],
                        payload["content_hash"], payload["storage_reference"],
                        payload["source_reference"], payload["privileged"],
                    )
                await self._append_audit(conn, next_state, actor, action, payload)
        return next_state

    async def audit_events(self, tenant_id: str, case_id: str) -> List[Dict[str, Any]]:
        db = await get_database_service()
        context = await db.get_connection_context()
        async with context as conn:
            rows = await conn.fetch(
                """
                SELECT case_id::text, sequence, actor_id::text, action, payload,
                       previous_hash, event_hash, created_at
                FROM security.investigation_audit_events
                WHERE tenant_id=$1::uuid AND case_id=$2::uuid ORDER BY sequence
                """,
                tenant_id, case_id,
            )
        events = []
        for row in rows:
            event = dict(row)
            if isinstance(event["payload"], str):
                event["payload"] = json.loads(event["payload"])
            events.append(event)
        return events

    async def _append_audit(self, conn, state, actor, action, payload):
        await conn.execute("SELECT pg_advisory_xact_lock(hashtext($1))", state["id"])
        previous = await conn.fetchrow(
            """
            SELECT sequence, event_hash FROM security.investigation_audit_events
            WHERE case_id=$1::uuid ORDER BY sequence DESC LIMIT 1
            """,
            state["id"],
        )
        sequence = (previous["sequence"] if previous else 0) + 1
        previous_hash = previous["event_hash"] if previous else "GENESIS"
        body = {
            "case_id": state["id"],
            "sequence": sequence,
            "actor_id": actor.user_id,
            "action": action,
            "payload": payload,
            "previous_hash": previous_hash,
        }
        await conn.execute(
            """
            INSERT INTO security.investigation_audit_events(
              tenant_id, case_id, sequence, actor_id, action, payload, previous_hash, event_hash
            ) VALUES ($1::uuid,$2::uuid,$3,$4::uuid,$5,$6::jsonb,$7,$8)
            """,
            state["tenant_id"], state["id"], sequence, actor.user_id, action,
            json.dumps(payload), previous_hash, sha256(canonical(body)),
        )
