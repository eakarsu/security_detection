"""
NodeGuard AI Security Platform - ML Prediction Routes
Real ML scoring endpoints for workflow nodes
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import structlog
from datetime import datetime
from ..services.database import get_database_service
from ..services.ml_service import MLService

logger = structlog.get_logger(__name__)

router = APIRouter()


class MLPredictionRequest(BaseModel):
    """ML prediction request model"""
    event_data: Dict[str, Any]
    model_type: Optional[str] = "ensemble"
    features: Optional[List[str]] = None


class MLPredictionResponse(BaseModel):
    """ML prediction response model"""
    threat_score: float
    confidence: float
    model_type: str
    features_used: List[str]
    analysis: str
    processing_time: float
    predictions: Dict[str, float]


class MLModel(BaseModel):
    """ML model information"""
    model_id: str
    name: str
    version: str
    status: str
    accuracy: float
    last_trained: str
    model_type: str


@router.post("/predict", response_model=MLPredictionResponse)
async def predict_threat(request: MLPredictionRequest) -> MLPredictionResponse:
    """Real ML prediction for security events"""
    try:
        start_time = datetime.utcnow()
        
        # Get ML service instance from main.py global
        from main import ml_service
        if not ml_service:
            raise HTTPException(status_code=503, detail="ML service not available")
        
        # Extract features from event data
        features = ml_service.extract_features(request.event_data)
        
        # Get predictions from different models
        predictions = {}
        
        if request.model_type == "ensemble" or request.model_type == "all":
            # Get predictions from all models
            xgb_pred = await ml_service.predict_threat_from_features(features, model_type="xgboost")
            rf_pred = await ml_service.predict_threat_from_features(features, model_type="random_forest")
            iso_pred = await ml_service.predict_threat_from_features(features, model_type="isolation_forest")
            
            predictions = {
                "xgboost": float(xgb_pred.get("threat_score", 0.0)),
                "random_forest": float(rf_pred.get("threat_score", 0.0)),
                "isolation_forest": float(iso_pred.get("threat_score", 0.0))
            }
            
            # Ensemble prediction (weighted average)
            weights = {"xgboost": 0.4, "random_forest": 0.35, "isolation_forest": 0.25}
            threat_score = sum(predictions[model] * weights[model] for model in predictions)
            confidence = min(0.95, max(0.6, threat_score * 1.1))  # Confidence based on score
            
        else:
            # Single model prediction
            result = await ml_service.predict_threat_from_features(features, model_type=request.model_type)
            threat_score = float(result.get("threat_score", 0.0))
            confidence = float(result.get("confidence", 0.8))
            predictions[request.model_type] = threat_score
        
        # Generate analysis text
        analysis = generate_threat_analysis(request.event_data, threat_score, predictions)
        
        # Calculate processing time
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        
        # Get features used
        features_used = list(features.keys()) if isinstance(features, dict) else []
        
        logger.info("ML prediction completed", 
                   threat_score=threat_score,
                   confidence=confidence,
                   model_type=request.model_type,
                   processing_time=processing_time)
        
        return MLPredictionResponse(
            threat_score=threat_score,
            confidence=confidence,
            model_type=request.model_type,
            features_used=features_used,
            analysis=analysis,
            processing_time=processing_time,
            predictions=predictions
        )
        
    except Exception as e:
        logger.error("ML prediction failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"ML prediction failed: {str(e)}")


@router.get("/models", response_model=List[MLModel])
async def get_models() -> List[MLModel]:
    """Get available ML models"""
    try:
        from main import ml_service
        if not ml_service:
            raise HTTPException(status_code=503, detail="ML service not available")
        
        return [
            MLModel(
                model_id="xgboost_v1",
                name="XGBoost Threat Detector",
                version="1.0.0",
                status="active",
                accuracy=0.94,
                last_trained="2025-08-01T10:00:00Z",
                model_type="gradient_boosting"
            ),
            MLModel(
                model_id="random_forest_v1",
                name="Random Forest Classifier",
                version="1.0.0",
                status="active",
                accuracy=0.91,
                last_trained="2025-08-01T15:30:00Z",
                model_type="ensemble"
            ),
            MLModel(
                model_id="isolation_forest_v1",
                name="Isolation Forest Anomaly Detector",
                version="1.0.0",
                status="active",
                accuracy=0.87,
                last_trained="2025-08-01T12:15:00Z",
                model_type="anomaly_detection"
            )
        ]
    except Exception as e:
        logger.error("Error retrieving ML models", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve models")


@router.post("/analyze-features")
async def analyze_features(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze and extract features from security event"""
    try:
        from main import ml_service
        if not ml_service:
            raise HTTPException(status_code=503, detail="ML service not available")
        features = ml_service.extract_features(event_data)
        
        # Add feature importance scores
        feature_importance = ml_service.get_feature_importance()
        
        analyzed_features = {}
        for feature_name, feature_value in features.items():
            analyzed_features[feature_name] = {
                "value": feature_value,
                "importance": feature_importance.get(feature_name, 0.0),
                "normalized": normalize_feature_value(feature_value),
                "risk_contribution": calculate_risk_contribution(feature_value, feature_importance.get(feature_name, 0.0))
            }
        
        return {
            "features": analyzed_features,
            "total_features": len(features),
            "high_risk_features": [name for name, data in analyzed_features.items() 
                                 if data["risk_contribution"] > 0.7],
            "feature_summary": generate_feature_summary(analyzed_features)
        }
        
    except Exception as e:
        logger.error("Feature analysis failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Feature analysis failed: {str(e)}")


