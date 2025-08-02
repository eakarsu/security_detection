#!/bin/bash

# NodeGuard AI Security Platform - Startup Script
# This script checks runtime requirements and starts all services

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_service() {
    echo -e "${PURPLE}[SERVICE]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1  # Port is in use
    else
        return 0  # Port is available
    fi
}

# Kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        kill -9 $pid
        log_info "Killed process on port $port"
    fi
}

# Wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    log_info "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            log_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "$service_name failed to start within 60 seconds"
    return 1
}

# Test API endpoint
test_api() {
    local url=$1
    local description=$2
    
    log_info "Testing $description..."
    
    response=$(curl -s -w "%{http_code}" "$url" -o /dev/null)
    
    if [ "$response" = "200" ] || [ "$response" = "404" ]; then
        log_success "$description is responding"
        return 0
    else
        log_error "$description is not responding (HTTP $response)"
        return 1
    fi
}

# Cleanup function
cleanup() {
    log_info "Shutting down services..."
    
    # Kill background processes
    if [ ! -z "$PYTHON_PID" ]; then
        kill $PYTHON_PID 2>/dev/null || true
        log_info "Stopped Python ML API"
    fi
    
    if [ ! -z "$NODEJS_PID" ]; then
        kill $NODEJS_PID 2>/dev/null || true
        log_info "Stopped Node.js API"
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        log_info "Stopped Frontend"
    fi
    
    # Kill any remaining processes on our ports
    kill_port 3000 2>/dev/null || true
    kill_port 3001 2>/dev/null || true
    kill_port 8000 2>/dev/null || true
    
    log_info "Cleanup completed"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Main startup function
main() {
    log_info "Starting NodeGuard AI Security Platform..."
    echo "=================================================="
    
    # Pre-flight checks
    log_info "Running pre-flight checks..."
    
    # Check if we're in the right directory
    if [ ! -f "install.sh" ] && [ ! -f "frontend/package.json" ]; then
        log_error "Not in the correct project directory. Please run from the project root."
        exit 1
    fi
    
    # Check required commands
    if ! command_exists node; then
        log_error "Node.js not found. Please run ./install.sh first"
        exit 1
    fi
    
    if ! command_exists python3; then
        log_error "Python 3 not found. Please run ./install.sh first"
        exit 1
    fi
    
    if ! command_exists curl; then
        log_error "curl not found. Please install curl"
        exit 1
    fi
    
    # Check .env file
    if [ ! -f ".env" ]; then
        log_error ".env file not found. Please run ./install.sh first"
        exit 1
    fi
    
    # Load environment variables
    set -a
    source .env
    set +a
    
    # Check OpenRouter API key
    if [ -z "$OPENROUTER_API_KEY" ] || [ "$OPENROUTER_API_KEY" = "your_openrouter_api_key_here" ]; then
        log_warning "OpenRouter API key not set. AI features will not work."
        log_info "Please set OPENROUTER_API_KEY in .env file"
    else
        log_success "OpenRouter API key found"
    fi
    
    # Check ports availability
    log_info "Checking port availability..."
    
    if ! check_port 8000; then
        log_warning "Port 8000 is in use. Attempting to free it..."
        kill_port 8000
        sleep 2
    fi
    
    if ! check_port 3000; then
        log_warning "Port 3000 is in use. Attempting to free it..."
        kill_port 3000
        sleep 2
    fi
    
    if ! check_port 3001; then
        log_warning "Port 3001 is in use. Attempting to free it..."
        kill_port 3001
        sleep 2
    fi
    
    log_success "Pre-flight checks completed"
    echo ""
    
    # Start Python ML API
    log_service "Starting Python ML API..."
    
    if [ ! -d "backend/python/venv" ]; then
        log_error "Python virtual environment not found. Please run ./install.sh first"
        exit 1
    fi
    
    cd backend/python
    source venv/bin/activate
    
    # Check if main.py exists
    if [ ! -f "main.py" ]; then
        log_error "main.py not found in backend/python"
        exit 1
    fi
    
    # Start Python API in background
    nohup uvicorn main:app --reload --port 8000 --host 0.0.0.0 > ../../logs/python-api.log 2>&1 &
    PYTHON_PID=$!
    
    cd ../..
    
    # Wait for Python API to be ready
    if wait_for_service "http://localhost:8000/health" "Python ML API"; then
        log_success "Python ML API started successfully (PID: $PYTHON_PID)"
    else
        log_error "Failed to start Python ML API"
        cleanup
        exit 1
    fi
    
    # Start Node.js API (if exists)
    if [ -d "backend/nodejs" ] && [ -f "backend/nodejs/package.json" ]; then
        log_service "Starting Node.js API..."
        
        cd backend/nodejs
        
        # Check if node_modules exists
        if [ ! -d "node_modules" ]; then
            log_error "Node.js dependencies not installed. Please run ./install.sh first"
            exit 1
        fi
        
        # Start Node.js API in background
        nohup npm run dev > ../../logs/nodejs-api.log 2>&1 &
        NODEJS_PID=$!
        
        cd ../..
        
        # Wait for Node.js API to be ready
        if wait_for_service "http://localhost:3001/api/v1/health" "Node.js API"; then
            log_success "Node.js API started successfully (PID: $NODEJS_PID)"
        else
            log_warning "Node.js API failed to start (this is optional)"
        fi
    else
        log_info "Node.js API not found, skipping..."
    fi
    
    # Start Frontend
    log_service "Starting Frontend..."
    
    if [ ! -d "frontend" ]; then
        log_error "Frontend directory not found"
        exit 1
    fi
    
    cd frontend
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        log_error "Frontend dependencies not installed. Please run ./install.sh first"
        exit 1
    fi
    
    # Start frontend in background
    nohup npm start > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    
    cd ..
    
    # Wait for frontend to be ready
    if wait_for_service "http://localhost:3000" "Frontend"; then
        log_success "Frontend started successfully (PID: $FRONTEND_PID)"
    else
        log_error "Failed to start Frontend"
        cleanup
        exit 1
    fi
    
    echo ""
    log_success "All services started successfully!"
    echo "=================================================="
    
    # Display service information
    echo ""
    log_info "Service URLs:"
    echo "  🌐 Frontend:        http://localhost:3000"
    echo "  🐍 Python ML API:   http://localhost:8000"
    echo "  📚 API Docs:        http://localhost:8000/docs"
    
    if [ ! -z "$NODEJS_PID" ]; then
        echo "  🟢 Node.js API:     http://localhost:3001"
        echo "  📖 API Docs:        http://localhost:3001/api/docs"
    fi
    
    echo ""
    log_info "Log files:"
    echo "  📄 Python API:      logs/python-api.log"
    echo "  📄 Frontend:        logs/frontend.log"
    
    if [ ! -z "$NODEJS_PID" ]; then
        echo "  📄 Node.js API:     logs/nodejs-api.log"
    fi
    
    echo ""
    
    # Test all services
    log_info "Testing services..."
    
    test_api "http://localhost:8000/health" "Python ML API health check"
    
    if [ ! -z "$NODEJS_PID" ]; then
        test_api "http://localhost:3001/api/v1/health" "Node.js API health check" || true
    fi
    
    test_api "http://localhost:3000" "Frontend"
    
    echo ""
    
    # Test AI functionality if API key is available
    if [ ! -z "$OPENROUTER_API_KEY" ] && [ "$OPENROUTER_API_KEY" != "your_openrouter_api_key_here" ]; then
        log_info "Testing AI functionality..."
        
        ai_test_response=$(curl -s -X POST "http://localhost:8000/analyze" \
            -H "Content-Type: application/json" \
            -d '{
                "event_id": "test-startup",
                "event_data": {
                    "timestamp": "2025-01-01T12:00:00Z",
                    "source_ip": "192.168.1.100",
                    "event_type": "test_event",
                    "severity": "low"
                },
                "analysis_type": "quick"
            }' -w "%{http_code}" -o /dev/null)
        
        if [ "$ai_test_response" = "200" ]; then
            log_success "AI analysis is working!"
        else
            log_warning "AI analysis test failed (HTTP $ai_test_response)"
        fi
    else
        log_warning "Skipping AI test - OpenRouter API key not configured"
    fi
    
    echo ""
    log_success "🚀 NodeGuard AI Security Platform is ready!"
    echo ""
    log_info "Quick start guide:"
    echo "1. Open http://localhost:3000 in your browser"
    echo "2. Navigate to 'Workflow Builder' to create security workflows"
    echo "3. Test the AI analysis at http://localhost:8000/docs"
    echo "4. Check logs in the 'logs/' directory if you encounter issues"
    echo ""
    log_info "Press Ctrl+C to stop all services"
    
    # Keep script running and monitor services
    while true; do
        sleep 10
        
        # Check if services are still running
        if ! kill -0 $PYTHON_PID 2>/dev/null; then
            log_error "Python ML API has stopped unexpectedly"
            cleanup
            exit 1
        fi
        
        if ! kill -0 $FRONTEND_PID 2>/dev/null; then
            log_error "Frontend has stopped unexpectedly"
            cleanup
            exit 1
        fi
        
        if [ ! -z "$NODEJS_PID" ] && ! kill -0 $NODEJS_PID 2>/dev/null; then
            log_warning "Node.js API has stopped"
            NODEJS_PID=""
        fi
    done
}

# Create logs directory if it doesn't exist
mkdir -p logs

# Run main function
main "$@"
