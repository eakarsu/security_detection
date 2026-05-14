"""
NodeGuard AI Security Platform - Rule-Based Detection Engine
Fallback detection engine used when ML model artifacts are absent.

Covers:
- High severity: >100 failed logins in 5 min window, known malicious IPs
- Medium severity: unusual hours access, geo-anomaly indicators
- Returns metadata with {method: "rule_based", confidence: 0.6}
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import ipaddress
import structlog

logger = structlog.get_logger(__name__)

# Static list of known malicious IP ranges (CIDR).
# In production, extend this from threat intel DB.
KNOWN_MALICIOUS_RANGES = [
    "185.220.0.0/16",   # Tor exit nodes (sample)
    "45.142.212.0/24",  # Known botnet C2 (sample)
]

# Business hours: 08:00-18:00
BUSINESS_HOURS_START = 8
BUSINESS_HOURS_END = 18

# Unusual geo: non-RFC1918 source IPs accessing internal-only destinations
INTERNAL_PREFIXES = ("10.", "172.16.", "172.17.", "172.18.", "172.19.",
                     "172.20.", "172.21.", "172.22.", "172.23.", "172.24.",
                     "172.25.", "172.26.", "172.27.", "172.28.", "172.29.",
                     "172.30.", "172.31.", "192.168.")


class RuleBasedEngine:
    """
    Stateless rule-based detection engine.
    Produces a risk assessment without requiring trained ML models.
    """

    def __init__(self):
        self._malicious_networks = []
        for cidr in KNOWN_MALICIOUS_RANGES:
            try:
                self._malicious_networks.append(ipaddress.ip_network(cidr, strict=False))
            except ValueError:
                pass

    def evaluate(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate a security event against all rules.

        Returns a dict compatible with the ML prediction shape plus extra
        metadata indicating rule_based method.
        """
        matched_rules: List[str] = []
        max_score = 0.0

        source_ip: str = event_data.get("source_ip", "") or ""
        destination_ip: str = event_data.get("destination_ip", "") or ""
        event_type: str = event_data.get("event_type", "") or ""
        timestamp_raw = event_data.get("timestamp")
        failed_login_count: int = int(event_data.get("failed_login_count", 0))
        raw_data: Dict[str, Any] = event_data.get("raw_data", {}) or {}

        # --- Rule 1: Known malicious IP ---
        if source_ip and self._is_malicious_ip(source_ip):
            matched_rules.append("known_malicious_ip")
            max_score = max(max_score, 0.95)

        # --- Rule 2: High failed login count (>100 in event window) ---
        event_failed = int(raw_data.get("failed_login_count", failed_login_count))
        if event_failed > 100:
            matched_rules.append("high_failed_logins")
            max_score = max(max_score, 0.90)
        elif event_failed > 20:
            matched_rules.append("elevated_failed_logins")
            max_score = max(max_score, 0.55)

        # --- Rule 3: Unusual hours access ---
        if timestamp_raw:
            hour = self._parse_hour(timestamp_raw)
            if hour is not None and not (BUSINESS_HOURS_START <= hour < BUSINESS_HOURS_END):
                matched_rules.append("unusual_hours_access")
                max_score = max(max_score, 0.55)

        # --- Rule 4: Geo-anomaly — external IP targeting internal destination ---
        if source_ip and destination_ip:
            src_internal = self._is_internal(source_ip)
            dst_internal = self._is_internal(destination_ip)
            if not src_internal and dst_internal:
                matched_rules.append("geo_anomaly_external_to_internal")
                max_score = max(max_score, 0.55)

        # --- Rule 5: Suspicious event type keywords ---
        suspicious_keywords = (
            "brute_force", "sql_injection", "xss", "rce", "ransomware",
            "lateral_movement", "privilege_escalation", "exfiltration",
            "c2", "command_and_control", "exploit", "malware",
        )
        for kw in suspicious_keywords:
            if kw in event_type.lower():
                matched_rules.append(f"suspicious_event_type:{kw}")
                max_score = max(max_score, 0.75)
                break

        # Determine severity bucket
        threat_detected = max_score >= 0.5
        risk_level = self._score_to_risk_level(max_score)
        threat_type = event_type if threat_detected else None

        recommendations = self._build_recommendations(risk_level, matched_rules)

        logger.info(
            "Rule-based engine evaluated event",
            event_id=event_data.get("event_id"),
            matched_rules=matched_rules,
            threat_score=max_score,
            risk_level=risk_level,
        )

        return {
            "threat_detected": threat_detected,
            "threat_score": max_score,
            "confidence": 0.6,
            "risk_level": risk_level,
            "threat_type": threat_type,
            "matched_rules": matched_rules,
            "recommendations": recommendations,
            "metadata": {
                "method": "rule_based",
                "confidence": 0.6,
            },
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _is_malicious_ip(self, ip_str: str) -> bool:
        # First: check the live threat intel loader (DB + feeds + local file)
        try:
            from .threat_intel_loader import get_threat_intel
            if get_threat_intel().is_malicious_ip(ip_str):
                return True
        except Exception:
            pass
        # Fallback: built-in CIDR list (covers offline / startup race)
        try:
            addr = ipaddress.ip_address(ip_str)
            return any(addr in net for net in self._malicious_networks)
        except ValueError:
            return False

    def _is_internal(self, ip_str: str) -> bool:
        try:
            return ipaddress.ip_address(ip_str).is_private
        except ValueError:
            return False

    def _parse_hour(self, timestamp_raw) -> Optional[int]:
        if isinstance(timestamp_raw, datetime):
            return timestamp_raw.hour
        if isinstance(timestamp_raw, str):
            try:
                ts = datetime.fromisoformat(timestamp_raw.replace("Z", "+00:00"))
                return ts.hour
            except ValueError:
                return None
        return None

    @staticmethod
    def _score_to_risk_level(score: float) -> str:
        if score >= 0.85:
            return "critical"
        elif score >= 0.65:
            return "high"
        elif score >= 0.4:
            return "medium"
        return "low"

    @staticmethod
    def _build_recommendations(risk_level: str, matched_rules: List[str]) -> List[str]:
        recs: List[str] = []
        if "known_malicious_ip" in matched_rules:
            recs.append("Block source IP immediately — matches known threat intelligence.")
        if "high_failed_logins" in matched_rules:
            recs.append("Lock or throttle the targeted account; investigate brute-force source.")
        if "unusual_hours_access" in matched_rules:
            recs.append("Verify legitimacy of off-hours access with the account owner.")
        if any(r.startswith("geo_anomaly") for r in matched_rules):
            recs.append("Investigate external IP accessing internal resources; confirm VPN/proxy usage.")

        if risk_level in ("critical", "high"):
            recs += [
                "Escalate to incident response team.",
                "Collect forensic evidence from affected systems.",
                "Review related events in the last 24 hours.",
            ]
        elif risk_level == "medium":
            recs.append("Continue monitoring and correlate with related events.")
        else:
            recs.append("No immediate action required; continue monitoring.")

        return recs or ["Continue monitoring"]
