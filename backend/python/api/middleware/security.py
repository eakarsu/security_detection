"""
NodeGuard AI Security Platform - Security Middleware
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import structlog

logger = structlog.get_logger(__name__)


class SecurityMiddleware(BaseHTTPMiddleware):
    """Security middleware for request validation and protection"""
    
    async def dispatch(self, request: Request, call_next):
        """Process request through security middleware"""
        try:
            # Add security headers
            response = await call_next(request)
            
            # Add security headers to response
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            
            return response
            
        except Exception as e:
            logger.error("Security middleware error", error=str(e))
            raise
