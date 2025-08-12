#!/bin/bash

# NodeGuard AI Security Platform - Hosting Deployment Script
# 
# ARCHITECTURE OVERVIEW:
# This script deploys the complete platform using Docker containers for hosting:
# - All services run in Docker containers (production-ready)
# - Uses the nodeguard-platform:latest container with Frontend, Node.js API, and Python API
# - Full infrastructure stack: PostgreSQL, Redis, Elasticsearch, Kafka
#
# COMPARISON WITH OTHER SCRIPTS:
# - start-local.sh: Development mode (infrastructure in Docker + apps as local processes)
# - deploy-hosting.sh: Production hosting (everything containerized)

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

# Check if .env.security exists, create from template if needed
check_and_setup_production_env() {
    if [ ! -f .env.security ]; then
        print_warning ".env.security file not found"
        if [ -f .env.example ]; then
            print_status "Creating .env.security from template..."
            cp .env.example .env.security
            print_success ".env.security created"
        else
            print_error ".env.example template not found. Please create .env.security manually."
            exit 1
        fi
    else
        print_success ".env.security file found"
    fi
    
    # Check for critical production variables
    local missing_vars=()
    
    if ! grep -q "POSTGRES_PASSWORD=" .env.security || grep -q "your_postgres_password_here" .env.security; then
        missing_vars+=("POSTGRES_PASSWORD")
    fi
    
    if ! grep -q "JWT_SECRET=" .env.security || grep -q "your-super-secret-jwt-key" .env.security; then
        missing_vars+=("JWT_SECRET")
    fi
    
    if ! grep -q "ENCRYPTION_KEY=" .env.security; then
        missing_vars+=("ENCRYPTION_KEY")
    fi
    
    if ! grep -q "ELASTICSEARCH_PASSWORD=" .env.security; then
        missing_vars+=("ELASTICSEARCH_PASSWORD")
    fi
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_error "Critical production variables missing in .env.security:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        print_error "Please set these variables before deployment"
        exit 1
    fi
    
    print_success "Production environment variables validated"
}

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker."
        exit 1
    fi
    print_success "Docker is running"
}

# Check if docker-compose is available
check_docker_compose() {
    if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
        print_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
    print_success "Docker Compose is available"
}

# Pull the latest nodeguard-platform image
pull_latest_image() {
    print_status "Pulling latest nodeguard-platform image..."
    docker pull eakarsun4/nodeguard-security-platform:latest
    print_success "Latest image pulled successfully"
}

# Stop existing containers if any
stop_existing_containers() {
    print_status "Stopping any existing containers..."
    docker-compose -f docker-compose.prod.yml --env-file .env.security down 2>/dev/null || true
    print_success "Existing containers stopped"
}

# Clean up dangling images and containers
cleanup_docker() {
    print_status "Cleaning up unused Docker resources..."
    docker system prune -f >/dev/null 2>&1 || true
    print_success "Docker cleanup completed"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    mkdir -p logs data/workflows
    print_success "Directories created"
}

# Deploy the platform using docker-compose
deploy_platform() {
    print_status "Deploying NodeGuard Security Platform..."
    print_status "Using docker-compose.prod.yml with .env.security"
    
    # Start all services
    docker-compose -f docker-compose.prod.yml --env-file .env.security up -d
    
    print_success "Platform deployment initiated"
}

# Wait for services to be healthy
wait_for_services() {
    print_status "Waiting for services to become healthy..."
    
    local max_attempts=60  # 5 minutes maximum
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        local healthy_services=0
        local total_services=0
        
        # Check service health
        for service in postgres redis elasticsearch kafka nodeguard-platform; do
            total_services=$((total_services + 1))
            if docker-compose -f docker-compose.prod.yml --env-file .env.security ps -q $service | xargs docker inspect --format='{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; then
                healthy_services=$((healthy_services + 1))
            fi
        done
        
        if [ $healthy_services -eq $total_services ]; then
            print_success "All services are healthy!"
            return 0
        fi
        
        print_status "Waiting for services... ($healthy_services/$total_services healthy) - Attempt $((attempt + 1))/$max_attempts"
        sleep 5
        attempt=$((attempt + 1))
    done
    
    print_warning "Some services may not be fully healthy yet. Check logs if issues occur."
}

