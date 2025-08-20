# NodeGuard Security Platform - Hosting Deployment Guide

## Port Configuration Changes

The deployment has been updated to avoid port conflicts with ports 3000 and 3001 that are already in use on your hosting server.

### New Port Configuration:
- **Frontend (React)**: Port 3002 (was 3000)
- **Node.js API**: Port 3003 (was 3001)
- **Python ML API**: Port 8001 (was 8000)

## Domain Access Configuration

The nginx configuration has been updated to work with your domain `security.orderlybite.com`.

## Deployment Steps on Hosting Server

1. **Stop existing containers** (these are using the conflicting ports):
   ```bash
   # Find and stop containers using ports 3000/3001
   docker ps | grep -E ":3000|:3001" | awk '{print $1}' | xargs -r docker stop
   docker ps | grep -E ":3000|:3001" | awk '{print $1}' | xargs -r docker rm
   ```

2. **Run the updated deployment script**:
   ```bash
   ./deploy-hosting.sh
   ```

3. **Set up nginx as reverse proxy**:
   ```bash
   # Install nginx if not already installed
   sudo apt update && sudo apt install nginx -y
   
   # Copy the nginx configuration
   sudo cp nginx.conf /etc/nginx/sites-available/security.orderlybite.com
   
   # Enable the site
   sudo ln -sf /etc/nginx/sites-available/security.orderlybite.com /etc/nginx/sites-enabled/
   
   # Remove default site if it exists
   sudo rm -f /etc/nginx/sites-enabled/default
   
   # Test nginx configuration
   sudo nginx -t
   
   # Restart nginx
   sudo systemctl restart nginx
   sudo systemctl enable nginx
   ```

4. **Optional: Set up SSL with Certbot**:
   ```bash
   # Install certbot
   sudo apt install certbot python3-certbot-nginx -y
   
   # Get SSL certificate
   sudo certbot --nginx -d security.orderlybite.com
   ```

## Accessing Your Application

After deployment, your application will be available at:

- **Via Domain**: https://security.orderlybite.com (with SSL) or http://security.orderlybite.com
- **Direct Access**:
  - Frontend: http://your-server-ip:3002
  - Node.js API: http://your-server-ip:3003
  - Python ML API: http://your-server-ip:8001
  - API Documentation: http://your-server-ip:8001/docs

## Troubleshooting

If deployment still fails:

1. **Check what's using the ports**:
   ```bash
   sudo lsof -i :3000
   sudo lsof -i :3001
   sudo lsof -i :3002
   sudo lsof -i :3003
   sudo lsof -i :8001
   ```

2. **Kill processes using conflicting ports**:
   ```bash
   sudo fuser -k 3000/tcp
   sudo fuser -k 3001/tcp
   ```

3. **View deployment logs**:
   ```bash
   docker-compose -f docker-compose.prod.yml --env-file .env.security logs -f
   ```

## Updated Files

The following files have been updated with the new port configuration:
- `docker-compose.prod.yml` - Updated container port mappings
- `nginx.conf` - Updated proxy ports and domain configuration
- `.env.example` - Updated default port values
- `.env.security` - Created with updated port configuration
- `deploy-hosting.sh` - Updated port references in deployment script

## Environment Variables

The `.env.security` file has been created with the new port configuration. Make sure to update the following production values:

- `POSTGRES_PASSWORD` - Set a secure database password
- `JWT_SECRET` - Set a secure JWT secret key
- `ENCRYPTION_KEY` - Set a 32-character encryption key
- `ELASTICSEARCH_PASSWORD` - Set a secure Elasticsearch password
- `OPENROUTER_API_KEY` - Set your OpenRouter API key (if using AI features)

## Verification

Once deployed, verify the setup:

1. Check container status:
   ```bash
   docker-compose -f docker-compose.prod.yml --env-file .env.security ps
   ```

2. Test endpoints:
   ```bash
   curl -I http://localhost:3002  # Frontend
   curl -I http://localhost:3003/health  # Node.js API
   curl -I http://localhost:8001/health  # Python ML API
   ```

3. Test domain access:
   ```bash
   curl -I http://security.orderlybite.com
   ```