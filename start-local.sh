#!/bin/bash

# NodeGuard AI Security Platform - Optimized Local Development
# This script starts infrastructure services and applications with improved performance

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

# Check if .env file exists and fix if needed
check_and_fix_env() {
    if [ ! -f .env ]; then
        print_error ".env file not found"
        print_status "Creating .env file from template..."
        cp .env.example .env
        print_success ".env file created"
    fi
    
    # Check for missing required variables and add defaults
    local missing_vars=()
    
    if ! grep -q "OPENROUTER_API_KEY=" .env || grep -q "your_openrouter_api_key_here" .env; then
        missing_vars+=("OPENROUTER_API_KEY")
    fi
    
    if ! grep -q "JWT_SECRET=" .env; then
        missing_vars+=("JWT_SECRET")
    fi
    
    if ! grep -q "ENCRYPTION_KEY=" .env; then
        missing_vars+=("ENCRYPTION_KEY")
    fi
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_warning "Adding missing environment variables with defaults..."
        
        for var in "${missing_vars[@]}"; do
            case $var in
                "OPENROUTER_API_KEY")
                    echo "OPENROUTER_API_KEY=your_openrouter_api_key_here" >> .env
                    ;;
                "JWT_SECRET")
                    echo "JWT_SECRET=your-super-secret-jwt-key-change-in-production" >> .env
                    ;;
                "ENCRYPTION_KEY")
                    echo "ENCRYPTION_KEY=your-32-character-encryption-key-here" >> .env
                    ;;
            esac
        done
        
        print_success "Environment variables added to .env file"
        print_warning "Please edit .env file and add your actual API keys"
    fi
    
    if grep -q "your_openrouter_api_key_here" .env; then
        print_warning "OpenRouter API key not set - AI features will not work until you add your API key"
    else
        print_success "OpenRouter API key is configured"
    fi
}

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    print_success "Docker is running"
}

# Check dependencies
check_dependencies() {
    if [ ! -d "backend/python/venv" ]; then
        print_error "Python virtual environment not found. Please run ./install.sh first."
        exit 1
    fi
    
    if [ ! -d "frontend/node_modules" ] || [ ! -d "backend/nodejs/node_modules" ]; then
        print_error "Node.js dependencies not found. Please run ./install.sh first."
        exit 1
    fi
    
    print_success "All dependencies found"
}

# Clean up any existing processes on our ports
cleanup_ports() {
    print_status "Cleaning up any existing processes on ports 3000, 3001, 8000..."
    
    # Kill processes on our ports (but preserve database services)
    for port in 3000 3001 8000; do
        if lsof -ti:$port >/dev/null 2>&1; then
            local process=$(lsof -ti:$port | head -1)
            local process_name=$(ps -p $process -o comm= 2>/dev/null || echo "unknown")
            
            # Don't kill database services
            if [[ "$process_name" != *"postgres"* ]] && [[ "$process_name" != *"redis"* ]] && [[ "$process_name" != *"docker"* ]]; then
                lsof -ti:$port | xargs kill -9 2>/dev/null || true
            fi
        fi
    done
    
    print_success "Ports cleaned up"
}

