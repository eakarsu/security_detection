#!/bin/bash

# NodeGuard AI Security Platform - Stop Local Development Services
# This script stops all locally running services

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

# Stop service by PID file
stop_service_by_pid() {
    local service_name=$1
    local pid_file=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            print_status "Stopping $service_name (PID: $pid)..."
            kill $pid
            sleep 2
            
            # Force kill if still running
            if ps -p $pid > /dev/null 2>&1; then
                print_warning "Force killing $service_name..."
                kill -9 $pid
            fi
            
            print_success "$service_name stopped"
        else
            print_warning "$service_name was not running (stale PID file)"
        fi
        rm -f "$pid_file"
    else
        print_warning "No PID file found for $service_name"
    fi
}

# Stop services by port
stop_services_by_port() {
    print_status "Stopping services by port..."
    
    # Stop processes on port 3000 (React frontend)
    local pids_3000=$(lsof -ti:3000 2>/dev/null || true)
    if [ ! -z "$pids_3000" ]; then
        print_status "Stopping processes on port 3000..."
        echo $pids_3000 | xargs kill -9 2>/dev/null || true
        print_success "Port 3000 processes stopped"
    fi
    
    # Stop processes on port 3001 (Node.js API)
    local pids_3001=$(lsof -ti:3001 2>/dev/null || true)
    if [ ! -z "$pids_3001" ]; then
        print_status "Stopping processes on port 3001..."
        echo $pids_3001 | xargs kill -9 2>/dev/null || true
        print_success "Port 3001 processes stopped"
    fi
    
    # Stop processes on port 8000 (Python API)
    local pids_8000=$(lsof -ti:8000 2>/dev/null || true)
    if [ ! -z "$pids_8000" ]; then
        print_status "Stopping processes on port 8000..."
        echo $pids_8000 | xargs kill -9 2>/dev/null || true
        print_success "Port 8000 processes stopped"
    fi
}

# Stop services by process name
stop_services_by_name() {
    print_status "Stopping NodeGuard services by process name..."
    
    # Stop uvicorn processes (Python API)
    pkill -f "uvicorn main:app" 2>/dev/null || true
    
    # Stop npm/node processes related to our project
    pkill -f "npm start" 2>/dev/null || true
    pkill -f "npm run start:dev" 2>/dev/null || true
    
    print_success "Process cleanup completed"
}

# Clean up log files
cleanup_logs() {
    if [ -d "logs" ]; then
        print_status "Cleaning up log files..."
        rm -f logs/*.pid
        print_success "PID files cleaned up"
        
        # Ask user if they want to remove log files
        read -p "Remove log files? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -f logs/*.log
            print_success "Log files removed"
        else
            print_status "Log files preserved"
        fi
    fi
}

# Display final status
show_status() {
    echo ""
    echo "=================================================="
    echo -e "${GREEN}NodeGuard AI Security Platform - Services Stopped${NC}"
    echo "=================================================="
    echo ""
    echo "🔍 Verify no services are running:"
    echo "   Check ports:        lsof -i :3000,3001,8000"
    echo "   Check processes:    ps aux | grep -E '(uvicorn|npm|node)'"
    echo ""
    echo "🚀 Start services again:"
    echo "   Local development:  ./start-local.sh"
    echo "   Docker mode:        ./docker-start.sh"
    echo ""
    echo "📝 Logs preserved in logs/ directory"
    echo "=================================================="
}

# Main execution
main() {
    echo "Stopping NodeGuard AI Security Platform (Local Development)..."
    echo "=================================================="
    
    # Create logs directory if it doesn't exist
    mkdir -p logs
    
    # Stop services using PID files first
    stop_service_by_pid "Python ML API" "logs/python-api.pid"
    stop_service_by_pid "Node.js API" "logs/nodejs-api.pid"
    stop_service_by_pid "React Frontend" "logs/frontend.pid"
    
    # Stop any remaining services by port
    stop_services_by_port
    
    # Stop any remaining services by process name
    stop_services_by_name
    
    # Clean up
    cleanup_logs
    
    # Show final status
    show_status
    
    print_success "All NodeGuard services have been stopped!"
}

# Run main function
main "$@"
