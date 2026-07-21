"""
NodeGuard AI Security Platform - API Routes
"""

from fastapi import APIRouter

# Import all routers
from .detection import router as detection_router
from .incidents import router as incidents_router
from .ml import router as ml_router
from .ai import router as ai_router
from .correlation import router as correlation_router
from .alerts import router as alerts_router
from .compliance import router as compliance_router
from .threat_intel import router as threat_intel_router
from .dashboard import router as dashboard_router
from .export import router as export_router
from .bulk import router as bulk_router
from .siem import router as siem_router
from .threat_hunting import router as hunting_router
from .advanced_detection import router as advanced_detection_router
from .soc_analyst import router as soc_analyst_router
from .investigation_cases import router as investigation_cases_router

__all__ = [
    "detection_router",
    "incidents_router",
    "ml_router",
    "ai_router",
    "correlation_router",
    "alerts_router",
    "compliance_router",
    "threat_intel_router",
    "dashboard_router",
    "export_router",
    "bulk_router",
    "siem_router",
    "hunting_router",
    "advanced_detection_router",
    "soc_analyst_router",
    "investigation_cases_router",
]
