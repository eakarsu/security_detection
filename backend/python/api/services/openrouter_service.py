"""
OpenRouter Service for Sonnet 4 Integration
Handles AI-powered threat analysis and incident explanation
"""

import asyncio
import json
import time
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone

import httpx
import structlog
from pydantic import BaseModel, Field

from utils.config import settings
from utils.prompts import SecurityPrompts

logger = structlog.get_logger(__name__)


class ThreatAnalysisRequest(BaseModel):
    """Request model for threat analysis"""
    event_id: str
    event_data: Dict[str, Any]
    context: Dict[str, Any] = Field(default_factory=dict)
    analysis_type: str = "comprehensive"  # comprehensive, quick, forensic
    priority: str = "normal"  # low, normal, high, critical


class ThreatAnalysisResponse(BaseModel):
    """Response model for threat analysis"""
    event_id: str
    analysis_id: str
    timestamp: datetime
    summary: str
    risk_score: float
    confidence: float
    mitre_mappings: List[Dict[str, str]]
    recommendations: List[str]
    technical_details: Dict[str, Any]
    response_actions: List[Dict[str, Any]]
    compliance_impact: Dict[str, Any]
    raw_response: str


class IncidentReport(BaseModel):
    """Structured incident report"""
    incident_id: str
    title: str
    severity: str
    description: str
    timeline: List[Dict[str, Any]]
    affected_assets: List[str]
    indicators_of_compromise: List[str]
    remediation_steps: List[str]
    lessons_learned: str


