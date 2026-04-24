"""
NodeGuard AI Security Platform - Log Search Engine
Builds PostgreSQL queries for searching normalized logs
"""

from typing import Dict, Any, List, Tuple, Optional
import structlog

logger = structlog.get_logger(__name__)


class SearchEngine:
    """Builds SQL queries for searching normalized_logs"""

    @staticmethod
    def build_query(filters: Dict[str, Any]) -> Tuple[str, List[Any]]:
        """Build a search query with filters against normalized_logs"""
        where_clauses = []
        params = []
        param_idx = 0

        # Time range filter
        if filters.get('time_start'):
            param_idx += 1
            where_clauses.append(f"timestamp >= ${param_idx}")
            params.append(filters['time_start'])

        if filters.get('time_end'):
            param_idx += 1
            where_clauses.append(f"timestamp <= ${param_idx}")
            params.append(filters['time_end'])

        # Exact match filters
        exact_filters = {
            'source_type': 'source_type',
            'severity': 'severity',
            'src_ip': 'src_ip',
            'dst_ip': 'dst_ip',
            'username': 'username',
            'hostname': 'hostname',
            'action': 'action',
            'protocol': 'protocol',
        }

        for filter_key, column in exact_filters.items():
            val = filters.get(filter_key)
            if val:
                if isinstance(val, list):
                    placeholders = []
                    for v in val:
                        param_idx += 1
                        placeholders.append(f"${param_idx}")
                        params.append(v)
                    where_clauses.append(f"{column} IN ({', '.join(placeholders)})")
                else:
                    param_idx += 1
                    where_clauses.append(f"{column} = ${param_idx}")
                    params.append(val)

        # Text search on message
        if filters.get('text_search'):
            param_idx += 1
            where_clauses.append(f"message ILIKE ${param_idx}")
            params.append(f"%{filters['text_search']}%")

        # Build final query
        where_sql = " AND ".join(where_clauses) if where_clauses else "TRUE"

        # Pagination
        page = filters.get('page', 1)
        page_size = filters.get('page_size', 50)
        offset = (page - 1) * page_size

        param_idx += 1
        limit_param = param_idx
        params.append(page_size)

        param_idx += 1
        offset_param = param_idx
        params.append(offset)

        query = f"""
            SELECT id, timestamp, source_type, source_name, action, severity,
                   src_ip, dst_ip, src_port, dst_port, protocol, username,
                   hostname, message, extra_fields, created_at
            FROM security.normalized_logs
            WHERE {where_sql}
            ORDER BY timestamp DESC
            LIMIT ${limit_param} OFFSET ${offset_param}
        """

        count_query = f"""
            SELECT COUNT(*) FROM security.normalized_logs
            WHERE {where_sql}
        """
        # Count query uses same params except limit/offset
        count_params = params[:-2]

        return query, params, count_query, count_params

    @staticmethod
    def build_stats_query(group_by: str = 'source_type', time_range: Optional[Dict] = None) -> Tuple[str, List[Any]]:
        """Build aggregation query for log statistics"""
        valid_groups = ['source_type', 'severity', 'action', 'src_ip', 'hostname']
        if group_by not in valid_groups:
            group_by = 'source_type'

        where_clauses = []
        params = []
        param_idx = 0

        if time_range:
            if time_range.get('start'):
                param_idx += 1
                where_clauses.append(f"timestamp >= ${param_idx}")
                params.append(time_range['start'])
            if time_range.get('end'):
                param_idx += 1
                where_clauses.append(f"timestamp <= ${param_idx}")
                params.append(time_range['end'])

        where_sql = " AND ".join(where_clauses) if where_clauses else "TRUE"

        query = f"""
            SELECT {group_by} as label, COUNT(*) as count
            FROM security.normalized_logs
            WHERE {where_sql}
            GROUP BY {group_by}
            ORDER BY count DESC
            LIMIT 20
        """

        return query, params
