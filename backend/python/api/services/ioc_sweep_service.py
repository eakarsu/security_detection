"""
NodeGuard AI Security Platform - IOC Sweep Service
Sweep historical logs for indicators of compromise
"""

import json
from datetime import datetime
from typing import Dict, Any, List
import structlog

logger = structlog.get_logger(__name__)


async def run_sweep(sweep_id: str, ioc_list: List[Dict[str, str]], time_range: Dict, conn) -> Dict[str, Any]:
    """
    Search normalized_logs for IOC matches.
    IOCs can be IPs (match src_ip/dst_ip), domains (match hostname/message),
    hashes (match message/extra_fields).
    """
    try:
        # Update sweep status to running
        await conn.execute("""
            UPDATE security.ioc_sweeps
            SET status = 'running', started_at = CURRENT_TIMESTAMP
            WHERE id = $1
        """, sweep_id)

        results = []
        total_matches = 0

        for ioc in ioc_list:
            ioc_value = ioc.get('value', '')
            ioc_type = ioc.get('type', 'unknown')

            if not ioc_value:
                continue

            # Build search query based on IOC type
            if ioc_type == 'ip':
                query = """
                    SELECT id, timestamp, src_ip, dst_ip, message, action
                    FROM security.normalized_logs
                    WHERE (src_ip = $1 OR dst_ip = $1)
                """
                params = [ioc_value]
            elif ioc_type == 'domain':
                query = """
                    SELECT id, timestamp, src_ip, dst_ip, message, action
                    FROM security.normalized_logs
                    WHERE (hostname ILIKE $1 OR message ILIKE $1)
                """
                params = [f"%{ioc_value}%"]
            elif ioc_type in ('hash', 'md5', 'sha1', 'sha256'):
                query = """
                    SELECT id, timestamp, src_ip, dst_ip, message, action
                    FROM security.normalized_logs
                    WHERE (message ILIKE $1 OR extra_fields::text ILIKE $1)
                """
                params = [f"%{ioc_value}%"]
            elif ioc_type == 'url':
                query = """
                    SELECT id, timestamp, src_ip, dst_ip, message, action
                    FROM security.normalized_logs
                    WHERE message ILIKE $1
                """
                params = [f"%{ioc_value}%"]
            elif ioc_type == 'email':
                query = """
                    SELECT id, timestamp, src_ip, dst_ip, message, action
                    FROM security.normalized_logs
                    WHERE (username ILIKE $1 OR message ILIKE $1)
                """
                params = [f"%{ioc_value}%"]
            else:
                query = """
                    SELECT id, timestamp, src_ip, dst_ip, message, action
                    FROM security.normalized_logs
                    WHERE message ILIKE $1
                """
                params = [f"%{ioc_value}%"]

            # Add time range filter
            if time_range.get('start'):
                query += f" AND timestamp >= ${len(params) + 1}"
                params.append(time_range['start'])
            if time_range.get('end'):
                query += f" AND timestamp <= ${len(params) + 1}"
                params.append(time_range['end'])

            query += " ORDER BY timestamp DESC LIMIT 100"

            matches = await conn.fetch(query, *params)

            for match in matches:
                matched_field = 'src_ip' if ioc_type == 'ip' else 'message'
                if ioc_type == 'ip':
                    if match['src_ip'] == ioc_value:
                        matched_field = 'src_ip'
                    elif match['dst_ip'] == ioc_value:
                        matched_field = 'dst_ip'

                context = f"Action: {match['action']}, Message: {(match['message'] or '')[:200]}"

                await conn.execute("""
                    INSERT INTO security.ioc_sweep_results
                    (sweep_id, ioc_value, ioc_type, matched_log_id, matched_field, context)
                    VALUES ($1, $2, $3, $4, $5, $6)
                """, sweep_id, ioc_value, ioc_type, match['id'], matched_field, context)

                total_matches += 1
                results.append({
                    'ioc_value': ioc_value,
                    'ioc_type': ioc_type,
                    'matched_log_id': str(match['id']),
                    'matched_field': matched_field,
                    'context': context,
                    'timestamp': match['timestamp'].isoformat() if match['timestamp'] else None,
                })

        # Update sweep as completed
        await conn.execute("""
            UPDATE security.ioc_sweeps
            SET status = 'completed', completed_at = CURRENT_TIMESTAMP, results_count = $1
            WHERE id = $2
        """, total_matches, sweep_id)

        return {
            'sweep_id': str(sweep_id),
            'status': 'completed',
            'total_matches': total_matches,
            'results': results
        }

    except Exception as e:
        logger.error("IOC sweep failed", sweep_id=str(sweep_id), error=str(e))
        await conn.execute("""
            UPDATE security.ioc_sweeps SET status = 'failed' WHERE id = $1
        """, sweep_id)
        raise
