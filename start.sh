#!/bin/bash

# NodeGuard AI Security Platform - Fully Local (No Docker)
# Uses locally installed PostgreSQL and Redis via Homebrew

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Ports
PYTHON_PORT=8010
NODEJS_PORT=3011
FRONTEND_PORT=3010

# Database config
DB_HOST=localhost
DB_PORT=5432
DB_USER=nodeguard
DB_PASS="NodeGuard2025!SecureDB"
DB_NAME=nodeguard

# Check prerequisites
check_prerequisites() {
    echo "NodeGuard AI Security Platform - Local Development (No Docker)"
    echo "=============================================================="
    echo ""

    # Check PostgreSQL
    if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        print_success "PostgreSQL is running on localhost:5432"
    else
        print_error "PostgreSQL is not running. Start it with: brew services start postgresql@14"
        exit 1
    fi

    # Check Redis
    if redis-cli ping >/dev/null 2>&1; then
        print_success "Redis is running on localhost:6379"
    else
        print_warning "Redis is not running. Starting Redis..."
        brew services start redis 2>/dev/null || redis-server --daemonize yes 2>/dev/null || true
        sleep 1
        if redis-cli ping >/dev/null 2>&1; then
            print_success "Redis started successfully"
        else
            print_warning "Redis could not be started. App will work without caching."
        fi
    fi

    # Check Python venv
    if [ ! -d "backend/python/venv" ]; then
        print_error "Python venv not found. Run: cd backend/python && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
        exit 1
    fi
    print_success "Python virtual environment found"

    # Check Node.js deps
    if [ ! -d "frontend/node_modules" ] || [ ! -d "backend/nodejs/node_modules" ]; then
        print_error "Node.js dependencies not found. Run: cd frontend && npm install && cd ../backend/nodejs && npm install"
        exit 1
    fi
    print_success "Node.js dependencies found"
}

# Check database setup
check_database() {
    print_status "Checking database..."

    # Test connection
    if psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -c "SELECT 1;" >/dev/null 2>&1; then
        print_success "Database '$DB_NAME' is accessible"
    else
        print_error "Cannot connect to database '$DB_NAME' as user '$DB_USER'"
        print_status "Try: psql -U $(whoami) -d postgres -c \"CREATE USER nodeguard WITH PASSWORD 'NodeGuard2025!SecureDB'; CREATE DATABASE nodeguard OWNER nodeguard;\""
        exit 1
    fi

    # Check if security schema tables exist
    TABLE_COUNT=$(psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -t -c "SELECT count(*) FROM pg_tables WHERE schemaname='security';" 2>/dev/null | tr -d ' ')
    if [ "$TABLE_COUNT" -gt 10 ]; then
        print_success "Security schema has $TABLE_COUNT tables"
    else
        print_warning "Security schema has only $TABLE_COUNT tables. Applying schema..."
        psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -f scripts/setup/init.sql 2>/dev/null || true
        psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -f scripts/setup/siem_threat_hunting_schema.sql 2>/dev/null || true
        psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -f scripts/setup/seed_siem_hunting_data.sql 2>/dev/null || true
        print_success "Schema and seed data applied"
    fi
}

# Clean up ports
cleanup_ports() {
    print_status "Cleaning up ports $FRONTEND_PORT, $NODEJS_PORT, $PYTHON_PORT..."
    for port in $FRONTEND_PORT $NODEJS_PORT $PYTHON_PORT; do
        if lsof -ti:$port >/dev/null 2>&1; then
            lsof -ti:$port | xargs kill -9 2>/dev/null || true
            print_status "Killed process on port $port"
        fi
    done
    print_success "Ports cleaned up"
}

# Start Python API
start_python_api() {
    print_status "Starting Python API on port $PYTHON_PORT..."

    cd backend/python
    source venv/bin/activate

    # Set environment for local PostgreSQL (localhost, not Docker)
    export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    export POSTGRES_HOST="$DB_HOST"
    export POSTGRES_PORT="$DB_PORT"
    export POSTGRES_USER="$DB_USER"
    export POSTGRES_PASSWORD="$DB_PASS"
    export POSTGRES_DB="$DB_NAME"
    export REDIS_URL="redis://localhost:6379"
    export LOCAL_DEV_MODE="true"
    export NODE_ENV="development"
    export ALLOWED_ORIGINS="http://localhost:${FRONTEND_PORT},http://localhost:${NODEJS_PORT}"
    export OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-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}"
    export JWT_SECRET="NodeGuard_JWT_Secret_Key_2025_Very_Secure_Random_String"

    nohup uvicorn main:app --reload --host 0.0.0.0 --port $PYTHON_PORT > ../../logs/python-api.log 2>&1 &
    PYTHON_PID=$!
    echo $PYTHON_PID > ../../logs/python-api.pid

    cd "$PROJECT_DIR"

    sleep 3
    if curl -s http://localhost:$PYTHON_PORT/health > /dev/null 2>&1; then
        print_success "Python API started on port $PYTHON_PORT (PID: $PYTHON_PID)"
    else
        print_warning "Python API still starting... check logs/python-api.log"
    fi
}

