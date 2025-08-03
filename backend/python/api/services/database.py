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
        self._initializing = False
        self._init_lock = asyncio.Lock()
    
    async def initialize(self):
        """Initialize database connection pool with proper locking"""
        async with self._init_lock:
            # Check if already connected or currently initializing
            if self._connected and self._pool:
                return
            
            if self._initializing:
                # Wait for initialization to complete
                while self._initializing:
                    await asyncio.sleep(0.1)
                return
            
            try:
                self._initializing = True
                logger.info("Initializing database service")
                
                # Close existing pool if any
                if self._pool:
                    await self._pool.close()
                    self._pool = None
                
                # Get database configuration from settings
                database_url = os.getenv('DATABASE_URL')
                if database_url:
                    # Use DATABASE_URL if provided
                    self._pool = await asyncpg.create_pool(
                        database_url, 
                        min_size=5, 
                        max_size=20,
                        command_timeout=60,
                        max_inactive_connection_lifetime=300,
                        server_settings={
                            'application_name': 'NodeGuard_Security_Platform'
                        }
                    )
                else:
                    # Build connection from settings
                    self._pool = await asyncpg.create_pool(
                        host=settings.POSTGRES_HOST,
                        port=settings.POSTGRES_PORT,
                        user=settings.POSTGRES_USER,
                        password=settings.POSTGRES_PASSWORD,
                        database=settings.POSTGRES_DB,
                        min_size=1,
                        max_size=10,
                        command_timeout=30,
                        max_inactive_connection_lifetime=300,
                        server_settings={
                            'application_name': 'NodeGuard_Security_Platform'
                        }
                    )
                
                # Test the connection
                async with self._pool.acquire() as conn:
                    result = await conn.fetchval('SELECT 1')
                    if result != 1:
                        raise Exception("Database connection test failed")
                
                self._connected = True
                logger.info("Database service initialized successfully", 
                          pool_size=f"{self._pool.get_size()}/{self._pool.get_max_size()}")
                
            except Exception as e:
                logger.error("Failed to initialize database service", error=str(e))
                self._connected = False
                if self._pool:
                    try:
                        await self._pool.close()
                    except:
                        pass
                    self._pool = None
                raise
            finally:
                self._initializing = False
    
    async def ensure_connected(self):
        """Ensure database is connected, initialize if needed"""
        if not self._connected or not self._pool:
            await self.initialize()
        
        # Double check after initialization
        if not self._connected or not self._pool:
            raise RuntimeError("Database connection could not be established")
    
    async def get_connection(self):
        """Get database connection from pool"""
        await self.ensure_connected()
        return await self._pool.acquire()
    
    def get_connection_context(self):
        """Get database connection context manager"""
        if not self._connected or not self._pool:
            raise RuntimeError("Database not initialized - call ensure_connected() first")
        return self._pool.acquire()
    
    async def close(self):
        """Close database connection pool"""
        async with self._init_lock:
            try:
                if self._pool:
                    logger.info("Closing database connection pool")
                    await self._pool.close()
                    self._pool = None
                self._connected = False
            except Exception as e:
                logger.error("Error closing database connection", error=str(e))
    
    def is_connected(self) -> bool:
        """Check if database is connected"""
        return self._connected and self._pool is not None and not self._pool.is_closing()
    
    async def health_check(self) -> bool:
        """Perform database health check"""
        try:
            if not self.is_connected():
                await self.initialize()
            
            if not self.is_connected():
                return False
            
            async with self._pool.acquire() as conn:
                result = await conn.fetchval('SELECT 1')
                return result == 1
        except Exception as e:
            logger.error("Database health check failed", error=str(e))
            return False
    
    def get_pool_stats(self) -> Dict[str, Any]:
        """Get connection pool statistics"""
        if not self._pool:
            return {"status": "not_initialized"}
        
        return {
            "status": "connected" if self._connected else "disconnected",
            "size": self._pool.get_size(),
            "max_size": self._pool.get_max_size(),
            "min_size": self._pool.get_min_size(),
            "is_closing": self._pool.is_closing()
        }


# Global database service instance
_db_service = None
_service_lock = asyncio.Lock()


async def get_database_service() -> DatabaseService:
    """Get the global database service instance with proper initialization"""
    global _db_service
    
    async with _service_lock:
        if _db_service is None:
            _db_service = DatabaseService()
            await _db_service.initialize()
        elif not _db_service.is_connected():
            await _db_service.initialize()
    
    return _db_service


async def get_database_connection():
    """Get a database connection"""
    db_service = await get_database_service()
    return await db_service.get_connection()


async def close_database_service():
    """Close the global database service"""
    global _db_service
    if _db_service:
        await _db_service.close()
        _db_service = None
