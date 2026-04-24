"""
NodeGuard AI Security Platform - Bulk Operations Routes
Bulk delete and bulk update endpoints for incidents and threat intelligence
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import structlog
from ..services.database import get_database_service

logger = structlog.get_logger(__name__)

router = APIRouter()


class BulkDeleteRequest(BaseModel):
    """Request body for bulk delete operations"""
    ids: List[str]


class IncidentUpdateItem(BaseModel):
    """Single incident update item"""
    id: str
    updates: Dict[str, Any]


class ThreatIntelUpdateItem(BaseModel):
    """Single threat intel update item"""
    id: str
    updates: Dict[str, Any]


class BulkUpdateIncidentsRequest(BaseModel):
    """Request body for bulk update of incidents"""
    items: List[IncidentUpdateItem]


class BulkUpdateThreatIntelRequest(BaseModel):
    """Request body for bulk update of threat intel"""
    items: List[ThreatIntelUpdateItem]


@router.delete("/incidents")
async def bulk_delete_incidents(request: BulkDeleteRequest) -> Dict[str, Any]:
    """Bulk delete incidents by IDs"""
    try:
        if not request.ids:
            raise HTTPException(status_code=400, detail="No IDs provided")

        db_service = await get_database_service()
        await db_service.ensure_connected()
        connection_context = await db_service.get_connection_context()
        async with connection_context as conn:
            query = "DELETE FROM security.events WHERE id = ANY($1)"
            result = await conn.execute(query, request.ids)

        # Parse the number of deleted rows from the result string (e.g., "DELETE 5")
        deleted_count = int(result.split(" ")[-1]) if result else 0

        logger.info("Bulk deleted incidents", count=deleted_count, ids=request.ids)

        return {
            "message": f"Successfully deleted {deleted_count} incidents",
            "deleted_count": deleted_count,
            "requested_ids": request.ids
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error bulk deleting incidents", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to bulk delete incidents")


@router.delete("/threat-intel")
async def bulk_delete_threat_intel(request: BulkDeleteRequest) -> Dict[str, Any]:
    """Bulk delete threat intelligence indicators by IDs"""
    try:
        if not request.ids:
            raise HTTPException(status_code=400, detail="No IDs provided")

        db_service = await get_database_service()
        await db_service.ensure_connected()
        connection_context = await db_service.get_connection_context()
        async with connection_context as conn:
            query = "DELETE FROM security.threat_intel WHERE id = ANY($1)"
            result = await conn.execute(query, request.ids)

        deleted_count = int(result.split(" ")[-1]) if result else 0

        logger.info("Bulk deleted threat intel", count=deleted_count, ids=request.ids)

        return {
            "message": f"Successfully deleted {deleted_count} threat intel indicators",
            "deleted_count": deleted_count,
            "requested_ids": request.ids
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error bulk deleting threat intel", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to bulk delete threat intel")


@router.put("/incidents")
async def bulk_update_incidents(request: BulkUpdateIncidentsRequest) -> Dict[str, Any]:
    """Bulk update incidents"""
    try:
        if not request.items:
            raise HTTPException(status_code=400, detail="No items provided")

        allowed_fields = {"status", "severity", "assigned_to", "description", "endpoint"}
        updated_count = 0

        db_service = await get_database_service()
        await db_service.ensure_connected()
        connection_context = await db_service.get_connection_context()
        async with connection_context as conn:
            for item in request.items:
                # Filter to only allowed fields
                safe_updates = {k: v for k, v in item.updates.items() if k in allowed_fields}
                if not safe_updates:
                    continue

                # Build dynamic SET clause
                set_clauses = []
                params = []
                param_idx = 1
                for field, value in safe_updates.items():
                    set_clauses.append(f"{field} = ${param_idx}")
                    params.append(value)
                    param_idx += 1

                # Add updated_at
                set_clauses.append(f"updated_at = NOW()")

                # Add the ID as the last parameter
                params.append(item.id)

                query = f"UPDATE security.events SET {', '.join(set_clauses)} WHERE id = ${param_idx}"
                result = await conn.execute(query, *params)

                if result and "UPDATE" in result:
                    count = int(result.split(" ")[-1])
                    updated_count += count

        logger.info("Bulk updated incidents", count=updated_count)

        return {
            "message": f"Successfully updated {updated_count} incidents",
            "updated_count": updated_count,
            "requested_items": len(request.items)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error bulk updating incidents", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to bulk update incidents")


@router.put("/threat-intel")
async def bulk_update_threat_intel(request: BulkUpdateThreatIntelRequest) -> Dict[str, Any]:
    """Bulk update threat intelligence indicators"""
    try:
        if not request.items:
            raise HTTPException(status_code=400, detail="No items provided")

        allowed_fields = {"is_active", "confidence_score", "threat_type", "description", "source"}
        updated_count = 0

        db_service = await get_database_service()
        await db_service.ensure_connected()
        connection_context = await db_service.get_connection_context()
        async with connection_context as conn:
            for item in request.items:
                # Filter to only allowed fields
                safe_updates = {k: v for k, v in item.updates.items() if k in allowed_fields}
                if not safe_updates:
                    continue

                # Build dynamic SET clause
                set_clauses = []
                params = []
                param_idx = 1
                for field, value in safe_updates.items():
                    set_clauses.append(f"{field} = ${param_idx}")
                    params.append(value)
                    param_idx += 1

                # Add the ID as the last parameter
                params.append(item.id)

                query = f"UPDATE security.threat_intel SET {', '.join(set_clauses)} WHERE id = ${param_idx}"
                result = await conn.execute(query, *params)

                if result and "UPDATE" in result:
                    count = int(result.split(" ")[-1])
                    updated_count += count

        logger.info("Bulk updated threat intel", count=updated_count)

        return {
            "message": f"Successfully updated {updated_count} threat intel indicators",
            "updated_count": updated_count,
            "requested_items": len(request.items)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error bulk updating threat intel", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to bulk update threat intel")