# Test deployment endpoints
test_deployment() {
    print_status "Testing deployment endpoints..."
    
    # Load environment variables
    source .env.security
    
    local frontend_port=${FRONTEND_PORT:-3002}
    local nodejs_api_port=${NODEJS_API_PORT:-3003}  
    local python_api_port=${PYTHON_API_PORT:-8001}
    
    # Test endpoints with retries
    local endpoints=(
        "http://localhost:$frontend_port:Frontend"
        "http://localhost:$nodejs_api_port/health:Node.js API"
        "http://localhost:$python_api_port/health:Python API"
    )
    
    for endpoint_info in "${endpoints[@]}"; do
        local endpoint=$(echo $endpoint_info | cut -d: -f1-2)
        local service=$(echo $endpoint_info | cut -d: -f3)
        
        local attempt=0
        while [ $attempt -lt 12 ]; do  # 1 minute total
            if curl -s -f "$endpoint" >/dev/null 2>&1; then
                print_success "$service is responding"
                break
            fi
            
            if [ $attempt -eq 11 ]; then
                print_warning "$service is not responding yet. Check logs: docker-compose -f docker-compose.prod.yml --env-file .env.security logs nodeguard-platform"
            else
                print_status "Waiting for $service... ($((attempt + 1))/12)"
                sleep 5
            fi
            attempt=$((attempt + 1))
        done
    done
}

# Show deployment status and information
show_deployment_info() {
    source .env.security
    
    echo ""
    echo "======================================================="
    echo -e "${GREEN}NodeGuard AI Security Platform - Hosting Deployment${NC}"
    echo "======================================================="
    echo ""
    
    print_success "Platform deployed successfully!"
    
    echo ""
    echo "🌐 Application URLs:"
    echo "   Frontend:           http://localhost:${FRONTEND_PORT:-3002}"
    echo "   Node.js API:        http://localhost:${NODEJS_API_PORT:-3003}"
    echo "   Python ML API:      http://localhost:${PYTHON_API_PORT:-8001}"
    echo "   API Documentation:  http://localhost:${PYTHON_API_PORT:-8001}/docs"
    echo ""
    echo "🐳 Container Status:"
    docker-compose -f docker-compose.prod.yml --env-file .env.security ps
    echo ""
    echo "🔧 Infrastructure Services:"
    echo "   PostgreSQL:         localhost:${POSTGRES_PORT:-5432}"
    echo "   Redis:              localhost:${REDIS_PORT:-6379}"
    echo "   Elasticsearch:      localhost:${ELASTICSEARCH_PORT:-9200}"
    echo "   Kafka:              localhost:${KAFKA_PORT:-9092}"
    echo ""
    echo "📝 Logs and Monitoring:"
    echo "   View all logs:      docker-compose -f docker-compose.prod.yml --env-file .env.security logs -f"
    echo "   Platform logs:      docker-compose -f docker-compose.prod.yml --env-file .env.security logs -f nodeguard-platform"
    echo "   Database logs:      docker-compose -f docker-compose.prod.yml --env-file .env.security logs -f postgres"
    echo "   Container stats:    docker stats"
    echo ""
    echo "🔧 Management Commands:"
    echo "   Stop platform:      docker-compose -f docker-compose.prod.yml --env-file .env.security down"
    echo "   Restart platform:   docker-compose -f docker-compose.prod.yml --env-file .env.security restart"
    echo "   Update platform:    docker-compose -f docker-compose.prod.yml --env-file .env.security pull && docker-compose -f docker-compose.prod.yml --env-file .env.security up -d"
    echo "   Shell access:       docker-compose -f docker-compose.prod.yml --env-file .env.security exec nodeguard-platform bash"
    echo ""
    echo "✅ Production Features Enabled:"
    echo "   - Complete containerized deployment"
    echo "   - Full infrastructure stack (PostgreSQL, Redis, Elasticsearch, Kafka)"
    echo "   - AI/ML security analysis with OpenRouter integration"
    echo "   - Real-time event processing with Kafka"
    echo "   - Advanced search and analytics with Elasticsearch" 
    echo "   - High-performance caching with Redis"
    echo "   - Automated health checks and restarts"
    echo "   - Resource limits and monitoring"
    echo ""
    echo "🔒 Security Notes:"
    echo "   - All services run in isolated Docker network"
    echo "   - Database and Redis are not exposed externally by default"
    echo "   - JWT authentication and encryption enabled"
    echo "   - Production environment variables are used"
    echo ""
    echo "======================================================="
}

# Main deployment function
main() {
    echo "NodeGuard AI Security Platform - Hosting Deployment"
    echo "===================================================="
    echo ""
    
    check_docker
    check_docker_compose
    check_and_setup_production_env
    create_directories
    
    pull_latest_image
    stop_existing_containers
    cleanup_docker
    
    deploy_platform
    wait_for_services
    test_deployment
    
    show_deployment_info
    
    print_success "Hosting deployment completed successfully!"
    print_status "Monitor logs with: docker-compose -f docker-compose.prod.yml --env-file .env.security logs -f"
}

# Run main function
main "$@"