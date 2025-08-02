# NodeGuard AI Security Platform - Complete System Documentation

## 🚀 Executive Summary

NodeGuard AI is a comprehensive, AI-powered cybersecurity detection and response platform that combines classical machine learning with advanced AI analysis using Sonnet 4 via OpenRouter. The platform features a professional node-based workflow builder, real-time threat detection, automated incident response, and comprehensive compliance reporting.

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Node.js API   │    │   Python ML     │
│   React/TS      │◄──►│   NestJS        │◄──►│   FastAPI       │
│   Node Builder  │    │   Workflows     │    │   AI Analysis   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Data Layer    │    │   Message Bus   │    │   AI Services   │
│   PostgreSQL    │    │   Kafka/Redis   │    │   OpenRouter    │
│   Elasticsearch │    │   Event Stream  │    │   Sonnet 4      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Core Components

1. **Frontend (React/TypeScript)**
   - Node-based workflow builder using ReactFlow
   - Real-time security dashboard
   - Incident management interface
   - Compliance reporting tools

2. **Node.js API (NestJS)**
   - RESTful API for frontend communication
   - Workflow orchestration engine
   - User authentication and authorization
   - Real-time WebSocket connections

3. **Python ML Engine (FastAPI)**
   - Hybrid ML pipeline (XGBoost, Random Forest, Isolation Forest)
   - AI-powered threat analysis using Sonnet 4
   - Feature extraction and model training
   - OpenRouter integration for LLM services

4. **Data Infrastructure**
   - PostgreSQL for structured data
   - Elasticsearch for log analysis
   - Redis for caching and sessions
   - Kafka for event streaming

## 🔧 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Material-UI (MUI)** for components
- **ReactFlow** for node-based workflow builder
- **React Query** for data fetching
- **Zustand** for state management
- **D3.js** for data visualization

### Backend APIs
- **Node.js** with NestJS framework
- **Python** with FastAPI
- **TypeORM** for database operations
- **Passport.js** for authentication
- **Winston** for logging

### Machine Learning & AI
- **scikit-learn** for classical ML models
- **XGBoost** for gradient boosting
- **pandas/numpy** for data processing
- **OpenRouter API** for Sonnet 4 access
- **Structured prompts** for AI analysis

### Infrastructure
- **Docker** for containerization
- **PostgreSQL** for primary database
- **Elasticsearch** for search and analytics
- **Redis** for caching
- **Apache Kafka** for event streaming

## 🚀 Quick Start Guide

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for development)
- Python 3.9+ (for development)
- OpenRouter API key

### 1. Environment Setup

```bash
# Clone the repository
git clone https://github.com/your-org/nodeguard-ai.git
cd nodeguard-ai

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 2. Required Environment Variables

```bash
# OpenRouter API Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here
DEFAULT_MODEL=anthropic/claude-3.5-sonnet
FALLBACK_MODEL=openai/gpt-4-turbo

# Database Configuration
POSTGRES_PASSWORD=secure_password_here
POSTGRES_USER=nodeguard
POSTGRES_DB=nodeguard

# Security Configuration
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here

# Optional: External Services
THREAT_INTEL_API_KEY=your_threat_intel_key
VIRUSTOTAL_API_KEY=your_virustotal_key
```

### 3. Start the Platform

```bash
# Start all services with Docker Compose
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Access the Platform

- **Frontend**: http://localhost:3000
- **Node.js API**: http://localhost:3001
- **Python ML API**: http://localhost:8000
- **API Documentation**: http://localhost:3001/api/docs

## 🎯 Core Features

### 1. Node-Based Workflow Builder

The heart of NodeGuard AI is its visual workflow builder that allows security teams to create sophisticated detection and response workflows without coding.

#### Available Node Types

**Input Nodes**
- **Data Input**: Ingest security events from Kafka, APIs, or files
- **Log Parser**: Parse and normalize log formats
- **Network Monitor**: Real-time network traffic analysis

**Analysis Nodes**
- **ML Scoring**: Classical ML threat scoring using ensemble models
- **AI Analysis**: Deep threat analysis using Sonnet 4
- **Behavioral Analysis**: User and entity behavior analytics
- **Threat Intel**: Enrich events with threat intelligence

**Processing Nodes**
- **Event Correlation**: Correlate events across time and systems
- **Data Enrichment**: Add context from external sources
- **Filtering**: Filter events based on conditions
- **Aggregation**: Aggregate events for pattern detection

**Output Nodes**
- **Alert Generation**: Create security alerts
- **Automated Response**: Execute response actions
- **Notification**: Send notifications via email, Slack, etc.
- **Data Export**: Export data to external systems

#### Workflow Example

```
[Data Input] → [ML Scoring] → [AI Analysis] → [Alert Generation]
     │              │              │              │
     └──────────────┼──────────────┼──────────────┘
                    ▼              ▼
            [Event Correlation] → [Automated Response]
```

### 2. Hybrid AI Threat Detection

NodeGuard AI combines the speed of classical ML with the intelligence of large language models.

