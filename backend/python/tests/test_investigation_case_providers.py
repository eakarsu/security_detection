import os
import sys
import unittest
from unittest.mock import patch

PYTHON_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PYTHON_ROOT not in sys.path:
    sys.path.insert(0, PYTHON_ROOT)

from api.services.investigation_case_providers import (  # noqa: E402
    JsonProvider,
    ProviderBundle,
    ProviderConfigurationError,
    TemplateProvider,
)


class FakeTemplateClient:
    def __init__(self, authority="Approved Authority", source_uri="https://authority.example/form"):
        self.authority = authority
        self.source_uri = source_uri

    async def post(self, path, body, key):
        return {"authority": self.authority, "source_uri": self.source_uri}


class ProviderConfigurationTests(unittest.IsolatedAsyncioTestCase):
    def test_provider_requires_https_and_nontrivial_token(self):
        with self.assertRaisesRegex(ProviderConfigurationError, "HTTPS"):
            JsonProvider("storage", "http://storage.example", "token-with-enough-characters")
        with self.assertRaisesRegex(ProviderConfigurationError, "16 characters"):
            JsonProvider("storage", "https://storage.example", "short")

    def test_bundle_fails_closed_when_configuration_is_missing(self):
        names = [
            "CASE_STORAGE_URL", "CASE_STORAGE_TOKEN", "CASE_OCR_URL", "CASE_OCR_TOKEN",
            "CASE_ESIGN_URL", "CASE_ESIGN_TOKEN", "CASE_FILING_URL", "CASE_FILING_TOKEN",
            "CASE_TEMPLATE_URL", "CASE_TEMPLATE_TOKEN", "CASE_TEMPLATE_ALLOWED_AUTHORITIES",
            "CASE_TEMPLATE_ALLOWED_HOSTS",
        ]
        with patch.dict(os.environ, {}, clear=True):
            for name in names:
                os.environ.pop(name, None)
            with self.assertRaises(ProviderConfigurationError):
                ProviderBundle.from_environment()

    async def test_template_provenance_must_match_both_allowlists(self):
        provider = TemplateProvider(
            FakeTemplateClient(),
            {"Approved Authority"},
            {"authority.example"},
        )
        result = await provider.resolve("NY-US", "2026-01-01T00:00:00Z")
        self.assertEqual(result["authority"], "Approved Authority")

        rejected = TemplateProvider(
            FakeTemplateClient(source_uri="https://attacker.example/form"),
            {"Approved Authority"},
            {"authority.example"},
        )
        with self.assertRaisesRegex(RuntimeError, "allowlist"):
            await rejected.resolve("NY-US", "2026-01-01T00:00:00Z")


if __name__ == "__main__":
    unittest.main()
