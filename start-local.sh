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

# Start infrastructure services with optimized Docker setup
start_infrastructure() {
    print_status "Starting infrastructure services with Docker (using local PostgreSQL)..."
    
    # Create optimized docker-compose for local development (without PostgreSQL)
    cat > docker-compose.local.yml << EOF
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 3

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"
    volumes:
      - zookeeper_data:/var/lib/zookeeper/data

  kafka:
    image: confluentinc/cp-kafka:latest
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: true
    volumes:
      - kafka_data:/var/lib/kafka/data

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./infrastructure/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3002:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=NodeGuard2025!Grafana
    volumes:
      - grafana_data:/var/lib/grafana
      - ./infrastructure/monitoring/grafana/datasources:/etc/grafana/provisioning/datasources

volumes:
  redis_data:
  elasticsearch_data:
  kafka_data:
  zookeeper_data:
  prometheus_data:
  grafana_data:
EOF

    # Start infrastructure services (without PostgreSQL)
    docker-compose -f docker-compose.local.yml up -d --remove-orphans
    
    print_status "Waiting for services to be ready..."
    
    # Check if local PostgreSQL is running
    if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        print_success "Local PostgreSQL is ready"
    else
        print_warning "Local PostgreSQL not detected. Make sure PostgreSQL is running locally."
    fi
    
    # Wait for Redis - optimized wait
    local attempt=0
    while [ $attempt -lt 10 ]; do
        if redis-cli -h localhost -p 6379 ping >/dev/null 2>&1; then
            print_success "Redis is ready"
            break
        fi
        print_status "Waiting for Redis... ($attempt/10)"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    # Give other services time to start (non-blocking)
    print_status "Allowing other services to start..."
    sleep 5
    
    print_success "Infrastructure services started"
}

# Setup local PostgreSQL database
setup_local_postgres() {
    print_status "Setting up local PostgreSQL database..."
    
    # Check if PostgreSQL is running
    if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        print_error "PostgreSQL is not running. Please start PostgreSQL first."
        print_status "On macOS with Homebrew: brew services start postgresql"
        exit 1
    fi
    
    # Create nodeguard user if it doesn't exist
    if ! psql -h localhost -p 5432 -U postgres -c "SELECT 1 FROM pg_user WHERE usename = 'nodeguard';" | grep -q 1; then
        print_status "Creating nodeguard user..."
        psql -h localhost -p 5432 -U postgres -c "CREATE USER nodeguard WITH PASSWORD 'NodeGuard2025!DB';"
        psql -h localhost -p 5432 -U postgres -c "ALTER USER nodeguard CREATEDB;"
        print_success "User 'nodeguard' created"
    else
        print_success "User 'nodeguard' already exists"
    fi
    
    # Create nodeguard database if it doesn't exist
    if ! psql -h localhost -p 5432 -U postgres -l | grep -q nodeguard; then
        print_status "Creating nodeguard database..."
        psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE nodeguard OWNER nodeguard;"
        print_success "Database 'nodeguard' created"
    else
        print_success "Database 'nodeguard' already exists"
    fi
    
    # Grant permissions
    psql -h localhost -p 5432 -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE nodeguard TO nodeguard;"
}

