#!/bin/bash

# NodeGuard AI Security Platform - Multi-Platform Docker Build Script
# Builds Docker images for Mac (ARM64/AMD64) and Linux (AMD64/ARM64) platforms

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

# Configuration
REGISTRY=${REGISTRY:-""}  # Set this to your Docker Hub username (e.g., "yourusername/")
PROJECT_NAME="security-detection"
VERSION=${VERSION:-"latest"}
PLATFORMS="linux/amd64,linux/arm64"

# Services to build
SERVICES=("frontend" "nodejs-api" "python-api")

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    
    # Check if buildx is available
    if ! docker buildx version >/dev/null 2>&1; then
        print_error "Docker Buildx is not available. Please update Docker to a recent version."
        exit 1
    fi
    
    # Create buildx instance if it doesn't exist
    if ! docker buildx inspect multiplatform-builder >/dev/null 2>&1; then
        print_status "Creating multi-platform builder..."
        docker buildx create --name multiplatform-builder --driver docker-container --bootstrap
        docker buildx use multiplatform-builder
        print_success "Multi-platform builder created"
    else
        docker buildx use multiplatform-builder
        print_success "Using existing multi-platform builder"
    fi
    
    print_success "Prerequisites check completed"
}

# Function to build a service
build_service() {
    local service=$1
    local context_path=""
    local dockerfile_path=""
    local image_name="${REGISTRY}${PROJECT_NAME}-${service}:${VERSION}"
    
    case $service in
        "frontend")
            context_path="./frontend"
            dockerfile_path="./frontend/Dockerfile"
            ;;
        "nodejs-api")
            context_path="./backend/nodejs"
            dockerfile_path="./backend/nodejs/Dockerfile"
            ;;
        "python-api")
            context_path="./backend/python"
            dockerfile_path="./backend/python/Dockerfile"
            ;;
        *)
            print_error "Unknown service: $service"
            return 1
            ;;
    esac
    
    print_status "Building $service for platforms: $PLATFORMS"
    print_status "Image: $image_name"
    print_status "Context: $context_path"
    print_status "Dockerfile: $dockerfile_path"
    
    # Build command
    local build_args="--platform $PLATFORMS"
    build_args="$build_args --file $dockerfile_path"
    build_args="$build_args --tag $image_name"
    build_args="$build_args --progress=plain"
    
    if [ "$PUSH" = "true" ]; then
        build_args="$build_args --push"
        print_status "Will push to registry after build"
    else
        build_args="$build_args --load"
        print_warning "Building for local use only (not pushing to registry)"
    fi
    
    # Execute build
    if docker buildx build $build_args $context_path; then
        print_success "Successfully built $service"
    else
        print_error "Failed to build $service"
        return 1
    fi
}

# Function to test built images
test_images() {
    print_status "Testing built images..."
    
    for service in "${SERVICES[@]}"; do
        local image_name="${REGISTRY}${PROJECT_NAME}-${service}:${VERSION}"
        
        print_status "Testing $service image..."
        
        # Test if image exists locally
        if docker image inspect "$image_name" >/dev/null 2>&1; then
            print_success "$service image exists locally"
        else
            print_warning "$service image not found locally (might be in registry only)"
        fi
    done
}

# Function to show build summary
show_summary() {
    echo ""
    echo "=============================================="
    print_success "Multi-Platform Build Summary"
    echo "=============================================="
    echo ""
    
    print_status "Built Images:"
    for service in "${SERVICES[@]}"; do
        local image_name="${REGISTRY}${PROJECT_NAME}-${service}:${VERSION}"
        echo "  📦 $image_name"
    done
    
    echo ""
    print_status "Supported Platforms:"
    echo "  🖥️  linux/amd64   (Linux Intel/AMD, runs on macOS Intel via Docker)"
    echo "  🦾  linux/arm64   (Linux ARM - Raspberry Pi, AWS Graviton, runs on macOS M1/M2/M3 via Docker)"
    
    echo ""
    print_status "Deployment Options:"
    echo "  🐳 Docker Compose:  docker-compose -f docker-compose.prod.yml up -d"
    echo "  ⚡ Quick Deploy:    ./deploy.sh deploy"
    echo "  🚀 Local Dev:       ./start-local.sh"
    
    if [ "$PUSH" = "true" ]; then
        echo ""
        print_success "Images pushed to registry and ready for deployment!"
    else
        echo ""
        print_warning "Images built locally only. Use PUSH=true to push to registry."
    fi
}

# Main function
main() {
    echo ""
    echo "================================================="
    echo -e "${BLUE}NodeGuard AI Security Platform${NC}"
    echo -e "${BLUE}Multi-Platform Docker Build${NC}"
    echo "================================================="
    echo ""
    
    # Parse command line arguments
    PUSH=${PUSH:-false}
    SPECIFIC_SERVICE=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --push)
                PUSH=true
                shift
                ;;
            --service)
                SPECIFIC_SERVICE="$2"
                shift 2
                ;;
            --version)
                VERSION="$2"
                shift 2
                ;;
            --registry)
                REGISTRY="$2"
                shift 2
                ;;
            --platforms)
                PLATFORMS="$2"
                shift 2
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --push                 Push images to registry after building"
                echo "  --service SERVICE      Build only specific service (frontend, nodejs-api, python-api)"
                echo "  --version VERSION      Image version tag (default: latest)"
                echo "  --registry REGISTRY    Docker registry prefix (default: none)"
                echo "  --platforms PLATFORMS  Target platforms (default: linux/amd64,linux/arm64)"
                echo "  --help, -h            Show this help message"
                echo ""
                echo "Environment Variables:"
                echo "  PUSH=true             Same as --push"
                echo "  VERSION=v1.0.0        Same as --version v1.0.0"
                echo "  REGISTRY=myregistry/  Same as --registry myregistry/"
                echo ""
                echo "Examples:"
                echo "  $0                                    # Build all services locally"
                echo "  $0 --push --version v1.0.0          # Build and push with version tag"
                echo "  $0 --service frontend                # Build only frontend"
                echo "  $0 --registry myregistry.com/       # Use custom registry"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    print_status "Configuration:"
    echo "  Version: $VERSION"
    echo "  Registry: ${REGISTRY:-"(none - local build)"}"
    echo "  Platforms: $PLATFORMS"
    echo "  Push to registry: $PUSH"
    echo "  Specific service: ${SPECIFIC_SERVICE:-"(all services)"}"
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Build services
    if [ -n "$SPECIFIC_SERVICE" ]; then
        # Build specific service
        if [[ " ${SERVICES[@]} " =~ " ${SPECIFIC_SERVICE} " ]]; then
            build_service "$SPECIFIC_SERVICE"
        else
            print_error "Invalid service: $SPECIFIC_SERVICE"
            print_status "Available services: ${SERVICES[*]}"
            exit 1
        fi
    else
        # Build all services
        for service in "${SERVICES[@]}"; do
            echo ""
            build_service "$service"
        done
    fi
    
    # Test images if built locally
    if [ "$PUSH" = "false" ]; then
        echo ""
        test_images
    fi
    
    # Show summary
    echo ""
    show_summary
    
    print_success "Multi-platform build completed successfully!"
}

# Run main function
main "$@"