#### Classical ML Pipeline
1. **Feature Extraction**: Extract 50+ features from security events
2. **Model Ensemble**: XGBoost, Random Forest, and Isolation Forest
3. **Real-time Scoring**: Sub-second threat scoring
4. **Threshold-based Triggering**: Trigger AI analysis for high-risk events

#### AI Analysis Pipeline
1. **Context Enrichment**: Add historical and threat intelligence context
2. **Structured Prompting**: Use specialized prompts for security analysis
3. **Sonnet 4 Analysis**: Deep threat analysis and explanation
4. **MITRE ATT&CK Mapping**: Map threats to MITRE framework
5. **Response Recommendations**: Generate actionable recommendations

### 3. Real-time Security Dashboard

- **Live Threat Feed**: Real-time security events and alerts
- **Risk Metrics**: Overall security posture and risk scores
- **Incident Timeline**: Visual timeline of security incidents
- **Performance Metrics**: ML model and system performance
- **Compliance Status**: Real-time compliance monitoring

### 4. Incident Management

- **Automated Incident Creation**: AI-generated incident reports
- **Investigation Workflows**: Guided investigation processes
- **Evidence Collection**: Automated evidence gathering
- **Response Tracking**: Track response actions and outcomes
- **Lessons Learned**: AI-generated lessons learned reports

### 5. Compliance Reporting

- **Multi-framework Support**: GDPR, HIPAA, PCI-DSS, SOX
- **Automated Reports**: AI-generated compliance reports
- **Audit Trails**: Complete audit trail maintenance
- **Risk Assessments**: Automated risk assessments
- **Remediation Tracking**: Track compliance remediation efforts

## 🔍 AI-Powered Analysis

### Threat Analysis Prompts

NodeGuard AI uses sophisticated prompts to ensure accurate and actionable threat analysis:

```json
{
  "role": "user",
  "content": "Analyze this security event and provide detailed threat assessment.
    Event Data: {...}
    Context: {...}
    
    Provide analysis in JSON format with:
    - Risk score (0.0-1.0)
    - MITRE ATT&CK mappings
    - Indicators of compromise
    - Recommended response actions
    - Compliance impact assessment"
}
```

### Analysis Types

1. **Quick Analysis**: Fast threat assessment for high-volume events
2. **Comprehensive Analysis**: Deep dive analysis for critical threats
3. **Forensic Analysis**: Detailed forensic investigation
4. **Compliance Analysis**: Compliance-focused threat assessment

### AI Safety Measures

- **Prompt Injection Protection**: Sanitize and validate all inputs
- **Rate Limiting**: Prevent API abuse and cost control
- **Fallback Models**: Automatic fallback to alternative models
- **Human Oversight**: Human review for critical decisions

## 📊 Data Flow Architecture

### Event Processing Pipeline

```
Security Events → Kafka → Feature Extraction → ML Scoring
                    ↓
                 Redis Cache ← Threat Intelligence
                    ↓
              High-Risk Events → AI Analysis → Incident Creation
                    ↓
              Elasticsearch ← Alert Generation → Notification
                    ↓
               PostgreSQL ← Response Actions → Audit Logs
```

### Data Sources

1. **Network Traffic**: Firewall logs, IDS/IPS alerts, flow data
2. **Endpoint Data**: EDR alerts, system logs, process events
3. **User Activity**: Authentication logs, access logs, behavior data
4. **Threat Intelligence**: IOCs, threat feeds, vulnerability data
5. **Cloud Events**: AWS CloudTrail, Azure Activity, GCP Audit

## 🔐 Security Architecture

### Authentication & Authorization

- **JWT-based Authentication**: Secure token-based auth
- **Role-based Access Control**: Granular permission system
- **Multi-factor Authentication**: Optional MFA support
- **Session Management**: Secure session handling

### Data Protection

- **Encryption at Rest**: AES-256 encryption for sensitive data
- **Encryption in Transit**: TLS 1.3 for all communications
- **Data Anonymization**: PII anonymization capabilities
- **Audit Logging**: Comprehensive audit trail

### Network Security

- **API Rate Limiting**: Prevent abuse and DoS attacks
- **Input Validation**: Comprehensive input sanitization
- **CORS Protection**: Secure cross-origin requests
- **Security Headers**: Comprehensive security headers

## 📈 Performance & Scalability

### Performance Metrics

- **Event Processing**: 10,000+ events/second
- **ML Inference**: <100ms average latency
- **AI Analysis**: 2-5 seconds average response time
- **Dashboard Updates**: Real-time via WebSockets

### Scalability Features

- **Horizontal Scaling**: Scale services independently
- **Load Balancing**: Distribute load across instances
- **Caching Strategy**: Multi-layer caching for performance
- **Database Optimization**: Optimized queries and indexing

### Monitoring & Observability

- **Health Checks**: Comprehensive health monitoring
- **Metrics Collection**: Prometheus-compatible metrics
- **Log Aggregation**: Centralized logging with ELK stack
- **Alerting**: Proactive system alerting

