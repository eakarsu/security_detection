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
from .response import router as response_router
from .compliance import router as compliance_router
from .threat_intel import router as threat_intel_router
from .dashboard import router as dashboard_router

__all__ = [
    "detection_router",
    "incidents_router", 
    "ml_router",
    "ai_router",
    "correlation_router",
    "alerts_router",
    "response_router",
    "compliance_router",
    "threat_intel_router",
    "dashboard_router"
]
