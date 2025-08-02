#!/bin/bash

echo "🔥 FORCE REBUILDING NodeGuard AI Security Platform..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found! Please create it first."
    exit 1
fi

# Stop all containers and remove everything
echo "🛑 Stopping and removing all containers..."
docker-compose down -v --remove-orphans

# Remove project-specific images first
echo "🗑️  Removing project Docker images..."
docker rmi -f $(docker images | grep -E "(security_detection|nodeguard)" | awk '{print $3}') 2>/dev/null || true

# Remove ALL volumes (be careful - this removes ALL Docker volumes)
echo "💾 Removing ALL Docker volumes..."
docker volume rm $(docker volume ls -q) 2>/dev/null || true

# Prune everything
echo "🧹 Pruning everything..."
docker system prune -a -f --volumes

# Remove build cache completely
echo "🔨 Removing build cache..."
docker builder prune -a -f

# List what's left
echo "📋 Remaining images:"
docker images

echo "📋 Remaining volumes:"
docker volume ls

# Wait for cleanup to complete
echo "⏳ Waiting for cleanup to complete..."
sleep 5

# Build infrastructure services first (databases, message queues)
echo "🔨 Building infrastructure services..."
docker-compose build --no-cache postgres redis elasticsearch zookeeper kafka

# Build backend services
echo "🔨 Building Python API..."
docker-compose build --no-cache python-api

echo "🔨 Building Node.js API..."
docker-compose build --no-cache nodejs-api

# Build frontend
echo "🔨 Building Frontend..."
docker-compose build --no-cache frontend

# Build monitoring services
echo "🔨 Building monitoring services..."
docker-compose build --no-cache prometheus grafana

# Start infrastructure services first
echo "🚀 Starting infrastructure services..."
docker-compose up -d postgres redis elasticsearch zookeeper

# Wait for databases to be ready
echo "⏳ Waiting for databases to initialize..."
sleep 30

# Start Kafka
echo "🚀 Starting Kafka..."
docker-compose up -d kafka

# Wait for Kafka to be ready
echo "⏳ Waiting for Kafka to be ready..."
sleep 15

# Start backend services
echo "🚀 Starting backend services..."
docker-compose up -d python-api nodejs-api

# Wait for APIs to be ready
echo "⏳ Waiting for APIs to start..."
sleep 20

# Start frontend and monitoring
echo "🚀 Starting frontend and monitoring..."
docker-compose up -d frontend prometheus grafana

echo "✅ Force rebuild complete!"
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "=================================================="
echo "🌐 NodeGuard AI Security Platform"
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
echo "   View all logs:     docker-compose logs -f"
echo "   View service logs: docker-compose logs -f <service-name>"
echo ""
echo "🛑 Stop services:     docker-compose down"
echo "=================================================="
echo ""
echo "🚀 NodeGuard AI Security Platform is now running!"
echo "📋 Press Ctrl+C to stop viewing logs (services will keep running)"
echo "🛑 Use 'docker-compose down' to stop all services"
echo ""

# Handle Ctrl+C to stop log viewing but keep services running
trap 'echo -e "\n🛑 Stopping log output...\n✅ Services are still running. Use docker-compose down to stop them."; exit 0' INT

# Follow logs like docker-start.sh does
echo "📋 Following all service logs..."
docker-compose logs -f
