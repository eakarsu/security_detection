# NodeGuard AI Security Platform - Local Testing Guide

This guide will help you test all the features we've implemented in the security detection system locally.

## 🚀 Quick Start

### 1. Prerequisites
Make sure you have completed the installation:
```bash
./install.sh
```

### 2. Start the System
```bash
./start-local.sh
```

This will:
- Start all infrastructure services (PostgreSQL, Redis, Elasticsearch, Kafka, etc.) in Docker
- Start the Python ML API locally on port 8000
- Start the Node.js API locally on port 3001  
- Start the React frontend locally on port 3000

### 3. Access the Application
Open your browser and go to: **http://localhost:3000**

## 🌐 Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | - |
| **Node.js API** | http://localhost:3001 | - |
| **Python ML API** | http://localhost:8000 | - |
| **API Documentation** | http://localhost:8000/docs | - |
| **PostgreSQL** | localhost:5432 | nodeguard / NodeGuard2025!DB |
| **Redis** | localhost:6379 | - |
| **Elasticsearch** | http://localhost:9200 | - |
| **Kafka** | localhost:9092 | - |
| **Prometheus** | http://localhost:9090 | - |
| **Grafana** | http://localhost:3002 | admin / NodeGuard2025!Grafana |

## 🧪 Feature Testing Checklist

### ✅ 1. Authentication & Login
- [ ] Navigate to http://localhost:3000
- [ ] You should see the login page
- [ ] Try logging in with test credentials
- [ ] Verify JWT token authentication works

### ✅ 2. Dashboard
- [ ] After login, verify the main dashboard loads
- [ ] Check security metrics and charts display
- [ ] Verify real-time data updates
- [ ] Test responsive design on different screen sizes

### ✅ 3. Incident Management
- [ ] Navigate to "Incident Management" from the sidebar
- [ ] Test creating a new incident
- [ ] Verify incident list displays properly
- [ ] Test incident status updates
- [ ] Check incident details view
- [ ] Test incident search and filtering

### ✅ 4. Threat Intelligence
- [ ] Navigate to "Threat Intelligence"
- [ ] Verify threat data displays
- [ ] Test threat analysis features
- [ ] Check threat correlation functionality
- [ ] Test threat intelligence feeds

### ✅ 5. Compliance Reports (NEW FEATURE)
- [ ] Navigate to "Compliance Reports"
- [ ] Test creating a new compliance report
- [ ] Verify different compliance frameworks (SOC 2, ISO 27001, NIST, etc.)
- [ ] Test report generation and download
- [ ] Check compliance score calculations
- [ ] Test findings management
- [ ] Verify evidence upload functionality
- [ ] Test remediation tracking

### ✅ 6. Workflow Builder
- [ ] Navigate to "Workflow Builder"
- [ ] Test drag-and-drop workflow creation
- [ ] Verify different node types work:
  - [ ] Input Node
  - [ ] ML Scoring Node
  - [ ] AI Analysis Node
  - [ ] Correlation Node
  - [ ] Alert Node
  - [ ] Response Node
- [ ] Test workflow execution
- [ ] Verify workflow saving and loading

### ✅ 7. Settings
- [ ] Navigate to "Settings"
- [ ] Test configuration options
- [ ] Verify user preferences
- [ ] Test system settings

### ✅ 8. API Testing

#### Python ML API (Port 8000)
```bash
# Health check
curl http://localhost:8000/health

# API documentation
open http://localhost:8000/docs

# Test ML endpoints
curl -X POST http://localhost:8000/api/ml/analyze \
  -H "Content-Type: application/json" \
  -d '{"data": "test security event"}'
```

#### Node.js API (Port 3001)
```bash
# Health check
curl http://localhost:3001/health

# Test authentication
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'

# Test security endpoints
curl http://localhost:3001/api/security/events
```

### ✅ 9. Database Testing
```bash
# Connect to PostgreSQL
PGPASSWORD=NodeGuard2025!DB psql -h localhost -p 5432 -U nodeguard -d nodeguard

# Check tables
\dt

# Test data
SELECT * FROM users LIMIT 5;
SELECT * FROM incidents LIMIT 5;
SELECT * FROM compliance_reports LIMIT 5;
```

### ✅ 10. Infrastructure Testing

#### Redis
```bash
# Connect to Redis
redis-cli -h localhost -p 6379

# Test commands
PING
SET test "Hello World"
GET test
```

#### Elasticsearch
```bash
# Check cluster health
curl http://localhost:9200/_cluster/health

# List indices
curl http://localhost:9200/_cat/indices
```

