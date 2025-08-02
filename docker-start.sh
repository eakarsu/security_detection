#!/bin/bash

# NodeGuard AI Security Platform - Docker Infrastructure Startup
# This script starts all infrastructure services using Docker Compose

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

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop and try again."
        exit 1
    fi
    print_success "Docker is running"
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
    else
        print_success "OpenRouter API key is configured"
    fi
}

# Pull latest images
pull_images() {
    print_status "Pulling latest Docker images..."
    docker compose pull
    print_success "Images pulled successfully"
}

# Start infrastructure services
start_infrastructure() {
    print_status "Starting infrastructure services..."
    
    # Start databases first
    print_status "Starting databases (PostgreSQL, Redis, Elasticsearch)..."
    docker compose up -d postgres redis elasticsearch
    
    # Wait for databases to be ready
    print_status "Waiting for databases to be ready..."
    sleep 10
    
    # Start message queue
    print_status "Starting message queue (Kafka)..."
    docker compose up -d zookeeper kafka
    
    # Wait for Kafka to be ready
    print_status "Waiting for Kafka to be ready..."
    sleep 15
    
    # Start monitoring
    print_status "Starting monitoring (Prometheus, Grafana)..."
    docker compose up -d prometheus grafana
    
    print_success "Infrastructure services started"
}

# Start application services
start_applications() {
    print_status "Starting application services..."
    
    # Start backend services
    print_status "Starting Python ML API..."
    docker compose up -d python-api
    
    print_status "Starting Node.js API..."
    docker compose up -d nodejs-api
    
    # Start frontend
    print_status "Starting React frontend..."
    docker compose up -d frontend
    
    print_success "Application services started"
}

# Check service health
check_services() {
    print_status "Checking service health..."
    
    # Wait a bit for services to start
    sleep 10
    
    # Check each service
    services=("postgres" "redis" "elasticsearch" "kafka" "prometheus" "grafana" "python-api" "nodejs-api" "frontend")
    
    for service in "${services[@]}"; do
        if docker compose ps | grep -q "$service.*Up"; then
            print_success "$service is running"
        else
            print_warning "$service may not be running properly"
        fi
    done
}

# Display service URLs
show_urls() {
    echo ""
    echo "=================================================="
    echo -e "${GREEN}NodeGuard AI Security Platform${NC}"
    echo "=================================================="
    echo ""
    echo "🌐 Application URLs:"
    echo "   Frontend:           http://localhost:3000"
    echo "   Node.js API:        http://localhost:3001"
    echo "   Python ML API:      http://localhost:8000"
    echo "   API Documentation:  http://localhost:8000/docs"
    echo ""
    echo "📊 Infrastructure URLs:"
    echo "   Grafana:           http://localhost:3002"
    echo "   Prometheus:        http://localhost:9090"
    echo "   Elasticsearch:     http://localhost:9200"
    echo ""
    echo "🔐 Default Credentials:"
    echo "   Grafana:           admin / NodeGuard2025!Grafana"
    echo "   Database:          nodeguard / NodeGuard2025!SecureDB"
    echo ""
    echo "📝 Logs:"
    echo "   View all logs:     docker compose logs -f"
    echo "   View service logs: docker compose logs -f <service-name>"
    echo ""
    echo "🛑 Stop services:     docker compose down"
    echo "=================================================="
}

# Main execution
main() {
    echo "Starting NodeGuard AI Security Platform..."
    echo "=================================================="
    
    check_docker
    check_env
    check_api_key
    
    # Ask user if they want to pull latest images
    read -p "Pull latest Docker images? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pull_images
    fi
    
    start_infrastructure
    start_applications
    check_services
    show_urls
    
    print_success "NodeGuard AI Security Platform is now running!"
    print_status "Press Ctrl+C to view logs, or run 'docker compose down' to stop all services"
    
    # Follow logs
    docker compose logs -f
}

# Handle Ctrl+C
trap 'echo -e "\n${YELLOW}Stopping log output...${NC}\nServices are still running. Use ${BLUE}docker compose down${NC} to stop them."; exit 0' INT

# Run main function
main "$@"
