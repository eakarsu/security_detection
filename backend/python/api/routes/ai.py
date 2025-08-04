"""
NodeGuard AI Security Platform - AI Analysis Routes
Real AI analysis endpoints for workflow nodes
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import structlog
from datetime import datetime
from ..services.openrouter_service import OpenRouterService, ThreatAnalysisRequest

logger = structlog.get_logger(__name__)

router = APIRouter()


class AIAnalysisRequest(BaseModel):
    """AI analysis request model"""
    event_data: Dict[str, Any]
    analysis_type: Optional[str] = "comprehensive"
    include_context: Optional[bool] = True
    model: Optional[str] = "anthropic/claude-3.5-sonnet"


class AIAnalysisResponse(BaseModel):
    """AI analysis response model"""
    analysis: str
    recommendations: List[str]
    confidence: float
    threat_level: str
    indicators: List[str]
    processing_time: float
    model_used: str
    context_included: bool


@router.post("/analyze", response_model=AIAnalysisResponse)
async def analyze_threat(request: AIAnalysisRequest) -> AIAnalysisResponse:
    """Real AI analysis for security events"""
    try:
        start_time = datetime.utcnow()
        
        # Get OpenRouter service instance from main.py global
        from main import openrouter_service
        if not openrouter_service:
            raise HTTPException(status_code=503, detail="AI service not available")
        
        # Build comprehensive threat analysis request
        threat_request = build_threat_analysis_request(request.event_data, request)
        
        # Get AI analysis using OpenRouter
        ai_result = await openrouter_service.analyze_threat(threat_request)
        
        # Convert ThreatAnalysisResponse to structured response format
        analysis_result = {
            "analysis": ai_result.summary,
            "recommendations": ai_result.recommendations,
            "confidence": ai_result.confidence,
            "threat_level": determine_threat_level_from_risk_score(ai_result.risk_score),
            "indicators": extract_indicators_from_analysis(ai_result.summary, request.event_data)
        }
        
        # Calculate processing time
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        
        logger.info("AI analysis completed", 
                   threat_level=analysis_result["threat_level"],
                   confidence=analysis_result["confidence"],
                   model=request.model,
                   processing_time=processing_time)
        
        return AIAnalysisResponse(
            analysis=analysis_result["analysis"],
            recommendations=analysis_result["recommendations"],
            confidence=analysis_result["confidence"],
            threat_level=analysis_result["threat_level"],
            indicators=analysis_result["indicators"],
            processing_time=processing_time,
            model_used=request.model,
            context_included=request.include_context
        )
        
    except Exception as e:
        logger.error("AI analysis failed", error=str(e))
        
        # Fallback analysis if AI service fails
        fallback_result = generate_fallback_analysis(request.event_data)
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        
        return AIAnalysisResponse(
            analysis=fallback_result["analysis"],
            recommendations=fallback_result["recommendations"],
            confidence=0.6,  # Lower confidence for fallback
            threat_level=fallback_result["threat_level"],
            indicators=fallback_result["indicators"],
            processing_time=processing_time,
            model_used="fallback",
            context_included=False
        )


@router.post("/explain")
async def explain_threat(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """Generate detailed explanation of threat indicators"""
    try:
        from main import openrouter_service
        if not openrouter_service:
            return generate_rule_based_explanation(event_data)
        
        # Create explanation-focused prompt
        explanation_prompt = build_explanation_prompt(event_data)
        
        threat_request = ThreatAnalysisRequest(
            event_id=event_data.get("event_id", "explain_event"),
            event_data=event_data,
            analysis_type="explanation",
            context={"role": "security_analyst", "prompt": explanation_prompt}
        )
        
        ai_result = await openrouter_service.analyze_threat(threat_request)
        
        return {
            "explanation": ai_result.summary if hasattr(ai_result, 'summary') else "No explanation available",
            "key_indicators": extract_key_indicators(event_data),
            "risk_factors": identify_risk_factors(event_data),
            "mitigation_steps": ai_result.recommendations if hasattr(ai_result, 'recommendations') else [],
            "confidence": ai_result.confidence if hasattr(ai_result, 'confidence') else 0.8
        }
        
    except Exception as e:
        logger.error("Threat explanation failed", error=str(e))
        return generate_rule_based_explanation(event_data)


@router.post("/recommend")
async def get_recommendations(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """Get AI-powered security recommendations"""
    try:
        from main import openrouter_service
        if not openrouter_service:
            return generate_standard_recommendations(event_data)
        
        # Focus on actionable recommendations
        recommendation_prompt = build_recommendation_prompt(event_data)
        
        threat_request = ThreatAnalysisRequest(
            event_id=event_data.get("event_id", "recommend_event"),
            event_data=event_data,
            analysis_type="recommendations",
            context={"role": "security_team", "prompt": recommendation_prompt}
        )
        
        ai_result = await openrouter_service.analyze_threat(threat_request)
        
        return {
            "immediate_actions": ai_result.recommendations[:3] if hasattr(ai_result, 'recommendations') and ai_result.recommendations else [],
            "investigation_steps": ai_result.recommendations[3:6] if hasattr(ai_result, 'recommendations') and len(ai_result.recommendations) > 3 else [],
            "prevention_measures": ai_result.recommendations[6:9] if hasattr(ai_result, 'recommendations') and len(ai_result.recommendations) > 6 else [],
            "escalation_criteria": ai_result.recommendations[9:] if hasattr(ai_result, 'recommendations') and len(ai_result.recommendations) > 9 else [],
            "confidence": ai_result.confidence if hasattr(ai_result, 'confidence') else 0.8
        }
        
    except Exception as e:
        logger.error("Recommendation generation failed", error=str(e))
        return generate_standard_recommendations(event_data)


def build_threat_analysis_request(event_data: Dict[str, Any], request: AIAnalysisRequest) -> ThreatAnalysisRequest:
    """Build comprehensive threat analysis request"""
    context_role = "security_analyst" if request.analysis_type == "comprehensive" else "threat_hunter"
    
    context = {
        "role": context_role,
        "include_recommendations": True,
        "include_confidence": True,
        "analysis_depth": request.analysis_type,
        "model": request.model
    }
    
    return ThreatAnalysisRequest(
        event_id=event_data.get("event_id", "ai_analysis_event"),
        event_data=event_data,
        analysis_type=request.analysis_type,
        context=context
    )


def parse_ai_analysis(ai_result, event_data: Dict[str, Any]) -> Dict[str, Any]:
    """Parse AI analysis response into structured format"""
    # Handle both ThreatAnalysisResponse objects and dictionaries
    if hasattr(ai_result, 'summary'):
        analysis_text = ai_result.summary
        recommendations = ai_result.recommendations if hasattr(ai_result, 'recommendations') else []
        confidence = ai_result.confidence if hasattr(ai_result, 'confidence') else calculate_confidence_from_event(event_data)
        risk_score = ai_result.risk_score if hasattr(ai_result, 'risk_score') else 5.0
    else:
        analysis_text = ai_result.get("analysis", "No analysis available")
        recommendations = ai_result.get("recommendations", [])
        confidence = ai_result.get("confidence", calculate_confidence_from_event(event_data))
        risk_score = ai_result.get("risk_score", 5.0)
    
    # Extract threat level from analysis or event data
    threat_level = determine_threat_level_from_risk_score(risk_score)
    
    # Extract indicators from analysis
    indicators = extract_indicators_from_analysis(analysis_text, event_data)
    
    # Get recommendations
    if not recommendations:
        recommendations = generate_default_recommendations(threat_level)
    
    # Determine confidence
    
    return {
        "analysis": analysis_text,
        "recommendations": recommendations,
        "confidence": confidence,
        "threat_level": threat_level,
        "indicators": indicators
    }


def generate_fallback_analysis(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """Generate rule-based analysis when AI is unavailable"""
    threat_type = event_data.get("threat_type", "Unknown")
    severity = event_data.get("severity", "MEDIUM")
    source_ip = event_data.get("source_ip", "Unknown")
    risk_score = event_data.get("risk_score", 0.0)
    
    # Rule-based threat level determination
    if risk_score >= 9.0 or severity == "CRITICAL":
        threat_level = "critical"
    elif risk_score >= 7.0 or severity == "HIGH":
        threat_level = "high"
    elif risk_score >= 5.0 or severity == "MEDIUM":
        threat_level = "medium"
    else:
        threat_level = "low"
    
    analysis = f"""
