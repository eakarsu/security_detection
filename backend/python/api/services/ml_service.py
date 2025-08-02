"""
Hybrid ML Service for NodeGuard AI Security Platform
Combines classical ML models with AI-powered analysis
"""

import asyncio
import json
import pickle
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import numpy as np
import pandas as pd

import joblib
import structlog
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
import xgboost as xgb

from utils.config import settings, MLConfig, SecurityConfig
from api.services.openrouter_service import OpenRouterService, ThreatAnalysisRequest

logger = structlog.get_logger(__name__)


class SecurityEvent:
    """Security event data structure"""
    
    def __init__(self, event_data: Dict[str, Any]):
        self.event_id = event_data.get("event_id", "")
        self.timestamp = event_data.get("timestamp", datetime.now(timezone.utc))
        self.source_ip = event_data.get("source_ip", "")
        self.destination_ip = event_data.get("destination_ip", "")
        self.user_id = event_data.get("user_id", "")
        self.asset_id = event_data.get("asset_id", "")
        self.event_type = event_data.get("event_type", "")
        self.severity = event_data.get("severity", "medium")
        self.raw_data = event_data


class MLPrediction:
    """ML prediction result"""
    
    def __init__(self, 
                 event_id: str,
                 threat_score: float,
                 confidence: float,
                 model_name: str,
                 features: Dict[str, Any],
                 prediction_time: datetime):
        self.event_id = event_id
        self.threat_score = threat_score
        self.confidence = confidence
        self.model_name = model_name
        self.features = features
        self.prediction_time = prediction_time
        self.requires_ai_analysis = threat_score > settings.THREAT_SCORE_THRESHOLD


class FeatureExtractor:
    """Extract features from security events for ML models"""
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.is_fitted = False
    
    def extract_features(self, event: SecurityEvent) -> Dict[str, Any]:
        """Extract features from a security event"""
        features = {}
        
        # Network features
        features.update(self._extract_network_features(event))
        
        # Temporal features
        features.update(self._extract_temporal_features(event))
        
        # User behavior features
        features.update(self._extract_user_features(event))
        
        # Asset features
        features.update(self._extract_asset_features(event))
        
        # Statistical features
        features.update(self._extract_statistical_features(event))
        
        return features
    
    def _extract_network_features(self, event: SecurityEvent) -> Dict[str, Any]:
        """Extract network-related features"""
        features = {}
        
        # IP address features
        if event.source_ip:
            features["src_ip_is_private"] = self._is_private_ip(event.source_ip)
            features["src_ip_reputation"] = self._get_ip_reputation(event.source_ip)
        
        if event.destination_ip:
            features["dst_ip_is_private"] = self._is_private_ip(event.destination_ip)
            features["dst_ip_reputation"] = self._get_ip_reputation(event.destination_ip)
        
        # Port and protocol features
        raw_data = event.raw_data
        features["src_port"] = raw_data.get("src_port", 0)
        features["dst_port"] = raw_data.get("dst_port", 0)
        features["protocol"] = raw_data.get("protocol", "unknown")
        features["bytes_sent"] = raw_data.get("bytes_sent", 0)
        features["bytes_received"] = raw_data.get("bytes_received", 0)
        
        return features
    
    def _extract_temporal_features(self, event: SecurityEvent) -> Dict[str, Any]:
        """Extract time-based features"""
        features = {}
        
        if isinstance(event.timestamp, str):
            timestamp = datetime.fromisoformat(event.timestamp.replace('Z', '+00:00'))
        else:
            timestamp = event.timestamp
        
        features["hour_of_day"] = timestamp.hour
        features["day_of_week"] = timestamp.weekday()
        features["is_weekend"] = timestamp.weekday() >= 5
        features["is_business_hours"] = 9 <= timestamp.hour <= 17
        
        return features
    
    def _extract_user_features(self, event: SecurityEvent) -> Dict[str, Any]:
        """Extract user behavior features"""
        features = {}
        
        features["user_id"] = event.user_id or "unknown"
        features["has_user"] = bool(event.user_id)
        
        # User risk score (would be calculated from historical data)
        features["user_risk_score"] = self._get_user_risk_score(event.user_id)
        
        return features
    
    def _extract_asset_features(self, event: SecurityEvent) -> Dict[str, Any]:
        """Extract asset-related features"""
        features = {}
        
        features["asset_id"] = event.asset_id or "unknown"
        features["has_asset"] = bool(event.asset_id)
        
        # Asset criticality (would be from asset inventory)
        features["asset_criticality"] = self._get_asset_criticality(event.asset_id)
        
        return features
    
    def _extract_statistical_features(self, event: SecurityEvent) -> Dict[str, Any]:
        """Extract statistical features"""
        features = {}
        
        raw_data = event.raw_data
        
        # Event frequency features
        features["event_frequency"] = self._get_event_frequency(event.event_type)
        features["user_event_frequency"] = self._get_user_event_frequency(event.user_id, event.event_type)
        features["asset_event_frequency"] = self._get_asset_event_frequency(event.asset_id, event.event_type)
        
        # Anomaly indicators
        features["rare_event"] = features["event_frequency"] < 0.01
        features["rare_user_event"] = features["user_event_frequency"] < 0.05
        features["rare_asset_event"] = features["asset_event_frequency"] < 0.05
        
        return features
    
    def _is_private_ip(self, ip: str) -> bool:
        """Check if IP is private"""
        try:
            from ipaddress import ip_address
            addr = ip_address(ip)
            return addr.is_private
        except:
            return False
    
    def _get_ip_reputation(self, ip: str) -> float:
        """Get IP reputation score (mock implementation)"""
        # In real implementation, this would query threat intelligence feeds
        return 0.5
    
    def _get_user_risk_score(self, user_id: str) -> float:
        """Get user risk score (mock implementation)"""
        # In real implementation, this would be calculated from user behavior analytics
        return 0.3
    
    def _get_asset_criticality(self, asset_id: str) -> float:
        """Get asset criticality score (mock implementation)"""
        # In real implementation, this would come from asset inventory
        return 0.5
    
    def _get_event_frequency(self, event_type: str) -> float:
        """Get event type frequency (mock implementation)"""
        # In real implementation, this would be calculated from historical data
        return 0.1
    
    def _get_user_event_frequency(self, user_id: str, event_type: str) -> float:
        """Get user-specific event frequency (mock implementation)"""
        return 0.05
    
    def _get_asset_event_frequency(self, asset_id: str, event_type: str) -> float:
        """Get asset-specific event frequency (mock implementation)"""
        return 0.05
    
    def prepare_features_for_training(self, features_list: List[Dict[str, Any]]) -> np.ndarray:
        """Prepare features for model training"""
        df = pd.DataFrame(features_list)
        
        # Handle categorical variables
        categorical_columns = df.select_dtypes(include=['object']).columns
        for col in categorical_columns:
            if col not in self.label_encoders:
                self.label_encoders[col] = LabelEncoder()
                df[col] = self.label_encoders[col].fit_transform(df[col].astype(str))
            else:
                df[col] = self.label_encoders[col].transform(df[col].astype(str))
        
        # Scale numerical features
        if not self.is_fitted:
            scaled_features = self.scaler.fit_transform(df)
            self.is_fitted = True
        else:
            scaled_features = self.scaler.transform(df)
        
        return scaled_features


