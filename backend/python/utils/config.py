"""
Configuration management for NodeGuard AI Security Platform
"""

import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings"""
    
    # Database Configuration
    POSTGRES_HOST: str = Field(default="localhost", env="POSTGRES_HOST")
    POSTGRES_PORT: int = Field(default=5432, env="POSTGRES_PORT")
    POSTGRES_DB: str = Field(default="nodeguard", env="POSTGRES_DB")
    POSTGRES_USER: str = Field(default="nodeguard", env="POSTGRES_USER")
    POSTGRES_PASSWORD: str = Field(env="POSTGRES_PASSWORD")
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    # Redis Configuration
    REDIS_URL: str = Field(default="redis://localhost:6379", env="REDIS_URL")
    REDIS_PASSWORD: Optional[str] = Field(default=None, env="REDIS_PASSWORD")
    
    # Elasticsearch Configuration
    ELASTICSEARCH_URL: str = Field(default="http://localhost:9200", env="ELASTICSEARCH_URL")
    ELASTICSEARCH_USERNAME: Optional[str] = Field(default=None, env="ELASTICSEARCH_USERNAME")
    ELASTICSEARCH_PASSWORD: Optional[str] = Field(default=None, env="ELASTICSEARCH_PASSWORD")
    
    # Kafka Configuration
    KAFKA_BOOTSTRAP_SERVERS: str = Field(default="localhost:9092", env="KAFKA_BOOTSTRAP_SERVERS")
    KAFKA_SECURITY_PROTOCOL: str = Field(default="PLAINTEXT", env="KAFKA_SECURITY_PROTOCOL")
    
    # OpenRouter API Configuration
    OPENROUTER_API_KEY: str = Field(env="OPENROUTER_API_KEY")
    OPENROUTER_BASE_URL: str = Field(default="https://openrouter.ai/api/v1", env="OPENROUTER_BASE_URL")
    
    # AI Model Configuration
    DEFAULT_MODEL: str = Field(default="anthropic/claude-3.5-sonnet", env="DEFAULT_MODEL")
    FALLBACK_MODEL: str = Field(default="openai/gpt-4-turbo", env="FALLBACK_MODEL")
    MAX_TOKENS: int = Field(default=4096, env="MAX_TOKENS")
    TEMPERATURE: float = Field(default=0.1, env="TEMPERATURE")
    
    # Security Configuration
    JWT_SECRET: str = Field(env="JWT_SECRET")
    JWT_EXPIRATION: str = Field(default="24h", env="JWT_EXPIRATION")
    ENCRYPTION_KEY: str = Field(env="ENCRYPTION_KEY")
    API_RATE_LIMIT: int = Field(default=1000, env="API_RATE_LIMIT")
    
    # Application Configuration
    NODE_ENV: str = Field(default="development", env="NODE_ENV")
    LOG_LEVEL: str = Field(default="info", env="LOG_LEVEL")
    API_PORT: int = Field(default=3001, env="API_PORT")
    PYTHON_API_PORT: int = Field(default=8000, env="PYTHON_API_PORT")
    FRONTEND_PORT: int = Field(default=3000, env="FRONTEND_PORT")
    
    # External Services
    THREAT_INTEL_API_KEY: Optional[str] = Field(default=None, env="THREAT_INTEL_API_KEY")
    MITRE_API_ENDPOINT: str = Field(default="https://attack.mitre.org/api", env="MITRE_API_ENDPOINT")
    VIRUSTOTAL_API_KEY: Optional[str] = Field(default=None, env="VIRUSTOTAL_API_KEY")
    
    # Email Configuration
    SMTP_HOST: str = Field(default="smtp.gmail.com", env="SMTP_HOST")
    SMTP_PORT: int = Field(default=587, env="SMTP_PORT")
    SMTP_USER: Optional[str] = Field(default=None, env="SMTP_USER")
    SMTP_PASSWORD: Optional[str] = Field(default=None, env="SMTP_PASSWORD")
    ALERT_EMAIL_FROM: str = Field(default="alerts@nodeguard.ai", env="ALERT_EMAIL_FROM")
    
    # Compliance Configuration
    GDPR_ENABLED: bool = Field(default=True, env="GDPR_ENABLED")
    HIPAA_ENABLED: bool = Field(default=False, env="HIPAA_ENABLED")
    SOX_ENABLED: bool = Field(default=False, env="SOX_ENABLED")
    AUDIT_RETENTION_DAYS: int = Field(default=2555, env="AUDIT_RETENTION_DAYS")  # 7 years
    
    # Performance Configuration
    MAX_CONCURRENT_REQUESTS: int = Field(default=100, env="MAX_CONCURRENT_REQUESTS")
    CACHE_TTL: int = Field(default=3600, env="CACHE_TTL")  # 1 hour
    ML_MODEL_CACHE_SIZE: int = Field(default=1000, env="ML_MODEL_CACHE_SIZE")
    BATCH_SIZE: int = Field(default=1000, env="BATCH_SIZE")
    
    # Development Configuration
    DEBUG: bool = Field(default=False, env="DEBUG")
    ENABLE_SWAGGER: bool = Field(default=True, env="ENABLE_SWAGGER")
    ENABLE_CORS: bool = Field(default=True, env="ENABLE_CORS")
    ALLOWED_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:3001"],
        env="ALLOWED_ORIGINS"
    )
    
    # ML Configuration
    ML_MODEL_PATH: str = Field(default="./models", env="ML_MODEL_PATH")
    ML_TRAINING_INTERVAL: int = Field(default=21600, env="ML_TRAINING_INTERVAL")  # 6 hours
    ML_FEATURE_STORE_SIZE: int = Field(default=10000, env="ML_FEATURE_STORE_SIZE")
    ML_ANOMALY_THRESHOLD: float = Field(default=0.7, env="ML_ANOMALY_THRESHOLD")
    
    # Monitoring Configuration
    PROMETHEUS_ENABLED: bool = Field(default=True, env="PROMETHEUS_ENABLED")
    METRICS_PORT: int = Field(default=9090, env="METRICS_PORT")
    HEALTH_CHECK_INTERVAL: int = Field(default=30, env="HEALTH_CHECK_INTERVAL")
    
    # Threat Detection Configuration
    THREAT_SCORE_THRESHOLD: float = Field(default=0.7, env="THREAT_SCORE_THRESHOLD")
    AUTO_RESPONSE_ENABLED: bool = Field(default=False, env="AUTO_RESPONSE_ENABLED")
    QUARANTINE_ENABLED: bool = Field(default=True, env="QUARANTINE_ENABLED")
    
    # Network Monitoring Configuration
    NETWORK_INTERFACE: str = Field(default="eth0", env="NETWORK_INTERFACE")
    PACKET_CAPTURE_ENABLED: bool = Field(default=True, env="PACKET_CAPTURE_ENABLED")
    DEEP_PACKET_INSPECTION: bool = Field(default=True, env="DEEP_PACKET_INSPECTION")
    
    # Incident Response Configuration
    INCIDENT_AUTO_ASSIGNMENT: bool = Field(default=True, env="INCIDENT_AUTO_ASSIGNMENT")
    INCIDENT_SLA_HOURS: int = Field(default=4, env="INCIDENT_SLA_HOURS")
    ESCALATION_ENABLED: bool = Field(default=True, env="ESCALATION_ENABLED")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Global settings instance
settings = Settings()


class LocalDevSettings:
    """Local development mode settings - simplified configuration for testing without external dependencies"""
    
    # Check if we're in local development mode
    LOCAL_DEV_MODE = os.getenv("LOCAL_DEV_MODE", "false").lower() == "true"
    
    # In-memory storage for local development
    USE_IN_MEMORY_DB = LOCAL_DEV_MODE
    USE_IN_MEMORY_CACHE = LOCAL_DEV_MODE
    DISABLE_EXTERNAL_SERVICES = LOCAL_DEV_MODE
    
    # Mock external service responses
    MOCK_OPENROUTER_RESPONSES = LOCAL_DEV_MODE
    MOCK_THREAT_INTEL = LOCAL_DEV_MODE
    MOCK_EMAIL_SENDING = LOCAL_DEV_MODE
    
    # Simplified ML models for local testing
    USE_SIMPLE_ML_MODELS = LOCAL_DEV_MODE
    SKIP_MODEL_TRAINING = LOCAL_DEV_MODE
    
    # Local development URLs
    LOCAL_FRONTEND_URL = "http://localhost:3000"
    LOCAL_NODEJS_API_URL = "http://localhost:3001"
    LOCAL_PYTHON_API_URL = "http://localhost:8000"
    
    @classmethod
    def get_effective_settings(cls):
        """Get settings adjusted for local development mode"""
        if not cls.LOCAL_DEV_MODE:
            return settings
            
        # Create a copy of settings with local dev overrides
        local_settings = settings.copy()
        
        # Override database settings for local dev
        if cls.USE_IN_MEMORY_DB:
            local_settings.DATABASE_URL = "sqlite:///:memory:"
            
        # Override cache settings
        if cls.USE_IN_MEMORY_CACHE:
            local_settings.REDIS_URL = "memory://"
            
        # Disable external services
        if cls.DISABLE_EXTERNAL_SERVICES:
            local_settings.ELASTICSEARCH_URL = None
            local_settings.KAFKA_BOOTSTRAP_SERVERS = None
            local_settings.PROMETHEUS_ENABLED = False
            
        return local_settings


# Get effective settings based on mode
effective_settings = LocalDevSettings.get_effective_settings()


class SecurityConfig:
    """Security-specific configuration"""
    
    # MITRE ATT&CK Configuration
    MITRE_TACTICS = [
        "initial-access", "execution", "persistence", "privilege-escalation",
        "defense-evasion", "credential-access", "discovery", "lateral-movement",
        "collection", "command-and-control", "exfiltration", "impact"
    ]
    
    # Risk Scoring Weights
    RISK_WEIGHTS = {
        "severity": 0.3,
        "confidence": 0.2,
        "asset_criticality": 0.2,
        "threat_intelligence": 0.15,
        "user_behavior": 0.15
    }
    
    # Alert Thresholds
    ALERT_THRESHOLDS = {
        "critical": 0.9,
        "high": 0.7,
        "medium": 0.5,
        "low": 0.3
    }
    
    # Compliance Mappings
    COMPLIANCE_FRAMEWORKS = {
        "GDPR": {
            "data_protection": ["Article 32", "Article 33", "Article 34"],
            "breach_notification": 72,  # hours
            "data_retention": 2555  # days (7 years)
        },
        "HIPAA": {
            "safeguards": ["Administrative", "Physical", "Technical"],
            "breach_notification": 60,  # days
            "audit_controls": True
        },
        "PCI-DSS": {
            "requirements": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
            "vulnerability_scanning": "quarterly",
            "penetration_testing": "annually"
        },
        "SOX": {
            "controls": ["ITGC", "Application Controls"],
            "documentation": True,
            "testing_frequency": "annually"
        }
    }
    
    # IOC Types
    IOC_TYPES = [
        "ip_address", "domain", "url", "file_hash", "file_path",
        "registry_key", "mutex", "email", "user_agent", "certificate"
    ]
    
    # Threat Categories
    THREAT_CATEGORIES = [
        "malware", "phishing", "insider_threat", "data_breach",
        "network_intrusion", "ddos", "ransomware", "apt",
        "credential_stuffing", "social_engineering"
    ]


class MLConfig:
    """Machine Learning specific configuration"""
    
    # Model Types
    CLASSICAL_MODELS = {
        "xgboost": {
            "n_estimators": 100,
            "max_depth": 6,
            "learning_rate": 0.1,
            "subsample": 0.8
        },
        "random_forest": {
            "n_estimators": 100,
            "max_depth": 10,
            "min_samples_split": 2,
            "min_samples_leaf": 1
        },
        "isolation_forest": {
            "n_estimators": 100,
            "contamination": 0.1,
            "random_state": 42
        }
    }
    
    # Feature Engineering
    FEATURE_CATEGORIES = [
        "network_features", "endpoint_features", "user_features",
        "temporal_features", "statistical_features", "behavioral_features"
    ]
    
    # Training Configuration
    TRAINING_CONFIG = {
        "test_size": 0.2,
        "validation_size": 0.1,
        "cross_validation_folds": 5,
        "early_stopping_rounds": 10,
        "metric": "auc"
    }
    
    # Model Performance Thresholds
    PERFORMANCE_THRESHOLDS = {
        "min_accuracy": 0.85,
        "min_precision": 0.80,
        "min_recall": 0.75,
        "max_false_positive_rate": 0.05
    }


class KafkaTopics:
    """Kafka topic configuration"""
    
    # Security Event Topics
    SECURITY_EVENTS = "security.events"
    NETWORK_EVENTS = "network.events"
    ENDPOINT_EVENTS = "endpoint.events"
    USER_EVENTS = "user.events"
    
    # Alert Topics
    ALERTS = "security.alerts"
    INCIDENTS = "security.incidents"
    THREAT_INTEL = "threat.intelligence"
    
    # ML Topics
    ML_PREDICTIONS = "ml.predictions"
    ML_TRAINING = "ml.training"
    FEATURE_STORE = "ml.features"
    
    # Compliance Topics
    AUDIT_LOGS = "compliance.audit"
    COMPLIANCE_REPORTS = "compliance.reports"
    
    # System Topics
    HEALTH_CHECKS = "system.health"
    METRICS = "system.metrics"
    LOGS = "system.logs"


class ElasticsearchIndices:
    """Elasticsearch index configuration"""
    
    # Security Indices
    SECURITY_EVENTS = "security-events"
    NETWORK_LOGS = "network-logs"
    ENDPOINT_LOGS = "endpoint-logs"
    USER_ACTIVITY = "user-activity"
    
    # Alert Indices
    ALERTS = "security-alerts"
    INCIDENTS = "security-incidents"
    THREAT_INTEL = "threat-intelligence"
    
    # ML Indices
    ML_PREDICTIONS = "ml-predictions"
    FEATURE_STORE = "ml-features"
    MODEL_METRICS = "ml-metrics"
    
    # Compliance Indices
    AUDIT_LOGS = "compliance-audit"
    COMPLIANCE_REPORTS = "compliance-reports"
    
    # System Indices
    APPLICATION_LOGS = "application-logs"
    SYSTEM_METRICS = "system-metrics"
