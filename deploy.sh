#!/bin/bash

# Security Detection Platform Deployment Script
# This script helps deploy the security detection platform using Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE} Security Detection Platform Deployment${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Check if Docker is installed and running
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
}

# Check environment file
check_env() {
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from template..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_warning "Please edit .env file with your configuration before running again."
            exit 1
        else
            print_error ".env.example not found. Cannot create environment file."
            exit 1
        fi
    fi
}

# Validate required environment variables
validate_env() {
    print_status "Validating environment configuration..."
    
    required_vars=(
        "POSTGRES_PASSWORD"
        "ELASTICSEARCH_PASSWORD"
        "JWT_SECRET"
        "ENCRYPTION_KEY"
        "GRAFANA_PASSWORD"
    )
    
    source .env
    
    missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    mkdir -p logs data/workflows models
}

# Stop existing containers
stop_containers() {
    print_status "Stopping existing containers..."
    docker-compose -f docker-compose.prod.yml down --remove-orphans || true
}

# Pull latest images
pull_images() {
    print_status "Pulling latest Docker images..."
    docker-compose -f docker-compose.prod.yml pull
}

# Build application images
build_images() {
    print_status "Building application images..."
    docker-compose -f docker-compose.prod.yml build --no-cache
}

# Start services
start_services() {
    print_status "Starting services..."
    docker-compose -f docker-compose.prod.yml up -d
}

# Wait for services to be healthy
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    services=(
        "postgres:5432"
        "redis:6379" 
        "elasticsearch:9200"
        "kafka:9092"
    )
    
    for service in "${services[@]}"; do
        IFS=':' read -ra ADDR <<< "$service"
        service_name=${ADDR[0]}
        port=${ADDR[1]}
        
        print_status "Waiting for $service_name..."
        timeout=60
        while ! docker-compose -f docker-compose.prod.yml exec -T $service_name sh -c "nc -z localhost $port" &> /dev/null; do
            sleep 2
            timeout=$((timeout-2))
            if [ $timeout -le 0 ]; then
                print_error "Timeout waiting for $service_name"
                exit 1
            fi
        done
    done
}

# Show service status
show_status() {
    print_status "Service Status:"
    docker-compose -f docker-compose.prod.yml ps
    
    echo
    print_status "Service URLs:"
    source .env
    echo "  Frontend:    http://localhost:${FRONTEND_PORT:-3000}"
    echo "  Node.js API: http://localhost:${NODEJS_API_PORT:-3001}"
    echo "  Python API:  http://localhost:${PYTHON_API_PORT:-8000}"
    echo "  Grafana:     http://localhost:${GRAFANA_PORT:-3002}"
    echo "  Prometheus:  http://localhost:${PROMETHEUS_PORT:-9090}"
    echo
}

# Health check
health_check() {
    print_status "Running health checks..."
    
    source .env
    
    # Check API endpoints
    apis=(
        "http://localhost:${PYTHON_API_PORT:-8000}/health"
        "http://localhost:${NODEJS_API_PORT:-3001}/health"
        "http://localhost:${FRONTEND_PORT:-3000}"
    )
    
    for api in "${apis[@]}"; do
        if curl -f -s "$api" > /dev/null; then
            print_status "✓ $api is healthy"
        else
            print_warning "✗ $api is not responding"
        fi
    done
}

# Main deployment function
deploy() {
    print_header
    
    check_docker
    check_env
    validate_env
    create_directories
    stop_containers
    pull_images
    build_images
    start_services
    wait_for_services
    show_status
    
    print_status "Deployment completed successfully!"
    print_status "Run './deploy.sh health' to check service health"
}

# Parse command line arguments
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "stop")
        print_status "Stopping all services..."
        docker-compose -f docker-compose.prod.yml down
        ;;
    "restart")
        print_status "Restarting services..."
        docker-compose -f docker-compose.prod.yml restart
        ;;
    "logs")
        docker-compose -f docker-compose.prod.yml logs -f "${2:-}"
        ;;
    "status")
        show_status
        ;;
    "health")
        health_check
        ;;
    "clean")
        print_warning "This will remove all containers, images, and volumes!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose -f docker-compose.prod.yml down -v --rmi all --remove-orphans
            docker system prune -af
        fi
        ;;
    *)
        echo "Usage: $0 {deploy|stop|restart|logs [service]|status|health|clean}"
        echo
        echo "Commands:"
        echo "  deploy   - Deploy the entire stack (default)"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services" 
        echo "  logs     - View logs (optionally for specific service)"
        echo "  status   - Show service status and URLs"
        echo "  health   - Run health checks"
        echo "  clean    - Remove everything (DESTRUCTIVE)"
        exit 1
        ;;
esac