# Initialize database if needed
init_database() {
    print_status "Checking database initialization..."
    
    # Simple check - just verify we can connect and initialize if needed
    if PGPASSWORD=NodeGuard2025!DB psql -h localhost -p 5432 -U nodeguard -d nodeguard -c "SELECT 1;" >/dev/null 2>&1; then
        print_success "Database connection established"
        
        # Check if tables exist, if not initialize them
        if ! PGPASSWORD=NodeGuard2025!DB psql -h localhost -p 5432 -U nodeguard -d nodeguard -c "SELECT 1 FROM users LIMIT 1;" >/dev/null 2>&1; then
            print_status "Initializing database tables..."
            PGPASSWORD=NodeGuard2025!DB psql -h localhost -p 5432 -U nodeguard -d nodeguard -f scripts/setup/init.sql >/dev/null 2>&1
            print_success "Database initialized"
        else
            print_success "Database already initialized"
        fi
    else
        print_warning "Cannot connect to database. Will try to set it up..."
        setup_local_postgres
        init_database  # Retry after setup
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
    
    # Override with local development settings
    export DATABASE_URL="postgresql://nodeguard:NodeGuard2025!DB@localhost:5432/nodeguard"
    export POSTGRES_HOST="localhost"
    export POSTGRES_PORT="5432"
    export POSTGRES_USER="nodeguard"
    export POSTGRES_PASSWORD="NodeGuard2025!DB"
    export POSTGRES_DB="nodeguard"
    export REDIS_URL="redis://localhost:6379"
    export ELASTICSEARCH_URL="http://localhost:9200"
    export KAFKA_BOOTSTRAP_SERVERS="localhost:9092"
    export ALLOWED_ORIGINS='["http://localhost:3000", "http://localhost:3001"]'
    export OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-dummy_key_for_local_dev}"
    export JWT_SECRET="${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}"
    export ENCRYPTION_KEY="${ENCRYPTION_KEY:-your-32-character-encryption-key-here}"
    
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
    
    # Set environment variables for local development
    export DATABASE_URL="postgresql://nodeguard:NodeGuard2025!DB@localhost:5432/nodeguard"
    export POSTGRES_HOST="localhost"
    export POSTGRES_PORT="5432"
    export POSTGRES_USER="nodeguard"
    export POSTGRES_PASSWORD="NodeGuard2025!DB"
    export POSTGRES_DB="nodeguard"
    export REDIS_URL="redis://localhost:6379"
    export JWT_SECRET="your-super-secret-jwt-key-change-in-production"
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

# Display service information
show_info() {
    echo ""
    echo "=================================================="
    echo -e "${GREEN}NodeGuard AI Security Platform - Ready!${NC}"
    echo "=================================================="
    echo ""
    echo "🌐 Application URLs:"
    echo "   Frontend:           http://localhost:3000"
    echo "   Node.js API:        http://localhost:3001"
    echo "   Python ML API:      http://localhost:8000"
    echo "   API Documentation:  http://localhost:8000/docs"
    echo ""
    echo "🔧 Infrastructure Services:"
    echo "   PostgreSQL:         localhost:5432 (nodeguard/NodeGuard2025!DB)"
    echo "   Redis:              localhost:6379"
    echo "   Elasticsearch:      http://localhost:9200"
    echo "   Kafka:              localhost:9092"
    echo "   Prometheus:         http://localhost:9090"
    echo "   Grafana:            http://localhost:3002 (admin/NodeGuard2025!Grafana)"
    echo ""
    echo "📝 Logs:"
    echo "   Frontend:           tail -f logs/frontend.log"
    echo "   Node.js API:        tail -f logs/nodejs-api.log"
    echo "   Python ML API:      tail -f logs/python-api.log"
    echo "   Infrastructure:     docker-compose -f docker-compose.local.yml logs -f"
    echo ""
    echo "🔧 Management:"
    echo "   Stop all services:  ./stop-local.sh"
    echo "   View processes:     ps aux | grep -E '(uvicorn|npm|node)'"
    echo "   Docker services:    docker-compose -f docker-compose.local.yml ps"
    echo ""
    echo "✅ All Features Available:"
    echo "   - Complete database with PostgreSQL"
    echo "   - Redis caching and session management"
    echo "   - Elasticsearch for advanced search"
    echo "   - Kafka for real-time messaging"
    echo "   - Prometheus monitoring"
    echo "   - Grafana dashboards"
    echo "   - AI/ML security analysis"
    echo "   - Compliance reporting"
    echo "   - Incident management"
    echo "   - Threat intelligence"
    echo "   - Workflow automation"
    echo ""
    echo "=================================================="
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