# Start Node.js API
start_nodejs_api() {
    print_status "Starting Node.js API on port $NODEJS_PORT..."

    cd backend/nodejs

    export POSTGRES_HOST="$DB_HOST"
    export POSTGRES_PORT="$DB_PORT"
    export POSTGRES_USER="$DB_USER"
    export POSTGRES_PASSWORD="$DB_PASS"
    export POSTGRES_DB="$DB_NAME"
    export DB_HOST="$DB_HOST"
    export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    export NODE_ENV="development"
    export PORT=$NODEJS_PORT
    export JWT_SECRET="NodeGuard_JWT_Secret_Key_2025_Very_Secure_Random_String"
    export REDIS_URL="redis://localhost:6379"

    nohup npm run start:dev > ../../logs/nodejs-api.log 2>&1 &
    NODEJS_PID=$!
    echo $NODEJS_PID > ../../logs/nodejs-api.pid

    cd "$PROJECT_DIR"

    sleep 5
    if curl -s http://localhost:$NODEJS_PORT/health > /dev/null 2>&1; then
        print_success "Node.js API started on port $NODEJS_PORT (PID: $NODEJS_PID)"
    else
        print_warning "Node.js API still starting... check logs/nodejs-api.log"
    fi
}

# Start React frontend
start_frontend() {
    print_status "Starting React frontend on port $FRONTEND_PORT..."

    cd frontend

    export REACT_APP_API_URL="http://localhost:${NODEJS_PORT}"
    export REACT_APP_PYTHON_API_URL="http://localhost:${PYTHON_PORT}"
    export REACT_APP_LOCAL_DEV_MODE="true"
    export REACT_APP_ENV="development"
    export PORT=$FRONTEND_PORT

    nohup npm start > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../logs/frontend.pid

    cd "$PROJECT_DIR"

    sleep 8
    if curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
        print_success "React frontend started on port $FRONTEND_PORT (PID: $FRONTEND_PID)"
    else
        print_warning "React frontend still starting... check logs/frontend.log"
    fi
}

# Show status
show_info() {
    echo ""
    echo "=================================================="
    echo -e "${GREEN}NodeGuard AI - Running Locally (No Docker)${NC}"
    echo "=================================================="
    echo ""
    echo "Application URLs:"
    echo "   Frontend:          http://localhost:$FRONTEND_PORT"
    echo "   Node.js API:       http://localhost:$NODEJS_PORT"
    echo "   Python API:        http://localhost:$PYTHON_PORT"
    echo "   API Docs (Swagger):http://localhost:$PYTHON_PORT/docs"
    echo ""
    echo "Infrastructure (local):"
    echo "   PostgreSQL:        localhost:5432 ($DB_USER/$DB_NAME)"
    echo "   Redis:             localhost:6379"
    echo ""
    echo "Logs:"
    echo "   tail -f logs/python-api.log"
    echo "   tail -f logs/nodejs-api.log"
    echo "   tail -f logs/frontend.log"
    echo ""
    echo "Stop all: kill \$(cat logs/*.pid 2>/dev/null) 2>/dev/null"
    echo "=================================================="
}

# Cleanup on Ctrl+C
cleanup() {
    echo ""
    print_status "Shutting down..."
    for pidfile in logs/frontend.pid logs/nodejs-api.pid logs/python-api.pid; do
        if [ -f "$pidfile" ]; then
            kill $(cat "$pidfile") 2>/dev/null || true
            rm "$pidfile"
        fi
    done
    print_success "All services stopped."
    exit 0
}

trap cleanup INT

# Main
main() {
    check_prerequisites
    check_database
    mkdir -p logs
    cleanup_ports

    start_python_api
    start_nodejs_api
    start_frontend

    sleep 3
    show_info

    print_success "All services started! Press Ctrl+C to stop."
    echo ""
    echo "Monitoring logs (Ctrl+C to stop):"
    echo "=================================================="
    tail -f logs/*.log 2>/dev/null || {
        sleep 5
        tail -f logs/*.log 2>/dev/null
    }
}

main "$@"
