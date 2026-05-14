"""
NodeGuard AI Security Platform - Elasticsearch Service
Wraps the ES client with graceful degradation when the cluster is unavailable.

When ES is not running (local dev), the service starts in LOCAL_MODE and all
search operations return empty results instead of raising exceptions.
"""

from typing import Any, Dict, List, Optional
import structlog

logger = structlog.get_logger(__name__)

_ES_AVAILABLE = True
try:
    from elasticsearch import AsyncElasticsearch
except ImportError:
    _ES_AVAILABLE = False
    logger.warning("elasticsearch package not installed — ES service disabled")


class ElasticsearchService:
    """
    Async Elasticsearch client with graceful local-mode fallback.

    If the ES cluster is unreachable during initialize(), the service switches
    to LOCAL_MODE where all operations are no-ops and return empty results.
    """

    def __init__(self, url: str = "http://localhost:9200",
                 username: Optional[str] = None,
                 password: Optional[str] = None):
        self._url = url
        self._username = username
        self._password = password
        self._client: Optional[Any] = None
        self._local_mode = False
        self._connected = False

    async def initialize(self) -> None:
        """Connect to ES cluster; fall back to local mode on failure."""
        if not _ES_AVAILABLE:
            logger.warning(
                "Elasticsearch client library not available — running in local mode"
            )
            self._local_mode = True
            return

        try:
            kwargs: Dict[str, Any] = {"hosts": [self._url]}
            if self._username and self._password:
                kwargs["http_auth"] = (self._username, self._password)

            self._client = AsyncElasticsearch(**kwargs)

            # Ping to verify connectivity (short timeout so local dev starts fast)
            reachable = await self._client.ping(request_timeout=3)
            if not reachable:
                raise ConnectionError("ES ping returned False")

            self._connected = True
            logger.info("Elasticsearch service connected", url=self._url)

        except Exception as e:
            logger.warning(
                "Elasticsearch is not reachable — running in LOCAL MODE. "
                "Log search, threat hunting, and SIEM correlation are disabled.",
                error=str(e),
                url=self._url,
            )
            if self._client:
                try:
                    await self._client.close()
                except Exception:
                    pass
            self._client = None
            self._local_mode = True

    def is_connected(self) -> bool:
        return self._connected and not self._local_mode

    def is_local_mode(self) -> bool:
        return self._local_mode

    async def search(self, index: str, body: Dict[str, Any]) -> Dict[str, Any]:
        """Search ES index; returns empty hits in local mode."""
        if self._local_mode or not self._client:
            logger.debug("ES local mode — returning empty search results", index=index)
            return {"hits": {"total": {"value": 0}, "hits": []}}

        try:
            return await self._client.search(index=index, body=body)
        except Exception as e:
            logger.error("ES search failed", index=index, error=str(e))
            return {"hits": {"total": {"value": 0}, "hits": []}}

    async def index_document(self, index: str, doc_id: str, document: Dict[str, Any]) -> bool:
        """Index a document; silently skips in local mode."""
        if self._local_mode or not self._client:
            logger.debug("ES local mode — skipping index operation", index=index)
            return False

        try:
            await self._client.index(index=index, id=doc_id, document=document)
            return True
        except Exception as e:
            logger.error("ES index failed", index=index, doc_id=doc_id, error=str(e))
            return False

    async def close(self) -> None:
        if self._client:
            try:
                await self._client.close()
            except Exception:
                pass
        self._connected = False
