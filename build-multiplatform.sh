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
REGISTRY=${REGISTRY:-"eakarsun4/"}  # Set this to your Docker Hub username (e.g., "yourusername/")
PROJECT_NAME="nodeguard-security-platform"
VERSION=${VERSION:-"latest"}
PLATFORMS="linux/amd64,linux/arm64"

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

# Function to build unified image
build_unified_image() {
    local image_name="${REGISTRY}${PROJECT_NAME}:${VERSION}"
    
    print_status "Building unified NodeGuard Security Platform for platforms: $PLATFORMS"
    print_status "Image: $image_name"
    print_status "Context: ."
    print_status "Dockerfile: ./Dockerfile"
    
    # Build command
    local build_args="--platform $PLATFORMS"
    build_args="$build_args --file ./Dockerfile"
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
    if docker buildx build $build_args .; then
        print_success "Successfully built unified NodeGuard Security Platform"
    else
        print_error "Failed to build unified image"
        return 1
    fi
}

# Function to test built image
test_image() {
    print_status "Testing built image..."
    
    local image_name="${REGISTRY}${PROJECT_NAME}:${VERSION}"
    
    print_status "Testing unified image..."
    
    # Test if image exists locally
    if docker image inspect "$image_name" >/dev/null 2>&1; then
        print_success "Unified image exists locally"
        
        # Get image size
        local image_size=$(docker image inspect "$image_name" --format='{{.Size}}' | numfmt --to=iec-i --suffix=B)
        print_status "Image size: $image_size"
    else
        print_warning "Image not found locally (might be in registry only)"
    fi
}

# Function to show build summary
show_summary() {
    echo ""
    echo "=============================================="
    print_success "Unified Multi-Platform Build Summary"
    echo "=============================================="
    echo ""
    
    local image_name="${REGISTRY}${PROJECT_NAME}:${VERSION}"
    print_status "Built Image:"
    echo "  📦 $image_name"
    
    echo ""
    print_status "Contains Services:"
    echo "  🌐 Frontend (React) - Port 3000"
    echo "  🐍 Python API (FastAPI) - Port 8000"
    echo "  🟢 Node.js API (NestJS) - Port 3001"
    
    echo ""
    print_status "Supported Platforms:"
    echo "  🖥️  linux/amd64   (Linux Intel/AMD, runs on macOS via Docker Desktop)"
    echo "  🦾  linux/arm64   (Linux ARM - Raspberry Pi, AWS Graviton, Apple Silicon via Docker Desktop)"
    
    echo ""
    print_status "Deployment Options:"
    echo "  🐳 Docker Compose:  docker-compose -f docker-compose.prod.yml up -d"
    echo "  🚀 Direct Run:      docker run -p 3000:3000 -p 3001:3001 -p 8000:8000 $image_name"
    echo "  ⚡ Quick Deploy:    ./deploy.sh deploy"
    
    if [ "$PUSH" = "true" ]; then
        echo ""
        print_success "Image pushed to registry and ready for deployment!"
        echo ""
        print_status "Usage from Registry:"
        echo "  docker pull $image_name"
        echo "  docker run -d -p 3000:3000 -p 3001:3001 -p 8000:8000 $image_name"
    else
        echo ""
        print_warning "Image built locally only. Use --push to push to registry."
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
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --push)
                PUSH=true
                shift
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
                echo "NodeGuard AI Security Platform - Unified Multi-Platform Docker Build"
                echo ""
                echo "Options:"
                echo "  --push                 Push image to registry after building"
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
                echo "  $0                                    # Build unified image locally"
                echo "  $0 --push --version v1.0.0          # Build and push with version tag"
                echo "  $0 --registry myregistry.com/       # Use custom registry"
                echo "  REGISTRY=johndoe/ $0 --push          # Build and push using environment variable"
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
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Build unified image
    echo ""
    build_unified_image
    
    # Test image if built locally
    if [ "$PUSH" = "false" ]; then
        echo ""
        test_image
    fi
    
    # Show summary
    echo ""
    show_summary
    
    print_success "Multi-platform build completed successfully!"
}

# Run main function
main "$@"
