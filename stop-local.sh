#!/bin/bash

# NodeGuard AI Security Platform - Stop Local Development
# This script stops both applications and infrastructure services

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

# Stop application processes
stop_applications() {
    print_status "Stopping application processes..."
    
    # Stop frontend
    if [ -f logs/frontend.pid ]; then
        local frontend_pid=$(cat logs/frontend.pid)
        if kill -0 $frontend_pid 2>/dev/null; then
            kill $frontend_pid 2>/dev/null || true
            print_success "Frontend stopped (PID: $frontend_pid)"
        else
            print_warning "Frontend process not running"
        fi
        rm logs/frontend.pid
    else
        print_warning "Frontend PID file not found"
    fi
    
    # Stop Node.js API
    if [ -f logs/nodejs-api.pid ]; then
        local nodejs_pid=$(cat logs/nodejs-api.pid)
        if kill -0 $nodejs_pid 2>/dev/null; then
            kill $nodejs_pid 2>/dev/null || true
            print_success "Node.js API stopped (PID: $nodejs_pid)"
        else
            print_warning "Node.js API process not running"
        fi
        rm logs/nodejs-api.pid
    else
        print_warning "Node.js API PID file not found"
    fi
    
    # Stop Python API
    if [ -f logs/python-api.pid ]; then
        local python_pid=$(cat logs/python-api.pid)
        if kill -0 $python_pid 2>/dev/null; then
            kill $python_pid 2>/dev/null || true
            print_success "Python ML API stopped (PID: $python_pid)"
        else
            print_warning "Python ML API process not running"
        fi
        rm logs/python-api.pid
    else
        print_warning "Python ML API PID file not found"
    fi
    
    # Kill any remaining processes on our ports
    print_status "Cleaning up any remaining processes on ports 3000, 3001, 8000..."
    
    # Kill processes on port 3000 (React frontend)
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    
    # Kill processes on port 3001 (Node.js API)
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    
    # Kill processes on port 8000 (Python API)
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    
    print_success "Application processes stopped"
}

# Stop infrastructure services
stop_infrastructure() {
    print_status "Stopping infrastructure services..."
    
    if [ -f docker-compose.local.yml ]; then
        # Stop and remove containers
        docker-compose -f docker-compose.local.yml down
        
        # Remove the temporary compose file
        rm docker-compose.local.yml
        
        print_success "Infrastructure services stopped"
    else
        print_warning "docker-compose.local.yml not found. Infrastructure may not be running."
    fi
}

# Clean up Docker volumes (optional)
cleanup_volumes() {
    if [ "$1" = "--clean-volumes" ] || [ "$1" = "-v" ]; then
        print_status "Cleaning up Docker volumes..."
        
        # List of volumes to remove
        local volumes=(
            "security_detection_postgres_data"
            "security_detection_redis_data"
            "security_detection_elasticsearch_data"
            "security_detection_kafka_data"
            "security_detection_zookeeper_data"
            "security_detection_zookeeper_logs"
            "security_detection_prometheus_data"
            "security_detection_grafana_data"
        )
        
        for volume in "${volumes[@]}"; do
            if docker volume ls -q | grep -q "^${volume}$"; then
                docker volume rm "$volume" 2>/dev/null || true
                print_success "Removed volume: $volume"
            fi
        done
        
        # Remove any orphaned volumes
        docker volume prune -f >/dev/null 2>&1 || true
        
        print_success "Docker volumes cleaned up"
    fi
}

# Show remaining processes
show_remaining_processes() {
    print_status "Checking for remaining processes..."
    
    local remaining_processes=$(ps aux | grep -E '(uvicorn|npm|node)' | grep -v grep | grep -v stop-local.sh || true)
    
    if [ -n "$remaining_processes" ]; then
        print_warning "Some processes may still be running:"
        echo "$remaining_processes"
        echo ""
        print_status "You can manually kill them with: kill -9 <PID>"
    else
        print_success "No remaining application processes found"
    fi
}

# Show Docker status
show_docker_status() {
    print_status "Docker container status:"
    
    local running_containers=$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(postgres|redis|elasticsearch|kafka|zookeeper|prometheus|grafana)" || true)
    
    if [ -n "$running_containers" ]; then
        echo "$running_containers"
        print_warning "Some infrastructure containers are still running"
        print_status "Use 'docker ps' to see all containers"
        print_status "Use 'docker stop <container_name>' to stop individual containers"
    else
        print_success "No infrastructure containers running"
    fi
}

# Display help
show_help() {
    echo "NodeGuard AI Security Platform - Stop Local Development"
    echo "======================================================="
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --help, -h           Show this help message"
    echo "  --clean-volumes, -v  Also remove Docker volumes (WARNING: This will delete all data!)"
    echo "  --apps-only, -a      Stop only applications, keep infrastructure running"
    echo "  --infra-only, -i     Stop only infrastructure, keep applications running"
    echo ""
    echo "Examples:"
    echo "  $0                   Stop all services"
    echo "  $0 --apps-only       Stop only applications"
    echo "  $0 --clean-volumes   Stop all services and remove data volumes"
    echo ""
}

# Main execution
main() {
    case "$1" in
        --help|-h)
            show_help
            exit 0
            ;;
        --apps-only|-a)
            echo "Stopping NodeGuard AI Security Platform Applications..."
            echo "======================================================"
            stop_applications
            show_remaining_processes
            print_success "Applications stopped. Infrastructure services are still running."
            ;;
        --infra-only|-i)
            echo "Stopping NodeGuard AI Security Platform Infrastructure..."
            echo "========================================================"
            stop_infrastructure
            cleanup_volumes "$1"
            show_docker_status
            print_success "Infrastructure stopped. Applications may still be running."
            ;;
        *)
            echo "Stopping NodeGuard AI Security Platform..."
            echo "=========================================="
            stop_applications
            stop_infrastructure
            cleanup_volumes "$1"
            show_remaining_processes
            show_docker_status
            
            echo ""
            echo "=================================================="
            echo -e "${GREEN}NodeGuard AI Security Platform Stopped${NC}"
            echo "=================================================="
            echo ""
            echo "✅ All services have been stopped"
            echo ""
            echo "To start again:"
            echo "  Full Docker:     ./docker-start.sh"
            echo "  Local Dev:       ./start-local.sh"
            echo ""
            if [ "$1" != "--clean-volumes" ] && [ "$1" != "-v" ]; then
                echo "💾 Data volumes preserved"
                echo "   To remove all data: ./stop-local.sh --clean-volumes"
                echo ""
            else
                echo "🗑️  Data volumes removed"
                echo "   Fresh start on next run"
                echo ""
            fi
            ;;
    esac
}

# Run main function
main "$@"
