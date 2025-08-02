"""
NodeGuard AI Security Platform - API Routes
"""

from fastapi import APIRouter

# Import all routers
from .detection import router as detection_router
from .incidents import router as incidents_router
from .ml import router as ml_router
from .compliance import router as compliance_router
from .threat_intel import router as threat_intel_router

__all__ = [
    "detection_router",
    "incidents_router", 
    "ml_router",
    "compliance_router",
    "threat_intel_router"
]
