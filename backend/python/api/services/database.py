"""
NodeGuard AI Security Platform - Database Service
"""

import asyncio
import os
from typing import Optional, Dict, Any, List
import asyncpg
import structlog
from utils.config import settings

logger = structlog.get_logger(__name__)


class DatabaseService:
    """Database service for managing database connections and operations"""
    
    def __init__(self):
        self._connected = False
        self._pool = None
    
    async def initialize(self):
        """Initialize database connection pool"""
        try:
            logger.info("Initializing database service")
            
            # Get database configuration from settings
            database_url = os.getenv('DATABASE_URL')
            if database_url:
                # Use DATABASE_URL if provided
                self._pool = await asyncpg.create_pool(database_url, min_size=1, max_size=10)
            else:
                # Build connection from settings
                self._pool = await asyncpg.create_pool(
                    host=settings.POSTGRES_HOST,
                    port=settings.POSTGRES_PORT,
                    user=settings.POSTGRES_USER,
                    password=settings.POSTGRES_PASSWORD,
                    database=settings.POSTGRES_DB,
                    min_size=1,
                    max_size=10
                )
            
            # Test the connection
            async with self._pool.acquire() as conn:
                await conn.fetchval('SELECT 1')
            
            self._connected = True
            logger.info("Database service initialized successfully")
            
        except Exception as e:
            logger.error("Failed to initialize database service", error=str(e))
            logger.warning("Falling back to mock mode for development")
            self._connected = False
            raise
    
    async def get_connection(self):
        """Get database connection from pool"""
        if not self._connected or not self._pool:
            await self.initialize()
        return self._pool.acquire()
    
    async def close(self):
        """Close database connection pool"""
        try:
            if self._connected and self._pool:
                logger.info("Closing database connection")
                await self._pool.close()
                self._connected = False
        except Exception as e:
            logger.error("Error closing database connection", error=str(e))
    
    def is_connected(self) -> bool:
        """Check if database is connected"""
        return self._connected and self._pool is not None
    
    async def health_check(self) -> bool:
        """Perform database health check"""
        try:
            if not self._connected or not self._pool:
                return False
            
            async with self._pool.acquire() as conn:
                result = await conn.fetchval('SELECT 1')
                return result == 1
        except Exception as e:
            logger.error("Database health check failed", error=str(e))
            return False


# Global database service instance
_db_service = None


async def get_database_service() -> DatabaseService:
    """Get the global database service instance"""
    global _db_service
    if _db_service is None:
        _db_service = DatabaseService()
        await _db_service.initialize()
    return _db_service


async def get_database_connection():
    """Get a database connection"""
    db_service = await get_database_service()
    return await db_service.get_connection()
