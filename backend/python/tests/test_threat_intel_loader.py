"""Tests for the threat intel loader."""

import json
import os
import sys
import tempfile

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from api.services.threat_intel_loader import ThreatIntelLoader  # noqa: E402


@pytest.mark.asyncio
async def test_loads_local_json_file_with_ips_and_cidrs():
    with tempfile.TemporaryDirectory() as td:
        path = os.path.join(td, "ti.json")
        with open(path, "w") as f:
            json.dump({"entries": ["1.2.3.4", "10.0.0.0/8", "not_an_ip"]}, f)
        os.environ["THREAT_INTEL_LOCAL_PATH"] = path
        loader = ThreatIntelLoader()
        await loader.refresh()

        assert loader.is_malicious_ip("1.2.3.4")
        assert loader.is_malicious_ip("10.5.5.5")
        assert not loader.is_malicious_ip("8.8.8.8")
        stats = loader.stats()
        assert stats["exact_ips"] >= 1
        assert stats["networks"] >= 1


@pytest.mark.asyncio
async def test_unknown_ip_returns_false_when_no_sources():
    os.environ["THREAT_INTEL_LOCAL_PATH"] = "/nonexistent/path.json"
    os.environ["THREAT_INTEL_FEED_URLS"] = ""
    loader = ThreatIntelLoader()
    await loader.refresh()
    assert not loader.is_malicious_ip("8.8.8.8")
