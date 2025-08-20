"""
NodeGuard AI Security Platform - Python API
Main FastAPI application with hybrid AI threat detection
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any

import structlog
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from prometheus_client import make_asgi_app
import uvicorn

from api.routes import (
    detection_router,
    incidents_router,
    ml_router,
    ai_router,
    correlation_router,
    alerts_router,
    response_router,
    compliance_router,
    threat_intel_router,
    dashboard_router
)
from api.middleware import SecurityMiddleware, LoggingMiddleware
from api.services.database import DatabaseService
from api.services.cache import CacheService
from api.services.kafka_service import KafkaService
from api.services.ml_service import MLService
from api.services.openrouter_service import OpenRouterService
from utils.config import settings, LocalDevSettings, effective_settings
from utils.logging_config import setup_logging

# Setup structured logging
setup_logging()
logger = structlog.get_logger(__name__)

# Global services
db_service: DatabaseService = None
cache_service: CacheService = None
kafka_service: KafkaService = None
ml_service: MLService = None
openrouter_service: OpenRouterService = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global db_service, cache_service, kafka_service, ml_service, openrouter_service
    
    logger.info("Starting NodeGuard AI Security Platform")
    
    if LocalDevSettings.LOCAL_DEV_MODE:
        logger.info("Running in LOCAL DEVELOPMENT MODE - simplified features")
    
    try:
        # Initialize services with graceful fallbacks for local dev
        try:
            db_service = DatabaseService()
            await db_service.initialize()
            logger.info("Database service initialized")
        except Exception as e:
            logger.warning("Database service failed to initialize", error=str(e))
            if not LocalDevSettings.LOCAL_DEV_MODE:
                raise
        
        try:
            cache_service = CacheService()
            await cache_service.initialize()
            logger.info("Cache service initialized")
        except Exception as e:
            logger.warning("Cache service failed to initialize", error=str(e))
            if not LocalDevSettings.LOCAL_DEV_MODE:
                raise
        
        # Only initialize Kafka if external services are enabled
        if not LocalDevSettings.DISABLE_EXTERNAL_SERVICES:
            try:
                kafka_service = KafkaService(bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS)
                await kafka_service.initialize()
                logger.info("Kafka service initialized")
            except Exception as e:
                logger.warning("Kafka service failed to initialize", error=str(e))
                if not LocalDevSettings.LOCAL_DEV_MODE:
                    raise
        else:
            logger.info("Kafka service disabled (external services disabled for local development)")
            kafka_service = None
        
        try:
            ml_service = MLService()
            await ml_service.initialize()
            logger.info("ML service initialized")
        except Exception as e:
            logger.warning("ML service failed to initialize", error=str(e))
            if not LocalDevSettings.LOCAL_DEV_MODE:
                raise
        
        try:
            openrouter_service = OpenRouterService()
            await openrouter_service.initialize()
            logger.info("OpenRouter service initialized")
        except Exception as e:
            logger.warning("OpenRouter service failed to initialize", error=str(e))
            if not LocalDevSettings.LOCAL_DEV_MODE:
                raise
        
        # Background tasks controlled by environment variables
        if (config.ENABLE_THREAT_DETECTION_PIPELINE and 
            kafka_service and not LocalDevSettings.DISABLE_EXTERNAL_SERVICES):
            asyncio.create_task(start_threat_detection_pipeline())
            logger.info("Threat detection pipeline enabled")
        
        if (config.ENABLE_MODEL_TRAINING_SCHEDULER and 
            ml_service and not LocalDevSettings.SKIP_MODEL_TRAINING):
            asyncio.create_task(start_model_training_scheduler())
            logger.info("Model training scheduler enabled")
        
        logger.info("All available services initialized successfully")
        
        yield
        
    except Exception as e:
        logger.error("Failed to initialize services", error=str(e))
        if not LocalDevSettings.LOCAL_DEV_MODE:
            raise
        else:
            logger.info("Continuing in local development mode with limited functionality")
            yield
    finally:
        # Cleanup
        logger.info("Shutting down services")
        if kafka_service:
            await kafka_service.close()
        if cache_service:
            await cache_service.close()
        if db_service:
            await db_service.close()


# Create FastAPI application
app = FastAPI(
    title="NodeGuard AI Security Platform",
    description="Advanced AI-powered cybersecurity detection and response system",
    version="1.0.0",
    docs_url="/docs" if settings.ENABLE_SWAGGER else None,
    redoc_url="/redoc" if settings.ENABLE_SWAGGER else None,
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.NODE_ENV == "development" else settings.ALLOWED_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*.nodeguard.ai"]
)

app.add_middleware(SecurityMiddleware)
app.add_middleware(LoggingMiddleware)

# Add Prometheus metrics
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

# Include routers
app.include_router(detection_router, prefix="/api/detection", tags=["Detection"])
app.include_router(incidents_router, prefix="/api/incidents", tags=["Incidents"])
app.include_router(ml_router, prefix="/api/ml", tags=["Machine Learning"])
app.include_router(ai_router, prefix="/api/ai", tags=["AI Analysis"])
app.include_router(correlation_router, prefix="/api/correlation", tags=["Event Correlation"])
app.include_router(alerts_router, prefix="/api/alerts", tags=["Alert Management"])
app.include_router(response_router, prefix="/api/response", tags=["Security Response"])
app.include_router(compliance_router, prefix="/api/compliance", tags=["Compliance"])
app.include_router(threat_intel_router, prefix="/api/threat-intel", tags=["Threat Intelligence"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["Dashboard"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "NodeGuard AI Security Platform",
        "version": "1.0.0",
        "status": "operational",
        "mode": "local_development" if LocalDevSettings.LOCAL_DEV_MODE else "production",
        "services": {
            "database": "connected" if db_service and db_service.is_connected() else "disconnected",
            "cache": "connected" if cache_service and cache_service.is_connected() else "disconnected",
            "kafka": "connected" if kafka_service and kafka_service.is_connected() else "disconnected",
            "ml_engine": "ready" if ml_service and ml_service.is_ready() else "not_ready",
            "ai_service": "ready" if openrouter_service and openrouter_service.is_ready() else "not_ready"
        },
        "features": {
            "external_services": not LocalDevSettings.DISABLE_EXTERNAL_SERVICES,
            "ml_training": not LocalDevSettings.SKIP_MODEL_TRAINING,
            "in_memory_storage": LocalDevSettings.USE_IN_MEMORY_DB,
            "mock_responses": LocalDevSettings.MOCK_OPENROUTER_RESPONSES
        } if LocalDevSettings.LOCAL_DEV_MODE else None
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    health_status = {
        "status": "healthy",
        "timestamp": asyncio.get_event_loop().time(),
        "services": {}
    }
    
    # Check each service
    services = [
        ("database", db_service),
        ("cache", cache_service),
        ("kafka", kafka_service),
        ("ml_engine", ml_service),
        ("ai_service", openrouter_service)
    ]
    
    all_healthy = True
    for service_name, service in services:
        try:
            if service and hasattr(service, 'health_check'):
                is_healthy = await service.health_check()
            else:
                is_healthy = service is not None
            
            health_status["services"][service_name] = "healthy" if is_healthy else "unhealthy"
            if not is_healthy:
                all_healthy = False
        except Exception as e:
            health_status["services"][service_name] = f"error: {str(e)}"
            all_healthy = False
    
    health_status["status"] = "healthy" if all_healthy else "degraded"
    return health_status


async def start_threat_detection_pipeline():
    """Start the real-time threat detection pipeline"""
    logger.info("Starting threat detection pipeline")
    
    while True:
        try:
            # Process incoming security events from Kafka
            if kafka_service and kafka_service.is_connected():
                await kafka_service.process_security_events()
            
            await asyncio.sleep(config.THREAT_DETECTION_INTERVAL)  # Configurable interval
            
        except Exception as e:
            logger.error("Error in threat detection pipeline", error=str(e))
            await asyncio.sleep(5)  # Wait before retrying


async def start_model_training_scheduler():
    """Start the ML model training scheduler"""
    logger.info("Starting model training scheduler")
    
    while True:
        try:
            # Retrain models every 6 hours
            if ml_service and ml_service.is_ready():
                await ml_service.schedule_model_training()
            
            await asyncio.sleep(21600)  # 6 hours
            
        except Exception as e:
            logger.error("Error in model training scheduler", error=str(e))
            await asyncio.sleep(3600)  # Wait 1 hour before retrying


# Dependency injection
def get_db_service() -> DatabaseService:
    if not db_service:
        raise HTTPException(status_code=503, detail="Database service not available")
    return db_service


def get_cache_service() -> CacheService:
    if not cache_service:
        raise HTTPException(status_code=503, detail="Cache service not available")
    return cache_service


def get_kafka_service() -> KafkaService:
    if not kafka_service:
        raise HTTPException(status_code=503, detail="Kafka service not available")
    return kafka_service


def get_ml_service() -> MLService:
    if not ml_service:
        raise HTTPException(status_code=503, detail="ML service not available")
    return ml_service


def get_openrouter_service() -> OpenRouterService:
    if not openrouter_service:
        raise HTTPException(status_code=503, detail="OpenRouter service not available")
    return openrouter_service


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PYTHON_API_PORT,
        reload=settings.NODE_ENV == "development",
        log_level=settings.LOG_LEVEL.lower()
    )
