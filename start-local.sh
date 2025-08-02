#!/bin/bash

# NodeGuard AI Security Platform - Local Development Startup
# This script starts all services locally without Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        print_error ".env file not found. Please run ./install.sh first."
        exit 1
    fi
    print_success ".env file found"
}

# Check if OpenRouter API key is set
check_api_key() {
    if grep -q "your_openrouter_api_key_here" .env; then
        print_warning "OpenRouter API key not set in .env file"
        print_warning "AI features will not work until you add your API key"
        print_warning "Edit .env file and add your OpenRouter API key"
    else
        print_success "OpenRouter API key is configured"
    fi
}

# Check if external services are running
check_external_services() {
    print_status "Checking external service availability..."
    
    # Check PostgreSQL
    if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        print_success "PostgreSQL is running on port 5432"
        export POSTGRES_AVAILABLE=true
    else
        print_warning "PostgreSQL not running - will use in-memory SQLite"
        export POSTGRES_AVAILABLE=false
        export LOCAL_DEV_MODE=true
    fi
    
    # Check Redis
    if redis-cli -h localhost -p 6379 ping >/dev/null 2>&1; then
        print_success "Redis is running on port 6379"
        export REDIS_AVAILABLE=true
    else
        print_warning "Redis not running - will use in-memory cache"
        export REDIS_AVAILABLE=false
        export LOCAL_DEV_MODE=true
    fi
    
    # Check Elasticsearch
    if curl -s -u elastic:NodeGuard2025!Elastic http://localhost:9200/_cluster/health >/dev/null 2>&1; then
        print_success "Elasticsearch is running on port 9200"
        export ELASTICSEARCH_AVAILABLE=true
    elif curl -s http://localhost:9200/_cluster/health >/dev/null 2>&1; then
        print_success "Elasticsearch is running on port 9200 (no auth)"
        export ELASTICSEARCH_AVAILABLE=true
    else
        print_warning "Elasticsearch not running - search features will be disabled"
        export ELASTICSEARCH_AVAILABLE=false
        export LOCAL_DEV_MODE=true
    fi
    
    # Check Kafka
    if nc -z localhost 9092 >/dev/null 2>&1; then
        print_success "Kafka is running on port 9092"
        export KAFKA_AVAILABLE=true
    else
        print_warning "Kafka not running - real-time features will be disabled"
        export KAFKA_AVAILABLE=false
        export LOCAL_DEV_MODE=true
    fi
    
    # Set local development mode if any service is missing
    if [ "$LOCAL_DEV_MODE" = "true" ]; then
        print_status "Enabling local development mode (simplified features)"
        echo "LOCAL_DEV_MODE=true" >> .env.local
    else
        print_success "All external services are available"
        echo "LOCAL_DEV_MODE=false" >> .env.local
    fi
}

# Check if Python virtual environment exists
check_python_env() {
    if [ ! -d "backend/python/venv" ]; then
        print_error "Python virtual environment not found. Please run ./install.sh first."
        exit 1
    fi
    print_success "Python virtual environment found"
}

# Check if Node.js dependencies are installed
check_node_deps() {
    if [ ! -d "frontend/node_modules" ]; then
        print_error "Frontend dependencies not found. Please run ./install.sh first."
        exit 1
    fi
    
    if [ ! -d "backend/nodejs/node_modules" ]; then
        print_error "Node.js backend dependencies not found. Please run ./install.sh first."
        exit 1
    fi
    
    print_success "Node.js dependencies found"
}

# Kill any existing processes on our ports
cleanup_ports() {
    print_status "Cleaning up any existing processes on ports 3000, 3001, 8000..."
    
    # Kill processes on port 3000 (React frontend)
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    
    # Kill processes on port 3001 (Node.js API)
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    
    # Kill processes on port 8000 (Python API)
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    
    print_success "Ports cleaned up"
}

# Start Python ML API
start_python_api() {
    print_status "Starting Python ML API on port 8000..."
    
    cd backend/python
    source venv/bin/activate
    
    # Start the Python API in background
    nohup uvicorn main:app --reload --host 0.0.0.0 --port 8000 > ../../logs/python-api.log 2>&1 &
    PYTHON_PID=$!
    echo $PYTHON_PID > ../../logs/python-api.pid
    
    cd ../..
    
    # Wait a moment for the service to start
    sleep 3
    
    # Check if the service is running
    if curl -s http://localhost:8000/health > /dev/null; then
        print_success "Python ML API started successfully (PID: $PYTHON_PID)"
    else
        print_warning "Python ML API may not have started properly. Check logs/python-api.log"
    fi
}