class MLService:
    """Hybrid ML service combining classical ML with AI analysis"""
    
    def __init__(self):
        self.feature_extractor = FeatureExtractor()
        self.models = {}
        self.model_metrics = {}
        self.is_initialized = False
        self.openrouter_service: Optional[OpenRouterService] = None
        
        # Model paths
        self.model_path = Path(settings.ML_MODEL_PATH)
        self.model_path.mkdir(exist_ok=True)
        
        # Performance tracking
        self.prediction_count = 0
        self.ai_analysis_count = 0
        self.false_positive_count = 0
        
    async def initialize(self):
        """Initialize the ML service"""
        try:
            logger.info("Initializing ML service")
            
            # Initialize OpenRouter service for AI analysis
            self.openrouter_service = OpenRouterService()
            await self.openrouter_service.initialize()
            
            # Load or train models
            await self._load_or_train_models()
            
            self.is_initialized = True
            logger.info("ML service initialized successfully")
            
        except Exception as e:
            logger.error("Failed to initialize ML service", error=str(e))
            raise
    
    def is_ready(self) -> bool:
        """Check if service is ready"""
        return self.is_initialized and len(self.models) > 0
    
    async def health_check(self) -> bool:
        """Health check for the service"""
        try:
            if not self.is_ready():
                return False
            
            # Test prediction with dummy data
            dummy_event = SecurityEvent({
                "event_id": "test",
                "timestamp": datetime.now(timezone.utc),
                "event_type": "test",
                "severity": "low"
            })
            
            prediction = await self.predict_threat(dummy_event)
            return prediction is not None
            
        except Exception:
            return False
    
    async def predict_threat(self, event: SecurityEvent) -> MLPrediction:
        """Predict threat level for a security event"""
        start_time = time.time()
        
        try:
            # Extract features
            features = self.feature_extractor.extract_features(event)
            
            # Get predictions from all models
            predictions = {}
            for model_name, model in self.models.items():
                try:
                    pred_score = await self._predict_with_model(model, features, model_name)
                    predictions[model_name] = pred_score
                except Exception as e:
                    logger.warning(f"Prediction failed for model {model_name}", error=str(e))
            
            if not predictions:
                raise Exception("No models available for prediction")
            
            # Ensemble prediction (weighted average)
            threat_score = self._ensemble_predictions(predictions)
            confidence = self._calculate_confidence(predictions)
            
            # Create prediction result
            prediction = MLPrediction(
                event_id=event.event_id,
                threat_score=threat_score,
                confidence=confidence,
                model_name="ensemble",
                features=features,
                prediction_time=datetime.now(timezone.utc)
            )
            
            self.prediction_count += 1
            
            # If threat score is high, trigger AI analysis
            if prediction.requires_ai_analysis and self.openrouter_service:
                await self._trigger_ai_analysis(event, prediction)
            
            processing_time = time.time() - start_time
            logger.info("Threat prediction completed",
                       event_id=event.event_id,
                       threat_score=threat_score,
                       confidence=confidence,
                       processing_time=processing_time)
            
            return prediction
            
        except Exception as e:
            logger.error("Threat prediction failed", 
                        event_id=event.event_id,
                        error=str(e))
            raise
    
    async def _predict_with_model(self, model: Any, features: Dict[str, Any], model_name: str) -> float:
        """Make prediction with a specific model"""
        try:
            # Convert features to format expected by model
            feature_array = self._prepare_features_for_prediction(features)
            
            if model_name == "isolation_forest":
                # Isolation Forest returns -1 for outliers, 1 for inliers
                prediction = model.decision_function([feature_array])[0]
                # Convert to 0-1 scale (higher = more anomalous)
                score = max(0, min(1, (1 - prediction) / 2))
            else:
                # Classification models
                if hasattr(model, 'predict_proba'):
                    # Get probability of positive class
                    proba = model.predict_proba([feature_array])[0]
                    score = proba[1] if len(proba) > 1 else proba[0]
                else:
                    # Binary prediction
                    prediction = model.predict([feature_array])[0]
                    score = float(prediction)
            
            return score
            
        except Exception as e:
            logger.error(f"Model prediction failed for {model_name}", error=str(e))
            return 0.5  # Default neutral score
    
    def _prepare_features_for_prediction(self, features: Dict[str, Any]) -> np.ndarray:
        """Prepare features for model prediction with dynamic feature handling"""
        # Convert to DataFrame for consistent processing
        df = pd.DataFrame([features])
        
        # Handle categorical variables
        categorical_columns = df.select_dtypes(include=['object']).columns
        for col in categorical_columns:
            if col in self.feature_extractor.label_encoders:
                try:
                    df[col] = self.feature_extractor.label_encoders[col].transform(df[col].astype(str))
                except ValueError:
                    # Handle unseen categories
                    df[col] = 0
            else:
                df[col] = 0
        
        # Ensure consistent feature count for models
        expected_features = 20  # Standard feature count for our models
        current_features = df.shape[1]
        
        if current_features > expected_features:
            # Too many features - select the first N features
            df = df.iloc[:, :expected_features]
            logger.warning(f"Truncated features from {current_features} to {expected_features}")
        elif current_features < expected_features:
            # Too few features - pad with zeros
            for i in range(current_features, expected_features):
                df[f'feature_{i}'] = 0
            logger.warning(f"Padded features from {current_features} to {expected_features}")
        
        # Scale features
        if self.feature_extractor.is_fitted:
            try:
                scaled_features = self.feature_extractor.scaler.transform(df)
            except ValueError as e:
                logger.warning(f"Scaling failed, using raw features: {e}")
                scaled_features = df.values
        else:
            scaled_features = df.values
        
        return scaled_features[0]
    
    def _ensemble_predictions(self, predictions: Dict[str, float]) -> float:
        """Combine predictions from multiple models"""
        if not predictions:
            return 0.5
        
        # Weighted average (can be customized based on model performance)
        weights = {
            "xgboost": 0.4,
            "random_forest": 0.3,
            "isolation_forest": 0.3
        }
        
        weighted_sum = 0
        total_weight = 0
        
        for model_name, score in predictions.items():
            weight = weights.get(model_name, 0.2)
            weighted_sum += score * weight
            total_weight += weight
        
        return weighted_sum / total_weight if total_weight > 0 else 0.5
    
    def _calculate_confidence(self, predictions: Dict[str, float]) -> float:
        """Calculate confidence based on model agreement"""
        if len(predictions) < 2:
            return 0.5
        
        scores = list(predictions.values())
        mean_score = np.mean(scores)
        std_score = np.std(scores)
        
        # Higher confidence when models agree (low standard deviation)
        confidence = max(0.1, min(1.0, 1.0 - (std_score * 2)))
        
        return confidence
    
    async def _trigger_ai_analysis(self, event: SecurityEvent, prediction: MLPrediction):
        """Trigger AI analysis for high-risk events"""
        try:
            self.ai_analysis_count += 1
            
            # Prepare context for AI analysis
            context = {
                "ml_prediction": {
                    "threat_score": prediction.threat_score,
                    "confidence": prediction.confidence,
                    "model_name": prediction.model_name,
                    "features": prediction.features
                },
                "historical_context": await self._get_historical_context(event),
                "threat_intelligence": await self._get_threat_intelligence_context(event)
            }
            
            # Create AI analysis request
            ai_request = ThreatAnalysisRequest(
                event_id=event.event_id,
                event_data=event.raw_data,
                context=context,
                analysis_type="comprehensive",
                priority="high" if prediction.threat_score > 0.8 else "normal"
            )
            
            # Trigger AI analysis asynchronously
            asyncio.create_task(self._perform_ai_analysis(ai_request))
            
        except Exception as e:
            logger.error("Failed to trigger AI analysis", 
                        event_id=event.event_id,
                        error=str(e))
    
    async def _perform_ai_analysis(self, request: ThreatAnalysisRequest):
        """Perform AI analysis using OpenRouter service"""
        try:
            if not self.openrouter_service:
                logger.warning("OpenRouter service not available for AI analysis")
                return
            
            analysis_result = await self.openrouter_service.analyze_threat(request)
            
            # Store or process the AI analysis result
            await self._process_ai_analysis_result(analysis_result)
            
        except Exception as e:
            logger.error("AI analysis failed", 
                        event_id=request.event_id,
                        error=str(e))
    
    async def _process_ai_analysis_result(self, analysis_result):
        """Process the AI analysis result"""
        # This would typically store the result in a database or trigger alerts
        logger.info("AI analysis completed",
                   event_id=analysis_result.event_id,
                   analysis_id=analysis_result.analysis_id,
                   risk_score=analysis_result.risk_score)
    
    async def _get_historical_context(self, event: SecurityEvent) -> Dict[str, Any]:
        """Get historical context for the event"""
        # Mock implementation - would query historical data
        return {
            "similar_events_count": 5,
            "user_history": "normal",
            "asset_history": "normal"
        }
    
    async def _get_threat_intelligence_context(self, event: SecurityEvent) -> Dict[str, Any]:
        """Get threat intelligence context"""
        # Mock implementation - would query threat intel feeds
        return {
            "known_bad_ips": [],
            "known_malware": [],
            "campaign_indicators": []
        }
    
    async def _load_or_train_models(self):
        """Load existing models or train new ones"""
        try:
            # Try to load existing models
            if await self._load_models():
                logger.info("Loaded existing ML models")
                return
            
            # If no models exist, train new ones
            logger.info("No existing models found, training new models")
            await self._train_models()
            
        except Exception as e:
            logger.error("Failed to load or train models", error=str(e))
            raise
    
    async def _load_models(self) -> bool:
        """Load models from disk"""
        try:
            model_files = {
                "xgboost": self.model_path / "xgboost_model.pkl",
                "random_forest": self.model_path / "random_forest_model.pkl",
                "isolation_forest": self.model_path / "isolation_forest_model.pkl"
            }
            
            loaded_count = 0
            for model_name, model_file in model_files.items():
                if model_file.exists():
                    self.models[model_name] = joblib.load(model_file)
                    loaded_count += 1
                    logger.info(f"Loaded {model_name} model")
            
            # Also load feature extractor if it exists
            feature_extractor_file = self.model_path / "feature_extractor.pkl"
            if feature_extractor_file.exists():
                self.feature_extractor = joblib.load(feature_extractor_file)
                logger.info("Loaded feature extractor")
            
            return loaded_count > 0
            
        except Exception as e:
            logger.error("Failed to load models", error=str(e))
            return False
    
    async def _train_models(self):
        """Train ML models with sample data"""
        try:
            # Generate sample training data (in real implementation, this would come from historical data)
            X_train, y_train = self._generate_sample_training_data()
            
            # Train XGBoost
            xgb_model = xgb.XGBClassifier(**MLConfig.CLASSICAL_MODELS["xgboost"])
            xgb_model.fit(X_train, y_train)
            self.models["xgboost"] = xgb_model
            
            # Train Random Forest
            rf_model = RandomForestClassifier(**MLConfig.CLASSICAL_MODELS["random_forest"])
            rf_model.fit(X_train, y_train)
            self.models["random_forest"] = rf_model
            
            # Train Isolation Forest (unsupervised)
            iso_model = IsolationForest(**MLConfig.CLASSICAL_MODELS["isolation_forest"])
            iso_model.fit(X_train)
            self.models["isolation_forest"] = iso_model
            
            # Save models
            await self._save_models()
            
            # Evaluate models
            await self._evaluate_models(X_train, y_train)
            
            logger.info("Successfully trained and saved ML models")
            
        except Exception as e:
            logger.error("Failed to train models", error=str(e))
            raise
    
    def _generate_sample_training_data(self) -> Tuple[np.ndarray, np.ndarray]:
        """Generate sample training data for initial model training"""
        # This is a mock implementation - real data would come from historical security events
        n_samples = 1000
        n_features = 20
        
        # Generate random features
        X = np.random.randn(n_samples, n_features)
        
        # Generate labels (0 = benign, 1 = malicious)
        # Add some patterns to make it learnable
        y = np.zeros(n_samples)
        
        # Make some samples malicious based on feature patterns
        malicious_indices = (X[:, 0] > 1.5) | (X[:, 1] < -1.5) | (np.sum(X[:, :5], axis=1) > 3)
        y[malicious_indices] = 1
        
        # Add some noise
        noise_indices = np.random.choice(n_samples, size=int(0.1 * n_samples), replace=False)
        y[noise_indices] = 1 - y[noise_indices]
        
        return X, y
    
    async def _save_models(self):
        """Save trained models to disk"""
        try:
            for model_name, model in self.models.items():
                model_file = self.model_path / f"{model_name}_model.pkl"
                joblib.dump(model, model_file)
                logger.info(f"Saved {model_name} model")
            
            # Save feature extractor
            feature_extractor_file = self.model_path / "feature_extractor.pkl"
            joblib.dump(self.feature_extractor, feature_extractor_file)
            logger.info("Saved feature extractor")
            
        except Exception as e:
            logger.error("Failed to save models", error=str(e))
            raise
    
    async def _evaluate_models(self, X_test: np.ndarray, y_test: np.ndarray):
        """Evaluate model performance"""
        try:
            for model_name, model in self.models.items():
                if model_name == "isolation_forest":
                    # Isolation Forest is unsupervised, different evaluation
                    continue
                
                # Make predictions
                y_pred = model.predict(X_test)
                y_pred_proba = model.predict_proba(X_test)[:, 1] if hasattr(model, 'predict_proba') else y_pred
                
                # Calculate metrics
                auc_score = roc_auc_score(y_test, y_pred_proba)
                
                # Store metrics
                self.model_metrics[model_name] = {
                    "auc_score": auc_score,
                    "classification_report": classification_report(y_test, y_pred, output_dict=True),
                    "last_evaluated": datetime.now(timezone.utc)
                }
                
                logger.info(f"Model {model_name} AUC score: {auc_score:.3f}")
                
        except Exception as e:
            logger.error("Failed to evaluate models", error=str(e))
    
    async def schedule_model_training(self):
        """Schedule periodic model retraining"""
        try:
            logger.info("Starting scheduled model training")
            
            # In a real implementation, this would:
            # 1. Collect new training data from recent events
            # 2. Retrain models with updated data
            # 3. Evaluate performance and decide whether to deploy new models
            # 4. Update models if performance improves
            
            # For now, just log that training was scheduled
            logger.info("Scheduled model training completed")
            
        except Exception as e:
            logger.error("Scheduled model training failed", error=str(e))
    
    def get_stats(self) -> Dict[str, Any]:
        """Get service statistics"""
        return {
            "is_ready": self.is_ready(),
            "models_loaded": list(self.models.keys()),
            "prediction_count": self.prediction_count,
            "ai_analysis_count": self.ai_analysis_count,
            "false_positive_count": self.false_positive_count,
            "model_metrics": self.model_metrics
        }
    
    async def close(self):
        """Close the service"""
        if self.openrouter_service:
            await self.openrouter_service.close()
        self.is_initialized = False
