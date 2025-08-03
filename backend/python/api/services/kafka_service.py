"""
NodeGuard AI Security Platform - Kafka Service
Real-time security event processing from Kafka
"""

import json
import logging
import asyncio
import threading
from typing import Dict, Any, Optional, Callable
from kafka import KafkaProducer, KafkaConsumer
from kafka.errors import KafkaError
import structlog
from datetime import datetime

logger = structlog.get_logger(__name__)

class SecurityEventProcessor:
    """Process security events and generate incidents"""
    
    def __init__(self, ml_service=None, database_service=None):
        self.ml_service = ml_service
        self.database_service = database_service
        self._kafka_db_service = None
        
    async def process_security_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a security event through ML analysis"""
        try:
            # Extract key information
            event_id = event_data.get('event_id')
            threat_type = event_data.get('threat_type', 'Unknown')
            severity = event_data.get('severity', 'LOW')
            risk_score = event_data.get('risk_score', 0.0)
            
            logger.info("Processing security event", 
                       event_id=event_id, 
                       threat_type=threat_type, 
                       severity=severity,
                       risk_score=risk_score)
            
            # Enhance with ML analysis if available
            if self.ml_service:
                try:
                    ml_analysis = await self.ml_service.analyze_security_event(event_data)
                    event_data.update(ml_analysis)
                except Exception as e:
                    logger.warning("ML analysis failed", error=str(e))
            
            # Create incident if risk score is high enough
            if risk_score >= 7.0:  # High risk threshold
                incident = await self.create_incident_from_event(event_data)
                logger.info("Created security incident", 
                           incident_id=incident.get('id'),
                           threat_type=threat_type)
            
            # Store event in database
            if self.database_service:
                await self.store_security_event(event_data)
            
            return {
                "status": "processed",
                "event_id": event_id,
                "threat_type": threat_type,
                "risk_score": risk_score,
                "incident_created": risk_score >= 7.0
            }
            
        except Exception as e:
            logger.error("Error processing security event", error=str(e))
            return {"status": "error", "error": str(e)}
    
    async def create_incident_from_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a security incident from an event"""
        incident = {
            "id": f"INC-{datetime.utcnow().strftime('%Y%m%d')}-{event_data.get('event_id', '')[:8]}",
            "title": f"{event_data.get('threat_type', 'Security Threat')} Detected",
            "description": self.generate_incident_description(event_data),
            "severity": event_data.get('severity', 'MEDIUM'),
            "status": "open",
            "source_event_id": event_data.get('event_id'),
            "risk_score": event_data.get('risk_score', 0.0),
            "source_ip": event_data.get('source_ip'),
            "target_ip": event_data.get('target_ip'),
            "detection_method": event_data.get('detection_method'),
            "confidence": event_data.get('confidence', 0.0),
            "created_at": datetime.utcnow().isoformat(),
            "metadata": event_data.get('metadata', {})
        }
        
        # Note: Incident is already stored as an event in security.events table
        # via store_security_event method, so no additional storage needed
        
        return incident
    
    def generate_incident_description(self, event_data: Dict[str, Any]) -> str:
        """Generate a detailed incident description"""
        threat_type = event_data.get('threat_type', 'Unknown Threat')
        source_ip = event_data.get('source_ip', 'Unknown')
        target_ip = event_data.get('target_ip', 'Unknown')
        risk_score = event_data.get('risk_score', 0.0)
        
        description = f"""
Security Threat Detected: {threat_type}

Risk Score: {risk_score}/10
Source IP: {source_ip}
Target IP: {target_ip}
Detection Method: {event_data.get('detection_method', 'Unknown')}
Confidence: {event_data.get('confidence', 0.0)}

Event Details:
{json.dumps(event_data.get('metadata', {}), indent=2)}
        """.strip()
        
        return description
    
    async def store_security_event(self, event_data: Dict[str, Any]):
        """Store security event in database"""
        try:
            # Use dedicated database service for Kafka to avoid connection conflicts
            if self._kafka_db_service is None:
                from .database import DatabaseService
                self._kafka_db_service = DatabaseService()
                await self._kafka_db_service.initialize()
            
            # Ensure connection is available
            if not self._kafka_db_service.is_connected():
                await self._kafka_db_service.initialize()
            
            # Store event in security.events table
            async with self._kafka_db_service.get_connection_context() as conn:
                # Map event data to database fields
                event_type = event_data.get('threat_type', 'unknown')
                description = event_data.get('description', f"{event_type} detected")
                severity = self._map_risk_to_severity(event_data.get('risk_score', 0.0))
                status = 'open' if event_data.get('risk_score', 0.0) >= 7.0 else 'investigating'
                
                # Insert into security.events table
                query = """
                    INSERT INTO security.events (
                        event_type, description, severity, status,
                        source_ip, destination_ip, user_id, endpoint,
                        ml_score, created_at, updated_at, assigned_to
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), $10)
                    RETURNING id
                """
                
                event_id = await conn.fetchval(
                    query,
                    event_type,
                    description,
                    severity,
                    status,
                    event_data.get('source_ip'),
                    event_data.get('target_ip'),
                    event_data.get('user_id'),
                    event_data.get('endpoint'),
                    event_data.get('risk_score'),
                    None  # assigned_to
                )
                
                logger.info("Stored security event in database", 
                           event_id=event_id, 
                           threat_type=event_type,
                           risk_score=event_data.get('risk_score'))
                
                # Also store threat intelligence if it's a high-confidence threat
                if event_data.get('risk_score', 0.0) >= 8.0:
                    await self._store_threat_intelligence(conn, event_data)
                
        except Exception as e:
            logger.error("Failed to store security event", error=str(e))
    
    def _map_risk_to_severity(self, risk_score: float) -> str:
        """Map risk score to severity level"""
        if risk_score >= 9.0:
            return 'critical'
        elif risk_score >= 7.0:
            return 'high'
        elif risk_score >= 5.0:
            return 'medium'
        else:
            return 'low'
    
    async def _store_threat_intelligence(self, conn, event_data: Dict[str, Any]):
        """Store threat intelligence indicators"""
        try:
            # Extract indicators from event data
            indicators = []
            
            # IP indicators
            if event_data.get('source_ip'):
                indicators.append({
                    'type': 'ip',
                    'value': event_data['source_ip'],
                    'threat_type': event_data.get('threat_type', 'unknown'),
                    'confidence': event_data.get('risk_score', 0.0) / 10.0
                })
            
            # Domain indicators (if available)
            if event_data.get('domain'):
                indicators.append({
                    'type': 'domain',
                    'value': event_data['domain'],
                    'threat_type': event_data.get('threat_type', 'unknown'),
                    'confidence': event_data.get('risk_score', 0.0) / 10.0
                })
            
            # Hash indicators (if available)
            if event_data.get('file_hash'):
                indicators.append({
                    'type': 'hash',
                    'value': event_data['file_hash'],
                    'threat_type': event_data.get('threat_type', 'unknown'),
                    'confidence': event_data.get('risk_score', 0.0) / 10.0
                })
            
            # Store each indicator
            for indicator in indicators:
                query = """
                    INSERT INTO security.threat_intel (
                        indicator_type, indicator_value, threat_type,
                        confidence_score, source, description,
                        first_seen, last_seen, is_active, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), true, NOW())
                    ON CONFLICT (indicator_value, indicator_type) 
                    DO UPDATE SET 
                        last_seen = NOW(),
                        confidence_score = GREATEST(security.threat_intel.confidence_score, $4)
                """
                
                await conn.execute(
                    query,
                    indicator['type'],
                    indicator['value'],
                    indicator['threat_type'],
                    indicator['confidence'],
                    'kafka_events',
                    f"{indicator['threat_type']} indicator from security event"
                )
                
                logger.debug("Stored threat intelligence indicator",
                           type=indicator['type'],
                           value=indicator['value'][:20] + "..." if len(indicator['value']) > 20 else indicator['value'])
                
        except Exception as e:
            logger.error("Failed to store threat intelligence", error=str(e))