#### Kafka
```bash
# List topics (if kafka-topics is available)
kafka-topics --bootstrap-server localhost:9092 --list

# Or check with Docker
docker exec -it $(docker ps -q --filter "name=kafka") kafka-topics --bootstrap-server localhost:9092 --list
```

## 🔍 Monitoring & Logs

### Application Logs
```bash
# Frontend logs
tail -f logs/frontend.log

# Node.js API logs
tail -f logs/nodejs-api.log

# Python ML API logs
tail -f logs/python-api.log

# All logs together
tail -f logs/*.log
```

### Infrastructure Logs
```bash
# All infrastructure services
docker-compose -f docker-compose.local.yml logs -f

# Specific service
docker-compose -f docker-compose.local.yml logs -f postgres
docker-compose -f docker-compose.local.yml logs -f redis
docker-compose -f docker-compose.local.yml logs -f elasticsearch
```

### Monitoring Dashboards
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3002 (admin/NodeGuard2025!Grafana)

## 🐛 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Kill processes on specific ports
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:3001 | xargs kill -9  # Node.js API
lsof -ti:8000 | xargs kill -9  # Python API
```

#### 2. Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check database connectivity
PGPASSWORD=NodeGuard2025!DB psql -h localhost -p 5432 -U nodeguard -d nodeguard -c "SELECT 1;"
```

#### 3. Frontend Not Loading
```bash
# Check if React dev server is running
curl http://localhost:3000

# Check frontend logs
tail -f logs/frontend.log

# Restart frontend only
./stop-local.sh --apps-only
cd frontend && npm start
```

#### 4. API Not Responding
```bash
# Check API health
curl http://localhost:3001/health  # Node.js
curl http://localhost:8000/health  # Python

# Check API logs
tail -f logs/nodejs-api.log
tail -f logs/python-api.log
```

#### 5. Infrastructure Services Not Starting
```bash
# Check Docker status
docker ps

# Check service health
docker-compose -f docker-compose.local.yml ps

# Restart infrastructure
./stop-local.sh --infra-only
./start-local.sh
```

## 🛑 Stopping Services

### Stop Everything
```bash
./stop-local.sh
```

### Stop Only Applications (Keep Infrastructure)
```bash
./stop-local.sh --apps-only
```

### Stop Only Infrastructure (Keep Applications)
```bash
./stop-local.sh --infra-only
```

### Clean Stop (Remove All Data)
```bash
./stop-local.sh --clean-volumes
```

## 📊 Performance Testing

### Load Testing Frontend
```bash
# Install Apache Bench (if not installed)
brew install httpie

# Test frontend
ab -n 100 -c 10 http://localhost:3000/
```

### API Load Testing
```bash
# Test Node.js API
ab -n 100 -c 10 http://localhost:3001/health

# Test Python API
ab -n 100 -c 10 http://localhost:8000/health
```

## 🔐 Security Testing

### Test Authentication
```bash
# Test without token
curl http://localhost:3001/api/security/events

# Test with invalid token
curl -H "Authorization: Bearer invalid_token" http://localhost:3001/api/security/events
```

### Test Input Validation
```bash
# Test SQL injection protection
curl -X POST http://localhost:8000/api/ml/analyze \
  -H "Content-Type: application/json" \
  -d '{"data": "test; DROP TABLE users; --"}'
```

## ✅ Success Criteria

Your local testing is successful when:

1. ✅ All services start without errors
2. ✅ Frontend loads at http://localhost:3000
3. ✅ All API endpoints respond correctly
4. ✅ Database connections work
5. ✅ All features are accessible and functional
6. ✅ No critical errors in logs
7. ✅ Infrastructure services are healthy
8. ✅ Compliance Reports feature works completely
9. ✅ Workflow Builder functions properly
10. ✅ Authentication and authorization work

## 🎯 Next Steps

After successful local testing:

1. **Production Deployment**: Use `./docker-start.sh` for full Docker deployment
2. **CI/CD Setup**: Configure automated testing and deployment
3. **Monitoring**: Set up production monitoring with Prometheus/Grafana
4. **Security Hardening**: Implement production security measures
5. **Performance Optimization**: Optimize for production workloads

## 📞 Support

If you encounter issues:

1. Check the logs first: `tail -f logs/*.log`
2. Verify all prerequisites are installed
3. Ensure Docker is running
4. Check port availability
5. Review the troubleshooting section above

---

**Happy Testing! 🚀**

The NodeGuard AI Security Platform is now ready for comprehensive local testing with all features including the new Compliance Reports system.