class OpenRouterService:
    """Service for interacting with OpenRouter API and Sonnet 4"""
    
    def __init__(self):
        self.base_url = settings.OPENROUTER_BASE_URL
        self.api_key = settings.OPENROUTER_API_KEY
        self.default_model = settings.DEFAULT_MODEL
        self.fallback_model = settings.FALLBACK_MODEL
        self.max_tokens = settings.MAX_TOKENS
        self.temperature = settings.TEMPERATURE
        
        self.client: Optional[httpx.AsyncClient] = None
        self.is_initialized = False
        self.request_count = 0
        self.error_count = 0
        
        # Rate limiting
        self.rate_limit = settings.API_RATE_LIMIT
        self.request_times = []
        
    async def initialize(self):
        """Initialize the OpenRouter service"""
        try:
            self.client = httpx.AsyncClient(
                base_url=self.base_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://nodeguard.ai",
                    "X-Title": "NodeGuard AI Security Platform"
                },
                timeout=30.0
            )
            
            # Test connection
            await self._test_connection()
            self.is_initialized = True
            logger.info("OpenRouter service initialized successfully")
            
        except Exception as e:
            logger.error("Failed to initialize OpenRouter service", error=str(e))
            raise
    
    async def close(self):
        """Close the service"""
        if self.client:
            await self.client.aclose()
        self.is_initialized = False
    
    def is_ready(self) -> bool:
        """Check if service is ready"""
        return self.is_initialized and self.client is not None
    
    async def health_check(self) -> bool:
        """Health check for the service"""
        try:
            if not self.is_ready():
                return False
            
            # Simple test request
            response = await self._make_request(
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=10
            )
            return response is not None
            
        except Exception:
            return False
    
    async def analyze_threat(self, request: ThreatAnalysisRequest) -> ThreatAnalysisResponse:
        """Analyze a security threat using Sonnet 4"""
        start_time = time.time()
        analysis_id = f"analysis_{int(time.time())}_{request.event_id}"
        
        try:
            logger.info("Starting threat analysis", 
                       event_id=request.event_id, 
                       analysis_id=analysis_id)
            
            # Build the analysis prompt
            prompt = self._build_threat_analysis_prompt(request)
            
            # Make request to Sonnet 4
            messages = [
                {
                    "role": "system",
                    "content": SecurityPrompts.SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
            
            response = await self._make_request(messages)
            
            if not response:
                raise Exception("No response from AI service")
            
            # Parse the structured response
            parsed_response = self._parse_threat_analysis_response(
                response, request.event_id, analysis_id
            )
            
            processing_time = time.time() - start_time
            logger.info("Threat analysis completed", 
                       analysis_id=analysis_id,
                       processing_time=processing_time)
            
            return parsed_response
            
        except Exception as e:
            logger.error("Threat analysis failed", 
                        event_id=request.event_id,
                        error=str(e))
            raise
    
    async def generate_incident_report(self, 
                                     incident_data: Dict[str, Any],
                                     analysis_results: List[ThreatAnalysisResponse]) -> IncidentReport:
        """Generate a comprehensive incident report"""
        try:
            prompt = self._build_incident_report_prompt(incident_data, analysis_results)
            
            messages = [
                {
                    "role": "system",
                    "content": SecurityPrompts.INCIDENT_REPORT_SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
            
            response = await self._make_request(messages)
            
            if not response:
                raise Exception("No response from AI service")
            
            return self._parse_incident_report(response, incident_data)
            
        except Exception as e:
            logger.error("Incident report generation failed", error=str(e))
            raise
    
    async def explain_alert(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate human-readable explanation for security alerts"""
        try:
            prompt = SecurityPrompts.build_alert_explanation_prompt(alert_data)
            
            messages = [
                {
                    "role": "system",
                    "content": SecurityPrompts.ALERT_EXPLANATION_SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
            
            response = await self._make_request(messages)
            
            if not response:
                raise Exception("No response from AI service")
            
            return self._parse_alert_explanation(response)
            
        except Exception as e:
            logger.error("Alert explanation failed", error=str(e))
            raise
    
    async def generate_compliance_report(self, 
                                       compliance_data: Dict[str, Any],
                                       regulation: str) -> Dict[str, Any]:
        """Generate compliance reports for various regulations"""
        try:
            prompt = SecurityPrompts.build_compliance_report_prompt(compliance_data, regulation)
            
            messages = [
                {
                    "role": "system",
                    "content": SecurityPrompts.COMPLIANCE_SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
            
            response = await self._make_request(messages)
            
            if not response:
                raise Exception("No response from AI service")
            
            return self._parse_compliance_report(response, regulation)
            
        except Exception as e:
            logger.error("Compliance report generation failed", error=str(e))
            raise
    
    async def _make_request(self, 
                          messages: List[Dict[str, str]], 
                          model: Optional[str] = None,
                          max_tokens: Optional[int] = None) -> Optional[str]:
        """Make a request to OpenRouter API"""
        if not self.client:
            raise Exception("OpenRouter client not initialized")
        
        # Rate limiting check
        await self._check_rate_limit()
        
        model = model or self.default_model
        max_tokens = max_tokens or self.max_tokens
        
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": self.temperature,
            "stream": False
        }
        
        try:
            self.request_count += 1
            self.request_times.append(time.time())
            
            response = await self.client.post("/chat/completions", json=payload)
            response.raise_for_status()
            
            data = response.json()
            
            if "choices" in data and len(data["choices"]) > 0:
                return data["choices"][0]["message"]["content"]
            else:
                logger.warning("No choices in response", response_data=data)
                return None
                
        except httpx.HTTPStatusError as e:
            self.error_count += 1
            
            if e.response.status_code == 429:  # Rate limited
                logger.warning("Rate limited, retrying with fallback model")
                if model != self.fallback_model:
                    await asyncio.sleep(1)
                    return await self._make_request(messages, self.fallback_model, max_tokens)
            
            logger.error("HTTP error in OpenRouter request", 
                        status_code=e.response.status_code,
                        error=str(e))
            raise
            
        except Exception as e:
            self.error_count += 1
            logger.error("Error in OpenRouter request", error=str(e))
            raise
    
    async def _test_connection(self):
        """Test connection to OpenRouter"""
        test_messages = [
            {"role": "user", "content": "Test connection"}
        ]
        
        response = await self._make_request(test_messages, max_tokens=10)
        if not response:
            raise Exception("Failed to connect to OpenRouter")
    
    async def _check_rate_limit(self):
        """Check and enforce rate limiting"""
        current_time = time.time()
        
        # Remove requests older than 1 minute
        self.request_times = [t for t in self.request_times if current_time - t < 60]
        
        # Check if we're hitting rate limit
        if len(self.request_times) >= self.rate_limit:
            sleep_time = 60 - (current_time - self.request_times[0])
            if sleep_time > 0:
                logger.info("Rate limit reached, sleeping", sleep_time=sleep_time)
                await asyncio.sleep(sleep_time)
    
    def _build_threat_analysis_prompt(self, request: ThreatAnalysisRequest) -> str:
        """Build the threat analysis prompt"""
        return SecurityPrompts.build_threat_analysis_prompt(
            request.event_data,
            request.context,
            request.analysis_type
        )
    
    def _parse_threat_analysis_response(self, 
                                      response: str, 
                                      event_id: str, 
                                      analysis_id: str) -> ThreatAnalysisResponse:
        """Parse the AI response into structured format"""
        try:
            # Try to extract JSON from response
            if "```json" in response:
                json_start = response.find("```json") + 7
                json_end = response.find("```", json_start)
                json_str = response[json_start:json_end].strip()
                parsed_data = json.loads(json_str)
            else:
                # Fallback: try to parse entire response as JSON
                parsed_data = json.loads(response)
            
            return ThreatAnalysisResponse(
                event_id=event_id,
                analysis_id=analysis_id,
                timestamp=datetime.now(timezone.utc),
                summary=parsed_data.get("summary", ""),
                risk_score=float(parsed_data.get("risk_score", 0.0)),
                confidence=float(parsed_data.get("confidence", 0.0)),
                mitre_mappings=parsed_data.get("mitre_mappings", []),
                recommendations=parsed_data.get("recommendations", []),
                technical_details=parsed_data.get("technical_details", {}),
                response_actions=parsed_data.get("response_actions", []),
                compliance_impact=parsed_data.get("compliance_impact", {}),
                raw_response=response
            )
            
        except Exception as e:
            logger.error("Failed to parse threat analysis response", error=str(e))
            # Return a basic response if parsing fails
            return ThreatAnalysisResponse(
                event_id=event_id,
                analysis_id=analysis_id,
                timestamp=datetime.now(timezone.utc),
                summary="Analysis completed but response parsing failed",
                risk_score=0.5,
                confidence=0.1,
                mitre_mappings=[],
                recommendations=["Manual review required"],
                technical_details={},
                response_actions=[],
                compliance_impact={},
                raw_response=response
            )
    
    def _build_incident_report_prompt(self, 
                                    incident_data: Dict[str, Any],
                                    analysis_results: List[ThreatAnalysisResponse]) -> str:
        """Build incident report prompt"""
        return SecurityPrompts.build_incident_report_prompt(incident_data, analysis_results)
    
    def _parse_incident_report(self, response: str, incident_data: Dict[str, Any]) -> IncidentReport:
        """Parse incident report response"""
        try:
            if "```json" in response:
                json_start = response.find("```json") + 7
                json_end = response.find("```", json_start)
                json_str = response[json_start:json_end].strip()
                parsed_data = json.loads(json_str)
            else:
                parsed_data = json.loads(response)
            
            return IncidentReport(
                incident_id=incident_data.get("incident_id", "unknown"),
                title=parsed_data.get("title", "Security Incident"),
                severity=parsed_data.get("severity", "medium"),
                description=parsed_data.get("description", ""),
                timeline=parsed_data.get("timeline", []),
                affected_assets=parsed_data.get("affected_assets", []),
                indicators_of_compromise=parsed_data.get("indicators_of_compromise", []),
                remediation_steps=parsed_data.get("remediation_steps", []),
                lessons_learned=parsed_data.get("lessons_learned", "")
            )
            
        except Exception as e:
            logger.error("Failed to parse incident report", error=str(e))
            raise
    
    def _parse_alert_explanation(self, response: str) -> Dict[str, Any]:
        """Parse alert explanation response"""
        try:
            if "```json" in response:
                json_start = response.find("```json") + 7
                json_end = response.find("```", json_start)
                json_str = response[json_start:json_end].strip()
                return json.loads(json_str)
            else:
                return json.loads(response)
                
        except Exception as e:
            logger.error("Failed to parse alert explanation", error=str(e))
            return {
                "explanation": response,
                "risk_level": "unknown",
                "recommended_actions": ["Manual review required"]
            }
    
    def _parse_compliance_report(self, response: str, regulation: str) -> Dict[str, Any]:
        """Parse compliance report response"""
        try:
            if "```json" in response:
                json_start = response.find("```json") + 7
                json_end = response.find("```", json_start)
                json_str = response[json_start:json_end].strip()
                return json.loads(json_str)
            else:
                return json.loads(response)
                
        except Exception as e:
            logger.error("Failed to parse compliance report", error=str(e))
            return {
                "regulation": regulation,
                "compliance_status": "unknown",
                "findings": [],
                "recommendations": ["Manual review required"]
            }
    
    def get_stats(self) -> Dict[str, Any]:
        """Get service statistics"""
        return {
            "is_ready": self.is_ready(),
            "request_count": self.request_count,
            "error_count": self.error_count,
            "error_rate": self.error_count / max(self.request_count, 1),
            "recent_requests": len(self.request_times)
        }
