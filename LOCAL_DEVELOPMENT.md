# Local Development Setup - NodeGuard AI Security Platform

## 🚀 Quick Local Testing (No Docker Required)

This guide will help you run the NodeGuard AI Security Platform locally for testing and development without building Docker containers.

## Prerequisites

- **Node.js 18+** (for frontend and Node.js API)
- **Python 3.9+** (for ML/AI backend)
- **OpenRouter API Key** (for AI analysis)

## 🔧 Step-by-Step Setup

### 1. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit with your OpenRouter API key
nano .env
```

**Required environment variables:**
```bash
OPENROUTER_API_KEY=your_openrouter_api_key_here
DEFAULT_MODEL=anthropic/claude-3.5-sonnet
FALLBACK_MODEL=openai/gpt-4-turbo
```

### 2. Python ML Backend Setup

```bash
# Navigate to Python backend
cd backend/python

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the Python ML API
uvicorn main:app --reload --port 8000
```

The Python ML API will be available at: http://localhost:8000

### 3. Node.js API Setup (Optional)

```bash
# Navigate to Node.js backend
cd backend/nodejs

# Install dependencies
npm install

# Start development server
npm run dev
```

The Node.js API will be available at: http://localhost:3001

### 4. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

The frontend will be available at: http://localhost:3000

## 🧪 Testing the System

### 1. Test Python ML API

```bash
# Health check
curl http://localhost:8000/health

# Test ML prediction (with sample data)
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "test-001",
    "timestamp": "2025-01-01T12:00:00Z",
    "source_ip": "192.168.1.100",
    "destination_ip": "8.8.8.8",
    "event_type": "network_connection",
    "severity": "medium"
  }'

# Test AI analysis (requires OpenRouter API key)
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "test-002",
    "event_data": {
      "timestamp": "2025-01-01T12:00:00Z",
      "source_ip": "192.168.1.100",
      "destination_ip": "8.8.8.8",
      "event_type": "suspicious_login",
      "user_id": "john.doe",
      "severity": "high"
    },
    "context": {
      "user_history": "normal",
      "recent_alerts": []
    },
    "analysis_type": "comprehensive"
  }'
```

### 2. Test Frontend

1. Open http://localhost:3000 in your browser
2. You should see the NodeGuard AI Security Platform interface
3. Navigate to the Workflow Builder to test the node-based interface
4. Try creating a simple workflow with the available nodes

## 🔍 Simplified Testing Mode

If you want to test just the core AI functionality without the full stack:

### Test AI Analysis Only

```bash
# Navigate to Python backend
cd backend/python

# Install minimal dependencies
pip install fastapi uvicorn httpx structlog pydantic

# Set your OpenRouter API key
export OPENROUTER_API_KEY=your_api_key_here

# Start the API
uvicorn main:app --reload --port 8000

# Test in another terminal
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "test-001",
    "event_data": {
      "timestamp": "2025-01-01T12:00:00Z",
      "source_ip": "10.0.0.100",
      "destination_ip": "malicious-site.com",
      "event_type": "suspicious_connection",
      "bytes_transferred": 1000000,
      "user_id": "admin",
      "severity": "critical"
    },
    "analysis_type": "comprehensive"
  }'
```

### Test Frontend Only

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start in development mode
npm start

# Open http://localhost:3000
# The frontend will work in demo mode without backend APIs
```

## 🛠️ Development Workflow

### 1. Backend Development

```bash
# Python ML API with hot reload
cd backend/python
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Node.js API with hot reload
cd backend/nodejs
npm run dev
```

### 2. Frontend Development

```bash
# React with hot reload
cd frontend
npm start
```

### 3. Testing Changes

- **Python changes**: The uvicorn server will auto-reload
- **Frontend changes**: React will hot-reload in the browser
- **Node.js changes**: ts-node-dev will auto-restart the server

## 📊 Sample Test Data

Use this sample data to test the AI analysis:

```json
{
  "event_id": "incident-001",
  "event_data": {
    "timestamp": "2025-01-01T14:30:00Z",
    "source_ip": "192.168.1.50",
    "destination_ip": "suspicious-domain.com",
    "event_type": "data_exfiltration",
    "user_id": "finance.user",
    "asset_id": "finance-server-01",
    "bytes_transferred": 50000000,
    "protocol": "HTTPS",
    "severity": "critical",
    "detection_method": "ml_model"
  },
  "context": {
    "user_history": "normal_user",
    "asset_criticality": "high",
    "recent_alerts": [
      {
        "timestamp": "2025-01-01T14:00:00Z",
        "type": "failed_login",
        "user_id": "finance.user"
      }
    ],
    "threat_intelligence": {
      "domain_reputation": "malicious",
      "known_campaigns": ["APT-Finance-2024"]
    }
  },
  "analysis_type": "comprehensive"
}
```

## 🚨 Troubleshooting

### Common Issues

1. **OpenRouter API Errors**
   ```bash
   # Check if API key is set
   echo $OPENROUTER_API_KEY
   
   # Test API key manually
   curl -H "Authorization: Bearer $OPENROUTER_API_KEY" \
        https://openrouter.ai/api/v1/models
   ```

2. **Python Dependencies**
   ```bash
   # If you get import errors, install missing packages
   pip install fastapi uvicorn httpx structlog pydantic python-multipart
   ```

3. **Node.js Issues**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Port Conflicts**
   ```bash
   # Check what's running on ports
   lsof -i :3000  # Frontend
   lsof -i :3001  # Node.js API
   lsof -i :8000  # Python API
   
   # Kill processes if needed
   kill -9 <PID>
   ```

### Debug Mode

```bash
# Run Python API with debug logging
cd backend/python
LOG_LEVEL=debug uvicorn main:app --reload --port 8000

# Run frontend with debug info
cd frontend
REACT_APP_DEBUG=true npm start
```

## 🎯 What You Can Test

### 1. AI Analysis Features
- Threat analysis with MITRE ATT&CK mapping
- Incident report generation
- Compliance impact assessment
- Alert explanations

### 2. ML Features
- Event feature extraction
- Threat scoring with ensemble models
- Anomaly detection

### 3. Frontend Features
- Node-based workflow builder
- Security dashboard (demo mode)
- Incident management interface

### 4. Integration Features
- OpenRouter API integration
- Structured prompt engineering
- JSON response parsing

## 📝 Next Steps

1. **Start with Python API**: Test the core AI functionality
2. **Add Frontend**: Explore the visual workflow builder
3. **Test Integration**: Connect frontend to backend APIs
4. **Customize Prompts**: Modify AI prompts for your use case
5. **Add Data Sources**: Connect real security data

This local setup gives you a fully functional development environment to explore and test the NodeGuard AI Security Platform!
