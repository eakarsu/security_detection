# NodeGuard AI Security Platform - Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Component Details](#component-details)
4. [Data Flow](#data-flow)
5. [Security Architecture](#security-architecture)
6. [AI/ML Pipeline](#aiml-pipeline)
7. [Infrastructure Components](#infrastructure-components)
8. [API Architecture](#api-architecture)
9. [Frontend Architecture](#frontend-architecture)
10. [Database Schema](#database-schema)
11. [Deployment Architecture](#deployment-architecture)
12. [Monitoring & Observability](#monitoring--observability)

---

## System Overview

NodeGuard is a comprehensive AI-powered security detection and response platform designed to provide real-time threat detection, incident management, compliance reporting, and automated security workflows.

### Core Capabilities
- **Real-time Security Detection** - AI/ML-powered threat identification
- **Incident Management** - Automated incident response and tracking
- **Compliance Reporting** - Automated compliance checks and reporting
- **Threat Intelligence** - Integration with external threat feeds
- **Workflow Automation** - Visual workflow builder for security processes
- **Advanced Analytics** - Security metrics and dashboards

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  React.js Application (Port 3000)                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │ Dashboard   │ │ Incidents   │ │ Compliance  │ │ Workflows   │              │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │ Threat Intel│ │ Settings    │ │ Reports     │ │ Analytics   │              │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘              │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                   HTTP/REST
                                       │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Node.js API (Port 3001)                    Python ML API (Port 8000)         │
│  ┌─────────────────────────────────┐       ┌─────────────────────────────────┐ │
│  │ • Authentication & Authorization│       │ • ML Model Inference           │ │
│  │ • User Management               │       │ • Security Analysis             │ │
│  │ • Workflow Management           │       │ • Threat Detection              │ │
│  │ • Security Operations           │       │ • Compliance Checks             │ │
│  │ • API Orchestration             │       │ • Data Processing               │ │
│  └─────────────────────────────────┘       └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                   Database/Cache
                                       │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │ PostgreSQL  │ │ Redis       │ │Elasticsearch│ │ Kafka       │              │
│  │ (Primary DB)│ │ (Cache)     │ │ (Search)    │ │ (Streaming) │              │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘              │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              INFRASTRUCTURE LAYER                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │ Prometheus  │ │ Grafana     │ │ Docker      │ │ Nginx       │              │
│  │ (Metrics)   │ │ (Dashboards)│ │ (Containers)│ │ (Proxy)     │              │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### Frontend Layer (React.js)

**Technology Stack:**
- React 18 with TypeScript
- Material-UI for components
- React Router for navigation
- Axios for HTTP requests
- React Flow for workflow visualization

**Key Components:**
- **Dashboard**: Real-time security metrics and alerts
- **Incident Management**: Incident tracking and response
- **Compliance Reports**: Automated compliance dashboards
- **Threat Intelligence**: External threat feed integration
- **Workflow Builder**: Visual security workflow creation
- **Settings**: System configuration and user management

### API Layer

#### Node.js API (Port 3001)
**Technology Stack:**
- NestJS framework with TypeScript
- TypeORM for database operations
- Passport.js for authentication
- JWT for session management
- Redis for caching

**Responsibilities:**
- User authentication and authorization
- Workflow management and execution
- Security operations coordination
- API request orchestration
- Real-time notifications

#### Python ML API (Port 8000)
**Technology Stack:**
- FastAPI framework
- Scikit-learn for ML models
- Pandas for data processing
- SQLAlchemy for database operations
- Celery for background tasks

**Responsibilities:**
- Machine learning model inference
- Security data analysis
- Threat detection algorithms
- Compliance rule evaluation
- Data preprocessing and feature extraction

### Data Layer

#### PostgreSQL (Primary Database)
**Purpose:** Primary data storage for all application data
**Schema:**
- Users and authentication
- Security incidents and events
- Compliance rules and reports
- Workflow definitions
- System configurations

#### Redis (Cache & Session Store)
**Purpose:** High-performance caching and session management
**Usage:**
- User session storage
- API response caching
- Real-time data caching
- Background job queues

#### Elasticsearch (Search & Analytics)
**Purpose:** Advanced search and log analytics
**Usage:**
- Security event indexing
- Full-text search capabilities
- Log aggregation and analysis
- Real-time alerting

#### Kafka (Message Streaming)
**Purpose:** Real-time event streaming and processing
**Usage:**
- Security event streaming
- Real-time notifications
- Microservice communication
- Event sourcing

---

## Data Flow

### 1. Security Event Processing Flow

```
Security Event → Kafka → Python ML API → Analysis → PostgreSQL
                   ↓
              Elasticsearch ← Real-time Indexing
                   ↓
              Dashboard ← Real-time Updates
```

### 2. User Authentication Flow

```
Frontend → Node.js API → JWT Validation → Redis Session Check → PostgreSQL User Data
```

### 3. ML Analysis Flow

```
Raw Data → Python API → Feature Extraction → ML Models → Risk Score → Alert Generation
```

### 4. Workflow Execution Flow

```
Trigger Event → Node.js API → Workflow Engine → Task Execution → Status Updates → Frontend
```

---

## Security Architecture

### Authentication & Authorization
- **JWT-based authentication** with secure token management
- **Role-based access control (RBAC)** for fine-grained permissions
- **Session management** with Redis for scalability
- **Password hashing** using bcrypt with salt

### Data Security
- **Encryption at rest** for sensitive data in PostgreSQL
- **Encryption in transit** using HTTPS/TLS
- **API key management** for external service integration
- **Input validation** and sanitization across all APIs

### Network Security
- **CORS configuration** for cross-origin requests
- **Rate limiting** to prevent abuse
- **API versioning** for backward compatibility
- **Request/response logging** for audit trails

---

## AI/ML Pipeline

### Machine Learning Models

#### 1. Anomaly Detection Model
- **Algorithm:** Isolation Forest
- **Purpose:** Detect unusual patterns in security events
- **Input:** Network traffic, user behavior, system logs
- **Output:** Anomaly score (0-1)

#### 2. Threat Classification Model
- **Algorithm:** Random Forest
- **Purpose:** Classify security threats by type and severity
- **Input:** Security event features
- **Output:** Threat category and confidence score

#### 3. Risk Scoring Model
- **Algorithm:** XGBoost
- **Purpose:** Calculate overall risk scores for incidents
- **Input:** Multiple security indicators
- **Output:** Risk score (1-10) and recommendations

### Feature Engineering
- **Network features:** Traffic patterns, connection metadata
- **User features:** Behavior patterns, access patterns
- **System features:** Resource usage, error rates
- **Temporal features:** Time-based patterns and trends

### Model Training Pipeline
1. **Data Collection:** Aggregate security events from multiple sources
2. **Feature Extraction:** Transform raw data into ML features
3. **Model Training:** Train models using historical data
4. **Model Validation:** Cross-validation and performance testing
5. **Model Deployment:** Deploy models to production API
6. **Model Monitoring:** Track model performance and drift

---

## Infrastructure Components

### Containerization (Docker)
- **Application containers** for each service
- **Database containers** for development
- **Orchestration** with Docker Compose
- **Environment isolation** for different deployment stages

### Monitoring (Prometheus + Grafana)
- **Metrics collection** from all services
- **Custom dashboards** for security metrics
- **Alerting rules** for system health
- **Performance monitoring** and optimization

### Load Balancing (Nginx)
- **Reverse proxy** for API requests
- **Static file serving** for frontend assets
- **SSL termination** for HTTPS
- **Request routing** between services

---

## API Architecture

### RESTful API Design
- **Resource-based URLs** following REST conventions
- **HTTP methods** for different operations (GET, POST, PUT, DELETE)
- **Status codes** for proper error handling
- **JSON payloads** for data exchange

### API Endpoints

#### Authentication Endpoints
```
POST /auth/login          - User login
POST /auth/logout         - User logout
POST /auth/refresh        - Token refresh
GET  /auth/profile        - User profile
```

#### Security Endpoints
```
GET    /security/incidents     - List security incidents
POST   /security/incidents     - Create new incident
GET    /security/incidents/:id - Get incident details
PUT    /security/incidents/:id - Update incident
DELETE /security/incidents/:id - Delete incident
```

#### ML Analysis Endpoints
```
POST /ml/analyze          - Analyze security data
GET  /ml/models           - List available models
POST /ml/predict          - Make predictions
GET  /ml/metrics          - Model performance metrics
```

#### Workflow Endpoints
```
GET    /workflows         - List workflows
POST   /workflows         - Create workflow
GET    /workflows/:id     - Get workflow details
PUT    /workflows/:id     - Update workflow
POST   /workflows/:id/run - Execute workflow
```

### API Documentation
- **OpenAPI/Swagger** specification
- **Interactive documentation** at `/docs`
- **Request/response examples**
- **Authentication requirements**

---

## Frontend Architecture

### Component Structure
```
src/
├── components/
│   ├── common/           # Reusable components
│   ├── workflow/         # Workflow-specific components
│   └── charts/           # Data visualization components
├── pages/                # Page components
├── hooks/                # Custom React hooks
├── services/             # API service functions
├── utils/                # Utility functions
└── types/                # TypeScript type definitions
```

### State Management
- **React Context** for global state
- **Local state** with useState hook
- **Custom hooks** for complex state logic
- **API state** managed with React Query

### Routing
- **React Router** for client-side routing
- **Protected routes** for authenticated pages
- **Dynamic routing** for parameterized pages
- **Route guards** for authorization

---

## Database Schema

### Core Tables

#### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Security Incidents Table
```sql
CREATE TABLE security_incidents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'open',
    assigned_to INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Workflows Table
```sql
CREATE TABLE workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Compliance Rules Table
```sql
CREATE TABLE compliance_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    framework VARCHAR(100) NOT NULL,
    rule_definition JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Deployment Architecture

### Local Development
- **Docker Compose** for infrastructure services
- **Local PostgreSQL** for database
- **Hot reloading** for development
- **Environment variables** for configuration

### Production Deployment
- **Kubernetes** for container orchestration
- **Helm charts** for deployment management
- **Horizontal pod autoscaling** for load handling
- **Persistent volumes** for data storage

### CI/CD Pipeline
1. **Code commit** triggers pipeline
2. **Automated testing** (unit, integration, e2e)
3. **Security scanning** for vulnerabilities
4. **Docker image building** and pushing
5. **Deployment** to staging environment
6. **Production deployment** after approval

---

## Monitoring & Observability

### Application Metrics
- **Request/response times** for API endpoints
- **Error rates** and status codes
- **Database query performance**
- **Memory and CPU usage**

### Security Metrics
- **Threat detection rates**
- **False positive/negative rates**
- **Incident response times**
- **Compliance score trends**

### Business Metrics
- **User activity** and engagement
- **Feature usage** statistics
- **System availability** and uptime
- **Performance benchmarks**

### Alerting
- **Threshold-based alerts** for system metrics
- **Anomaly detection** for unusual patterns
- **Security incident alerts**
- **System health notifications**

---

## Technology Stack Summary

### Frontend
- **React 18** with TypeScript
- **Material-UI** for components
- **React Router** for navigation
- **Axios** for HTTP requests

### Backend
- **Node.js** with NestJS framework
- **Python** with FastAPI framework
- **TypeScript** for type safety
- **JWT** for authentication

### Database
- **PostgreSQL** for primary data
- **Redis** for caching
- **Elasticsearch** for search
- **Kafka** for streaming

### Infrastructure
- **Docker** for containerization
- **Prometheus** for metrics
- **Grafana** for dashboards
- **Nginx** for load balancing

### AI/ML
- **Scikit-learn** for ML models
- **Pandas** for data processing
- **NumPy** for numerical computing
- **Joblib** for model persistence

---

## Conclusion

The NodeGuard AI Security Platform is designed as a modern, scalable, and secure system that leverages cutting-edge technologies to provide comprehensive security detection and response capabilities. The microservices architecture ensures scalability and maintainability, while the AI/ML pipeline provides intelligent threat detection and analysis.

The system is built with security-first principles, comprehensive monitoring, and observability features that enable effective operation and maintenance in production environments.
