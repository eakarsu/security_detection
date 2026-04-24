"""
NodeGuard AI Security Platform - Log Parser Service
Parses Syslog, CEF, LEEF, and JSON log formats into normalized schema
"""

import re
import json
from datetime import datetime
from typing import Dict, Any, Optional
import structlog

logger = structlog.get_logger(__name__)


def parse_syslog(raw: str) -> Dict[str, Any]:
    """Parse RFC 5424/3164 syslog format"""
    result = _empty_normalized()

    # RFC 5424: <priority>version timestamp hostname app-name procid msgid structured-data msg
    rfc5424 = re.match(
        r'<(\d+)>(\d+)?\s*(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*(.*)',
        raw
    )

    if rfc5424:
        priority = int(rfc5424.group(1))
        result['severity'] = _priority_to_severity(priority)
        result['timestamp'] = _parse_timestamp(rfc5424.group(3))
        result['hostname'] = rfc5424.group(4)
        result['source_name'] = rfc5424.group(5)
        result['message'] = rfc5424.group(8) or ''
    else:
        # RFC 3164: <priority>timestamp hostname message
        rfc3164 = re.match(
            r'<(\d+)>(\w{3}\s+\d+\s+\d+:\d+:\d+)\s+(\S+)\s+(.*)',
            raw
        )
        if rfc3164:
            priority = int(rfc3164.group(1))
            result['severity'] = _priority_to_severity(priority)
            result['timestamp'] = _parse_timestamp(rfc3164.group(2))
            result['hostname'] = rfc3164.group(3)
            result['message'] = rfc3164.group(4)
        else:
            result['message'] = raw

    # Extract IPs from message
    ips = re.findall(r'\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b', result['message'])
    if len(ips) >= 1:
        result['src_ip'] = ips[0]
    if len(ips) >= 2:
        result['dst_ip'] = ips[1]

    # Extract action keywords
    result['action'] = _extract_action(result['message'])
    result['source_type'] = 'syslog'

    return result


def parse_cef(raw: str) -> Dict[str, Any]:
    """Parse Common Event Format (CEF)"""
    result = _empty_normalized()

    # CEF:Version|Device Vendor|Device Product|Device Version|Signature ID|Name|Severity|Extension
    cef_match = re.match(
        r'CEF:(\d+)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|(.*)',
        raw
    )

    if cef_match:
        result['source_name'] = f"{cef_match.group(2)} {cef_match.group(3)}"
        result['action'] = cef_match.group(6)
        result['severity'] = _cef_severity(cef_match.group(7))
        result['message'] = cef_match.group(6)

        # Parse extension key=value pairs
        extensions = _parse_kv_pairs(cef_match.group(8))
        result['src_ip'] = extensions.get('src', extensions.get('sourceAddress', ''))
        result['dst_ip'] = extensions.get('dst', extensions.get('destinationAddress', ''))
        result['src_port'] = _safe_int(extensions.get('spt', extensions.get('sourcePort')))
        result['dst_port'] = _safe_int(extensions.get('dpt', extensions.get('destinationPort')))
        result['protocol'] = extensions.get('proto', extensions.get('transportProtocol', ''))
        result['username'] = extensions.get('suser', extensions.get('sourceUserName', ''))
        result['hostname'] = extensions.get('shost', extensions.get('sourceHostName', ''))

        if extensions.get('rt'):
            result['timestamp'] = _parse_timestamp(extensions['rt'])

        result['extra_fields'] = extensions
    else:
        result['message'] = raw

    result['source_type'] = 'firewall'
    return result


def parse_leef(raw: str) -> Dict[str, Any]:
    """Parse Log Event Extended Format (LEEF)"""
    result = _empty_normalized()

    # LEEF:Version|Vendor|Product|Version|EventID|delimiter?|extensions
    leef_match = re.match(
        r'LEEF:(\d+(?:\.\d+)?)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|(.*)',
        raw
    )

    if leef_match:
        result['source_name'] = f"{leef_match.group(2)} {leef_match.group(3)}"
        result['action'] = leef_match.group(5)
        result['message'] = leef_match.group(5)

        extensions = _parse_kv_pairs(leef_match.group(6))
        result['src_ip'] = extensions.get('src', '')
        result['dst_ip'] = extensions.get('dst', '')
        result['src_port'] = _safe_int(extensions.get('srcPort'))
        result['dst_port'] = _safe_int(extensions.get('dstPort'))
        result['protocol'] = extensions.get('proto', '')
        result['username'] = extensions.get('usrName', extensions.get('identSrc', ''))
        result['hostname'] = extensions.get('srcHostName', '')
        result['severity'] = extensions.get('sev', 'medium')

        result['extra_fields'] = extensions
    else:
        result['message'] = raw

    result['source_type'] = 'endpoint'
    return result


