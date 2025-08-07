#!/bin/bash

# NodeGuard AI Security Platform - Installation Script
# This script checks requirements and sets up the development environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check version
check_version() {
    local min_version="$1"
    local current_version="$2"
    
    # Use sort -V to compare versions properly
    if [ "$(printf '%s\n' "$min_version" "$current_version" | sort -V | head -n1)" = "$min_version" ]; then
        return 0
    else
        return 1
    fi
}

# Main installation function
main() {
    log_info "Starting NodeGuard AI Security Platform installation..."
    echo "=================================================="
    
    # Check operating system
    OS="$(uname -s)"
    case "${OS}" in
        Linux*)     MACHINE=Linux;;
        Darwin*)    MACHINE=Mac;;
        CYGWIN*)    MACHINE=Cygwin;;
        MINGW*)     MACHINE=MinGw;;
        *)          MACHINE="UNKNOWN:${OS}"
    esac
    log_info "Detected OS: $MACHINE"
    
    # Check system requirements
    log_info "Checking system requirements..."
    
    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version | sed 's/v//')
        if check_version "18.0.0" "$NODE_VERSION"; then
            log_success "Node.js $NODE_VERSION found (>= 18.0.0 required)"
        else
            log_error "Node.js version $NODE_VERSION is too old. Please install Node.js 18.0.0 or higher"
            log_info "Visit: https://nodejs.org/en/download/"
            exit 1
        fi
    else
        log_error "Node.js not found. Please install Node.js 18.0.0 or higher"
        log_info "Visit: https://nodejs.org/en/download/"
        exit 1
    fi
    
    # Check npm
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        log_success "npm $NPM_VERSION found"
    else
        log_error "npm not found. Please install npm"
        exit 1
    fi
    
    # Check Python
    if command_exists python3; then
        PYTHON_VERSION=$(python3 --version | awk '{print $2}')
        if check_version "3.9.0" "$PYTHON_VERSION"; then
            log_success "Python $PYTHON_VERSION found (>= 3.9.0 required)"
        else
            log_error "Python version $PYTHON_VERSION is too old. Please install Python 3.9.0 or higher"
            log_info "Visit: https://www.python.org/downloads/"
            exit 1
        fi
    else
        log_error "Python 3 not found. Please install Python 3.9.0 or higher"
        log_info "Visit: https://www.python.org/downloads/"
        exit 1
    fi
    
    # Check pip
    if command_exists pip3; then
        PIP_VERSION=$(pip3 --version | awk '{print $2}')
        log_success "pip $PIP_VERSION found"
    else
        log_error "pip3 not found. Please install pip3"
        exit 1
    fi
    
    # Check git
    if command_exists git; then
        GIT_VERSION=$(git --version | awk '{print $3}')
        log_success "Git $GIT_VERSION found"
    else
        log_warning "Git not found. Git is recommended for version control"
    fi
    
    # Check curl
    if command_exists curl; then
        log_success "curl found"
    else
        log_error "curl not found. Please install curl"
        exit 1
    fi
    
    # Check available disk space
    if [ "$MACHINE" = "Mac" ]; then
        AVAILABLE_SPACE=$(df -h . | awk 'NR==2{print $4}' | sed 's/G//')
    else
        AVAILABLE_SPACE=$(df -h . | awk 'NR==2{print $4}' | sed 's/G//')
    fi
    log_info "Available disk space: ${AVAILABLE_SPACE}G"
    
    # Check memory
    if [ "$MACHINE" = "Mac" ]; then
        TOTAL_MEM=$(sysctl -n hw.memsize | awk '{print int($1/1024/1024/1024)}')
    else
        TOTAL_MEM=$(free -g | awk 'NR==2{print $2}')
    fi
    log_info "Total memory: ${TOTAL_MEM}GB"
    
    if [ "$TOTAL_MEM" -lt 4 ]; then
        log_warning "Less than 4GB RAM detected. Performance may be affected."
    fi
    
    log_success "All system requirements met!"
    echo ""
    
    # Setup environment
    log_info "Setting up environment..."
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_success "Created .env file from template"
            log_warning "Please edit .env file and add your OpenRouter API key"
        else
            log_error ".env.example file not found"
            exit 1
        fi
    else
        log_info ".env file already exists"
    fi
    
    # Install Python dependencies
    log_info "Installing Python dependencies..."
    cd backend/python
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        log_info "Creating Python virtual environment..."
        python3 -m venv venv
        log_success "Python virtual environment created"
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install requirements
    if [ -f "requirements.txt" ]; then
        log_info "Installing Python packages..."
        pip install -r requirements.txt
        log_success "Python dependencies installed"
    else
        log_error "requirements.txt not found in backend/python"
        exit 1
    fi
    
    cd ../..
    
    # Install Node.js dependencies for frontend
    log_info "Installing frontend dependencies..."
    cd frontend
    
    if [ -f "package.json" ]; then
        npm install
        log_success "Frontend dependencies installed"
    else
        log_error "package.json not found in frontend"
        exit 1
    fi
    
    cd ..
    
    # Install Node.js dependencies for backend API (if exists)
    if [ -d "backend/nodejs" ]; then
        log_info "Installing Node.js backend dependencies..."
        cd backend/nodejs
        
        if [ -f "package.json" ]; then
            npm install
            log_success "Node.js backend dependencies installed"
        else
            log_warning "package.json not found in backend/nodejs"
        fi
        
        cd ../..
    fi
    
    # Create necessary directories
    log_info "Creating necessary directories..."
    mkdir -p logs
    mkdir -p data
    mkdir -p models
    log_success "Directories created"
    
    # Check Docker (optional)
    if command_exists docker; then
        DOCKER_VERSION=$(docker --version | awk '{print $3}' | sed 's/,//')
        log_success "Docker $DOCKER_VERSION found (optional)"
        
        if command_exists docker-compose; then
            COMPOSE_VERSION=$(docker-compose --version | awk '{print $3}' | sed 's/,//')
            log_success "Docker Compose $COMPOSE_VERSION found (optional)"
        else
            log_warning "Docker Compose not found (optional for containerized deployment)"
        fi
    else
        log_warning "Docker not found (optional for containerized deployment)"
    fi
    
    echo ""
    log_success "Installation completed successfully!"
    echo "=================================================="
    
    # Display next steps
    echo ""
    log_info "Next steps:"
    echo "1. Edit .env file and add your OpenRouter API key:"
    echo "   nano .env"
    echo ""
    echo "2. Run the startup script:"
    echo "   ./start-local.sh      (recommended for development)"
    echo "   ./deploy.sh deploy    (production Docker deployment)"
    echo ""
    echo "3. Or start services manually:"
    echo "   # Python ML API:"
    echo "   cd backend/python && source venv/bin/activate && uvicorn main:app --reload --port 8000"
    echo ""
    echo "   # Frontend (in another terminal):"
    echo "   cd frontend && npm start"
    echo ""
    echo "4. Access the application:"
    echo "   Frontend: http://localhost:3000"
    echo "   Python API: http://localhost:8000"
    echo "   API Docs: http://localhost:8000/docs"
    echo ""
    
    # Check if OpenRouter API key is set
    if grep -q "your_openrouter_api_key_here" .env 2>/dev/null; then
        log_warning "Remember to set your OpenRouter API key in .env file for AI features to work!"
    fi
}

# Run main function
main "$@"