class KafkaService:
    """Enhanced Kafka service for real-time security event processing"""
    
    def __init__(self, bootstrap_servers: str = "localhost:9092", database_service=None):
        self.bootstrap_servers = bootstrap_servers
        self.producer = None
        self.consumer = None
        self.consumer_thread = None
        self.running = False
        self.database_service = database_service
        # Create event processor with isolated database connection
        self.event_processor = SecurityEventProcessor(database_service=None)  # Don't share database service
        self._connected = False
        
    async def initialize(self):
        """Initialize Kafka connection with retry logic"""
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                logger.info("Initializing Kafka service", 
                           servers=self.bootstrap_servers, 
                           attempt=attempt + 1)
                
                # Test connection by creating a producer with shorter timeout
                self.producer = KafkaProducer(
                    bootstrap_servers=[self.bootstrap_servers],
                    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                    key_serializer=lambda k: k.encode('utf-8') if k else None,
                    retries=1,
                    retry_backoff_ms=500,
                    request_timeout_ms=3000,
                    api_version_auto_timeout_ms=3000
                )
                
                self._connected = True
                logger.info("Kafka service initialized successfully")
                
                # Start consuming security events
                await self.start_security_event_consumer()
                return
                
            except Exception as e:
                logger.warning("Kafka connection attempt failed", 
                             attempt=attempt + 1, 
                             error=str(e))
                
                if attempt < max_retries - 1:
                    logger.info("Retrying Kafka connection", delay=retry_delay)
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    logger.warning("Failed to connect to Kafka after all retries, continuing without Kafka")
                    self._connected = False
                    # Don't raise exception - allow service to start without Kafka
                    return
    
    async def start_security_event_consumer(self):
        """Start consuming security events from Kafka"""
        try:
            logger.info("Starting security event consumer")
            
            def consume_events():
                """Consumer thread function"""
                try:
                    consumer = KafkaConsumer(
                        'security-events',
                        bootstrap_servers=[self.bootstrap_servers],
                        group_id='nodeguard-security-processor',
                        value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                        key_deserializer=lambda k: k.decode('utf-8') if k else None,
                        auto_offset_reset='latest',
                        enable_auto_commit=True,
                        consumer_timeout_ms=1000
                    )
                    
                    logger.info("Security event consumer started")
                    
                    while self.running:
                        try:
                            message_batch = consumer.poll(timeout_ms=1000)
                            for topic_partition, messages in message_batch.items():
                                for message in messages:
                                    try:
                                        # Process each security event
                                        # Create a new event loop for the thread
                                        loop = asyncio.new_event_loop()
                                        asyncio.set_event_loop(loop)
                                        loop.run_until_complete(self.process_security_event(
                                            message.key, 
                                            message.value
                                        ))
                                        loop.close()
                                    except Exception as e:
                                        logger.error("Error processing security event", error=str(e))
                        except Exception as e:
                            if self.running:  # Only log if we're supposed to be running
                                logger.warning("Consumer poll error", error=str(e))
                            
                except Exception as e:
                    logger.error("Consumer thread error", error=str(e))
                finally:
                    if 'consumer' in locals():
                        consumer.close()
            
            # Start consumer in background thread
            self.running = True
            self.consumer_thread = threading.Thread(target=consume_events, daemon=True)
            self.consumer_thread.start()
            
        except Exception as e:
            logger.error("Failed to start security event consumer", error=str(e))
    
    async def process_security_event(self, key: str, event_data: Dict[str, Any]):
        """Process a security event from Kafka"""
        try:
            logger.info("Processing security event from Kafka", 
                       key=key, 
                       threat_type=event_data.get('threat_type'),
                       risk_score=event_data.get('risk_score'))
            
            # Process through ML pipeline
            result = await self.event_processor.process_security_event(event_data)
            
            # Log processing result
            if result.get('incident_created'):
                logger.warning("High-risk security incident created", 
                             threat_type=result.get('threat_type'),
                             risk_score=result.get('risk_score'))
            else:
                logger.info("Security event processed", 
                           threat_type=result.get('threat_type'),
                           risk_score=result.get('risk_score'))
            
            return result
            
        except Exception as e:
            logger.error("Error processing security event", error=str(e), key=key)
            return {"status": "error", "error": str(e)}
    
    async def process_security_events(self):
        """Process security events - main pipeline method called from main.py"""
        try:
            if not self._connected:
                logger.debug("Kafka not connected, skipping event processing")
                return
            
            # This method is called periodically from the main threat detection pipeline
            # The actual event processing happens in the consumer thread via process_security_event
            # We can use this to perform any periodic maintenance or monitoring
            
            logger.debug("Security event processing pipeline active")
            
            # Optional: Send a test event periodically for monitoring
            # await self.send_test_event("Pipeline Health Check", 1.0)
            
        except Exception as e:
            logger.error("Error in security events processing pipeline", error=str(e))
    
    async def publish_event(self, topic: str, event: Dict[str, Any], key: Optional[str] = None) -> bool:
        """Publish event to Kafka topic"""
        try:
            if not self._connected or not self.producer:
                logger.warning("Kafka not connected, cannot publish event")
                return False
            
            future = self.producer.send(topic, value=event, key=key)
            record_metadata = future.get(timeout=10)
            
            logger.debug("Event published to Kafka", 
                        topic=topic, 
                        partition=record_metadata.partition,
                        offset=record_metadata.offset)
            return True
            
        except Exception as e:
            logger.error("Error publishing event to Kafka", error=str(e), topic=topic)
            return False
    
    async def send_test_event(self, threat_type: str = "Test Event", risk_score: float = 5.0):
        """Send a test security event"""
        test_event = {
            "event_id": f"test-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}",
            "timestamp": datetime.utcnow().isoformat() + 'Z',
            "event_type": "test",
            "threat_type": threat_type,
            "severity": "MEDIUM" if risk_score < 7.0 else "HIGH",
            "risk_score": risk_score,
            "source_ip": "192.168.1.100",
            "target_ip": "192.168.1.200",
            "detection_method": "Test Generator",
            "confidence": 0.95,
            "metadata": {
                "test_event": True,
                "generated_at": datetime.utcnow().isoformat()
            }
        }
        
        return await self.publish_event('security-events', test_event, f"test-{test_event['event_id']}")
    
    def is_connected(self) -> bool:
        """Check if Kafka is connected"""
        return self._connected
    
    async def health_check(self) -> bool:
        """Perform Kafka health check"""
        try:
            if not self._connected:
                return False
            
            # Try to send a small test message
            test_result = await self.send_test_event("Health Check", 1.0)
            return test_result
            
        except Exception as e:
            logger.error("Kafka health check failed", error=str(e))
            return False
    
    async def close(self):
        """Close Kafka connection"""
        try:
            logger.info("Closing Kafka service")
            
            # Stop consumer
            self.running = False
            if self.consumer_thread and self.consumer_thread.is_alive():
                self.consumer_thread.join(timeout=5)
            
            # Close producer
            if self.producer:
                self.producer.close()
            
            self._connected = False
            logger.info("Kafka service closed")
            
        except Exception as e:
            logger.error("Error closing Kafka service", error=str(e))

# Global instance
kafka_service = KafkaService()