# Start Node.js API
start_nodejs_api() {
    print_status "Starting Node.js API on port 3001..."
    
    cd backend/nodejs
    
    # Start the Node.js API in background
    nohup npm run start:dev > ../../logs/nodejs-api.log 2>&1 &
    NODEJS_PID=$!
    echo $NODEJS_PID > ../../logs/nodejs-api.pid
    
    cd ../..
    
    # Wait a moment for the service to start
    sleep 5
    
    # Check if the service is running
    if curl -s http://localhost:3001/health > /dev/null; then
        print_success "Node.js API started successfully (PID: $NODEJS_PID)"
    else
        print_warning "Node.js API may not have started properly. Check logs/nodejs-api.log"
    fi
}

# Start React frontend
start_frontend() {
    print_status "Starting React frontend on port 3000..."
    
    cd frontend
    
    # Start the React frontend in background
    nohup npm start > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../logs/frontend.pid
    
    cd ..
    
    # Wait a moment for the service to start
    sleep 10
    
    # Check if the service is running
    if curl -s http://localhost:3000 > /dev/null; then
        print_success "React frontend started successfully (PID: $FRONTEND_PID)"
    else
        print_warning "React frontend may not have started properly. Check logs/frontend.log"
    fi
}

# Create logs directory
create_logs_dir() {
    mkdir -p logs
    print_success "Logs directory created"
}

# Display service URLs and information
show_info() {
    echo ""
    echo "=================================================="
    echo -e "${GREEN}NodeGuard AI Security Platform - Local Development${NC}"
    echo "=================================================="
    echo ""
    echo "🌐 Application URLs:"
    echo "   Frontend:           http://localhost:3000"
    echo "   Node.js API:        http://localhost:3001"
    echo "   Python ML API:      http://localhost:8000"
    echo "   API Documentation:  http://localhost:8000/docs"
    echo ""
    echo "📝 Logs:"
    echo "   Frontend:           tail -f logs/frontend.log"
    echo "   Node.js API:        tail -f logs/nodejs-api.log"
    echo "   Python ML API:      tail -f logs/python-api.log"
    echo ""
    echo "🔧 Process Management:"
    echo "   Stop all services:  ./stop-local.sh"
    echo "   View processes:     ps aux | grep -E '(uvicorn|npm|node)'"
    echo ""
    echo "⚠️  Note: This is local development mode."
    echo "   - No database (PostgreSQL) - using in-memory storage"
    echo "   - No Redis cache - using in-memory cache"
    echo "   - No Elasticsearch - search features disabled"
    echo "   - No Kafka - real-time features disabled"
    echo "   - No monitoring (Prometheus/Grafana)"
    echo ""
    echo "   For full features, use Docker: ./docker-start.sh"
    echo "=================================================="
}

# Main execution
main() {
    echo "Starting NodeGuard AI Security Platform (Local Development)..."
    echo "=================================================="
    
    check_env
    check_api_key
    check_external_services
    check_python_env
    check_node_deps
    create_logs_dir
    cleanup_ports
    
    start_python_api
    start_nodejs_api
    start_frontend
    
    show_info
    
    print_success "All services started successfully!"
    print_status "Press Ctrl+C to stop monitoring, or run './stop-local.sh' to stop all services"
    
    # Monitor logs
    echo ""
    echo "Monitoring logs (Press Ctrl+C to stop):"
    echo "========================================"
    
    # Follow all logs
    tail -f logs/*.log 2>/dev/null || {
        print_warning "No log files found yet. Services may still be starting..."
        sleep 5
        tail -f logs/*.log 2>/dev/null || print_warning "Check individual log files manually"
    }
}

# Handle Ctrl+C
trap 'echo -e "\n${YELLOW}Stopping log monitoring...${NC}\nServices are still running. Use ${BLUE}./stop-local.sh${NC} to stop them."; exit 0' INT

# Run main function
main "$@"
