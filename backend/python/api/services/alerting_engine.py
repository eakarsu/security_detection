"""
NodeGuard AI Security Platform - Alerting Engine
Evaluates alerting rules against normalized log data
"""

import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import structlog

logger = structlog.get_logger(__name__)


class AlertingEngine:
    """Evaluates alerting rules against normalized logs"""

    @staticmethod
    async def evaluate_rule(rule: Dict[str, Any], conn) -> Optional[Dict[str, Any]]:
        """Evaluate a single alerting rule against recent logs"""
        try:
            conditions = rule['conditions']
            window = rule.get('window_seconds', 300)
            threshold = rule.get('threshold', 1)

            time_start = datetime.utcnow() - timedelta(seconds=window)

            # Build WHERE clause from conditions
            where_parts = ["timestamp >= $1"]
            params = [time_start]
            param_idx = 1

            for condition in conditions:
                field = condition.get('field', '')
                operator = condition.get('operator', 'equals')
                value = condition.get('value', '')

                # Validate field name to prevent injection
                valid_fields = [
                    'source_type', 'severity', 'src_ip', 'dst_ip',
                    'username', 'hostname', 'action', 'message', 'protocol'
                ]
                if field not in valid_fields:
                    continue

                param_idx += 1
                if operator == 'equals':
                    where_parts.append(f"{field} = ${param_idx}")
                    params.append(value)
                elif operator == 'not_equals':
                    where_parts.append(f"{field} != ${param_idx}")
                    params.append(value)
                elif operator == 'contains':
                    where_parts.append(f"{field} ILIKE ${param_idx}")
                    params.append(f"%{value}%")
                elif operator == 'greater_than':
                    where_parts.append(f"{field} > ${param_idx}")
                    params.append(value)

            where_sql = " AND ".join(where_parts)

            # Check type of rule
            rule_type = conditions[0].get('type', 'count') if conditions else 'count'

            if rule_type == 'unique_count':
                count_field = conditions[0].get('count_field', 'src_ip')
                if count_field not in valid_fields:
                    count_field = 'src_ip'
                query = f"""
                    SELECT COUNT(DISTINCT {count_field}) as cnt
                    FROM security.normalized_logs
                    WHERE {where_sql}
                """
            else:
                query = f"""
                    SELECT COUNT(*) as cnt
                    FROM security.normalized_logs
                    WHERE {where_sql}
                """

            result = await conn.fetchrow(query, *params)
            count = result['cnt'] if result else 0

            if count >= threshold:
                # Get sample matched events
                sample_query = f"""
                    SELECT id, timestamp, source_type, severity, src_ip, dst_ip,
                           username, action, message
                    FROM security.normalized_logs
                    WHERE {where_sql}
                    ORDER BY timestamp DESC
                    LIMIT 10
                """
                matched = await conn.fetch(sample_query, *params)

                return {
                    'rule_id': str(rule['id']),
                    'rule_name': rule['name'],
                    'matched_count': count,
                    'threshold': threshold,
                    'matched_events': [
                        {
                            'id': str(r['id']),
                            'timestamp': r['timestamp'].isoformat() if r['timestamp'] else None,
                            'src_ip': r['src_ip'],
                            'action': r['action'],
                            'message': r['message'][:200] if r['message'] else ''
                        }
                        for r in matched
                    ]
                }

            return None

        except Exception as e:
            logger.error("Error evaluating rule", rule_id=str(rule.get('id')), error=str(e))
            return None

    @staticmethod
    async def check_all_rules(conn) -> List[Dict[str, Any]]:
        """Evaluate all enabled alerting rules"""
        matches = []

        try:
            rules = await conn.fetch("""
                SELECT id, name, description, conditions, threshold,
                       window_seconds, severity, actions
                FROM security.alerting_rules
                WHERE enabled = true
            """)

            for rule in rules:
                rule_dict = {
                    'id': rule['id'],
                    'name': rule['name'],
                    'conditions': json.loads(rule['conditions']) if isinstance(rule['conditions'], str) else rule['conditions'],
                    'threshold': rule['threshold'],
                    'window_seconds': rule['window_seconds'],
                    'severity': rule['severity'],
                }

                match = await AlertingEngine.evaluate_rule(rule_dict, conn)
                if match:
                    # Record the match
                    await conn.execute("""
                        INSERT INTO security.alerting_rule_matches (rule_id, matched_events, details)
                        VALUES ($1, $2, $3)
                    """, rule['id'], json.dumps(match['matched_events']),
                        f"Rule triggered: {match['matched_count']} events exceeded threshold of {match['threshold']}")

                    # Update last_triggered_at
                    await conn.execute("""
                        UPDATE security.alerting_rules SET last_triggered_at = CURRENT_TIMESTAMP
                        WHERE id = $1
                    """, rule['id'])

                    matches.append(match)

        except Exception as e:
            logger.error("Error checking alerting rules", error=str(e))

        return matches