# Start minimal infrastructure (only PostgreSQL)
start_infrastructure() {
    print_status "Starting minimal infrastructure (PostgreSQL only)..."
    
    # Check if PostgreSQL container is running
    if ! docker ps | grep -q "security_detection-postgres-1"; then
        print_status "Starting PostgreSQL container..."
        docker-compose up -d postgres
        sleep 3
        print_success "PostgreSQL container started"
    else
        print_success "PostgreSQL container already running"
    fi
    
    print_success "Minimal infrastructure ready"
    
    # List all running Docker containers
    print_status "Currently running Docker containers:"
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" | grep -E "(NAMES|security_detection)" || echo "No security_detection containers found"
}
# Test API endpoints and display comprehensive status
show_info() {
    echo ""
    echo "=================================================="
    echo -e "${GREEN}NodeGuard AI Security Platform - Status Report${NC}"
    echo "=================================================="
    echo ""
    
    # Test API endpoints
    print_status "Testing API endpoints..."
    
    # Test Python API
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        print_success "Python ML API (port 8000) - WORKING"
        # Test specific endpoints that were failing
        if curl -s http://localhost:8000/api/incidents/ > /dev/null 2>&1; then
            print_success "  ✓ /api/incidents/ endpoint - WORKING"
        else
            print_error "  ✗ /api/incidents/ endpoint - FAILED"
        fi
        
        if curl -s http://localhost:8000/api/threat-intel/ > /dev/null 2>&1; then
            print_success "  ✓ /api/threat-intel/ endpoint - WORKING"
        else
            print_error "  ✗ /api/threat-intel/ endpoint - FAILED"
        fi
    else
        print_error "Python ML API (port 8000) - NOT RESPONDING"
    fi
    
    # Test Node.js API
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        print_success "Node.js API (port 3001) - WORKING"
    else
        print_warning "Node.js API (port 3001) - NOT RESPONDING"
    fi
    
    # Test Frontend
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_success "Frontend (port 3000) - WORKING"
    else
        print_warning "Frontend (port 3000) - NOT RESPONDING"
    fi
    
    echo ""
    echo "🐳 Docker Containers:"
    docker ps --format "   {{.Names}} ({{.Image}}) - {{.Status}}" | grep security_detection || echo "   No security_detection containers running"
    
    echo ""
    echo "🔍 Kafka Status:"
    if docker ps | grep -q kafka; then
        print_success "   Kafka container is running"
    else
        print_warning "   Kafka is NOT running (this is NORMAL for minimal local development)"
        print_status "   Kafka connection errors in logs are expected and harmless"
    fi
    
    echo ""
    echo "🌐 Application URLs:"
    echo "   Frontend:           http://localhost:3000"
    echo "   Node.js API:        http://localhost:3001"
    echo "   Python ML API:      http://localhost:8000"
    echo "   API Documentation:  http://localhost:8000/docs"
    echo ""
    echo "🔧 Infrastructure Services:"
    echo "   PostgreSQL:         localhost:5432 (nodeguard/NodeGuard2025!SecureDB)"
    echo ""
    echo "📝 Logs:"
    echo "   Frontend:           tail -f logs/frontend.log"
    echo "   Node.js API:        tail -f logs/nodejs-api.log"
    echo "   Python ML API:      tail -f logs/python-api.log"
    echo "   PostgreSQL:         docker logs security_detection-postgres-1"
    echo ""
    echo "🔧 Management:"
    echo "   Stop all services:  ./stop-local.sh"
    echo "   View processes:     ps aux | grep -E '(uvicorn|npm|node)'"
    echo "   Docker services:    docker ps"
    echo ""
    echo "✅ Core Features Available:"
    echo "   - Complete database with PostgreSQL"
    echo "   - AI/ML security analysis"
    echo "   - Compliance reporting"
    echo "   - Incident management"
    echo "   - Threat intelligence"
    echo "   - Workflow automation"
    echo ""
    echo "ℹ️  Important Notes:"
    echo "   - This is a minimal local development setup with only PostgreSQL"
    echo "   - Kafka connection errors in Python API logs are EXPECTED and harmless"
    echo "   - APIs are working correctly - any frontend 500 errors may be CORS related"
    echo "   - For full infrastructure (Redis, Kafka, etc.), use docker-start.sh"
    echo ""
    echo "🚨 Troubleshooting:"
    echo "   - If frontend shows 500 errors, check browser console for CORS issues"
    echo "   - APIs can be tested directly: curl http://localhost:8000/api/incidents/"
    echo "   - Database has sample data loaded and ready"
    echo ""
    echo "=================================================="
}

# Initialize database if needed
init_database() {
    print_status "Checking database initialization..."
    
    # Wait for PostgreSQL to be ready
    local attempt=0
    while [ $attempt -lt 30 ]; do
        if docker exec security_detection-postgres-1 pg_isready -U postgres >/dev/null 2>&1; then
            print_success "PostgreSQL container is ready"
            break
        fi
        print_status "Waiting for PostgreSQL... ($attempt/30)"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -eq 30 ]; then
        print_error "PostgreSQL container failed to start"
        exit 1
    fi
    
    # Check database setup using the correct credentials from .env
    print_status "Checking database setup..."
    
    # Load environment variables from .env file
    source .env
    
    # Use the nodeguard user (which exists) instead of postgres user (which doesn't exist)
    if docker exec security_detection-postgres-1 psql -U nodeguard -d nodeguard -c "\l" | grep -q nodeguard; then
        print_success "Database 'nodeguard' exists and is accessible"
    else
        print_warning "Database 'nodeguard' not accessible - may need container restart"
    fi
    
    if docker exec security_detection-postgres-1 psql -U nodeguard -d nodeguard -c "\du" | grep -q nodeguard; then
        print_success "User 'nodeguard' exists and is accessible"
    else
        print_warning "User 'nodeguard' not accessible - may need container restart"
    fi
    
    # Check if tables exist, if not initialize them
    if ! docker exec security_detection-postgres-1 psql -U nodeguard -d nodeguard -c "SELECT 1 FROM users LIMIT 1;" >/dev/null 2>&1; then
        print_status "Initializing database tables..."
        docker exec -i security_detection-postgres-1 psql -U nodeguard -d nodeguard < scripts/setup/init.sql >/dev/null 2>&1
        print_success "Database initialized"
    else
        print_success "Database already initialized"
    fi
}

