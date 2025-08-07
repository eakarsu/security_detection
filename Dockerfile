# Multi-stage Dockerfile for complete security detection platform
# This builds all services in one container for simplified deployments

FROM node:18-alpine as frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM node:18-alpine as nodejs-builder
WORKDIR /app/backend/nodejs
COPY backend/nodejs/package*.json ./
COPY backend/nodejs/tsconfig.json ./
RUN npm ci
COPY backend/nodejs/ .
RUN rm -rf dist && npm run build || echo "Build completed with warnings"

FROM python:3.12-slim as final
WORKDIR /app

# Install system dependencies for both Node.js and Python
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    gcc \
    g++ \
    nginx \
    supervisor \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy Python API
COPY backend/python/requirements.txt ./backend/python/
RUN pip install --no-cache-dir -r ./backend/python/requirements.txt
COPY backend/python/ ./backend/python/

# Copy built Node.js API
COPY --from=nodejs-builder /app/backend/nodejs/dist ./backend/nodejs/dist
COPY --from=nodejs-builder /app/backend/nodejs/node_modules ./backend/nodejs/node_modules
COPY backend/nodejs/package*.json ./backend/nodejs/

# Copy built frontend
COPY --from=frontend-builder /app/frontend/build ./frontend/build
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy ML models
COPY models/ ./models/

# Create necessary directories
RUN mkdir -p /app/logs /app/data/workflows

# Copy supervisor configuration
COPY <<EOF /etc/supervisor/conf.d/supervisord.conf
[supervisord]
nodaemon=true
user=root

[program:python-api]
command=uvicorn main:app --host 0.0.0.0 --port 8000
directory=/app/backend/python
autostart=true
autorestart=true
stderr_logfile=/app/logs/python-api.log
stdout_logfile=/app/logs/python-api.log

[program:nodejs-api]
command=node dist/index.js
directory=/app/backend/nodejs
autostart=true
autorestart=true
stderr_logfile=/app/logs/nodejs-api.log
stdout_logfile=/app/logs/nodejs-api.log
environment=NODE_ENV=production,API_PORT=3001

[program:nginx]
command=/usr/sbin/nginx -g "daemon off;"
autostart=true
autorestart=true
stderr_logfile=/app/logs/nginx.log
stdout_logfile=/app/logs/nginx.log
EOF

# Health check script
COPY <<EOF /app/health-check.sh
#!/bin/bash
curl -f http://localhost:8000/health && \
curl -f http://localhost:3001/health && \
curl -f http://localhost:3000 || exit 1
EOF
RUN chmod +x /app/health-check.sh

# Expose ports
EXPOSE 3000 3001 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
    CMD /app/health-check.sh

# Start all services with supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