def parse_json_log(raw: str) -> Dict[str, Any]:
    """Parse JSON formatted log"""
    result = _empty_normalized()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        result['message'] = raw
        return result

    # Map common field names
    field_mappings = {
        'timestamp': ['timestamp', 'time', '@timestamp', 'eventTime', 'created_at', 'date'],
        'src_ip': ['src_ip', 'source_ip', 'sourceIPAddress', 'client_ip', 'remote_addr', 'srcaddr'],
        'dst_ip': ['dst_ip', 'destination_ip', 'destinationIPAddress', 'server_ip', 'dstaddr'],
        'src_port': ['src_port', 'source_port', 'sourcePort', 'srcport'],
        'dst_port': ['dst_port', 'destination_port', 'destinationPort', 'dstport'],
        'protocol': ['protocol', 'proto', 'transport'],
        'username': ['username', 'user', 'userName', 'userIdentity', 'actor', 'principalName'],
        'hostname': ['hostname', 'host', 'computer', 'deviceName', 'machineName'],
        'action': ['action', 'eventName', 'event_type', 'activity', 'operation', 'eventType'],
        'severity': ['severity', 'level', 'priority', 'risk_level', 'alertSeverity'],
        'message': ['message', 'msg', 'description', 'detail', 'summary'],
        'source_type': ['source_type', 'logType', 'eventSource', 'service'],
        'source_name': ['source_name', 'sourceName', 'eventSource', 'application'],
    }

    for field, candidates in field_mappings.items():
        for candidate in candidates:
            val = _deep_get(data, candidate)
            if val is not None:
                if field in ('src_port', 'dst_port'):
                    result[field] = _safe_int(val)
                elif field == 'timestamp':
                    result[field] = _parse_timestamp(str(val))
                elif field == 'severity':
                    result[field] = _normalize_severity(str(val))
                else:
                    result[field] = str(val)
                break

    if not result['message']:
        result['message'] = json.dumps(data)

    # Store unmapped fields as extra
    mapped_keys = set()
    for candidates in field_mappings.values():
        mapped_keys.update(candidates)

    extra = {k: v for k, v in data.items() if k not in mapped_keys}
    if extra:
        result['extra_fields'] = extra

    return result


def normalize(raw: str, format: str) -> Dict[str, Any]:
    """Dispatch to appropriate parser"""
    parsers = {
        'syslog': parse_syslog,
        'cef': parse_cef,
        'leef': parse_leef,
        'json': parse_json_log,
    }

    parser = parsers.get(format, parse_json_log)
    result = parser(raw)

    # Ensure timestamp
    if not result.get('timestamp'):
        result['timestamp'] = datetime.utcnow().isoformat()

    # Ensure severity
    if not result.get('severity'):
        result['severity'] = 'info'

    return result


# --- Helper Functions ---

def _empty_normalized() -> Dict[str, Any]:
    return {
        'timestamp': None,
        'source_type': '',
        'source_name': '',
        'action': '',
        'severity': 'info',
        'src_ip': '',
        'dst_ip': '',
        'src_port': None,
        'dst_port': None,
        'protocol': '',
        'username': '',
        'hostname': '',
        'message': '',
        'extra_fields': {},
    }


def _priority_to_severity(priority: int) -> str:
    severity_val = priority % 8
    if severity_val <= 2:
        return 'critical'
    elif severity_val <= 3:
        return 'high'
    elif severity_val <= 5:
        return 'medium'
    else:
        return 'low'


def _cef_severity(sev: str) -> str:
    try:
        val = int(sev)
        if val >= 9:
            return 'critical'
        elif val >= 7:
            return 'high'
        elif val >= 4:
            return 'medium'
        else:
            return 'low'
    except ValueError:
        return _normalize_severity(sev)


def _normalize_severity(sev: str) -> str:
    sev_lower = sev.lower().strip()
    if sev_lower in ('critical', 'fatal', 'emergency', 'alert'):
        return 'critical'
    elif sev_lower in ('high', 'error', 'err', 'severe'):
        return 'high'
    elif sev_lower in ('medium', 'warning', 'warn', 'moderate'):
        return 'medium'
    elif sev_lower in ('low', 'info', 'information', 'notice', 'debug'):
        return 'low'
    return 'info'


def _parse_timestamp(ts: str) -> str:
    formats = [
        '%Y-%m-%dT%H:%M:%S.%fZ',
        '%Y-%m-%dT%H:%M:%SZ',
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%d %H:%M:%S',
        '%b %d %H:%M:%S',
        '%b  %d %H:%M:%S',
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(ts.strip(), fmt)
            if dt.year == 1900:
                dt = dt.replace(year=datetime.utcnow().year)
            return dt.isoformat()
        except ValueError:
            continue
    return ts


def _parse_kv_pairs(text: str) -> Dict[str, str]:
    result = {}
    # Match key=value pairs (value may be quoted)
    for match in re.finditer(r'(\w+)=("(?:[^"\\]|\\.)*"|[^\s]+)', text):
        key = match.group(1)
        value = match.group(2).strip('"')
        result[key] = value
    return result


def _extract_action(message: str) -> str:
    action_keywords = [
        'denied', 'allowed', 'blocked', 'dropped', 'accepted',
        'login', 'logout', 'failed', 'success', 'created',
        'deleted', 'modified', 'accessed', 'executed', 'detected',
    ]
    msg_lower = message.lower()
    for keyword in action_keywords:
        if keyword in msg_lower:
            return keyword
    return 'unknown'


def _safe_int(val) -> Optional[int]:
    if val is None:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def _deep_get(data: dict, key: str):
    """Get value from nested dict using dot notation or direct key"""
    if '.' in key:
        parts = key.split('.')
        current = data
        for part in parts:
            if isinstance(current, dict):
                current = current.get(part)
            else:
                return None
        return current
    return data.get(key)