Security Event Analysis (Rule-based):

Threat Type: {threat_type}
Source: {source_ip}
Risk Score: {risk_score}/10
Severity: {severity}
Threat Level: {threat_level.upper()}

Assessment: Based on the event characteristics, this appears to be a {threat_level}-level security concern. 
The threat type '{threat_type}' with a risk score of {risk_score} requires {'immediate attention' if risk_score >= 8.0 else 'monitoring and investigation'}.

Key Observations:
- Event originated from {source_ip}
- Risk score indicates {'high probability of malicious activity' if risk_score >= 7.0 else 'moderate security risk'}
- {'Critical response required' if threat_level == 'critical' else 'Standard investigation procedures apply'}
    """.strip()
    
    recommendations = generate_default_recommendations(threat_level)
    indicators = [source_ip, threat_type] if source_ip != "Unknown" else [threat_type]
    
    return {
        "analysis": analysis,
        "recommendations": recommendations,
        "threat_level": threat_level,
        "indicators": indicators
    }


def determine_threat_level(ai_result: Dict[str, Any], event_data: Dict[str, Any]) -> str:
    """Determine threat level from AI result or event data"""
    # Check AI result first
    if "threat_level" in ai_result:
        return ai_result["threat_level"].lower()
    
    # Fallback to event data
    risk_score = event_data.get("risk_score", 0.0)
    severity = event_data.get("severity", "MEDIUM").upper()
    
    if risk_score >= 9.0 or severity == "CRITICAL":
        return "critical"
    elif risk_score >= 7.0 or severity == "HIGH":
        return "high"
    elif risk_score >= 5.0 or severity == "MEDIUM":
        return "medium"
    else:
        return "low"


def extract_indicators_from_analysis(analysis: str, event_data: Dict[str, Any]) -> List[str]:
    """Extract threat indicators from analysis text and event data"""
    indicators = []
    
    # Get indicators from event data
    for field in ["source_ip", "destination_ip", "target_ip", "user_id", "file_hash", "domain", "url"]:
        value = event_data.get(field)
        if value and value not in ["Unknown", "", None]:
            indicators.append(str(value))
    
    # Add threat type as indicator
    threat_type = event_data.get("threat_type")
    if threat_type:
        indicators.append(threat_type)
    
    return list(set(indicators))  # Remove duplicates


def generate_default_recommendations(threat_level: str) -> List[str]:
    """Generate default recommendations based on threat level"""
    base_recommendations = [
        "Monitor network traffic for suspicious activity",
        "Review security logs for related events",
        "Verify user access permissions"
    ]
    
    if threat_level in ["critical", "high"]:
        base_recommendations.extend([
            "Immediately isolate affected systems",
            "Escalate to security incident response team",
            "Collect forensic evidence",
            "Block suspicious IP addresses",
            "Reset potentially compromised credentials"
        ])
    elif threat_level == "medium":
        base_recommendations.extend([
            "Increase monitoring for related indicators",
            "Validate security controls effectiveness",
            "Consider temporary access restrictions"
        ])
    
    return base_recommendations


def calculate_confidence_from_event(event_data: Dict[str, Any]) -> float:
    """Calculate confidence score based on event data completeness"""
    required_fields = ["source_ip", "threat_type", "risk_score", "severity"]
    present_fields = sum(1 for field in required_fields if event_data.get(field))
    
    base_confidence = present_fields / len(required_fields)
    
    # Adjust based on risk score
    risk_score = event_data.get("risk_score", 0.0)
    if risk_score >= 8.0:
        base_confidence += 0.1
    elif risk_score <= 3.0:
        base_confidence -= 0.1
    
    return min(0.95, max(0.3, base_confidence))


def build_explanation_prompt(event_data: Dict[str, Any]) -> str:
    """Build prompt for detailed threat explanation"""
    return f"""