## 🛠️ Development Guide

### Local Development Setup

```bash
# Frontend development
cd frontend
npm install
npm start

# Node.js API development
cd backend/nodejs
npm install
npm run dev

# Python ML API development
cd backend/python
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Code Structure

```
nodeguard-ai/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   └── utils/          # Utility functions
├── backend/
│   ├── nodejs/             # Node.js API
│   │   ├── src/
│   │   │   ├── modules/    # Feature modules
│   │   │   ├── common/     # Shared utilities
│   │   │   └── config/     # Configuration
│   └── python/             # Python ML API
│       ├── api/            # API endpoints
│       ├── services/       # Business logic
│       └── utils/          # Utilities
├── infrastructure/          # Docker and deployment
└── docs/                   # Documentation
```

### Testing Strategy

- **Unit Tests**: Jest for Node.js, pytest for Python
- **Integration Tests**: API and database integration
- **E2E Tests**: Cypress for frontend testing
- **Load Tests**: Performance and scalability testing

## 🚀 Deployment Guide

### Production Deployment

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale api=3 --scale ml-api=2
```

### Environment Configuration

- **Development**: Local development with hot reload
- **Staging**: Production-like environment for testing
- **Production**: High-availability production deployment

### Backup & Recovery

- **Database Backups**: Automated PostgreSQL backups
- **Configuration Backups**: Version-controlled configuration
- **Disaster Recovery**: Multi-region deployment support

## 📚 API Documentation

### Node.js API Endpoints

```
GET    /api/v1/health              # Health check
POST   /api/v1/auth/login          # User authentication
GET    /api/v1/workflows           # List workflows
POST   /api/v1/workflows           # Create workflow
POST   /api/v1/workflows/execute   # Execute workflow
GET    /api/v1/incidents           # List incidents
POST   /api/v1/incidents           # Create incident
GET    /api/v1/alerts              # List alerts
POST   /api/v1/alerts              # Create alert
```

### Python ML API Endpoints

```
GET    /health                     # Health check
POST   /predict                    # ML threat prediction
POST   /analyze                    # AI threat analysis
POST   /train                      # Train ML models
GET    /models                     # List available models
GET    /metrics                    # Model performance metrics
```

## 🔧 Configuration Reference

### Core Settings

```yaml
# Application Configuration
NODE_ENV: production
LOG_LEVEL: info
API_PORT: 3001
PYTHON_API_PORT: 8000
FRONTEND_PORT: 3000

# Database Configuration
POSTGRES_HOST: localhost
POSTGRES_PORT: 5432
POSTGRES_DB: nodeguard
POSTGRES_USER: nodeguard
POSTGRES_PASSWORD: secure_password

# AI Configuration
OPENROUTER_API_KEY: your_api_key
DEFAULT_MODEL: anthropic/claude-3.5-sonnet
MAX_TOKENS: 4096
TEMPERATURE: 0.1

# Security Configuration
JWT_SECRET: your_jwt_secret
JWT_EXPIRATION: 24h
ENCRYPTION_KEY: your_encryption_key
API_RATE_LIMIT: 1000

# ML Configuration
ML_MODEL_PATH: ./models
ML_TRAINING_INTERVAL: 21600  # 6 hours
ML_ANOMALY_THRESHOLD: 0.7
THREAT_SCORE_THRESHOLD: 0.7
```

## 🆘 Troubleshooting

### Common Issues

1. **OpenRouter API Errors**
   - Check API key validity
   - Verify rate limits
   - Check model availability

2. **Database Connection Issues**
   - Verify database credentials
   - Check network connectivity
   - Ensure database is running

3. **ML Model Loading Errors**
   - Check model file permissions
   - Verify model compatibility
   - Check available disk space

4. **Frontend Build Issues**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility
   - Verify environment variables

### Debugging

```bash
# Check service logs
docker-compose logs -f [service_name]

# Check service health
curl http://localhost:3001/api/v1/health
curl http://localhost:8000/health

# Monitor resource usage
docker stats

# Check database connectivity
docker-compose exec postgres psql -U nodeguard -d nodeguard
```

## 📞 Support & Contributing

### Getting Help

- **Documentation**: Check this comprehensive guide
- **Issues**: Report bugs on GitHub Issues
- **Discussions**: Join community discussions
- **Email**: Contact support team

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Development Guidelines

- Follow TypeScript/Python coding standards
- Write comprehensive tests
- Update documentation
- Follow security best practices

## 📄 License

This project is licensed under the MIT License. See LICENSE file for details.

---

## 🎯 Next Steps

1. **Set up your environment** using the Quick Start Guide
2. **Explore the workflow builder** to create your first security workflow
3. **Configure data sources** to start ingesting security events
4. **Customize AI prompts** for your specific use cases
5. **Set up compliance reporting** for your regulatory requirements

For detailed implementation examples and advanced configuration, see the individual component documentation in the `/docs` directory.
