"""
NodeGuard AI Security Platform - Sigma Rule Service
Parse, validate, convert, and export Sigma detection rules
"""

import json
from typing import Dict, Any, List, Tuple, Optional
import structlog

logger = structlog.get_logger(__name__)

try:
    import yaml
except ImportError:
    yaml = None
    logger.warning("PyYAML not installed, Sigma YAML parsing disabled")


def parse_sigma_yaml(yaml_content: str) -> Dict[str, Any]:
    """Parse Sigma YAML into structured detection logic"""
    if yaml is None:
        raise ValueError("PyYAML is required for Sigma rule parsing")

    try:
        data = yaml.safe_load(yaml_content)
    except Exception as e:
        raise ValueError(f"Invalid YAML: {str(e)}")

    return {
        'title': data.get('title', ''),
        'description': data.get('description', ''),
        'status': data.get('status', 'experimental'),
        'level': data.get('level', 'medium'),
        'author': data.get('author', ''),
        'tags': data.get('tags', []),
        'logsource': data.get('logsource', {}),
        'detection': data.get('detection', {}),
        'falsepositives': data.get('falsepositives', []),
    }


def sigma_to_sql(parsed: Dict[str, Any]) -> Tuple[str, List[Any]]:
    """Convert Sigma detection logic to SQL WHERE clause for normalized_logs"""
    detection = parsed.get('detection', {})
    if not detection:
        return "TRUE", []

    where_parts = []
    params = []
    param_idx = 0

    # Map Sigma fields to normalized_logs columns
    field_map = {
        'EventID': 'action',
        'Image': 'message',
        'CommandLine': 'message',
        'ParentImage': 'message',
        'TargetFilename': 'message',
        'SourceIp': 'src_ip',
        'DestinationIp': 'dst_ip',
        'DestinationPort': 'dst_port',
        'User': 'username',
        'ComputerName': 'hostname',
        'Channel': 'source_type',
        'SourceHostname': 'hostname',
    }

    # Process selection keys
    condition = detection.get('condition', '')

    for key, value in detection.items():
        if key == 'condition':
            continue

        if isinstance(value, dict):
            for field, pattern in value.items():
                col = field_map.get(field, 'message')
                if isinstance(pattern, list):
                    sub_parts = []
                    for p in pattern:
                        param_idx += 1
                        if '*' in str(p):
                            sub_parts.append(f"{col} ILIKE ${param_idx}")
                            params.append(str(p).replace('*', '%'))
                        else:
                            sub_parts.append(f"{col} = ${param_idx}")
                            params.append(str(p))
                    if sub_parts:
                        where_parts.append(f"({' OR '.join(sub_parts)})")
                elif isinstance(pattern, str):
                    param_idx += 1
                    if '|contains' in field:
                        actual_col = field_map.get(field.split('|')[0], 'message')
                        where_parts.append(f"{actual_col} ILIKE ${param_idx}")
                        params.append(f"%{pattern}%")
                    elif '*' in pattern:
                        where_parts.append(f"{col} ILIKE ${param_idx}")
                        params.append(pattern.replace('*', '%'))
                    else:
                        where_parts.append(f"{col} = ${param_idx}")
                        params.append(pattern)
        elif isinstance(value, list):
            for item in value:
                if isinstance(item, dict):
                    for field, pattern in item.items():
                        col = field_map.get(field, 'message')
                        param_idx += 1
                        if isinstance(pattern, str) and '*' in pattern:
                            where_parts.append(f"{col} ILIKE ${param_idx}")
                            params.append(pattern.replace('*', '%'))
                        else:
                            where_parts.append(f"{col} = ${param_idx}")
                            params.append(str(pattern))

    # Apply logsource filters
    logsource = parsed.get('logsource', {})
    if logsource.get('category'):
        param_idx += 1
        where_parts.append(f"source_type ILIKE ${param_idx}")
        params.append(f"%{logsource['category']}%")

    # Determine AND/OR from condition
    if 'or' in condition.lower() if condition else False:
        where_sql = " OR ".join(where_parts) if where_parts else "TRUE"
    else:
        where_sql = " AND ".join(where_parts) if where_parts else "TRUE"

    # Handle 'not' in condition
    if condition and 'not' in condition.lower():
        filter_key = None
        for key in detection:
            if key != 'condition' and key.startswith('filter'):
                filter_key = key
                break
        # Simplified: just negate any filter parts
        # In real implementation, parse the condition expression tree

    return where_sql, params


def validate_sigma(yaml_content: str) -> List[str]:
    """Validate Sigma rule YAML and return list of errors"""
    errors = []

    if yaml is None:
        errors.append("PyYAML is not installed")
        return errors

    try:
        data = yaml.safe_load(yaml_content)
    except Exception as e:
        errors.append(f"Invalid YAML syntax: {str(e)}")
        return errors

    if not isinstance(data, dict):
        errors.append("Root element must be a mapping")
        return errors

    required_fields = ['title', 'logsource', 'detection']
    for field in required_fields:
        if field not in data:
            errors.append(f"Missing required field: {field}")

    if 'detection' in data:
        detection = data['detection']
        if not isinstance(detection, dict):
            errors.append("Detection must be a mapping")
        elif 'condition' not in detection:
            errors.append("Detection must contain a 'condition' field")

    if 'logsource' in data:
        logsource = data['logsource']
        if not isinstance(logsource, dict):
            errors.append("Logsource must be a mapping")

    valid_levels = ['informational', 'low', 'medium', 'high', 'critical']
    level = data.get('level', '')
    if level and level not in valid_levels:
        errors.append(f"Invalid level '{level}', must be one of: {', '.join(valid_levels)}")

    return errors


def export_sigma(rule_data: Dict[str, Any]) -> str:
    """Export rule data back to Sigma YAML format"""
    if yaml is None:
        raise ValueError("PyYAML is required for Sigma rule export")

    sigma = {
        'title': rule_data.get('title', ''),
        'description': rule_data.get('description', ''),
        'status': rule_data.get('status', 'experimental'),
        'level': rule_data.get('severity', 'medium'),
        'author': rule_data.get('author', 'NodeGuard AI'),
        'tags': rule_data.get('tags', []),
        'logsource': {
            'category': rule_data.get('logsource_category', ''),
            'product': rule_data.get('logsource_product', ''),
        },
        'detection': rule_data.get('parsed_logic', {
            'selection': {'message|contains': 'suspicious'},
            'condition': 'selection'
        }),
        'falsepositives': ['Unknown'],
    }

    return yaml.dump(sigma, default_flow_style=False, sort_keys=False)