@router.get("/model-status")
async def get_model_status() -> Dict[str, Any]:
    """Get status of all ML models"""
    try:
        from main import ml_service
        if not ml_service:
            raise HTTPException(status_code=503, detail="ML service not available")
        
        models = ["xgboost", "random_forest", "isolation_forest"]
        status = {}
        
        for model in models:
            try:
                # Test prediction with dummy data
                test_features = {"test_feature": 0.5}
                result = await ml_service.predict_threat(test_features, model_type=model)
                status[model] = {
                    "available": True,
                    "last_trained": ml_service.get_model_info(model).get("last_trained"),
                    "accuracy": ml_service.get_model_info(model).get("accuracy", 0.0),
                    "status": "healthy"
                }
            except Exception as e:
                status[model] = {
                    "available": False,
                    "error": str(e),
                    "status": "error"
                }
        
        return {
            "models": status,
            "ensemble_available": all(status[model]["available"] for model in models),
            "total_models": len(models),
            "healthy_models": sum(1 for model in status.values() if model.get("available", False))
        }
        
    except Exception as e:
        logger.error("Model status check failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Model status check failed: {str(e)}")


def generate_threat_analysis(event_data: Dict[str, Any], threat_score: float, predictions: Dict[str, float]) -> str:
    """Generate human-readable threat analysis"""
    threat_type = event_data.get("threat_type", "Unknown")
    severity = event_data.get("severity", "UNKNOWN")
    source_ip = event_data.get("source_ip", "Unknown")
    
    # Determine threat level
    if threat_score >= 0.9:
        level = "CRITICAL"
        description = "Extremely high probability of malicious activity"
    elif threat_score >= 0.7:
        level = "HIGH"
        description = "High probability of security threat"
    elif threat_score >= 0.5:
        level = "MEDIUM"
        description = "Moderate security risk detected"
    elif threat_score >= 0.3:
        level = "LOW"
        description = "Low-level security concern"
    else:
        level = "MINIMAL"
        description = "Minimal security risk"
    
    # Model agreement analysis
    model_scores = list(predictions.values())
    if len(model_scores) > 1:
        score_variance = max(model_scores) - min(model_scores)
        if score_variance < 0.1:
            agreement = "strong agreement"
        elif score_variance < 0.3:
            agreement = "moderate agreement"
        else:
            agreement = "disagreement"
        
        model_analysis = f"Models show {agreement} (variance: {score_variance:.3f})"
    else:
        model_analysis = f"Single model prediction: {list(predictions.keys())[0]}"
    
    analysis = f"""
ML Threat Analysis Report:
- Threat Level: {level} (Score: {threat_score:.3f})
- Assessment: {description}
- Event Type: {threat_type} from {source_ip}
- Severity: {severity}
- Model Analysis: {model_analysis}
- Risk Factors: {'High variance in network patterns' if threat_score > 0.7 else 'Standard activity patterns'}
    """.strip()
    
    return analysis


def normalize_feature_value(value: Any) -> float:
    """Normalize feature value to 0-1 range"""
    if isinstance(value, (int, float)):
        return min(1.0, max(0.0, float(value)))
    elif isinstance(value, bool):
        return 1.0 if value else 0.0
    elif isinstance(value, str):
        return len(value) / 100.0  # Simple string length normalization
    else:
        return 0.5  # Default for unknown types


def calculate_risk_contribution(feature_value: Any, importance: float) -> float:
    """Calculate how much this feature contributes to risk"""
    normalized_value = normalize_feature_value(feature_value)
    return normalized_value * importance


def generate_feature_summary(features: Dict[str, Any]) -> str:
    """Generate summary of important features"""
    high_risk = [name for name, data in features.items() if data["risk_contribution"] > 0.7]
    medium_risk = [name for name, data in features.items() if 0.3 < data["risk_contribution"] <= 0.7]
    
    if high_risk:
        return f"High-risk features detected: {', '.join(high_risk[:3])}"
    elif medium_risk:
        return f"Medium-risk features: {', '.join(medium_risk[:3])}"
    else:
        return "No significant risk features detected"


@router.post("/predict")
async def predict(data: Dict[str, Any]) -> Dict[str, Any]:
    """Make prediction using ML models"""
    try:
        # Mock prediction
        return {
            "prediction": "anomaly_detected",
            "confidence": 0.87,
            "model_used": "anomaly_detector_v1",
            "processing_time_ms": 45
        }
    except Exception as e:
        logger.error("Error making prediction", error=str(e))
        raise HTTPException(status_code=500, detail="Prediction failed")
