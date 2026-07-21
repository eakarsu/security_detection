"""
Configuration management for NodeGuard AI Security Platform
"""

from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """Application settings"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )
    
    # Database Configuration
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "nodeguard"
    POSTGRES_USER: str = "nodeguard"
    POSTGRES_PASSWORD: str = Field(min_length=1)
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_PASSWORD: Optional[str] = None
    
    # Elasticsearch Configuration
    ELASTICSEARCH_URL: str = "http://localhost:9200"
    ELASTICSEARCH_USERNAME: Optional[str] = None
    ELASTICSEARCH_PASSWORD: Optional[str] = None
    
    # Kafka Configuration
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_SECURITY_PROTOCOL: str = "PLAINTEXT"
    
    # OpenRouter API Configuration
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    
    # AI Model Configuration
    DEFAULT_MODEL: str = "anthropic/claude-3.5-sonnet"
    FALLBACK_MODEL: str = "openai/gpt-4-turbo"
    MAX_TOKENS: int = 4096
    TEMPERATURE: float = 0.1
    
    # Background Task Configuration
    ENABLE_THREAT_DETECTION_PIPELINE: bool = False
    ENABLE_MODEL_TRAINING_SCHEDULER: bool = False
    THREAT_DETECTION_INTERVAL: int = 60
    
    # Security Configuration
    JWT_SECRET: str = Field(min_length=32)
    JWT_EXPIRATION: str = "24h"
    ENCRYPTION_KEY: str = Field(min_length=16)
    API_RATE_LIMIT: int = 1000
    
    # Application Configuration
    NODE_ENV: str = "development"
    LOG_LEVEL: str = "info"
    API_PORT: int = 3001
    PYTHON_API_PORT: int = 8000
    FRONTEND_PORT: int = 3000
    
    # External Services
    THREAT_INTEL_API_KEY: Optional[str] = None
    MITRE_API_ENDPOINT: str = "https://attack.mitre.org/api"
    VIRUSTOTAL_API_KEY: Optional[str] = None
    
    # Email Configuration
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    ALERT_EMAIL_FROM: str = "alerts@nodeguard.ai"
    
    # Compliance Configuration
    GDPR_ENABLED: bool = True
    HIPAA_ENABLED: bool = False
    SOX_ENABLED: bool = False
    AUDIT_RETENTION_DAYS: int = 2555
    
    # Performance Configuration
    MAX_CONCURRENT_REQUESTS: int = 100
    CACHE_TTL: int = 3600
    ML_MODEL_CACHE_SIZE: int = 1000
    BATCH_SIZE: int = 1000
    
    # Development Configuration
    DEBUG: bool = False
    ENABLE_SWAGGER: bool = True
    ENABLE_CORS: bool = True
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001"
    
    @property
    def ALLOWED_ORIGINS_LIST(self) -> List[str]:
        """Parse comma-separated ALLOWED_ORIGINS into a list"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]
    
    # ML Configuration
    ML_MODEL_PATH: str = "./models"
    ML_TRAINING_INTERVAL: int = 21600
    ML_FEATURE_STORE_SIZE: int = 10000
    ML_ANOMALY_THRESHOLD: float = 0.7
    
    # Monitoring Configuration
    PROMETHEUS_ENABLED: bool = True
    METRICS_PORT: int = 9090
    HEALTH_CHECK_INTERVAL: int = 30
    GRAFANA_PASSWORD: Optional[str] = None
    PROMETHEUS_RETENTION: str = "15d"
    
    # Threat Detection Configuration
    THREAT_SCORE_THRESHOLD: float = 0.7
    AUTO_RESPONSE_ENABLED: bool = False
    QUARANTINE_ENABLED: bool = True
    
    # Network Monitoring Configuration
    NETWORK_INTERFACE: str = "eth0"
    PACKET_CAPTURE_ENABLED: bool = True
    DEEP_PACKET_INSPECTION: bool = True
    
    # Incident Response Configuration
    INCIDENT_AUTO_ASSIGNMENT: bool = True
    INCIDENT_SLA_HOURS: int = 4
    ESCALATION_ENABLED: bool = True


# Global settings instance
settings = Settings()


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
