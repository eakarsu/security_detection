# NodeGuard AI Security Platform - Project Structure

## Directory Structure

```
security_detection/
├── README.md
├── docker-compose.yml
├── requirements.txt
├── package.json
├── .env.example
├── .gitignore
├── docs/
│   ├── api/
│   ├── architecture/
│   └── user-guide/
├── backend/
│   ├── python/
│   │   ├── api/
│   │   │   ├── main.py
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   └── services/
│   │   ├── ml/
│   │   │   ├── classical/
│   │   │   ├── hybrid/
│   │   │   └── training/
│   │   ├── data/
│   │   │   ├── ingestion/
│   │   │   ├── processing/
│   │   │   └── storage/
│   │   └── utils/
│   └── nodejs/
│       ├── src/
│       │   ├── controllers/
│       │   ├── services/
│       │   ├── middleware/
│       │   └── utils/
│       ├── tests/
│       └── config/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   ├── workflow/
│   │   │   ├── incidents/
│   │   │   └── common/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── styles/
│   ├── public/
│   └── package.json
├── infrastructure/
│   ├── kubernetes/
│   ├── terraform/
│   └── monitoring/
├── scripts/
│   ├── setup/
│   ├── deployment/
│   └── maintenance/
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

## Core Components

### 1. Hybrid AI Detection Engine
- Classical ML models (XGBoost, RandomForest)
- LLM integration with Sonnet 4 via OpenRouter
- Real-time scoring and analysis

### 2. Node-Based Workflow UI
- React + Svelvet for visual workflow builder
- D3.js for graph visualization
- Drag-and-drop playbook creation

### 3. Data Pipeline
- Kafka for streaming
- Redis for caching
- PostgreSQL for structured data
- ElasticSearch for logs and analytics

### 4. Microservices Architecture
- FastAPI (Python) for ML services
- NestJS (Node.js) for business logic
- gRPC for inter-service communication

### 5. Security & Compliance
- RBAC and MFA
- Audit trails
- Compliance reporting (GDPR, HIPAA)
