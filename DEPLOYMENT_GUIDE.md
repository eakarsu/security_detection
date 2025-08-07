# Multi-Platform Deployment Guide

This guide covers deploying the NodeGuard AI Security Platform across different platforms (Mac and Linux) using Docker.

## Supported Platforms

The Docker images are built to support:

- **Linux AMD64** - Standard Linux servers, Intel/AMD processors
- **Linux ARM64** - ARM-based Linux servers (Raspberry Pi, AWS Graviton, etc.)
- **macOS Intel** - Mac computers with Intel processors
- **macOS Apple Silicon** - Mac computers with M1/M2/M3 chips

## Quick Start

### 1. Prerequisites

- Docker Desktop (Mac) or Docker Engine (Linux)
- Docker Compose v2.0+
- Git

### 2. Clone and Setup

```bash
git clone <repository-url>
cd security_detection
./install.sh
```

### 3. Choose Deployment Method

#### Development (Recommended)
```bash
./start-local.sh
```

#### Production
```bash
./deploy.sh deploy
```

## Multi-Platform Building

### Build for Current Platform
```bash
# Build all services for current platform
docker-compose -f docker-compose.prod.yml build

# Build specific service
docker-compose -f docker-compose.prod.yml build python-api
```

### Build for Multiple Platforms
```bash
# Build for Mac and Linux platforms
./build-multiplatform.sh

# Build and push to registry
./build-multiplatform.sh --push --version v1.0.0

# Build specific service only
./build-multiplatform.sh --service frontend
```

### Build Script Options
```bash
./build-multiplatform.sh [OPTIONS]

Options:
  --push                 Push images to registry after building
  --service SERVICE      Build only specific service (frontend, nodejs-api, python-api)
  --version VERSION      Image version tag (default: latest)
  --registry REGISTRY    Docker registry prefix
  --platforms PLATFORMS  Target platforms (default: all supported)
  --help, -h            Show help message

Examples:
  ./build-multiplatform.sh                    # Build all services locally
  ./build-multiplatform.sh --push             # Build and push to registry
  ./build-multiplatform.sh --service frontend # Build only frontend
```

## Platform-Specific Instructions

### macOS (Intel & Apple Silicon)

1. **Install Docker Desktop**
   ```bash
   # Download from https://docker.com/products/docker-desktop
   # Or using Homebrew:
   brew install --cask docker
   ```

2. **Clone and Deploy**
   ```bash
   git clone <repository-url>
   cd security_detection
   ./install.sh
   ./start-local.sh    # For development
   # OR
   ./deploy.sh deploy  # For production
   ```

3. **Access Services**
   - Frontend: http://localhost:3000
   - Python API: http://localhost:8000
   - Node.js API: http://localhost:3001

### Linux (Ubuntu/Debian)

1. **Install Docker**
   ```bash
   # Update package index
   sudo apt-get update
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Add user to docker group
   sudo usermod -aG docker $USER
   newgrp docker
   
   # Install Docker Compose
   sudo apt-get install docker-compose-plugin
   ```

2. **Deploy Application**
   ```bash
   git clone <repository-url>
   cd security_detection
   ./install.sh
   ./deploy.sh deploy
   ```

### Linux (CentOS/RHEL/Fedora)

1. **Install Docker**
   ```bash
   # Install Docker
   sudo dnf install -y docker docker-compose
   
   # Start and enable Docker
   sudo systemctl start docker
   sudo systemctl enable docker
   
   # Add user to docker group
   sudo usermod -aG docker $USER
   newgrp docker
   ```

2. **Deploy Application**
   ```bash
   git clone <repository-url>
   cd security_detection
   ./install.sh
   ./deploy.sh deploy
   ```

## Production Deployment

### Using Pre-built Images

1. **Pull from Registry**
   ```bash
   docker pull your-registry.com/security-detection-frontend:latest
   docker pull your-registry.com/security-detection-nodejs-api:latest
   docker pull your-registry.com/security-detection-python-api:latest
   ```

2. **Deploy with Compose**
   ```bash
   # Update docker-compose.prod.yml to use registry images
   # Then deploy
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Building on Target Platform

1. **On Production Server**
   ```bash
   git clone <repository-url>
   cd security_detection
   cp .env.example .env
   # Edit .env with production values
   ./deploy.sh deploy
   ```

## Cross-Platform Considerations

### Architecture Detection
The application automatically detects and adapts to the host architecture:

- **Node.js**: Uses platform-specific npm packages
- **Python**: Uses platform-appropriate wheels and packages
- **Nginx**: Optimized Alpine Linux base for all platforms

### Performance Notes

- **Apple Silicon (M1/M2/M3)**: Native ARM64 performance
- **Intel Mac**: Native AMD64 performance  
- **Linux ARM64**: Optimized for Graviton/Raspberry Pi
- **Linux AMD64**: Standard server performance

### Health Checks

All services include robust health checks that work across platforms:
- Primary: `curl` HTTP health check
- Fallback: `wget` HTTP health check  
- Final: `nc` port connectivity check

## Troubleshooting

### Platform Issues

1. **Wrong Architecture Error**
   ```bash
   # Force rebuild for current platform
   docker-compose build --no-cache
   ```

2. **ARM64 on Intel Mac**
   ```bash
   # Use Rosetta 2 translation
   docker run --platform linux/arm64 <image>
   ```

3. **Build Failures**
   ```bash
   # Check Docker Buildx
   docker buildx version
   docker buildx ls
   
   # Recreate builder
   docker buildx rm multiplatform-builder
   ./build-multiplatform.sh
   ```

### Service Health

1. **Check Service Status**
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   docker-compose -f docker-compose.prod.yml logs <service>
   ```

2. **Test Endpoints**
   ```bash
   curl http://localhost:8000/health    # Python API
   curl http://localhost:3001           # Node.js API  
   curl http://localhost:3000           # Frontend
   ```

## Environment Variables

Key environment variables for deployment:

```bash
# Required
POSTGRES_PASSWORD=your-secure-password
ELASTICSEARCH_PASSWORD=your-elastic-password
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key

# Optional Platform Settings
DOCKER_DEFAULT_PLATFORM=linux/amd64  # Force platform
NODE_ENV=production                   # Environment mode
LOG_LEVEL=INFO                       # Logging level

# Service Configuration
PYTHON_API_PORT=8000
NODEJS_API_PORT=3001
FRONTEND_PORT=3000
```

## Security Best Practices

1. **Non-Root Users**: All containers run as non-root users
2. **Health Checks**: Comprehensive health monitoring
3. **Resource Limits**: Memory and CPU limits configured
4. **Secrets Management**: Use environment variables for secrets
5. **Network Isolation**: Services isolated in Docker networks

## Monitoring

The platform includes monitoring services that work across all platforms:

- **Prometheus**: Metrics collection (port 9090)
- **Grafana**: Visualization dashboard (port 3002)
- **Health Endpoints**: Built-in health checks
- **Logs**: Centralized logging with Docker

## Support

For platform-specific issues:

1. Check Docker Desktop/Engine logs
2. Verify platform compatibility: `docker version`
3. Test multi-platform builder: `docker buildx ls`
4. Check service logs: `docker-compose logs <service>`

## Next Steps

After successful deployment:

1. Configure `.env` with your API keys
2. Access the web interface at http://localhost:3000
3. Configure threat intelligence feeds
4. Set up monitoring dashboards
5. Review security configuration