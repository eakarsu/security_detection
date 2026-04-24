"""
NodeGuard AI Security Platform - UEBA Service
User & Entity Behavior Analytics - baseline and anomaly detection
"""

import json
from datetime import datetime, timedelta
from typing import Dict, Any, List
import structlog

logger = structlog.get_logger(__name__)


class UEBAService:
    """User & Entity Behavior Analytics service"""

    @staticmethod
    async def build_baseline(entity_id: str, entity_type: str, conn, lookback_days: int = 30) -> Dict[str, Any]:
        """Build behavioral baseline for an entity from normalized logs"""
        time_start = datetime.utcnow() - timedelta(days=lookback_days)

        field = 'username' if entity_type == 'user' else 'hostname'

        # Gather activity stats
        stats_query = f"""
            SELECT
                COUNT(*) as total_events,
                COUNT(DISTINCT action) as unique_actions,
                COUNT(DISTINCT dst_ip) as unique_destinations,
                COUNT(DISTINCT EXTRACT(HOUR FROM timestamp)) as active_hours,
                MIN(timestamp) as first_seen,
                MAX(timestamp) as last_seen
            FROM security.normalized_logs
            WHERE {field} = $1 AND timestamp >= $2
        """
        stats = await conn.fetchrow(stats_query, entity_id, time_start)

        # Hourly distribution
        hourly_query = f"""
            SELECT EXTRACT(HOUR FROM timestamp)::int as hour, COUNT(*) as cnt
            FROM security.normalized_logs
            WHERE {field} = $1 AND timestamp >= $2
            GROUP BY hour ORDER BY hour
        """
        hourly = await conn.fetch(hourly_query, entity_id, time_start)
        hourly_dist = {r['hour']: r['cnt'] for r in hourly}

        # Daily event counts for std deviation
        daily_query = f"""
            SELECT DATE(timestamp) as day, COUNT(*) as cnt
            FROM security.normalized_logs
            WHERE {field} = $1 AND timestamp >= $2
            GROUP BY day ORDER BY day
        """
        daily = await conn.fetch(daily_query, entity_id, time_start)
        daily_counts = [r['cnt'] for r in daily]

        mean_daily = sum(daily_counts) / len(daily_counts) if daily_counts else 0
        variance = sum((c - mean_daily) ** 2 for c in daily_counts) / len(daily_counts) if daily_counts else 0
        stddev_daily = variance ** 0.5

        # Severity distribution
        severity_query = f"""
            SELECT severity, COUNT(*) as cnt
            FROM security.normalized_logs
            WHERE {field} = $1 AND timestamp >= $2
            GROUP BY severity
        """
        severity_rows = await conn.fetch(severity_query, entity_id, time_start)
        severity_dist = {r['severity']: r['cnt'] for r in severity_rows}

        # Top actions
        actions_query = f"""
            SELECT action, COUNT(*) as cnt
            FROM security.normalized_logs
            WHERE {field} = $1 AND timestamp >= $2
            GROUP BY action ORDER BY cnt DESC LIMIT 10
        """
        actions = await conn.fetch(actions_query, entity_id, time_start)
        top_actions = {r['action']: r['cnt'] for r in actions}

        baseline_data = {
            'total_events': stats['total_events'] if stats else 0,
            'unique_actions': stats['unique_actions'] if stats else 0,
            'unique_destinations': stats['unique_destinations'] if stats else 0,
            'active_hours': stats['active_hours'] if stats else 0,
            'mean_daily_events': round(mean_daily, 2),
            'stddev_daily_events': round(stddev_daily, 2),
            'hourly_distribution': hourly_dist,
            'severity_distribution': severity_dist,
            'top_actions': top_actions,
            'lookback_days': lookback_days,
        }

        sample_count = len(daily_counts)

        # Upsert baseline
        existing = await conn.fetchrow("""
            SELECT id FROM security.ueba_baselines
            WHERE entity_id = $1 AND entity_type = $2
        """, entity_id, entity_type)

        if existing:
            await conn.execute("""
                UPDATE security.ueba_baselines
                SET baseline_data = $1, sample_count = $2, last_updated = CURRENT_TIMESTAMP
                WHERE entity_id = $3 AND entity_type = $4
            """, json.dumps(baseline_data), sample_count, entity_id, entity_type)
            baseline_id = existing['id']
        else:
            row = await conn.fetchrow("""
                INSERT INTO security.ueba_baselines (entity_id, entity_type, baseline_data, sample_count)
                VALUES ($1, $2, $3, $4) RETURNING id
            """, entity_id, entity_type, json.dumps(baseline_data), sample_count)
            baseline_id = row['id']

        return {
            'id': str(baseline_id),
            'entity_id': entity_id,
            'entity_type': entity_type,
            'baseline_data': baseline_data,
            'sample_count': sample_count
        }

    @staticmethod
    async def detect_anomalies(entity_id: str, entity_type: str, conn) -> List[Dict[str, Any]]:
        """Detect anomalies by comparing recent activity against baseline"""
        anomalies = []

        # Get baseline
        baseline_row = await conn.fetchrow("""
            SELECT id, baseline_data FROM security.ueba_baselines
            WHERE entity_id = $1 AND entity_type = $2
        """, entity_id, entity_type)

        if not baseline_row:
            return anomalies

        baseline = json.loads(baseline_row['baseline_data']) if isinstance(baseline_row['baseline_data'], str) else baseline_row['baseline_data']
        baseline_id = baseline_row['id']

        field = 'username' if entity_type == 'user' else 'hostname'
        time_24h = datetime.utcnow() - timedelta(hours=24)

        # Check daily event count anomaly
        recent_count = await conn.fetchval(f"""
            SELECT COUNT(*) FROM security.normalized_logs
            WHERE {field} = $1 AND timestamp >= $2
        """, entity_id, time_24h)

        mean = baseline.get('mean_daily_events', 0)
        stddev = baseline.get('stddev_daily_events', 1)

        if stddev > 0 and mean > 0:
            z_score = (recent_count - mean) / stddev
            if abs(z_score) > 2.0:
                score = min(abs(z_score) / 5.0, 1.0)
                anomaly = {
                    'entity_id': entity_id,
                    'entity_type': entity_type,
                    'anomaly_type': 'unusual_event_volume',
                    'score': round(score, 3),
                    'deviation': round(z_score, 2),
                    'details': {
                        'recent_count': recent_count,
                        'baseline_mean': mean,
                        'baseline_stddev': stddev,
                        'z_score': round(z_score, 2)
                    },
                    'baseline_id': str(baseline_id)
                }
                anomalies.append(anomaly)

        # Check unusual hours
        hour_query = f"""
            SELECT EXTRACT(HOUR FROM timestamp)::int as hour, COUNT(*) as cnt
            FROM security.normalized_logs
            WHERE {field} = $1 AND timestamp >= $2
            GROUP BY hour
        """
        recent_hours = await conn.fetch(hour_query, entity_id, time_24h)
        baseline_hours = baseline.get('hourly_distribution', {})

        for row in recent_hours:
            hour = row['hour']
            baseline_count = baseline_hours.get(str(hour), baseline_hours.get(hour, 0))
            if baseline_count == 0 and row['cnt'] > 2:
                anomalies.append({
                    'entity_id': entity_id,
                    'entity_type': entity_type,
                    'anomaly_type': 'unusual_activity_hour',
                    'score': 0.7,
                    'deviation': row['cnt'],
                    'details': {
                        'hour': hour,
                        'event_count': row['cnt'],
                        'baseline_count': baseline_count
                    },
                    'baseline_id': str(baseline_id)
                })

        # Check unusual destinations
        dest_count = await conn.fetchval(f"""
            SELECT COUNT(DISTINCT dst_ip) FROM security.normalized_logs
            WHERE {field} = $1 AND timestamp >= $2
        """, entity_id, time_24h)

        baseline_dests = baseline.get('unique_destinations', 0)
        if baseline_dests > 0 and dest_count > baseline_dests * 2:
            anomalies.append({
                'entity_id': entity_id,
                'entity_type': entity_type,
                'anomaly_type': 'unusual_destination_count',
                'score': 0.6,
                'deviation': dest_count - baseline_dests,
                'details': {
                    'recent_destinations': dest_count,
                    'baseline_destinations': baseline_dests
                },
                'baseline_id': str(baseline_id)
            })

        # Save anomalies to DB
        for anomaly in anomalies:
            await conn.execute("""
                INSERT INTO security.ueba_anomalies
                (entity_id, entity_type, anomaly_type, score, deviation, details, baseline_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            """, anomaly['entity_id'], anomaly['entity_type'], anomaly['anomaly_type'],
                anomaly['score'], anomaly['deviation'],
                json.dumps(anomaly['details']), baseline_row['id'])

        return anomalies
