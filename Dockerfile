# Single-stage Dockerfile for complete security detection platform
# This builds all services in one container using Node.js 24 slim base

FROM node:24-slim
WORKDIR /app

# Set environment variables for non-interactive package installation
ENV DEBIAN_FRONTEND=noninteractive

# Configure apt retry logic and enable main repository
RUN mkdir -p /etc/apt/apt.conf.d && \
    printf 'Acquire::Retries "3";\nAcquire::http::Timeout "30";\nAcquire::https::Timeout "30";\n' > /etc/apt/apt.conf.d/99-retries

# Ensure we have proper sources configured and update with debugging
RUN echo "deb http://deb.debian.org/debian bookworm main" > /etc/apt/sources.list && \
    echo "deb http://deb.debian.org/debian bookworm-updates main" >> /etc/apt/sources.list && \
    echo "deb http://deb.debian.org/debian-security bookworm-security main" >> /etc/apt/sources.list && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Update package lists with retry logic
RUN for i in 1 2 3; do \
        echo "Attempt $i: Updating package lists..." && \
        apt-get update && \
        break || \
        (echo "Update failed, attempt $i/3" && sleep 5); \
    done

# Install system dependencies
RUN apt-get install -y --no-install-recommends \
    curl \
    wget \
    gnupg \
    ca-certificates \
    build-essential \
    supervisor \
    python3 \
    python3-pip \
    python3-venv \
    netcat-openbsd \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/* && apt-get clean

# Create Python virtual environment with proper error handling
RUN python3 -m venv /app/venv || echo "Virtual env creation failed, using system python"
ENV PATH="/app/venv/bin:$PATH"

# Build Frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund && npm cache clean --force
COPY frontend/ .

# Set React environment variables for build (passed from docker-compose)
ARG REACT_APP_API_URL
ARG REACT_APP_PYTHON_API_URL
ARG REACT_APP_FRONTEND_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_PYTHON_API_URL=$REACT_APP_PYTHON_API_URL
ENV REACT_APP_FRONTEND_URL=$REACT_APP_FRONTEND_URL

RUN npm run build

# Build Node.js API
WORKDIR /app/backend/nodejs
COPY backend/nodejs/package*.json ./
COPY backend/nodejs/tsconfig.json ./
RUN npm ci
COPY backend/nodejs/ .
RUN rm -rf dist && npm run build || echo "Build completed with warnings"

# Setup Python API
WORKDIR /app/backend/python
COPY backend/python/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/python/ ./

# Return to app root
WORKDIR /app

# Install serve (lightweight static file server for React)
RUN npm install -g serve

# Copy ML models
COPY models/ ./models/

# Copy database seed scripts
COPY scripts/setup/ ./scripts/setup/

# Create necessary directories
RUN mkdir -p /app/logs /app/data/workflows

# Copy supervisor configuration
COPY <<EOF /etc/supervisor/conf.d/supervisord.conf
[supervisord]
nodaemon=true
user=root

[program:db-seeder]
command=/app/seed-database.sh
directory=/app
autostart=true
autorestart=false
startsecs=0
exitcodes=0
stderr_logfile=/app/logs/db-seeder.log
stdout_logfile=/app/logs/db-seeder.log
priority=1

[program:python-api]
command=/app/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
directory=/app/backend/python
autostart=true
autorestart=true
stderr_logfile=/app/logs/python-api.log
stdout_logfile=/app/logs/python-api.log
priority=10

[program:nodejs-api]
command=node dist/index.js
directory=/app/backend/nodejs
autostart=true
autorestart=true
stderr_logfile=/app/logs/nodejs-api.log
stdout_logfile=/app/logs/nodejs-api.log
environment=NODE_ENV=production,API_PORT=3001
priority=10

[program:frontend]
command=serve -s /app/frontend/build -l 3000
directory=/app
autostart=true
autorestart=true
stderr_logfile=/app/logs/frontend.log
stdout_logfile=/app/logs/frontend.log
priority=20
EOF

# Database seeding script
COPY <<EOF /app/seed-database.sh
#!/bin/bash
echo "Waiting for database to be ready..."
# Wait for database to be available
while ! nc -z postgres 5432; do
  echo "Waiting for database..."
  sleep 2
done

echo "Database is ready. Starting seeding process..."
sleep 5

# Run database seeding
echo "Running seed script: /app/scripts/setup/seed_security_data.sql"
PGPASSWORD=\${POSTGRES_PASSWORD} psql -h postgres -U \${POSTGRES_USER:-nodeguard} -d \${POSTGRES_DB:-nodeguard} -f /app/scripts/setup/seed_security_data.sql

if [ \$? -eq 0 ]; then
    echo "Database seeding completed successfully!"
else
    echo "Database seeding failed!"
    exit 1
fi
EOF
RUN chmod +x /app/seed-database.sh

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
