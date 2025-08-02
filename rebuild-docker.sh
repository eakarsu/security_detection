#!/bin/bash

echo "🔄 Rebuilding NodeGuard AI Security Platform from scratch..."

# Stop all containers
echo "📦 Stopping all containers..."
docker-compose down -v

# Remove all related images to force rebuild
echo "🗑️  Removing old images..."
docker image rm -f $(docker images | grep -E "(security_detection|nodeguard)" | awk '{print $3}') 2>/dev/null || true

# Remove all volumes to ensure clean database
echo "💾 Removing all volumes..."
docker volume prune -f

# Remove build cache
echo "🧹 Clearing Docker build cache..."
docker builder prune -f

# Rebuild all images without cache
echo "🔨 Building all images from scratch..."
docker-compose build --no-cache --parallel

# Start the platform
echo "🚀 Starting the platform..."
docker-compose up -d

echo "✅ Rebuild complete! Check logs with: docker-compose logs -f"