Please provide a detailed explanation of this security event:

Event Data: {event_data}

Focus on:
1. What this event indicates about potential threats
2. Why the specific indicators are concerning
3. How this type of attack typically progresses
4. What systems or data might be at risk

Provide a clear, technical explanation suitable for a security analyst.
    """.strip()


def build_recommendation_prompt(event_data: Dict[str, Any]) -> str:
    """Build prompt for actionable recommendations"""
    return f"""
Based on this security event, provide specific actionable recommendations:

Event Data: {event_data}

Please provide:
1. Immediate actions (next 5 minutes)
2. Investigation steps (next hour)
3. Prevention measures (long-term)
4. Escalation criteria (when to involve leadership)

Focus on practical, actionable steps for a security team.
    """.strip()


def generate_rule_based_explanation(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """Generate rule-based explanation when AI is unavailable"""
    threat_type = event_data.get("threat_type", "Unknown")
    
    explanations = {
        "Ransomware": "File encryption malware that demands payment for decryption keys",
        "Phishing": "Social engineering attack attempting to steal credentials or sensitive data",
        "Malware": "Malicious software designed to damage, disrupt, or gain unauthorized access",
        "DDoS": "Distributed denial-of-service attack overwhelming system resources",
        "SQL Injection": "Code injection attack targeting database queries",
        "XSS": "Cross-site scripting attack injecting malicious scripts into web applications"
    }
    
    explanation = explanations.get(threat_type, f"Security event of type '{threat_type}' detected")
    
    return {
        "explanation": explanation,
        "key_indicators": extract_key_indicators(event_data),
        "risk_factors": identify_risk_factors(event_data),
        "confidence": 0.7
    }


def generate_standard_recommendations(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """Generate standard recommendations when AI is unavailable"""
    return {
        "immediate_actions": [
            "Review event details and context",
            "Check for related security events",
            "Verify affected systems status"
        ],
        "investigation_steps": [
            "Analyze network traffic logs",
            "Review user activity logs",
            "Check endpoint security status",
            "Validate security control effectiveness"
        ],
        "prevention_measures": [
            "Update security policies if needed",
            "Review access controls",
            "Enhance monitoring rules",
            "Conduct security awareness training"
        ],
        "escalation_criteria": [
            "Multiple similar events detected",
            "High-value assets affected",
            "Evidence of data exfiltration",
            "System compromise confirmed"
        ],
        "confidence": 0.7
    }


def extract_key_indicators(event_data: Dict[str, Any]) -> List[str]:
    """Extract key threat indicators from event data"""
    indicators = []
    
    # Network indicators
    for field in ["source_ip", "destination_ip", "target_ip"]:
        value = event_data.get(field)
        if value and value != "Unknown":
            indicators.append(f"IP: {value}")
    
    # User indicators  
    user_id = event_data.get("user_id")
    if user_id:
        indicators.append(f"User: {user_id}")
    
    # File indicators
    file_hash = event_data.get("file_hash")
    if file_hash:
        indicators.append(f"File Hash: {file_hash}")
    
    return indicators


def identify_risk_factors(event_data: Dict[str, Any]) -> List[str]:
    """Identify risk factors from event data"""
    risk_factors = []
    
    risk_score = event_data.get("risk_score", 0.0)
    if risk_score >= 8.0:
        risk_factors.append("Very high risk score detected")
    elif risk_score >= 6.0:
        risk_factors.append("Elevated risk score")
    
    severity = event_data.get("severity", "").upper()
    if severity in ["HIGH", "CRITICAL"]:
        risk_factors.append(f"{severity.lower().capitalize()} severity event")
    
    # Check for suspicious patterns
    source_ip = event_data.get("source_ip", "")
    if source_ip.startswith("10.") or source_ip.startswith("192.168."):
        risk_factors.append("Internal network source")
    
    return risk_factors


def determine_threat_level_from_risk_score(risk_score: float) -> str:
    """Determine threat level from risk score"""
    if risk_score >= 8.0:
        return "critical"
    elif risk_score >= 6.0:
        return "high"
    elif risk_score >= 4.0:
        return "medium"
    else:
        return "low"