"""Typed HTTPS adapters for investigation-case external services."""

import os
from urllib.parse import urlparse

import httpx


class ProviderConfigurationError(RuntimeError):
    pass


def _required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise ProviderConfigurationError(f"{name} is required")
    return value


class JsonProvider:
    def __init__(self, name: str, base_url: str, token: str):
        parsed = urlparse(base_url)
        if parsed.scheme != "https" or not parsed.netloc:
            raise ProviderConfigurationError(f"{name} URL must use HTTPS")
        if len(token) < 16:
            raise ProviderConfigurationError(f"{name} token must contain at least 16 characters")
        self.name = name
        self.base_url = base_url.rstrip("/")
        self.token = token

    async def post(self, path: str, body: dict, idempotency_key: str):
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{self.base_url}{path}",
                json=body,
                headers={
                    "Authorization": f"Bearer {self.token}",
                    "Idempotency-Key": idempotency_key,
                    "Accept": "application/json",
                },
            )
        if response.status_code < 200 or response.status_code >= 300:
            error = RuntimeError(f"{self.name} returned HTTP {response.status_code}")
            error.code = f"PROVIDER_{response.status_code}"
            raise error
        return response.json()


class StorageProvider:
    def __init__(self, client):
        self.client = client

    async def put(self, **value):
        return await self.client.post("/v1/objects", value, value["idempotency_key"])

    async def dispose(self, **value):
        return await self.client.post("/v1/dispositions", value, value["idempotency_key"])


class OCRProvider:
    def __init__(self, client):
        self.client = client

    async def extract(self, **value):
        return await self.client.post("/v1/extractions", value, value["idempotency_key"])


class SignatureProvider:
    def __init__(self, client):
        self.client = client

    async def request(self, **value):
        return await self.client.post("/v1/envelopes", value, value["idempotency_key"])


class FilingProvider:
    def __init__(self, client):
        self.client = client

    async def submit(self, **value):
        return await self.client.post("/v1/submissions", value, value["idempotency_key"])


class TemplateProvider:
    def __init__(self, client, allowed_authorities, allowed_source_hosts):
        self.client = client
        self.allowed_authorities = allowed_authorities
        self.allowed_source_hosts = allowed_source_hosts

    async def resolve(self, jurisdiction, incident_at):
        key = f"template:{jurisdiction}:{incident_at[:10]}"
        result = await self.client.post(
            "/v1/templates/resolve",
            {"jurisdiction": jurisdiction, "as_of": incident_at},
            key,
        )
        source_host = urlparse(result.get("source_uri", "")).hostname
        if result.get("authority") not in self.allowed_authorities or source_host not in self.allowed_source_hosts:
            raise RuntimeError("Template provenance is not in the configured authority allowlist")
        return result


class ProviderBundle:
    @classmethod
    def from_environment(cls):
        bundle = cls()
        bundle.storage = StorageProvider(JsonProvider("storage", _required("CASE_STORAGE_URL"), _required("CASE_STORAGE_TOKEN")))
        bundle.ocr = OCRProvider(JsonProvider("ocr", _required("CASE_OCR_URL"), _required("CASE_OCR_TOKEN")))
        bundle.signature = SignatureProvider(JsonProvider("signature", _required("CASE_ESIGN_URL"), _required("CASE_ESIGN_TOKEN")))
        bundle.filing = FilingProvider(JsonProvider("filing", _required("CASE_FILING_URL"), _required("CASE_FILING_TOKEN")))
        authorities = {item.strip() for item in _required("CASE_TEMPLATE_ALLOWED_AUTHORITIES").split(",") if item.strip()}
        hosts = {item.strip().lower() for item in _required("CASE_TEMPLATE_ALLOWED_HOSTS").split(",") if item.strip()}
        if not authorities or not hosts:
            raise ProviderConfigurationError("Template authority and host allowlists cannot be empty")
        bundle.templates = TemplateProvider(
            JsonProvider("template", _required("CASE_TEMPLATE_URL"), _required("CASE_TEMPLATE_TOKEN")),
            authorities,
            hosts,
        )
        return bundle