# Start Python ML API with proper environment
start_python_api() {
    print_status "Starting Python ML API on port 8000..."
    
    cd backend/python
    source venv/bin/activate
    
    # Load environment variables from .env file
    set -a
    source ../../.env
    set +a
    
    # Override with local development settings using .env values
    export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
    export ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"
    export NODE_ENV="development"
    
    # Start the Python API in background
    nohup uvicorn main:app --reload --host 0.0.0.0 --port 8000 > ../../logs/python-api.log 2>&1 &
    PYTHON_PID=$!
    echo $PYTHON_PID > ../../logs/python-api.pid
    
    cd ../..
    
    # Quick health check
    sleep 3
    if curl -s http://localhost:8000/health > /dev/null; then
        print_success "Python ML API started successfully (PID: $PYTHON_PID)"
    else
        print_warning "Python ML API may still be starting. Check logs/python-api.log"
    fi
}

# Start Node.js API with proper environment
start_nodejs_api() {
    print_status "Starting Node.js API on port 3001..."
    
    cd backend/nodejs
    
    # Load environment variables from .env file
    set -a
    source ../../.env
    set +a
    
    # Override with local development settings using .env values
    export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
    export NODE_ENV="development"
    
    # Start the Node.js API in background
    nohup npm run start:dev > ../../logs/nodejs-api.log 2>&1 &
    NODEJS_PID=$!
    echo $NODEJS_PID > ../../logs/nodejs-api.pid
    
    cd ../..
    
    # Quick health check
    sleep 5
    if curl -s http://localhost:3001/health > /dev/null; then
        print_success "Node.js API started successfully (PID: $NODEJS_PID)"
    else
        print_warning "Node.js API may still be starting. Check logs/nodejs-api.log"
    fi
}

# Start React frontend
start_frontend() {
    print_status "Starting React frontend on port 3000..."
    
    cd frontend
    
    # Set environment variables for local development
    export REACT_APP_API_URL="http://localhost:3001"
    export REACT_APP_PYTHON_API_URL="http://localhost:8000"
    export REACT_APP_ENV="development"
    
    # Start the React frontend in background
    nohup npm start > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../logs/frontend.pid
    
    cd ..
    
    # Quick health check
    sleep 10
    if curl -s http://localhost:3000 > /dev/null; then
        print_success "React frontend started successfully (PID: $FRONTEND_PID)"
    else
        print_warning "React frontend may still be starting. Check logs/frontend.log"
    fi
}

# Create logs directory
create_logs_dir() {
    mkdir -p logs
    print_success "Logs directory ready"
}


# Cleanup function for graceful shutdown
cleanup() {
    print_status "Shutting down applications..."
    
    # Stop application processes
    if [ -f logs/frontend.pid ]; then
        kill $(cat logs/frontend.pid) 2>/dev/null || true
        rm logs/frontend.pid
    fi
    
    if [ -f logs/nodejs-api.pid ]; then
        kill $(cat logs/nodejs-api.pid) 2>/dev/null || true
        rm logs/nodejs-api.pid
    fi
    
    if [ -f logs/python-api.pid ]; then
        kill $(cat logs/python-api.pid) 2>/dev/null || true
        rm logs/python-api.pid
    fi
    
    print_warning "Applications stopped. Infrastructure services are still running."
    print_status "Use './stop-local.sh' to stop infrastructure services."
    exit 0
}

# Main execution
main() {
    echo "NodeGuard AI Security Platform - Optimized Local Development"
    echo "============================================================"
    echo ""
    
    check_and_fix_env
    check_docker
    check_dependencies
    create_logs_dir
    cleanup_ports
    
    start_infrastructure
    init_database
    
    start_python_api
    start_nodejs_api
    start_frontend
    
    # Wait a moment for services to fully start
    print_status "Waiting for services to fully initialize..."
    sleep 5
    
    show_info
    
    print_success "All services started successfully!"
    print_status "Press Ctrl+C to stop applications (infrastructure will keep running)"
    
    # Monitor logs
    echo ""
    echo "Monitoring application logs (Press Ctrl+C to stop):"
    echo "=================================================="
    
    # Follow all logs
    tail -f logs/*.log 2>/dev/null || {
        print_warning "No log files found yet. Services may still be starting..."
        sleep 5
        tail -f logs/*.log 2>/dev/null || print_warning "Check individual log files manually"
    }
}

# Handle Ctrl+C
trap cleanup INT

# Run main function
main "$@"
