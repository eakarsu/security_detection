"""
NodeGuard AI Security Platform - Kill Chain Service
Lockheed Martin Cyber Kill Chain analysis and visualization
"""

import json
from datetime import datetime, timedelta
from typing import Dict, Any, List
import structlog

logger = structlog.get_logger(__name__)

KILL_CHAIN_PHASES = [
    {
        "id": "reconnaissance",
        "name": "Reconnaissance",
        "order": 1,
        "description": "Harvesting information: email addresses, social engineering, scanning"
    },
    {
        "id": "weaponization",
        "name": "Weaponization",
        "order": 2,
        "description": "Coupling exploit with backdoor into deliverable payload"
    },
    {
        "id": "delivery",
        "name": "Delivery",
        "order": 3,
        "description": "Delivering weaponized bundle to victim via email, web, USB"
    },
    {
        "id": "exploitation",
        "name": "Exploitation",
        "order": 4,
        "description": "Exploiting a vulnerability to execute code on victim system"
    },
    {
        "id": "installation",
        "name": "Installation",
        "order": 5,
        "description": "Installing malware on the asset, establishing persistence"
    },
    {
        "id": "command_and_control",
        "name": "Command & Control",
        "order": 6,
        "description": "Establishing channel for remote manipulation of victim"
    },
    {
        "id": "actions_on_objectives",
        "name": "Actions on Objectives",
        "order": 7,
        "description": "Achieving the adversary's goal: data exfiltration, destruction"
    },
]

# Map event types/actions to kill chain phases
EVENT_PHASE_MAP = {
    'reconnaissance': ['scan', 'port_scan', 'enumeration', 'discovery', 'recon', 'probe', 'nmap'],
    'weaponization': ['compile', 'build', 'pack', 'encode', 'obfuscate'],
    'delivery': ['phishing', 'email', 'download', 'drive-by', 'usb', 'attachment', 'spearphish'],
    'exploitation': ['exploit', 'vulnerability', 'sql_injection', 'xss', 'rce', 'buffer_overflow', 'zero_day'],
    'installation': ['install', 'persistence', 'backdoor', 'trojan', 'malware', 'dropper', 'implant', 'registry'],
    'command_and_control': ['c2', 'beacon', 'callback', 'command_and_control', 'dns_tunnel', 'reverse_shell', 'c&c'],
    'actions_on_objectives': ['exfiltration', 'data_theft', 'ransomware', 'encrypt', 'destroy', 'wipe', 'steal', 'dump'],
}


def classify_event_phase(event_type: str, action: str, message: str) -> str:
    """Classify an event into a kill chain phase"""
    text = f"{event_type} {action} {message}".lower()

    for phase, keywords in EVENT_PHASE_MAP.items():
        for keyword in keywords:
            if keyword in text:
                return phase

    return 'reconnaissance'  # default


async def detect_kill_chain(src_ip: str, conn, time_window_hours: int = 24) -> Dict[str, Any]:
    """Detect kill chain progression for a given source IP"""
    time_start = datetime.utcnow() - timedelta(hours=time_window_hours)

    # Query events from this IP
    events = await conn.fetch("""
        SELECT id, timestamp, source_type, action, severity, src_ip, dst_ip,
               username, message, extra_fields
        FROM security.normalized_logs
        WHERE src_ip = $1 AND timestamp >= $2
        ORDER BY timestamp ASC
    """, src_ip, time_start)

    if not events:
        # Also check events with matching dst_ip
        events = await conn.fetch("""
            SELECT id, timestamp, source_type, action, severity, src_ip, dst_ip,
                   username, message, extra_fields
            FROM security.normalized_logs
            WHERE (src_ip = $1 OR dst_ip = $1) AND timestamp >= $2
            ORDER BY timestamp ASC
        """, src_ip, time_start)

    # Classify events into phases
    phases = {phase['id']: [] for phase in KILL_CHAIN_PHASES}

    for event in events:
        phase = classify_event_phase(
            event.get('action', '') or '',
            event.get('source_type', '') or '',
            event.get('message', '') or ''
        )
        phases[phase].append({
            'event_id': str(event['id']),
            'timestamp': event['timestamp'].isoformat() if event['timestamp'] else None,
            'action': event['action'],
            'severity': event['severity'],
            'src_ip': event['src_ip'],
            'dst_ip': event['dst_ip'],
            'message': (event['message'] or '')[:200],
        })

    # Determine active phases and progression
    active_phases = [p for p in KILL_CHAIN_PHASES if phases[p['id']]]
    max_phase = max((p['order'] for p in active_phases), default=0)

    # Create or update kill chain record
    chain_name = f"Kill Chain - {src_ip} - {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
    chain_row = await conn.fetchrow("""
        INSERT INTO security.kill_chains (name, description, src_ip, status)
        VALUES ($1, $2, $3, $4) RETURNING id
    """, chain_name, f"Auto-detected kill chain for {src_ip}", src_ip, 'detected')

    chain_id = chain_row['id']

    # Insert kill chain events
    seq = 0
    for phase_info in KILL_CHAIN_PHASES:
        for event in phases[phase_info['id']]:
            seq += 1
            await conn.execute("""
                INSERT INTO security.kill_chain_events
                (chain_id, phase, event_id, event_type, description, timestamp, sequence_order)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            """, chain_id, phase_info['id'],
                event.get('event_id') if event.get('event_id') != 'None' else None,
                event.get('action', ''), event.get('message', ''),
                datetime.fromisoformat(event['timestamp']) if event.get('timestamp') else None,
                seq)

    return {
        'chain_id': str(chain_id),
        'name': chain_name,
        'src_ip': src_ip,
        'status': 'detected',
        'total_events': len(events),
        'phases_detected': len(active_phases),
        'max_phase': max_phase,
        'phases': [
            {
                'id': p['id'],
                'name': p['name'],
                'order': p['order'],
                'events': phases[p['id']],
                'event_count': len(phases[p['id']]),
            }
            for p in KILL_CHAIN_PHASES
        ]
    }


async def build_visualization(chain_id: str, conn) -> Dict[str, Any]:
    """Get kill chain visualization data for an existing chain"""
    chain = await conn.fetchrow("""
        SELECT id, name, description, src_ip, status, created_at
        FROM security.kill_chains WHERE id = $1
    """, chain_id)

    if not chain:
        return None

    events = await conn.fetch("""
        SELECT id, phase, event_id, event_type, description, timestamp, sequence_order
        FROM security.kill_chain_events
        WHERE chain_id = $1
        ORDER BY sequence_order ASC
    """, chain_id)

    phases = {p['id']: {'events': [], **p} for p in KILL_CHAIN_PHASES}

    for event in events:
        phase_id = event['phase']
        if phase_id in phases:
            phases[phase_id]['events'].append({
                'id': str(event['id']),
                'event_type': event['event_type'],
                'description': event['description'],
                'timestamp': event['timestamp'].isoformat() if event['timestamp'] else None,
                'sequence_order': event['sequence_order'],
            })

    return {
        'chain_id': str(chain['id']),
        'name': chain['name'],
        'description': chain['description'],
        'src_ip': chain['src_ip'],
        'status': chain['status'],
        'created_at': chain['created_at'].isoformat() if chain['created_at'] else None,
        'phases': [
            {
                'id': p_id,
                'name': p_data['name'],
                'order': p_data['order'],
                'description': p_data['description'],
                'events': p_data['events'],
                'event_count': len(p_data['events']),
            }
            for p_id, p_data in phases.items()
        ]
    }
