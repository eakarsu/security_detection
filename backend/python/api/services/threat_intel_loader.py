"""
Threat Intel Feed Loader.

Audit fix: KNOWN_MALICIOUS_IPS was empty (api/routes/detection.py:19).
This module loads malicious IP/CIDR data from:
  1. Local JSON file (THREAT_INTEL_LOCAL_PATH)
  2. Remote feeds via HTTP (THREAT_INTEL_FEED_URLS, comma-separated)
  3. Database table (security.threat_intel_iocs) when available

Refreshed on startup and every REFRESH_INTERVAL seconds in the background.
Exposes a singleton get_threat_intel() with .is_malicious_ip() and .stats().
"""

from __future__ import annotations

import asyncio
import ipaddress
import json
import os
import time
from pathlib import Path
from typing import List, Optional, Set, Tuple

import structlog

logger = structlog.get_logger(__name__)

REFRESH_INTERVAL = int(os.getenv("THREAT_INTEL_REFRESH_SECONDS", "3600"))


class ThreatIntelLoader:
    """Loads + refreshes malicious IP/CIDR data from multiple sources."""

    def __init__(self) -> None:
        self._exact_ips: Set[str] = set()
        self._networks: List[ipaddress._BaseNetwork] = []
        self._sources: List[Tuple[str, int]] = []  # (source, count)
        self._last_loaded: float = 0.0
        self._lock = asyncio.Lock()

    async def initialize(self) -> None:
        await self.refresh()

    async def refresh(self) -> None:
        """Reload all sources. Safe to call repeatedly."""
        async with self._lock:
            new_ips: Set[str] = set()
            new_nets: List[ipaddress._BaseNetwork] = []
            sources: List[Tuple[str, int]] = []

            # --- Source 1: Local JSON file ---
            local_path = os.getenv("THREAT_INTEL_LOCAL_PATH", "data/threat_intel/malicious_ips.json")
            try:
                p = Path(local_path)
                if p.exists():
                    payload = json.loads(p.read_text())
                    entries = payload if isinstance(payload, list) else payload.get("entries", [])
                    cnt = self._absorb(entries, new_ips, new_nets)
                    sources.append((f"local:{local_path}", cnt))
                    logger.info("Loaded threat intel from local file", path=local_path, count=cnt)
            except Exception as e:
                logger.warning("Local threat intel load failed", error=str(e))

            # --- Source 2: Remote HTTP feeds ---
            feed_urls = [u.strip() for u in os.getenv("THREAT_INTEL_FEED_URLS", "").split(",") if u.strip()]
            if feed_urls:
                try:
                    import httpx
                    async with httpx.AsyncClient(timeout=20.0) as client:
                        for url in feed_urls:
                            try:
                                r = await client.get(url)
                                r.raise_for_status()
                                # Accept JSON list, JSON object with "entries", or newline-delimited text
                                if r.headers.get("content-type", "").startswith("application/json"):
                                    payload = r.json()
                                    entries = payload if isinstance(payload, list) else payload.get("entries", [])
                                else:
                                    entries = [
                                        line.split("#", 1)[0].strip()
                                        for line in r.text.splitlines()
                                        if line.strip() and not line.strip().startswith("#")
                                    ]
                                cnt = self._absorb(entries, new_ips, new_nets)
                                sources.append((f"feed:{url}", cnt))
                                logger.info("Loaded threat intel from feed", url=url, count=cnt)
                            except Exception as e:
                                logger.warning("Feed load failed", url=url, error=str(e))
                except ImportError:
                    logger.warning("httpx not available for remote feed loading")

            # --- Source 3: DB-backed IOC table (best effort) ---
            try:
                # Lazy import to avoid circular deps
                from main import db_service  # type: ignore
                if db_service and db_service.is_connected():
                    rows = await self._load_from_db(db_service)
                    cnt = self._absorb(rows, new_ips, new_nets)
                    sources.append(("db:security.threat_intel_iocs", cnt))
                    logger.info("Loaded threat intel from DB", count=cnt)
            except Exception as e:
                logger.debug("DB threat intel skipped", error=str(e))

            # Atomic swap
            self._exact_ips = new_ips
            self._networks = new_nets
            self._sources = sources
            self._last_loaded = time.time()
            logger.info(
                "Threat intel refresh complete",
                exact_ips=len(self._exact_ips),
                networks=len(self._networks),
                sources=len(self._sources),
            )

    @staticmethod
    async def _load_from_db(db_service) -> List[str]:
        try:
            pool = getattr(db_service, "_pool", None)
            if pool is None:
                return []
            async with pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT ioc_value FROM security.threat_intel_iocs WHERE ioc_type IN ('ip','cidr') AND active = true"
                )
                return [r["ioc_value"] for r in rows]
        except Exception:
            return []

    @staticmethod
    def _absorb(entries, ips: Set[str], nets: List[ipaddress._BaseNetwork]) -> int:
        cnt = 0
        for raw in entries:
            if not raw:
                continue
            value = raw["value"] if isinstance(raw, dict) and "value" in raw else raw
            value = str(value).strip()
            if not value:
                continue
            try:
                if "/" in value:
                    nets.append(ipaddress.ip_network(value, strict=False))
                else:
                    ipaddress.ip_address(value)  # validate
                    ips.add(value)
                cnt += 1
            except ValueError:
                continue
        return cnt

    def is_malicious_ip(self, ip_str: str) -> bool:
        if not ip_str:
            return False
        if ip_str in self._exact_ips:
            return True
        try:
            addr = ipaddress.ip_address(ip_str)
            return any(addr in net for net in self._networks)
        except ValueError:
            return False

    def stats(self) -> dict:
        return {
            "exact_ips": len(self._exact_ips),
            "networks": len(self._networks),
            "sources": [{"source": s, "count": c} for (s, c) in self._sources],
            "last_loaded_epoch": self._last_loaded,
            "last_loaded_age_seconds": round(time.time() - self._last_loaded) if self._last_loaded else None,
        }


_singleton: Optional[ThreatIntelLoader] = None


def get_threat_intel() -> ThreatIntelLoader:
    global _singleton
    if _singleton is None:
        _singleton = ThreatIntelLoader()
    return _singleton


async def start_threat_intel_refresh_loop():
    """Background task: refresh every REFRESH_INTERVAL seconds."""
    intel = get_threat_intel()
    await intel.initialize()
    while True:
        try:
            await asyncio.sleep(REFRESH_INTERVAL)
            await intel.refresh()
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.error("Threat intel refresh loop error", error=str(e))
            await asyncio.sleep(60)
